import * as fs from 'fs';
import * as path from 'path';

export interface TrackerKeywords {
  en: string[];
  ar: string[];
}

export interface TrackerDefinition {
  id: string;
  name: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
  keywords: TrackerKeywords;
  description: string;
}

export interface TrackerDictionary {
  metadata: {
    version: string;
    description: string;
    last_updated: string;
    language_support: string[];
  };
  trackers: TrackerDefinition[];
  generic_disclosure_keywords: TrackerKeywords;
}

export interface PolicyGap {
  toolId: string;
  toolName: string;
  category: string;
  status: 'missing_in_policy' | 'disclosed' | 'generic_disclosure';
  severity: 'high' | 'medium' | 'low';
  evidence?: {
    matchedKeywords?: string[];
    searchedKeywords?: string[];
  };
  recommendation?: string;
}

export interface GapAnalysisResult {
  totalTrackersDetected: number;
  totalDisclosed: number;
  totalMissing: number;
  totalGenericDisclosure: number;
  disclosureRate: number;
  gaps: PolicyGap[];
  summary: {
    highRiskGaps: number;
    mediumRiskGaps: number;
    lowRiskGaps: number;
  };
}

export interface DetectedTracker {
  name: string;
  category?: string;
  detected?: boolean;
}

export interface ParsedPolicy {
  type: string;
  url: string;
  fullText: string;
  wordCount: number;
  language: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

let trackerDictionary: TrackerDictionary | null = null;

function loadTrackerDictionary(): TrackerDictionary {
  if (trackerDictionary) {
    return trackerDictionary;
  }
  
  const dictionaryPath = path.join(__dirname, '../knowledge/tracker-policy-dictionary.json');
  const content = fs.readFileSync(dictionaryPath, 'utf-8');
  trackerDictionary = JSON.parse(content) as TrackerDictionary;
  
  console.log(`[GapAnalyzer] Loaded tracker dictionary with ${trackerDictionary.trackers.length} trackers`);
  
  return trackerDictionary;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

function findTrackerInDictionary(trackerName: string, dictionary: TrackerDictionary): TrackerDefinition | null {
  const normalizedName = normalizeText(trackerName);
  
  for (const tracker of dictionary.trackers) {
    const normalizedTrackerName = normalizeText(tracker.name);
    if (normalizedName.includes(normalizedTrackerName) || normalizedTrackerName.includes(normalizedName)) {
      return tracker;
    }
    
    const allKeywords = [...tracker.keywords.en, ...tracker.keywords.ar];
    for (const keyword of allKeywords) {
      if (normalizeText(keyword) === normalizedName) {
        return tracker;
      }
    }
  }
  
  return null;
}

function searchKeywordsInText(text: string, keywords: string[]): string[] {
  const normalizedText = normalizeText(text);
  const matchedKeywords: string[] = [];
  
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedText.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
    }
  }
  
  return matchedKeywords;
}

function hasGenericDisclosure(text: string, dictionary: TrackerDictionary): boolean {
  const allGenericKeywords = [
    ...dictionary.generic_disclosure_keywords.en,
    ...dictionary.generic_disclosure_keywords.ar
  ];
  
  const matches = searchKeywordsInText(text, allGenericKeywords);
  return matches.length >= 2;
}

export function analyzePolicyGaps(
  detectedTrackers: DetectedTracker[],
  policies: ParsedPolicy[]
): GapAnalysisResult {
  console.log(`[GapAnalyzer] Starting gap analysis...`);
  console.log(`[GapAnalyzer] Detected trackers: ${detectedTrackers.length}`);
  console.log(`[GapAnalyzer] Policies to analyze: ${policies.length}`);
  
  const dictionary = loadTrackerDictionary();
  
  const combinedPolicyText = policies
    .filter(p => p.type === 'privacy' || p.type === 'cookies')
    .map(p => p.fullText)
    .join(' ');
  
  console.log(`[GapAnalyzer] Combined policy text length: ${combinedPolicyText.length} characters`);
  
  const gaps: PolicyGap[] = [];
  let totalDisclosed = 0;
  let totalMissing = 0;
  let totalGenericDisclosure = 0;
  
  const hasGenericThirdPartyDisclosure = hasGenericDisclosure(combinedPolicyText, dictionary);
  
  for (const detected of detectedTrackers) {
    const trackerDef = findTrackerInDictionary(detected.name, dictionary);
    
    if (!trackerDef) {
      console.log(`[GapAnalyzer] Tracker "${detected.name}" not found in dictionary, skipping...`);
      continue;
    }
    
    const allKeywords = [...trackerDef.keywords.en, ...trackerDef.keywords.ar];
    const matchedKeywords = searchKeywordsInText(combinedPolicyText, allKeywords);
    
    if (matchedKeywords.length > 0) {
      totalDisclosed++;
      gaps.push({
        toolId: trackerDef.id,
        toolName: trackerDef.name,
        category: trackerDef.category,
        status: 'disclosed',
        severity: trackerDef.severity,
        evidence: {
          matchedKeywords,
          searchedKeywords: allKeywords
        }
      });
    } else if (hasGenericThirdPartyDisclosure) {
      totalGenericDisclosure++;
      gaps.push({
        toolId: trackerDef.id,
        toolName: trackerDef.name,
        category: trackerDef.category,
        status: 'generic_disclosure',
        severity: trackerDef.severity,
        evidence: {
          searchedKeywords: allKeywords
        },
        recommendation: `Consider explicitly mentioning "${trackerDef.name}" in your privacy policy for full PDPL compliance.`
      });
    } else {
      totalMissing++;
      gaps.push({
        toolId: trackerDef.id,
        toolName: trackerDef.name,
        category: trackerDef.category,
        status: 'missing_in_policy',
        severity: trackerDef.severity,
        evidence: {
          searchedKeywords: allKeywords
        },
        recommendation: `PDPL Article 12 requires disclosure of "${trackerDef.name}" usage in your privacy policy.`
      });
    }
  }
  
  const summary = {
    highRiskGaps: gaps.filter(g => g.status === 'missing_in_policy' && g.severity === 'high').length,
    mediumRiskGaps: gaps.filter(g => g.status === 'missing_in_policy' && g.severity === 'medium').length,
    lowRiskGaps: gaps.filter(g => g.status === 'missing_in_policy' && g.severity === 'low').length
  };
  
  const disclosureRate = gaps.length > 0 
    ? Math.round((totalDisclosed / gaps.length) * 100) 
    : 100;
  
  console.log(`[GapAnalyzer] Analysis complete. Disclosed: ${totalDisclosed}, Missing: ${totalMissing}, Generic: ${totalGenericDisclosure}`);
  
  return {
    totalTrackersDetected: gaps.length,
    totalDisclosed,
    totalMissing,
    totalGenericDisclosure,
    disclosureRate,
    gaps,
    summary
  };
}

export function getHighRiskGaps(result: GapAnalysisResult): PolicyGap[] {
  return result.gaps.filter(g => g.status === 'missing_in_policy' && g.severity === 'high');
}

export function getMissingTrackers(result: GapAnalysisResult): PolicyGap[] {
  return result.gaps.filter(g => g.status === 'missing_in_policy');
}
