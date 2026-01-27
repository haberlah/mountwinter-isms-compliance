import type { Severity } from "@shared/schema";

interface SeverityBadgeProps {
  severity: Severity;
}

const severityConfig: Record<Severity, { bg: string; text: string; border: string; dot: string }> = {
  Critical: {
    bg: "bg-red-100 dark:bg-red-950",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  High: {
    bg: "bg-orange-100 dark:bg-orange-950",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
  },
  Medium: {
    bg: "bg-yellow-100 dark:bg-yellow-950",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
    dot: "bg-yellow-500",
  },
  Low: {
    bg: "bg-green-100 dark:bg-green-950",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    dot: "bg-green-500",
  },
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const config = severityConfig[severity];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border
        ${config.bg} ${config.text} ${config.border}
      `}
      data-testid={`badge-severity-${severity.toLowerCase()}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {severity}
    </span>
  );
}
