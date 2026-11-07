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
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCurrentUser, useLogout } from "../api/auth";

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
  const logoutMutation = useLogout();
  const role = user?.role || "admin";

  const hasAccessibleReport = (r?: string) => {
    return r === "admin" || r === "cashier" || r === "pharmacist";
  };

  const visibleNavItems = navItems.filter((item) => {
    if (item.to === "/reports") {
      return hasAccessibleReport(role);
    }
    return !item.roles || item.roles.includes(role);
  });

  return (
    <aside
      className="glass-sidebar fixed top-0 left-0 h-screen flex flex-col z-30 transition-[width] duration-200 ease-out border-r border-border"
      style={{
        width: isCollapsed
          ? "var(--sidebar-width-collapsed, 72px)"
          : "var(--sidebar-width-expanded, 250px)",
      }}
    >
      {/* Brand Header */}
      <div
        className={`relative flex items-center border-b border-white/60 h-16 shrink-0 bg-white/15 transition-all ${
          isCollapsed ? "justify-center px-0" : "justify-between px-3.5"
        }`}
      >
        <div className={`flex items-center min-w-0 ${isCollapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="w-9 h-9 rounded-xl bg-white/90 border border-primary/15 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden relative">
            <img
              src="/logo.png"
              alt="MediDeck Logo"
              className="w-full h-full object-contain scale-[1.28] translate-y-[1px]"
            />
          </div>
          <div
            className={`select-none flex flex-col justify-center transition-opacity duration-200 ${
              isCollapsed ? "sr-only" : "opacity-100"
            }`}
          >
            <div className="text-[17px] font-bold tracking-tight leading-tight flex items-center">
              <span className="text-primary font-bold">Medi</span>
              <span className="text-secondary font-bold ml-0.5">Deck</span>
            </div>
            <span className="text-[9.5px] font-semibold uppercase tracking-wider text-text-muted/70 leading-none mt-0.5">
              Dispensary OS
            </span>
          </div>
        </div>

        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`text-text-muted hover:text-primary transition-colors shrink-0 cursor-pointer ${
            isCollapsed
              ? "absolute -right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-white/95 border border-border shadow-2xs hover:bg-white z-40"
              : "p-1.5 rounded-lg hover:bg-white/80"
          }`}
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
                      ? "bg-primary text-white shadow-xs shadow-primary/30 font-semibold"
                      : "text-text-muted hover:bg-white/80 hover:text-primary hover:shadow-2xs"
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

      {/* Anchored Profile & Logout Footer */}
      {user && (
        <div className="p-3 border-t border-white/60 bg-white/15 mt-auto shrink-0">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} gap-2`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-primary font-semibold text-xs border border-sage-accent/30 shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text truncate">{user.username}</p>
                  <p className="text-[10px] uppercase font-semibold text-primary tracking-wider">{user.role}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="p-1.5 rounded-lg text-text-muted hover:text-coral hover:bg-coral-tint transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
