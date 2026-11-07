import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin } from "../api/auth";
import { Eye, EyeOff, Lock, User, AlertCircle, Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    try {
      await loginMutation.mutateAsync({
        username: username.trim(),
        password,
      });
      navigate("/", { replace: true });
    } catch (err: any) {
      setErrorMessage(err?.detail || "Invalid username or password.");
    }
  };

  const fillCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Warm ambient background lights */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-modal rounded-[var(--radius-card)] border border-border shadow-xl p-8 space-y-6 relative z-10 backdrop-blur-xl">
        {/* Header / Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-sage/70 border border-primary/20 shadow-2xs">
            <img
              src="/logo.png"
              alt="MediDeck Logo"
              className="h-12 w-12 object-contain"
            />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-text flex items-center justify-center">
              <span className="text-primary">Medi</span>
              <span className="text-secondary ml-0.5">Deck</span>
            </div>
            <p className="text-xs text-text-muted mt-1 uppercase tracking-wider font-medium">
              Pharmacy Management System
            </p>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-[var(--radius-control)] bg-coral-tint border border-coral/20 text-coral text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-9 pr-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-10 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-text-muted hover:text-text absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-2.5 px-4 bg-primary text-white rounded-[var(--radius-control)] text-sm font-semibold hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loginMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Demo Account Quick-Fill Buttons (Available only in local development) */}
        {import.meta.env.DEV && (
          <div className="pt-4 border-t border-border/60">
            <p className="text-[11px] text-text-muted text-center font-medium mb-2.5">
              Default Demo Accounts (Dev Only)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("admin", "Admin@123")}
                className="py-1.5 px-2 border border-border/80 rounded-lg text-[11px] text-text bg-white/70 hover:bg-sage/40 transition-colors text-center"
              >
                <div className="font-semibold text-primary">Admin</div>
                <div className="text-[10px] text-text-muted">Full Access</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("pharmacist", "Pharm@123")}
                className="py-1.5 px-2 border border-border/80 rounded-lg text-[11px] text-text bg-white/70 hover:bg-sage/40 transition-colors text-center"
              >
                <div className="font-semibold text-primary">Pharmacist</div>
                <div className="text-[10px] text-text-muted">Inventory</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("cashier", "Cashier@123")}
                className="py-1.5 px-2 border border-border/80 rounded-lg text-[11px] text-text bg-white/70 hover:bg-sage/40 transition-colors text-center"
              >
                <div className="font-semibold text-primary">Cashier</div>
                <div className="text-[10px] text-text-muted">POS Billing</div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}