import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  Calendar,
  ClipboardList,
  Activity
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DashboardStats } from "@shared/schema";

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  subtitle?: string;
  icon: typeof CheckCircle; 
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceGauge({ percentage, passedCount, applicableCount }: { 
  percentage: number; 
  passedCount: number; 
  applicableCount: number;
}) {
  const color = percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";
  const data = [{ name: "Compliance", value: percentage, fill: color }];
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Compliance Status
        </CardTitle>
        <CardDescription>Percentage of applicable controls passed</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="70%" 
              outerRadius="90%" 
              barSize={12} 
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background={{ fill: "hsl(var(--muted))" }}
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="text-4xl font-bold" 
              style={{ color }}
              data-testid="text-compliance-percentage"
            >
              {percentage.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground">compliant</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2" data-testid="text-compliance-summary">
          {passedCount} of {applicableCount} applicable controls passed
        </p>
      </CardContent>
    </Card>
  );
}

function QuestionnaireProgress({ progress }: { 
  progress: DashboardStats["questionnaireProgress"];
}) {
  const { totalQuestions, answeredQuestions, percentage, controlsComplete, controlsPartial, controlsNotStarted } = progress;
  const color = percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#3b82f6";
  const data = [{ name: "Answered", value: percentage, fill: color }];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Questionnaire Progress
        </CardTitle>
        <CardDescription>Assessment questionnaire completion</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="70%" 
              outerRadius="90%" 
              barSize={12} 
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background={{ fill: "hsl(var(--muted))" }}
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span 
              className="text-4xl font-bold" 
              style={{ color }}
              data-testid="text-questionnaire-percentage"
            >
              {percentage.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground">complete</span>
          </div>
        </div>
        <p className="text-sm font-medium mt-2" data-testid="text-controls-summary">
          Controls: <span className="text-green-600 dark:text-green-400" data-testid="text-controls-complete">{controlsComplete}</span> complete
          <span className="text-muted-foreground mx-1">•</span>
          <span className="text-amber-600 dark:text-amber-400" data-testid="text-controls-partial">{controlsPartial}</span> partial
          <span className="text-muted-foreground mx-1">•</span>
          <span className="text-zinc-500" data-testid="text-controls-not-started">{controlsNotStarted}</span> not started
        </p>
        <p className="text-xs text-muted-foreground mt-1" data-testid="text-questionnaire-summary">
          Question coverage: {answeredQuestions} / {totalQuestions} answered
        </p>
      </CardContent>
    </Card>
  );
}

function DueSoonList({ dueSoon }: { dueSoon: DashboardStats["dueSoon"] }) {
  const [, navigate] = useLocation();

  const getUrgencyStyle = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    if (daysUntilDue <= 7) return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    return "";
  };

  const getDaysLabel = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
    if (daysUntilDue === 0) return "Due today";
    if (daysUntilDue === 1) return "Due tomorrow";
    return `${daysUntilDue} days`;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Due Soon
        </CardTitle>
        <CardDescription>Controls due in the next 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        {dueSoon.length > 0 ? (
          <div className="space-y-2">
            {dueSoon.map((item) => (
              <div
                key={item.controlNumber}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover-elevate ${getUrgencyStyle(item.daysUntilDue)}`}
                onClick={() => navigate(`/controls/${item.controlNumber}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/controls/${item.controlNumber}`);
                  }
                }}
                tabIndex={0}
                role="link"
                data-testid={`row-due-${item.controlNumber}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.controlNumber}</span>
                    <span className="text-sm truncate">{item.controlName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Due: {format(new Date(item.dueDate), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge 
                  variant={item.daysUntilDue < 0 ? "destructive" : item.daysUntilDue <= 7 ? "secondary" : "outline"}
                  className="shrink-0"
                >
                  {getDaysLabel(item.daysUntilDue)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No controls due in the next 30 days</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivityList({ activity }: { activity: DashboardStats["recentActivity"] }) {
  const [, navigate] = useLocation();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pass":
      case "PassPrevious":
      case "ContinualImprovement":
        return <Badge variant="default">Passed</Badge>;
      case "Fail":
        return <Badge variant="destructive">Failed</Badge>;
      case "Blocked":
        return <Badge variant="secondary">Blocked</Badge>;
      default:
        return <Badge variant="outline">Not Tested</Badge>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest control assessments</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length > 0 ? (
          <div className="space-y-2">
            {activity.map((item, index) => (
              <div
                key={`${item.controlNumber}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover-elevate"
                onClick={() => navigate(`/controls/${item.controlNumber}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/controls/${item.controlNumber}`);
                  }
                }}
                tabIndex={0}
                role="link"
                data-testid={`row-activity-${item.controlNumber}-${index}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{item.controlNumber}</span>
                    <span className="text-sm truncate">{item.controlName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(item.testDate), { addSuffix: true })}
                    {item.testerName && ` by ${item.testerName}`}
                  </p>
                </div>
                {getStatusBadge(item.status)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No tests recorded yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryBreakdownChart({ breakdown }: { breakdown: DashboardStats["categoryBreakdown"] }) {
  const data = breakdown.map(cat => ({
    name: cat.categoryName.replace("Controls", "").trim(),
    Passed: cat.passed,
    Failed: cat.failed,
    "Not Tested": cat.notTested,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
        <CardDescription>Control status by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Legend />
              <Bar dataKey="Passed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Failed" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Not Tested" stackId="a" fill="#a1a1aa" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold" data-testid="heading-dashboard">Dashboard</h1>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">ISMS Compliance Overview</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold" data-testid="heading-dashboard">Dashboard</h1>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">ISMS Compliance Overview</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Failed to load dashboard</p>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold" data-testid="heading-dashboard">Dashboard</h1>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-muted-foreground">ISMS Compliance Overview</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Controls"
            value={data.totalControls}
            subtitle={`${data.applicableControls} applicable`}
            icon={AlertCircle}
            color="bg-blue-600"
          />
          <StatCard
            title="Passed"
            value={data.passedControls}
            icon={CheckCircle}
            color="bg-green-600"
          />
          <StatCard
            title="Failed"
            value={data.failedControls}
            icon={XCircle}
            color="bg-red-600"
          />
          <StatCard
            title="Not Tested"
            value={data.notTestedControls}
            icon={Clock}
            color="bg-zinc-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ComplianceGauge
            percentage={data.compliancePercentage}
            passedCount={data.passedControls}
            applicableCount={data.applicableControls}
          />
          <QuestionnaireProgress progress={data.questionnaireProgress} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DueSoonList dueSoon={data.dueSoon} />
          <RecentActivityList activity={data.recentActivity} />
        </div>

        <CategoryBreakdownChart breakdown={data.categoryBreakdown} />
      </div>
    </div>
  );
}
