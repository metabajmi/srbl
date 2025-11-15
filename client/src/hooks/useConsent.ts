import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ConsentPreferences } from "@/components/CookieBanner";

const CONSENT_STORAGE_KEY = "pdpl_consent";
const ANONYMOUS_ID_KEY = "pdpl_anonymous_id";

interface StoredConsent extends ConsentPreferences {
  timestamp: number;
  version: string;
}

// Generate a simple anonymous ID (fingerprint)
function generateAnonymousId(): string {
  const id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (id) return id;
  
  const newId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(ANONYMOUS_ID_KEY, newId);
  return newId;
}

export function useConsent() {
  const [hasConsented, setHasConsented] = useState<boolean | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Check if user has already consented
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored) {
      try {
        const consent: StoredConsent = JSON.parse(stored);
        // Check if consent is still valid (e.g., within 1 year)
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        const isValid = Date.now() - consent.timestamp < oneYear;
        
        if (isValid) {
          setHasConsented(true);
          setShowBanner(false);
        } else {
          setHasConsented(false);
          setShowBanner(true);
        }
      } catch {
        setHasConsented(false);
        setShowBanner(true);
      }
    } else {
      setHasConsented(false);
      setShowBanner(true);
    }
  }, []);

  // Mutation to save consent to backend
  const saveConsentMutation = useMutation({
    mutationFn: async (preferences: ConsentPreferences) => {
      const anonymousId = generateAnonymousId();
      
      return apiRequest("POST", "/api/cmp/consent", {
        anonymousId,
        necessaryCookies: "accepted", // Always accepted
        analyticsCookies: preferences.analytics ? "accepted" : "rejected",
        marketingCookies: preferences.marketing ? "accepted" : "rejected",
        performanceCookies: preferences.performance ? "accepted" : "rejected",
        consentMethod: "banner",
        consentVersion: "1.0",
        ipAddress: null, // Will be set by backend
        userAgent: navigator.userAgent,
      });
    },
  });

  const acceptConsent = async (preferences: ConsentPreferences) => {
    // Save to localStorage
    const consent: StoredConsent = {
      ...preferences,
      timestamp: Date.now(),
      version: "1.0",
    };
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
    
    // Save to backend
    await saveConsentMutation.mutateAsync(preferences);
    
    setHasConsented(true);
    setShowBanner(false);
  };

  const rejectConsent = async () => {
    const onlyNecessary: ConsentPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      performance: false,
    };
    
    await acceptConsent(onlyNecessary);
  };

  const resetConsent = () => {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
    setHasConsented(false);
    setShowBanner(true);
  };

  return {
    hasConsented,
    showBanner,
    acceptConsent,
    rejectConsent,
    resetConsent,
    isLoading: saveConsentMutation.isPending,
  };
}
