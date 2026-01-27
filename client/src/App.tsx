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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/controls" component={Controls} />
      <Route path="/controls/:controlNumber" component={ControlDetail} />
      <Route path="/controls/:controlNumber/test" component={RecordTest} />
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

function App() {
  const style = {
    "--sidebar-width": "256px",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
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
              <main className="flex-1 overflow-y-auto p-6 bg-background">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
