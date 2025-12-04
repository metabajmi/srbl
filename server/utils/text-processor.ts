/**
 * Text Processing Module for Deterministic Legal Document Analysis
 * Provides sentence-level tokenization, negation detection, and contextual search
 */

export interface Sentence {
  text: string;
  index: number;
  startPos: number;
  endPos: number;
  isNegated: boolean;
}

export interface ContextMatch {
  sentence: Sentence;
  matchedTerms: string[];
  confidence: number;
}

// Sentence delimiters for Arabic and English
const SENTENCE_DELIMITERS = /[.،؟!?\n\r]+/g;

// Negation patterns
const NEGATION_PATTERNS = {
  arabic: [
    'لا ', 'لن ', 'لم ', 'ليس', 'ليست', 'دون ', 'بدون ',
    'لا يتم', 'لا نقوم', 'لا نجمع', 'لا نستخدم', 'لا نشارك', 'لا نحتفظ',
    'لن يتم', 'لن نقوم', 'لن نجمع', 'لن نستخدم', 'لن نشارك',
    'عدم ', 'من دون', 'غير ', 'ممنوع'
  ],
  english: [
    'do not ', 'don\'t ', 'does not ', 'doesn\'t ',
    'will not ', 'won\'t ', 'cannot ', 'can\'t ',
    'never ', 'no ', 'not ', 'without ',
    'we do not', 'we don\'t', 'we never', 'we will not'
  ]
};

// Contact section indicators (to exclude from data collection context)
const CONTACT_SECTION_INDICATORS = [
  // Arabic
  'اتصل بنا', 'تواصل معنا', 'للتواصل', 'للاستفسار', 'خدمة العملاء',
  'بريد الدعم', 'فريق الدعم', 'أرسل لنا', 'راسلنا',
  // English
  'contact us', 'get in touch', 'reach us', 'customer service',
  'support team', 'send us', 'write to us', 'email us at'
];

/**
 * Splits text into sentences with metadata
 */
export function splitIntoSentences(text: string): Sentence[] {
  const sentences: Sentence[] = [];
  const textLower = text.toLowerCase();
  
  // Split by sentence delimiters
  const parts = text.split(SENTENCE_DELIMITERS);
  let currentPos = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (part.length < 5) continue; // Skip very short fragments
    
    const startPos = text.indexOf(part, currentPos);
    const endPos = startPos + part.length;
    currentPos = endPos;
    
    // Check if sentence is negated
    const partLower = part.toLowerCase();
    const isNegated = isNegatedSentence(partLower);
    
    sentences.push({
      text: part,
      index: sentences.length,
      startPos,
      endPos,
      isNegated
    });
  }
  
  return sentences;
}

/**
 * Checks if a sentence contains negation
 */
export function isNegatedSentence(sentenceText: string): boolean {
  const textLower = sentenceText.toLowerCase();
  
  // Check Arabic negations
  for (const pattern of NEGATION_PATTERNS.arabic) {
    if (textLower.includes(pattern)) {
      return true;
    }
  }
  
  // Check English negations
  for (const pattern of NEGATION_PATTERNS.english) {
    if (textLower.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Checks if a sentence is in a contact section (not data collection context)
 */
export function isContactSection(sentenceText: string): boolean {
  const textLower = sentenceText.toLowerCase();
  return CONTACT_SECTION_INDICATORS.some(indicator => 
    textLower.includes(indicator.toLowerCase())
  );
}

/**
 * Finds sentences that contain BOTH a verb and a term from the target list
 * Used for co-location verification (e.g., collection verb + data type)
 */
export function findColocatedTerms(
  sentences: Sentence[],
  verbs: string[],
  targets: string[],
  options: { excludeNegated?: boolean; excludeContactSections?: boolean } = {}
): ContextMatch[] {
  const matches: ContextMatch[] = [];
  const { excludeNegated = true, excludeContactSections = true } = options;
  
  for (const sentence of sentences) {
    // Skip negated sentences if requested
    if (excludeNegated && sentence.isNegated) continue;
    
    // Skip contact sections if requested
    if (excludeContactSections && isContactSection(sentence.text)) continue;
    
    const sentenceLower = sentence.text.toLowerCase();
    const matchedVerbs: string[] = [];
    const matchedTargets: string[] = [];
    
    // Check for verbs
    for (const verb of verbs) {
      if (sentenceLower.includes(verb.toLowerCase())) {
        matchedVerbs.push(verb);
      }
    }
    
    // Check for target terms
    for (const target of targets) {
      if (sentenceLower.includes(target.toLowerCase())) {
        matchedTargets.push(target);
      }
    }
    
    // Only include if BOTH verb and target are found
    if (matchedVerbs.length > 0 && matchedTargets.length > 0) {
      matches.push({
        sentence,
        matchedTerms: [...matchedVerbs, ...matchedTargets],
        confidence: Math.min(matchedVerbs.length, matchedTargets.length) / Math.max(1, targets.length)
      });
    }
  }
  
  return matches;
}

/**
 * Finds sentences containing any of the specified terms
 */
export function findSentencesWithTerms(
  sentences: Sentence[],
  terms: string[],
  options: { excludeNegated?: boolean } = {}
): ContextMatch[] {
  const matches: ContextMatch[] = [];
  const { excludeNegated = false } = options;
  
  for (const sentence of sentences) {
    if (excludeNegated && sentence.isNegated) continue;
    
    const sentenceLower = sentence.text.toLowerCase();
    const matchedTerms: string[] = [];
    
    for (const term of terms) {
      if (sentenceLower.includes(term.toLowerCase())) {
        matchedTerms.push(term);
      }
    }
    
    if (matchedTerms.length > 0) {
      matches.push({
        sentence,
        matchedTerms,
        confidence: matchedTerms.length / terms.length
      });
    }
  }
  
  return matches;
}

/**
 * Counts how many unique terms from a list appear in non-negated sentences
 */
export function countAffirmativeTerms(
  sentences: Sentence[],
  terms: string[],
  options: { excludeContactSections?: boolean } = {}
): { count: number; foundTerms: string[] } {
  const { excludeContactSections = true } = options;
  const foundTerms = new Set<string>();
  
  for (const sentence of sentences) {
    // Skip negated sentences
    if (sentence.isNegated) continue;
    
    // Skip contact sections if requested
    if (excludeContactSections && isContactSection(sentence.text)) continue;
    
    const sentenceLower = sentence.text.toLowerCase();
    
    for (const term of terms) {
      if (sentenceLower.includes(term.toLowerCase())) {
        foundTerms.add(term);
      }
    }
  }
  
  return {
    count: foundTerms.size,
    foundTerms: Array.from(foundTerms)
  };
}

/**
 * Checks if document mentions a topic with consent mechanism
 * Used for marketing consent verification
 */
export function hasTopicWithConsent(
  sentences: Sentence[],
  topicTerms: string[],
  consentTerms: string[]
): { hasTopic: boolean; topicNegated: boolean; hasConsent: boolean } {
  let hasTopic = false;
  let topicNegated = false;
  let hasConsent = false;
  
  for (const sentence of sentences) {
    const sentenceLower = sentence.text.toLowerCase();
    
    // Check for topic terms
    const topicFound = topicTerms.some(t => sentenceLower.includes(t.toLowerCase()));
    if (topicFound) {
      hasTopic = true;
      if (sentence.isNegated) {
        topicNegated = true;
      }
    }
    
    // Check for consent terms
    const consentFound = consentTerms.some(t => sentenceLower.includes(t.toLowerCase()));
    if (consentFound) {
      hasConsent = true;
    }
  }
  
  return { hasTopic, topicNegated, hasConsent };
}

/**
 * Analyzes document structure - identifies sections
 */
export function identifySections(text: string): { name: string; content: string }[] {
  const sections: { name: string; content: string }[] = [];
  
  // Common section headers in Arabic and English
  const sectionPatterns = [
    // Arabic
    /(?:^|\n)([\u0600-\u06FF\s]+)[:：]/gm,
    /(?:^|\n)(\d+[-.)]?\s*[\u0600-\u06FF\s]+)/gm,
    // English
    /(?:^|\n)([A-Z][A-Za-z\s]+)[:：]/gm,
    /(?:^|\n)(\d+[-.)]?\s*[A-Z][A-Za-z\s]+)/gm
  ];
  
  // Simple section extraction based on newlines and headers
  const lines = text.split(/\n+/);
  let currentSection = { name: 'introduction', content: '' };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    
    // Check if this looks like a header
    const isHeader = 
      trimmed.length < 100 && // Headers are usually short
      (trimmed.endsWith(':') || trimmed.endsWith('：') ||
       /^[\d\u0660-\u0669]+[-.)]/.test(trimmed) || // Numbered
       /^[أ-ي]+[-.)]/.test(trimmed)); // Arabic lettered
    
    if (isHeader) {
      if (currentSection.content.length > 0) {
        sections.push({ ...currentSection });
      }
      currentSection = { name: trimmed.replace(/[:：.\d\u0660-\u0669\-)\s]+$/, '').trim(), content: '' };
    } else {
      currentSection.content += trimmed + ' ';
    }
  }
  
  // Add last section
  if (currentSection.content.length > 0) {
    sections.push(currentSection);
  }
  
  return sections;
}
