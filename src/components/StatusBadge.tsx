import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

type StatusLevel = "low" | "medium" | "high";
type ClaimStatus = "full" | "partial" | "none" | "pending" | "approved" | "rejected";

export const WaterStatusBadge = ({ level }: { level: StatusLevel }) => {
  const config = {
    low: { label: "Low", icon: CheckCircle2, className: "bg-success/10 text-success" },
    medium: { label: "Medium", icon: AlertTriangle, className: "bg-warning/10 text-warning" },
    high: { label: "High", icon: XCircle, className: "bg-destructive/10 text-destructive" },
  }[level];

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${config.className}`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  );
};

export const ClaimBadge = ({ status }: { status: ClaimStatus }) => {
  const config: Record<ClaimStatus, { label: string; className: string }> = {
    full: { label: "Full Claim", className: "bg-success/10 text-success" },
    partial: { label: "Partial Claim", className: "bg-warning/10 text-warning" },
    none: { label: "No Claim", className: "bg-muted text-muted-foreground" },
    pending: { label: "Pending", className: "bg-secondary/10 text-secondary" },
    approved: { label: "Approved", className: "bg-success/10 text-success" },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive" },
  };

  const c = config[status];
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${c.className}`}>
      {c.label}
    </span>
  );
};
