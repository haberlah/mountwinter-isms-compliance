import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton } from "@/components/loading-skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "wouter";
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  Calendar,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import type { DashboardStats } from "@shared/schema";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !stats) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium text-destructive">Failed to load dashboard</p>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </CardContent>
      </Card>
    );
  }

  const categoryChartData = stats.categoryBreakdown.map((cat) => ({
    name: cat.categoryName.replace(/\s*\(.*\)/, "").substring(0, 15),
    fullName: cat.categoryName,
    passed: cat.passed,
    failed: cat.failed,
    notTested: cat.notTested,
    total: cat.total,
  }));

  const pieData = [
    { name: "Passed", value: stats.passedControls, color: "#10b981" },
    { name: "Failed", value: stats.failedControls, color: "#ef4444" },
    { name: "Not Tested", value: stats.notTestedControls, color: "#94a3b8" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Dashboard</h1>
        <p className="text-muted-foreground">
          ISO 27001:2022 compliance overview and status
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Controls</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalControls}</div>
            <p className="text-xs text-muted-foreground">
              {stats.applicableControls} applicable to your organisation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.compliancePercentage.toFixed(1)}%
            </div>
            <Progress 
              value={stats.compliancePercentage} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Passed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passedControls}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.applicableControls} applicable controls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.failedControls}
            </div>
            <p className="text-xs text-muted-foreground">
              controls currently failing
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compliance by Category</CardTitle>
            <CardDescription>Control status breakdown per category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100} 
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                  />
                  <Bar dataKey="passed" stackId="a" fill="#10b981" name="Passed" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
                  <Bar dataKey="notTested" stackId="a" fill="#94a3b8" name="Not Tested" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overall Status</CardTitle>
            <CardDescription>Distribution of control test results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No test data available yet</p>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-muted-foreground">Passed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm text-muted-foreground">Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-slate-400" />
                <span className="text-sm text-muted-foreground">Not Tested</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Upcoming Tests</CardTitle>
              <CardDescription>Controls due for testing soon</CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.upcomingTests.length > 0 ? (
              <div className="space-y-4">
                {stats.upcomingTests.slice(0, 5).map((test) => (
                  <Link 
                    key={test.controlNumber} 
                    href={`/controls/${test.controlNumber}`}
                    className="flex items-center justify-between p-3 rounded-md hover-elevate bg-muted/50"
                    data-testid={`link-upcoming-${test.controlNumber}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-14 items-center justify-center rounded bg-primary/10 text-primary text-sm font-mono font-medium">
                        {test.controlNumber}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{test.controlName}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {format(new Date(test.nextDueDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.daysUntilDue <= 7 ? (
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                          {test.daysUntilDue} days
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {test.daysUntilDue} days
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No upcoming tests scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Recent Test Results</CardTitle>
              <CardDescription>Latest control assessments</CardDescription>
            </div>
            <Link href="/test-runs">
              <Button variant="ghost" size="sm" data-testid="button-view-all-tests">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentTestRuns && stats.recentTestRuns.length > 0 ? (
              <div className="space-y-4">
                {stats.recentTestRuns.slice(0, 5).map((run) => (
                  <div 
                    key={run.id} 
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-14 items-center justify-center rounded bg-primary/10 text-primary text-sm font-mono font-medium">
                        {run.organisationControl?.control?.controlNumber || "N/A"}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">
                          {run.organisationControl?.control?.name || "Unknown Control"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(run.testDate), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={run.status} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No test results yet</p>
                <Link href="/controls">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-start-testing">
                    Start Testing
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
