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
import { ScanProvider } from "@/contexts/ScanContext";
import { LogIn, UserPlus } from "lucide-react";
import HomePage from "@/pages/HomePage";
import ScanResultsPage from "@/pages/ScanResultsPage";
import PrivacyGeneratorPage from "@/pages/PrivacyGeneratorPage";
import TermsGeneratorPage from "@/pages/TermsGeneratorPage";
import ConsentManagementPage from "@/pages/ConsentManagementPage";
import PreferencesCenterPage from "@/pages/PreferencesCenterPage";
import SmartAssistantPage from "@/pages/SmartAssistantPage";
import SignUpPage from "@/pages/SignUpPage";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import MyPoliciesPage from "@/pages/MyPoliciesPage";
import MyRequestsPage from "@/pages/MyRequestsPage";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminRequestsPage from "@/pages/admin/AdminRequestsPage";
import AdminPoliciesPage from "@/pages/admin/AdminPoliciesPage";
import AdminAuditLogsPage from "@/pages/admin/AdminAuditLogsPage";
import AdminManagementPage from "@/pages/admin/AdminManagementPage";
import RopaPage from "@/pages/RopaPage";
import DsarPage from "@/pages/DsarPage";
import DpiaPage from "@/pages/DpiaPage";
import ComplianceWorkspacePage from "@/pages/ComplianceWorkspacePage";
import InternalComplianceWorkspacePage from "@/pages/InternalComplianceWorkspacePage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Admin Portal */}
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminDashboardPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/requests" component={AdminRequestsPage} />
      <Route path="/admin/policies" component={AdminPoliciesPage} />
      <Route path="/admin/audit-logs" component={AdminAuditLogsPage} />
      <Route path="/admin/admins" component={AdminManagementPage} />
      
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
      <Route path="/workspace" component={ComplianceWorkspacePage} />
      <Route path="/internal-compliance" component={InternalComplianceWorkspacePage} />
      <Route path="/privacy-generator" component={PrivacyGeneratorPage} />
      <Route path="/terms-generator" component={TermsGeneratorPage} />
      <Route path="/consent-management" component={ConsentManagementPage} />
      <Route path="/preferences-center" component={PreferencesCenterPage} />
      <Route path="/smart-assistant" component={SmartAssistantPage} />
      
      {/* Internal Compliance */}
      <Route path="/ropa" component={RopaPage} />
      <Route path="/dsar" component={DsarPage} />
      <Route path="/dpia" component={DpiaPage} />
      
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
      <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
        <div className="flex h-screen w-full" dir="rtl">
          <SidebarTrigger 
            data-testid="button-sidebar-toggle" 
            className="fixed top-3 z-[100]"
            style={{ right: '12px' }}
          />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-end px-4 py-2 border-b gap-4 pr-14">
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
              <div className="mx-auto max-w-7xl">
                <Router />
              </div>
            </main>
          </div>
          <AppSidebar />
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
      <ScanProvider>
        <AppContent />
      </ScanProvider>
    </QueryClientProvider>
  );
}

export default App;
