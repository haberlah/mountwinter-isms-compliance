import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle, Clock, MinusCircle, TrendingUp } from "lucide-react";

type TestStatus = "Pass" | "PassPrevious" | "Fail" | "Blocked" | "NotAttempted" | "ContinualImprovement";

interface StatusBadgeProps {
  status: TestStatus | null | undefined;
  size?: "sm" | "default";
  showIcon?: boolean;
}

const statusConfig: Record<TestStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  Pass: {
    label: "Pass",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle,
  },
  PassPrevious: {
    label: "Pass (Previous)",
    className: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800",
    icon: CheckCircle,
  },
  Fail: {
    label: "Fail",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    icon: XCircle,
  },
  Blocked: {
    label: "Blocked",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    icon: AlertCircle,
  },
  NotAttempted: {
    label: "Not Tested",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700",
    icon: Clock,
  },
  ContinualImprovement: {
    label: "Continual Improvement",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    icon: TrendingUp,
  },
};

export function StatusBadge({ status, size = "default", showIcon = true }: StatusBadgeProps) {
  if (!status) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-medium border",
          statusConfig.NotAttempted.className,
          size === "sm" && "text-xs px-2 py-0.5"
        )}
      >
        {showIcon && <Clock className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
        Not Tested
      </Badge>
    );
  }

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        config.className,
        size === "sm" && "text-xs px-2 py-0.5"
      )}
    >
      {showIcon && <Icon className={cn("mr-1", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />}
      {config.label}
    </Badge>
  );
}

interface ApplicabilityBadgeProps {
  isApplicable: boolean;
  size?: "sm" | "default";
}

export function ApplicabilityBadge({ isApplicable, size = "default" }: ApplicabilityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        isApplicable
          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
          : "bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-500 border-slate-200 dark:border-slate-700",
        size === "sm" && "text-xs px-2 py-0.5"
      )}
    >
      {isApplicable ? "Applicable" : "Not Applicable"}
    </Badge>
  );
}

interface FrequencyBadgeProps {
  frequency: "Annual" | "Quarterly" | "Monthly" | null | undefined;
  size?: "sm" | "default";
}

export function FrequencyBadge({ frequency, size = "default" }: FrequencyBadgeProps) {
  const colors: Record<string, string> = {
    Annual: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    Quarterly: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
    Monthly: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        frequency ? colors[frequency] : colors.Annual,
        size === "sm" && "text-xs px-2 py-0.5"
      )}
    >
      {frequency || "Annual"}
    </Badge>
  );
}
