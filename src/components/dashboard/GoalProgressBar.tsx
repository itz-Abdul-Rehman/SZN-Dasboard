import { cn } from "@/lib/utils";

type Status = "on-pace" | "at-risk" | "behind" | "stable";

interface GoalProgressBarProps {
  percentage: number;
  current: string;
  goal: string;
  label: string;
  status: Status;
}

const statusConfig: Record<Status, { bar: string; badge: string; label: string }> = {
  "on-pace": { bar: "bg-success", badge: "text-success", label: "On Pace" },
  "at-risk": { bar: "bg-warning", badge: "text-warning", label: "At Risk" },
  "behind": { bar: "bg-danger", badge: "text-danger", label: "Behind" },
  "stable": { bar: "bg-secondary", badge: "text-secondary", label: "Stable" },
};

export default function GoalProgressBar({ percentage, current, goal, label, status }: GoalProgressBarProps) {
  const cfg = statusConfig[status];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">{label}: <span className="text-on-surface">{current} / {goal}</span></span>
        <span className={cn("text-xs font-medium", cfg.badge)}>{cfg.label}</span>
      </div>
      <div className="h-1.5 bg-surface-high rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all", cfg.bar)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
