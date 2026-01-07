import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { ScanProvider } from "@/contexts/ScanContext";
import { LogIn, LogOut } from "lucide-react";
import { OTPModal } from "@/components/OTPModal";
import HomePage from "@/pages/HomePage";
import ScanResultsPage from "@/pages/ScanResultsPage";
import PrivacyGeneratorPage from "@/pages/PrivacyGeneratorPage";
import TermsGeneratorPage from "@/pages/TermsGeneratorPage";
import SmartAssistantPage from "@/pages/SmartAssistantPage";
// Old auth pages removed - OTP modal handles authentication now
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
import PrivacyPage from "@/pages/PrivacyPage";
import NotFound from "@/pages/not-found";
import { useEffect, useState } from "react";

// Check if user (client) is logged in (for UI display purposes only)
const isClientLoggedInLocal = (): boolean => {
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

// Check if client is logged in via server session (secure)
const useClientAuth = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  
  // Clear localStorage if server says not authenticated
  useEffect(() => {
    if (!isLoading && (error || !data)) {
      localStorage.removeItem("user");
    }
  }, [isLoading, error, data]);
  
  return { isAuthenticated: !!data && !error, isLoading, user: (data as any)?.user };
};

// Protected route wrapper for client pages (server-verified)
function ClientRoute({ component: Component }: { component: React.ComponentType }) {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useClientAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to home - OTP modal handles auth now
      navigate("/");
    }
  }, [isAuthenticated, isLoading, navigate]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Show redirecting message instead of blank screen
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري إعادة التوجيه...</p>
        </div>
      </div>
    );
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
  const { isAuthenticated } = useClientAuth();
  const { isAdmin } = useAdminAuth();
  
  // If a client (not admin) tries to access admin pages, redirect to home
  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      navigate("/");
    }
  }, [isAuthenticated, isAdmin, navigate]);
  
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
      
      {/* Auth pages - Redirect to home (OTP modal handles auth now) */}
      <Route path="/signup">
        <Redirect to="/" />
      </Route>
      <Route path="/login">
        <Redirect to="/" />
      </Route>
      
      {/* Client Dashboard - Redirect to home for MVP */}
      <Route path="/dashboard">
        <Redirect to="/" />
      </Route>
      <Route path="/my-policies">
        <Redirect to="/" />
      </Route>
      <Route path="/my-requests">
        <Redirect to="/" />
      </Route>
      
      {/* Main pages - Public */}
      <Route path="/" component={HomePage} />
      <Route path="/scans" component={HomePage} />
      <Route path="/scan/:id" component={ScanResultsPage} />
      
      {/* Policy Generator - Active (accessed from scan results) */}
      <Route path="/workspace" component={ComplianceWorkspacePage} />
      <Route path="/privacy-generator" component={PrivacyGeneratorPage} />
      <Route path="/terms-generator" component={TermsGeneratorPage} />
      
      {/* Other Tools - Redirect to home for MVP (Coming Soon) */}
      <Route path="/internal-compliance">
        <Redirect to="/" />
      </Route>
      <Route path="/smart-assistant">
        <Redirect to="/" />
      </Route>
      <Route path="/ropa">
        <Redirect to="/" />
      </Route>
      <Route path="/dsar">
        <Redirect to="/" />
      </Route>
      <Route path="/dpia">
        <Redirect to="/" />
      </Route>
      
      {/* Static Pages */}
      <Route path="/privacy" component={PrivacyPage} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location, navigate] = useLocation();
  
  // Check if user is logged in (for UI display - localStorage for quick response)
  const [isLoggedIn, setIsLoggedIn] = useState(isClientLoggedInLocal());
  const [showOTPModal, setShowOTPModal] = useState(false);
  
  useEffect(() => {
    const checkAuth = () => setIsLoggedIn(isClientLoggedInLocal());
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

  // Handle OTP success
  const handleOTPSuccess = () => {
    setIsLoggedIn(true);
  };
  
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
                {/* Sidebar trigger hidden for MVP launch - keep code for future */}
                {/* <SidebarTrigger 
                  data-testid="button-sidebar-toggle" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-md p-2.5 shrink-0"
                /> */}
                <div className="flex-1" /> {/* Spacer to push login button to the left */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {!isLoggedIn ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowOTPModal(true)}
                      data-testid="button-header-login"
                      className="text-sm"
                    >
                      <LogIn className="w-4 h-4 ml-1.5" />
                      <span className="hidden sm:inline">تسجيل الدخول</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await fetch("/api/auth/logout", { method: "POST" });
                          localStorage.removeItem("user");
                          setIsLoggedIn(false);
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                        } catch (e) {
                          console.error("Logout error:", e);
                        }
                      }}
                      data-testid="button-header-logout"
                      className="text-sm"
                    >
                      <LogOut className="w-4 h-4 ml-1.5" />
                      <span className="hidden sm:inline">تسجيل الخروج</span>
                    </Button>
                  )}
                </div>
              </header>
            )}
            <main className="flex-1 overflow-auto">
              <Router />
            </main>
          </div>
          {/* Sidebar hidden for MVP launch - keep code for future */}
          {/* {!isAdminPage && <AppSidebar />} */}
        </div>
        
        <Toaster />
        
        {/* Global OTP Modal */}
        <OTPModal
          open={showOTPModal}
          onOpenChange={setShowOTPModal}
          onSuccess={handleOTPSuccess}
        />
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
