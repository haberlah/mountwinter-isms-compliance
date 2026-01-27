import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  CheckCircle, 
  XCircle, 
  Download, 
  RefreshCw,
  Database,
  Key,
  Calendar,
  BarChart3
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SettingsData {
  ai: {
    configured: boolean;
    message: string;
    model: string;
  };
  defaults: {
    frequency: string;
    startQuarter: string;
  };
  statistics: {
    totalControls: number;
    totalCategories: number;
    testedControls: number;
    passedControls: number;
    failedControls: number;
  };
}

interface TestApiResponse {
  success: boolean;
  message: string;
  model?: string;
}

export default function Settings() {
  const { toast } = useToast();

  const { data: settings, isLoading, error } = useQuery<SettingsData>({
    queryKey: ["/api/settings"],
  });

  const testApiMutation = useMutation<TestApiResponse>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/test-api");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: `Connected to ${data.model}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Error",
        description: error.message || "Failed to test API connection",
        variant: "destructive",
      });
    },
  });

  const handleExportTestHistory = () => {
    window.open("/api/export/test-history", "_blank");
    toast({
      title: "Export Started",
      description: "Test history CSV is being downloaded",
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-destructive">
                <XCircle className="h-5 w-5" />
                <p>Failed to load settings. Please try refreshing the page.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-2xl font-semibold" data-testid="heading-settings">Settings</h1>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-muted-foreground">Application configuration and data management</span>
        </div>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Manage your Anthropic AI integration for questionnaire generation and analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-md border">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${settings.ai.configured ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                  {settings.ai.configured ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium" data-testid="text-api-status">
                    {settings.ai.configured ? "API Key Configured" : "API Key Not Configured"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings.ai.configured ? `Model: ${settings.ai.model}` : settings.ai.message}
                  </p>
                </div>
              </div>
              <Badge variant={settings.ai.configured ? "default" : "destructive"}>
                {settings.ai.configured ? "Active" : "Inactive"}
              </Badge>
            </div>

            {!settings.ai.configured && (
              <div className="p-4 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> Set <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-xs">ANTHROPIC_API_KEY</code> in Replit Secrets to enable AI features.
                </p>
              </div>
            )}

            <Button 
              onClick={() => testApiMutation.mutate()}
              disabled={testApiMutation.isPending || !settings.ai.configured}
              data-testid="button-test-api"
            >
              {testApiMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Control Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Control Defaults
            </CardTitle>
            <CardDescription>
              Default settings applied to new controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md border">
                <p className="text-sm text-muted-foreground">Default Frequency</p>
                <p className="text-lg font-medium" data-testid="text-default-frequency">{settings.defaults.frequency}</p>
              </div>
              <div className="p-4 rounded-md border">
                <p className="text-sm text-muted-foreground">Default Start Quarter</p>
                <p className="text-lg font-medium" data-testid="text-default-quarter">{settings.defaults.startQuarter}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Export and manage your compliance data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-md border">
              <div>
                <p className="font-medium">Export Test History</p>
                <p className="text-sm text-muted-foreground">Download all test results as a CSV file</p>
              </div>
              <Button onClick={handleExportTestHistory} variant="outline" data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistics Summary
            </CardTitle>
            <CardDescription>
              Overview of your compliance tracking data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold" data-testid="text-stat-total-controls">{settings.statistics.totalControls}</p>
                <p className="text-sm text-muted-foreground">Total Controls</p>
              </div>
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold" data-testid="text-stat-categories">{settings.statistics.totalCategories}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold" data-testid="text-stat-tested">{settings.statistics.testedControls}</p>
                <p className="text-sm text-muted-foreground">Tested</p>
              </div>
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-stat-passed">{settings.statistics.passedControls}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-stat-failed">{settings.statistics.failedControls}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
