import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean | null;
  trendLabel?: string;
  icon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
}

export default function KpiCard({
  label,
  value,
  trend,
  trendUp,
  trendLabel = "vs LW",
  icon: Icon,
  className,
  children,
}: KpiCardProps) {
  return (
    <div className={cn("bg-surface-low border border-border rounded-lg p-4 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-widest text-on-surface-variant uppercase leading-tight">{label}</span>
        {Icon && <Icon size={14} className="text-on-surface-variant flex-shrink-0" />}
      </div>

      <span className="text-2xl font-bold text-on-surface leading-none font-mono">{value}</span>

      {trend && (
        <span
          className={cn(
            "text-xs font-medium flex items-center gap-0.5 whitespace-nowrap",
            trendUp === true ? "text-success" : trendUp === false ? "text-danger" : "text-on-surface-variant"
          )}
        >
          {trendUp === true ? "↑" : trendUp === false ? "↓" : "—"} {trend} {trendLabel}
        </span>
      )}

      {children}
    </div>
  );
}
