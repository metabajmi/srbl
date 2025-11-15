import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import CookieBanner from "@/components/CookieBanner";
import { useConsent } from "@/hooks/useConsent";
import HomePage from "@/pages/HomePage";
import ScanResultsPage from "@/pages/ScanResultsPage";
import PrivacyGeneratorPage from "@/pages/PrivacyGeneratorPage";
import TermsGeneratorPage from "@/pages/TermsGeneratorPage";
import ConsentManagementPage from "@/pages/ConsentManagementPage";
import PreferencesCenterPage from "@/pages/PreferencesCenterPage";
import InternalCompliancePage from "@/pages/InternalCompliancePage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Main pages */}
      <Route path="/" component={HomePage} />
      <Route path="/scans" component={HomePage} />
      <Route path="/scan/:id" component={ScanResultsPage} />
      
      {/* Tools */}
      <Route path="/privacy-generator" component={PrivacyGeneratorPage} />
      <Route path="/terms-generator" component={TermsGeneratorPage} />
      <Route path="/consent-management" component={ConsentManagementPage} />
      <Route path="/preferences-center" component={PreferencesCenterPage} />
      <Route path="/internal-compliance" component={InternalCompliancePage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { showBanner, acceptConsent, rejectConsent } = useConsent();
  
  // Load CMP settings
  const { data: cmpSettings } = useQuery<{
    bannerTitle: string;
    bannerDescription: string;
    privacyPolicyUrl: string;
    termsUrl: string;
  }>({
    queryKey: ["/api/cmp/settings"],
  });

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <TooltipProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between px-4 py-2 border-b">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </header>
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
        </div>
      </SidebarProvider>
      
      {/* Cookie Banner */}
      {showBanner && (
        <CookieBanner
          onAccept={acceptConsent}
          onReject={rejectConsent}
          settings={cmpSettings ? {
            bannerTitle: cmpSettings.bannerTitle,
            bannerDescription: cmpSettings.bannerDescription,
            privacyPolicyUrl: cmpSettings.privacyPolicyUrl || "/privacy-policy",
            termsUrl: cmpSettings.termsUrl || "/terms",
          } : undefined}
        />
      )}
      
      <Toaster />
    </TooltipProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
