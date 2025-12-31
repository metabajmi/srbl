import { Switch, Route, useLocation, Redirect } from "wouter";
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
import { useEffect, useState } from "react";

// Check if user (client) is logged in
const isClientLoggedIn = (): boolean => {
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

// Check if admin is logged in (via session - we check the API)
const useAdminAuth = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/me"],
    retry: false,
  });
  return { isAdmin: !!data, isLoading };
};

// Protected route wrapper for client pages
function ClientRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const isLoggedIn = isClientLoggedIn();
  
  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [isLoggedIn, navigate]);
  
  if (!isLoggedIn) {
    return null;
  }
  
  return <Component />;
}

// Protected route wrapper for admin pages
function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const { isAdmin, isLoading } = useAdminAuth();
  
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/admin/login");
    }
  }, [isAdmin, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return null;
  }
  
  return <Component />;
}

// Redirect logged-in clients away from admin pages
function AdminGuard({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const isClient = isClientLoggedIn();
  const { isAdmin } = useAdminAuth();
  
  // If a client (not admin) tries to access admin pages, redirect to dashboard
  useEffect(() => {
    if (isClient && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isClient, isAdmin, navigate]);
  
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Admin Portal - Protected & Guarded */}
      <Route path="/admin/login">
        <AdminGuard>
          <AdminLoginPage />
        </AdminGuard>
      </Route>
      <Route path="/admin/dashboard">
        <AdminRoute component={AdminDashboardPage} />
      </Route>
      <Route path="/admin/users">
        <AdminRoute component={AdminUsersPage} />
      </Route>
      <Route path="/admin/requests">
        <AdminRoute component={AdminRequestsPage} />
      </Route>
      <Route path="/admin/policies">
        <AdminRoute component={AdminPoliciesPage} />
      </Route>
      <Route path="/admin/audit-logs">
        <AdminRoute component={AdminAuditLogsPage} />
      </Route>
      <Route path="/admin/admins">
        <AdminRoute component={AdminManagementPage} />
      </Route>
      
      {/* Auth pages */}
      <Route path="/signup" component={SignUpPage} />
      <Route path="/login" component={LoginPage} />
      
      {/* Client Dashboard & Pages - Protected */}
      <Route path="/dashboard">
        <ClientRoute component={DashboardPage} />
      </Route>
      <Route path="/my-policies">
        <ClientRoute component={MyPoliciesPage} />
      </Route>
      <Route path="/my-requests">
        <ClientRoute component={MyRequestsPage} />
      </Route>
      
      {/* Main pages - Public */}
      <Route path="/" component={HomePage} />
      <Route path="/scans" component={HomePage} />
      <Route path="/scan/:id" component={ScanResultsPage} />
      
      {/* Tools - Some protected, some public */}
      <Route path="/workspace" component={ComplianceWorkspacePage} />
      <Route path="/internal-compliance">
        <ClientRoute component={InternalComplianceWorkspacePage} />
      </Route>
      <Route path="/privacy-generator" component={PrivacyGeneratorPage} />
      <Route path="/terms-generator" component={TermsGeneratorPage} />
      <Route path="/consent-management" component={ConsentManagementPage} />
      <Route path="/preferences-center" component={PreferencesCenterPage} />
      <Route path="/smart-assistant" component={SmartAssistantPage} />
      
      {/* Internal Compliance - Protected */}
      <Route path="/ropa">
        <ClientRoute component={RopaPage} />
      </Route>
      <Route path="/dsar">
        <ClientRoute component={DsarPage} />
      </Route>
      <Route path="/dpia">
        <ClientRoute component={DpiaPage} />
      </Route>
      
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
  
  // Check if user is logged in (reactive)
  const [isLoggedIn, setIsLoggedIn] = useState(isClientLoggedIn());
  
  useEffect(() => {
    const checkAuth = () => setIsLoggedIn(isClientLoggedIn());
    // Check on mount and when storage changes
    checkAuth();
    window.addEventListener('storage', checkAuth);
    // Also check periodically for same-tab changes
    const interval = setInterval(checkAuth, 1000);
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);
  
  // Check if on admin pages
  const isAdminPage = location.startsWith("/admin");

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
        <div className="flex min-h-screen w-full" dir="rtl">
          <div className="flex flex-col flex-1 min-w-0">
            {/* Don't show main header on admin pages */}
            {!isAdminPage && (
              <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 gap-4">
                <SidebarTrigger 
                  data-testid="button-sidebar-toggle" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-md p-2.5 shrink-0"
                />
                <div className="flex items-center gap-2 sm:gap-3">
                  {!isLoggedIn ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/login")}
                        data-testid="button-header-login"
                        className="text-sm"
                      >
                        <LogIn className="w-4 h-4 ml-1.5" />
                        <span className="hidden sm:inline">تسجيل الدخول</span>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => navigate("/signup")}
                        data-testid="button-header-signup"
                        className="text-sm"
                      >
                        <UserPlus className="w-4 h-4 ml-1.5" />
                        <span className="hidden sm:inline">إنشاء حساب</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/dashboard")}
                      data-testid="button-header-dashboard"
                      className="text-sm"
                    >
                      لوحة التحكم
                    </Button>
                  )}
                </div>
              </header>
            )}
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
          {/* Don't show sidebar on admin pages */}
          {!isAdminPage && <AppSidebar />}
        </div>
        
        {/* Cookie Banner - not on admin pages */}
        {showBanner && !isAdminPage && (
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
