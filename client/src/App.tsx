import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import CookieBanner from "@/components/CookieBanner";
import { useConsent } from "@/hooks/useConsent";
import { LogIn, UserPlus } from "lucide-react";
import HomePage from "@/pages/HomePage";
import ScanResultsPage from "@/pages/ScanResultsPage";
import PrivacyGeneratorPage from "@/pages/PrivacyGeneratorPage";
import TermsGeneratorPage from "@/pages/TermsGeneratorPage";
import ConsentManagementPage from "@/pages/ConsentManagementPage";
import PreferencesCenterPage from "@/pages/PreferencesCenterPage";
import InternalCompliancePage from "@/pages/InternalCompliancePage";
import RopaManagementPage from "@/pages/RopaManagementPage";
import DsarManagementPage from "@/pages/DsarManagementPage";
import DpiaManagementPage from "@/pages/DpiaManagementPage";
import SmartAssistantPage from "@/pages/SmartAssistantPage";
import SignUpPage from "@/pages/SignUpPage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import MyPoliciesPage from "@/pages/MyPoliciesPage";
import MyRequestsPage from "@/pages/MyRequestsPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Auth pages */}
      <Route path="/signup" component={SignUpPage} />
      <Route path="/login" component={LoginPage} />
      
      {/* Client Dashboard & Pages */}
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/my-policies" component={MyPoliciesPage} />
      <Route path="/my-requests" component={MyRequestsPage} />
      
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
      <Route path="/smart-assistant" component={SmartAssistantPage} />
      
      {/* Internal Compliance Sub-modules */}
      <Route path="/internal-compliance/ropa" component={RopaManagementPage} />
      <Route path="/internal-compliance/dsar" component={DsarManagementPage} />
      <Route path="/internal-compliance/dpia" component={DpiaManagementPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { showBanner, acceptConsent, rejectConsent } = useConsent();
  const [location, navigate] = useLocation();
  
  // Load CMP settings
  const { data: cmpSettings } = useQuery<{
    bannerTitle: string;
    bannerDescription: string;
    privacyPolicyUrl: string;
    termsUrl: string;
  }>({
    queryKey: ["/api/cmp/settings"],
  });
  
  // Check if user is logged in
  const isLoggedIn = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "undefined" && userStr !== "null") {
        const user = JSON.parse(userStr);
        return !!user.id;
      }
    } catch (e) {
      return false;
    }
    return false;
  };

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
            <header className="flex items-center justify-between px-4 py-2 border-b gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              
              <div className="flex items-center gap-2">
                {!isLoggedIn() ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/login")}
                      data-testid="button-header-login"
                    >
                      <LogIn className="w-4 h-4 ml-2" />
                      تسجيل الدخول
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => navigate("/signup")}
                      data-testid="button-header-signup"
                    >
                      <UserPlus className="w-4 h-4 ml-2" />
                      إنشاء حساب
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    data-testid="button-header-dashboard"
                  >
                    لوحة التحكم
                  </Button>
                )}
              </div>
            </header>
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
        </div>
        
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
      </SidebarProvider>
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
