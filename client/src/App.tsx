import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminLogs from "@/pages/admin-logs";
import Onboarding from "@/pages/onboarding";
import Dashboard from "@/pages/dashboard";
import Agent from "@/pages/agent";
import Products from "@/pages/products";
import ProductDrafts from "@/pages/product-drafts";
import Orders from "@/pages/orders";
import Conversations from "@/pages/conversations";
import ChatWeb from "@/pages/chatweb";
import { useEffect } from "react";

// Protected route wrapper
function ProtectedRoute({ component: Component, requireAuth = true, adminOnly = false }: any) {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (requireAuth) {
      const token = localStorage.getItem("auth_token");
      const userType = localStorage.getItem("user_type");
      
      if (!token) {
        setLocation(adminOnly ? "/admin/login" : "/");
        return;
      }
      
      if (adminOnly && userType !== "admin") {
        setLocation("/");
        return;
      }
      
      if (!adminOnly && userType !== "user") {
        setLocation("/admin/login");
        return;
      }
    }
  }, [requireAuth, adminOnly, setLocation]);
  
  return <Component />;
}

// Layout wrapper for authenticated pages
function AuthenticatedLayout({ children, isAdmin = false }: { children: React.ReactNode; isAdmin?: boolean }) {
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/chat/:companyId" component={ChatWeb} />
      
      {/* User Protected Routes */}
      <Route path="/dashboard">
        {() => (
          <ProtectedRoute
            component={() => (
              <AuthenticatedLayout>
                <Dashboard />
              </AuthenticatedLayout>
            )}
          />
        )}
      </Route>
      
      <Route path="/agent">
        {() => (
          <ProtectedRoute
            component={() => (
              <AuthenticatedLayout>
                <Agent />
              </AuthenticatedLayout>
            )}
          />
        )}
      </Route>
      
      <Route path="/products">
        {() => (
          <ProtectedRoute
            component={() => (
              <AuthenticatedLayout>
                <Products />
              </AuthenticatedLayout>
            )}
          />
        )}
      </Route>
      
      <Route path="/product-drafts">
        {() => (
          <ProtectedRoute
            component={() => (
              <AuthenticatedLayout>
                <ProductDrafts />
              </AuthenticatedLayout>
            )}
          />
        )}
      </Route>
      
      <Route path="/orders">
        {() => (
          <ProtectedRoute
            component={() => (
              <AuthenticatedLayout>
                <Orders />
              </AuthenticatedLayout>
            )}
          />
        )}
      </Route>
      
      <Route path="/conversations">
        {() => (
          <ProtectedRoute
            component={() => (
              <AuthenticatedLayout>
                <Conversations />
              </AuthenticatedLayout>
            )}
          />
        )}
      </Route>
      
      {/* Admin Protected Routes */}
      <Route path="/admin/dashboard">
        {() => (
          <ProtectedRoute
            component={() => (
              <AuthenticatedLayout isAdmin>
                <AdminDashboard />
              </AuthenticatedLayout>
            )}
            adminOnly
          />
        )}
      </Route>
      
      <Route path="/admin/logs">
        {() => (
          <ProtectedRoute
            component={() => (
              <AuthenticatedLayout isAdmin>
                <AdminLogs />
              </AuthenticatedLayout>
            )}
            adminOnly
          />
        )}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
