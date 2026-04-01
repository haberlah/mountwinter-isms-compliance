import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Controls from "@/pages/controls";
import ControlDetail from "@/pages/control-detail";
import RecordTest from "@/pages/record-test";
import Settings from "@/pages/settings";
import Documents from "@/pages/documents";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/controls" component={Controls} />
      <Route path="/controls/:controlNumber" component={ControlDetail} />
      <Route path="/controls/:controlNumber/test" component={RecordTest} />
      <Route path="/documents" component={Documents} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function PageTitle() {
  const [location] = useLocation();
  
  const titles: Record<string, string> = {
    "/": "Dashboard",
    "/controls": "Controls",
    "/documents": "Documents",
    "/settings": "Settings",
  };
  
  let title = titles[location];
  if (!title) {
    if (location.startsWith("/controls/") && location.endsWith("/test")) {
      title = "Record Test";
    } else if (location.startsWith("/controls/")) {
      title = "Control Detail";
    } else {
      title = "Page Not Found";
    }
  }
  
  return (
    <h1 className="text-lg font-semibold tracking-tight" data-testid="text-page-title">
      {title}
    </h1>
  );
}

function LandingPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-6 max-w-md text-center p-8">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-landing-title">
            ISMS Compliance Tracker
          </h1>
          <p className="text-muted-foreground" data-testid="text-landing-description">
            ISO 27001:2022 compliance management with AI-powered assessments. Sign in to access your organisation's controls and test history.
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => { window.location.href = "/api/login"; }}
          data-testid="button-login"
        >
          Sign in with Replit
        </Button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground" data-testid="text-loading">Loading...</p>
      </div>
    </div>
  );
}

function NoOrgScreen() {
  const { logout } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-6 max-w-md text-center p-8">
        <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-destructive/10">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-no-org-title">
            No Organisation Found
          </h1>
          <p className="text-muted-foreground" data-testid="text-no-org-description">
            Your account is not linked to any organisation. Please contact your administrator to get access, or sign in with a different account.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => logout()}
          data-testid="button-logout-no-org"
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const style = {
    "--sidebar-width": "256px",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-background shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <PageTitle />
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-background">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  if (!user?.organisationId) {
    return <NoOrgScreen />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
