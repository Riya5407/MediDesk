interface StatusBadgeProps {
  status: "in_stock" | "low_stock" | "out_of_stock" | "expired" | "expiring_soon" | "Delivered" | "Pending" | "Cancelled" | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let badgeClass = "bg-sage text-primary border border-sage-accent/30";
  let label = status.replace(/_/g, " ");

  if (status === "in_stock" || status === "Delivered") {
    badgeClass = "bg-sage text-primary border border-sage-accent/30 font-medium";
    label = status === "in_stock" ? "In Stock" : "Delivered";
  } else if (status === "low_stock" || status === "expiring_soon" || status === "Pending") {
    badgeClass = "bg-amber-tint text-amber-800 border border-amber/30 font-medium";
    label =
      status === "low_stock"
        ? "Low Stock"
        : status === "expiring_soon"
        ? "Expiring Soon"
        : "Pending";
  } else if (status === "expired" || status === "out_of_stock") {
    badgeClass = "bg-coral-tint text-coral border border-coral/30 font-medium";
    label = status === "expired" ? "Expired" : "Out of Stock";
  } else if (status === "Cancelled") {
    badgeClass = "bg-ivory-subtle border border-border text-text-muted font-medium";
    label = "Cancelled";
  } else {
    badgeClass = "bg-ivory border border-border text-text-muted font-medium";
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs capitalize tracking-wide shadow-2xs ${badgeClass}`}
    >
      {label}
    </span>
  );
}

