import { Search, LogOut, UserCircle, PanelLeftOpen, PanelLeftClose } from "lucide-react";
import { useCurrentUser, useLogout } from "../api/auth";

interface TopBarProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function TopBar({
  isSidebarCollapsed,
  onToggleSidebar,
}: TopBarProps) {
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const roleBadgeStyle = (role?: string) => {
    switch (role) {
      case "admin":
        return "bg-primary text-white border-primary";
      case "pharmacist":
        return "bg-mint text-primary border-primary/25 font-semibold";
      case "cashier":
        return "bg-blue-tint text-blue border-blue/25 font-semibold";
      default:
        return "bg-bg text-text-muted border-border";
    }
  };

  return (
    <header className="glass-header sticky top-0 z-20 flex items-center justify-between px-6 h-16 shrink-0 transition-colors">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-2 rounded-[var(--radius-control)] text-text-muted hover:text-primary hover:bg-white/70 transition-colors lg:hidden cursor-pointer"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Global search */}
        <div className="relative w-72 sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search…"
            className="w-full rounded-[var(--radius-control)] border border-white/80 bg-white/50 focus:bg-white py-1.5 pl-9 pr-3 text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-xs"
          />
        </div>
      </div>

      {/* User profile & Logout */}
      <div className="flex items-center gap-3.5">
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-white/60 border border-white/80 backdrop-blur-sm shadow-xs">
            <UserCircle className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold text-text text-xs tracking-tight">{user.username}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${roleBadgeStyle(
                user.role
              )}`}
            >
              {user.role}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-control)] text-xs font-medium text-text-muted hover:text-red hover:bg-red-tint/70 border border-white/80 hover:border-red/20 transition-all cursor-pointer bg-white/50 shadow-xs"
          title="Sign out of MediDeck"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
