import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Pill,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  Truck,
  FileBox,
  FileText,
  UserCog,
  BarChart3,
  ChevronLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCurrentUser } from "../api/auth";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: ("admin" | "pharmacist" | "cashier")[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Medicines", to: "/medicines", icon: Pill },
  { label: "Batches & Expiry", to: "/batches", icon: Package },
  { label: "New Sale", to: "/new-sale", icon: ShoppingCart },
  { label: "Sales History", to: "/sales", icon: ClipboardList },
  { label: "Customers", to: "/customers", icon: Users },
  { label: "Suppliers", to: "/suppliers", icon: Truck, roles: ["admin", "pharmacist"] },
  { label: "Purchase Orders", to: "/purchase-orders", icon: FileBox, roles: ["admin", "pharmacist"] },
  { label: "Prescriptions", to: "/prescriptions", icon: FileText, roles: ["admin", "pharmacist"] },
  { label: "Employees", to: "/employees", icon: UserCog, roles: ["admin"] },
  { label: "Reports", to: "/reports", icon: BarChart3 },
];

export interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({
  isCollapsed: controlledCollapsed,
  onToggle,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const { data: user } = useCurrentUser();
  const role = user?.role || "admin";

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside
      className="fixed top-0 left-0 h-screen flex flex-col z-30 bg-white/90 backdrop-blur-xl border-r border-border transition-[width] duration-200 ease-out shadow-[0_0_15px_rgba(8,126,120,0.03)]"
      style={{
        width: isCollapsed
          ? "var(--sidebar-width-collapsed, 72px)"
          : "var(--sidebar-width-expanded, 250px)",
      }}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/80 h-16 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/logo.png"
            alt="MediDeck Logo"
            className="h-9 w-9 object-contain rounded-lg shrink-0"
          />
          <div
            className={`text-lg font-bold tracking-tight select-none flex items-center transition-opacity duration-200 ${
              isCollapsed ? "sr-only" : "opacity-100"
            }`}
          >
            <span className="text-primary font-bold">Medi</span>
            <span className="text-secondary ml-0.5 font-bold">Deck</span>
          </div>
        </div>

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-mint/60 transition-colors shrink-0 cursor-pointer"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-200 ${
              isCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 pt-3 space-y-1">
        <ul className="space-y-1">
          {visibleNavItems.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                title={isCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-all ${
                    isCollapsed ? "justify-center px-0" : ""
                  } ${
                    isActive
                      ? "bg-primary text-white shadow-sm shadow-primary/25 font-semibold"
                      : "text-text-muted hover:bg-mint/50 hover:text-primary"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span
                  className={`whitespace-nowrap transition-all duration-200 ${
                    isCollapsed ? "sr-only" : "opacity-100"
                  }`}
                >
                  {label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
