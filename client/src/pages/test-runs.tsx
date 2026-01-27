import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TestRunsSkeleton } from "@/components/loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { 
  ClipboardCheck, 
  Calendar, 
  AlertTriangle,
  ArrowRight,
  FileText,
  Brain
} from "lucide-react";
import type { TestRunWithDetails } from "@shared/schema";
import { format } from "date-fns";

export default function TestRuns() {
  const { data: testRuns, isLoading, error } = useQuery<TestRunWithDetails[]>({
    queryKey: ["/api/test-runs"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Results</h1>
          <p className="text-muted-foreground">
            Complete audit trail of all control assessments
          </p>
        </div>
        <TestRunsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Results</h1>
          <p className="text-muted-foreground">
            Complete audit trail of all control assessments
          </p>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Failed to load test results</p>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Test Results</h1>
        <p className="text-muted-foreground">
          Complete audit trail of all control assessments
        </p>
      </div>

      {testRuns && testRuns.length > 0 ? (
        <div className="space-y-3">
          {testRuns.map((run) => (
            <Card key={run.id} className="hover-elevate" data-testid={`card-test-run-${run.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-18 items-center justify-center rounded-md bg-primary/10 text-primary font-mono font-semibold text-sm shrink-0">
                      {run.organisationControl?.control?.controlNumber || "N/A"}
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium">
                        {run.organisationControl?.control?.name || "Unknown Control"}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(run.testDate), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                        {run.tester && (
                          <span>by {run.tester.name}</span>
                        )}
                      </div>
                      {run.comments && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                          {run.comments}
                        </p>
                      )}
                      {run.aiAnalysis && (
                        <div className="flex items-center gap-2 mt-2">
                          <Brain className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs text-muted-foreground">
                            AI analyzed ({run.aiConfidence ? `${(run.aiConfidence * 100).toFixed(0)}% confidence` : "reviewed"})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={run.status} />
                    <Link href={`/controls/${run.organisationControl?.control?.controlNumber}`}>
                      <Button variant="ghost" size="icon" data-testid={`button-view-control-${run.id}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardCheck className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-xl font-medium mb-2">No test results yet</p>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Start testing your security controls to build your compliance audit trail. 
              All test results are immutable and permanently recorded.
            </p>
            <Link href="/controls">
              <Button data-testid="button-start-testing">
                <FileText className="mr-2 h-4 w-4" />
                View Controls
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
