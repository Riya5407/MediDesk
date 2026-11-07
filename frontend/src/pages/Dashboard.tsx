import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useDashboardSummary,
  useSalesTrend,
  useStockAlerts,
  useCategoryStock,
} from "../api/dashboard";
import { useSales } from "../api/sales";
import { useCurrentUser } from "../api/auth";
import StatusBadge from "../components/StatusBadge";
import {
  ShoppingCart,
  Receipt,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Plus,
  Truck,
  ArrowUpRight,
  Sun,
  Moon,
  Sunset,
  Sparkles,
  Pill,
  IndianRupee,
  PackageMinus,
  CalendarClock,
  CalendarX,
} from "lucide-react";

// ── Category Color Palette (Warm Clinical Luxury) ───────────────────────────
const CATEGORY_COLORS = [
  "#096B65", // Deep teal
  "#1FA89B", // Soft silk teal
  "#7A9A8B", // Sage accent
  "#D97706", // Warm amber
  "#2A8296", // Muted clinical blue
  "#D45B4B", // Muted coral
  "#8FA89B", // Soft laurel
  "#6E7C7A", // Warm slate
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const [trendDays, setTrendDays] = useState(7);

  const { data: summary, isLoading: sumLoading, refetch: refetchSum } = useDashboardSummary();
  const { data: trend, isLoading: trendLoading } = useSalesTrend(trendDays);
  const canViewAlerts = user?.role === "admin" || user?.role === "pharmacist";
  const { data: alerts, isLoading: alertsLoading, isError: alertsError } = useStockAlerts(8, { enabled: canViewAlerts });
  const { data: categoryStock, isLoading: catLoading } = useCategoryStock();
  const { data: recentSales, isLoading: salesLoading } = useSales({ page: 1, page_size: 5 });

  // ── Contextual Greeting Calculation ───────────────────────────────────────
  const { greeting, GreetingIcon } = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: "Good morning", GreetingIcon: Sun };
    if (hour < 17) return { greeting: "Good afternoon", GreetingIcon: Sunset };
    return { greeting: "Good evening", GreetingIcon: Moon };
  }, []);

  const totalCategoryStockUnits = useMemo(() => {
    if (!categoryStock?.length) return 0;
    return categoryStock.reduce((acc, curr) => acc + (curr.total_stock || 0), 0);
  }, [categoryStock]);

  const fmtCurrency = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN");
  const fmtShortDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const role = user?.role || "cashier";
  const canManageInventory = ["admin", "pharmacist"].includes(role);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Section A: Welcome Header & Quick Actions ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-sage/60 text-primary">
              <GreetingIcon className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text mt-1">
            {greeting}, {user?.username ? user.username : "Staff"}
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-0.5">
            Pharmacy dispensary overview and real-time inventory metrics
          </p>
        </div>

        {/* Quick Actions Subject to Role */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => navigate("/new-sale")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[var(--radius-control)] bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-xs shadow-primary/25 transition-all cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" /> New Sale
          </button>

          {canManageInventory && (
            <>
              <button
                onClick={() => navigate("/medicines")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-control)] bg-white/80 hover:bg-white text-text border border-border text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-primary" /> Add Medicine
              </button>
              <button
                onClick={() => navigate("/purchase-orders")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-control)] bg-white/80 hover:bg-white text-text border border-border text-xs font-semibold shadow-2xs transition-all cursor-pointer hidden md:inline-flex"
              >
                <Truck className="w-3.5 h-3.5 text-secondary" /> Receive Order
              </button>
            </>
          )}

          <button
            onClick={() => refetchSum()}
            aria-label="Refresh dashboard metrics"
            className="p-2 rounded-[var(--radius-control)] bg-white/80 hover:bg-white text-text-muted hover:text-text border border-border shadow-2xs transition-all cursor-pointer"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Section B & C: Revenue Highlight & Operational KPIs ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        {/* Highlight Card: Today's Revenue (spans 4 columns on desktop) */}
        <div className="lg:col-span-4 glass-panel rounded-[var(--radius-card)] p-6 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-white/90 via-white/80 to-sage/30 border border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Today's Performance
            </span>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 text-primary border border-primary/20 shadow-2xs flex items-center justify-center">
              <IndianRupee className="w-5 h-5" strokeWidth={1.75} />
            </div>
          </div>

          <div className="my-4">
            <p className="text-xs font-medium text-text-muted">Total Gross Revenue</p>
            {sumLoading ? (
              <div className="h-10 w-36 bg-ivory-subtle animate-pulse rounded mt-2" />
            ) : (
              <p className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight mt-1">
                {summary ? fmtCurrency(summary.todays_sales) : "₹0.00"}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-text-muted">Invoiced receipts today:</span>
            <span className="font-bold text-text bg-white/90 px-2.5 py-0.5 rounded-full border border-border shadow-2xs">
              {sumLoading ? "…" : `${summary?.todays_bills ?? 0} bills`}
            </span>
          </div>
        </div>

        {/* 4 Operational KPI Cards (spans 8 columns on desktop) */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 1. Total Medicines */}
          <div className="glass-kpi glass-panel-interactive rounded-[var(--radius-card)] p-4.5 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 text-primary border border-primary/20 shadow-2xs flex items-center justify-center mb-3">
              <Pill className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Medicines</p>
              {sumLoading ? (
                <div className="h-7 w-16 bg-ivory-subtle animate-pulse rounded mt-1" />
              ) : (
                <p className="text-2xl font-bold text-text mt-0.5">{summary?.total_medicines ?? "—"}</p>
              )}
              <span className="text-[10px] text-text-muted mt-1 block">Active catalogue</span>
            </div>
          </div>

          {/* 2. Today's Bills */}
          <div className="glass-kpi glass-panel-interactive rounded-[var(--radius-card)] p-4.5 flex flex-col justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue/15 via-blue/10 to-blue/5 text-blue border border-blue/20 shadow-2xs flex items-center justify-center mb-3">
              <Receipt className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Bills Issued</p>
              {sumLoading ? (
                <div className="h-7 w-16 bg-ivory-subtle animate-pulse rounded mt-1" />
              ) : (
                <p className="text-2xl font-bold text-text mt-0.5">{summary?.todays_bills ?? "—"}</p>
              )}
              <span className="text-[10px] text-text-muted mt-1 block">Completed sales</span>
            </div>
          </div>

          {/* 3. Low Stock Alert */}
          <div className="glass-kpi glass-panel-interactive rounded-[var(--radius-card)] p-4.5 flex flex-col justify-between border-amber/30">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber/20 via-amber/10 to-amber/5 text-amber-800 border border-amber/30 shadow-2xs flex items-center justify-center mb-3">
              <PackageMinus className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Low Stock</p>
              {sumLoading ? (
                <div className="h-7 w-16 bg-amber-tint animate-pulse rounded mt-1" />
              ) : (
                <p className="text-2xl font-bold text-amber-800 mt-0.5">{summary?.low_stock_count ?? "—"}</p>
              )}
              <span className="text-[10px] text-amber-700/80 mt-1 block">Below threshold</span>
            </div>
          </div>

          {/* 4. Expiring / Expired Alert */}
          <div className="glass-kpi glass-panel-interactive rounded-[var(--radius-card)] p-4.5 flex flex-col justify-between border-coral/30">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral/20 via-coral/10 to-coral/5 text-coral border border-coral/30 shadow-2xs flex items-center justify-center mb-3">
              {(summary?.expired_count ?? 0) > 0 ? (
                <CalendarX className="w-5 h-5" strokeWidth={1.75} />
              ) : (
                <CalendarClock className="w-5 h-5" strokeWidth={1.75} />
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold text-coral uppercase tracking-wider">Expiry Alert</p>
              {sumLoading ? (
                <div className="h-7 w-16 bg-coral-tint animate-pulse rounded mt-1" />
              ) : (
                <p className="text-2xl font-bold text-coral mt-0.5">
                  {(summary?.expiring_soon_count ?? 0) + (summary?.expired_count ?? 0)}
                </p>
              )}
              <span className="text-[10px] text-coral/80 mt-1 block">
                {summary?.expired_count ?? 0} expired · {summary?.expiring_soon_count ?? 0} soon
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section D: Analytics (MANDATORY: LEFT = Sales Trend, RIGHT = Category Distribution) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Sales Trend AreaChart (spans 7 cols on desktop) */}
        <div className="lg:col-span-7 glass-panel rounded-[var(--radius-card)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-text">Sales Trend</h2>
              <p className="text-xs text-text-muted">Daily dispensary revenue performance</p>
            </div>
            <div className="flex items-center gap-1 bg-white/70 p-1 rounded-[var(--radius-control)] border border-border shadow-2xs">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setTrendDays(d)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    trendDays === d
                      ? "bg-primary text-white shadow-xs"
                      : "text-text-muted hover:text-text hover:bg-white/60"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {trendLoading ? (
            <div className="h-64 bg-ivory-subtle animate-pulse rounded-[var(--radius-control)]" />
          ) : !trend?.length ? (
            <div className="h-64 flex items-center justify-center text-sm text-text-muted">
              No sales data recorded for this period.
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="warmTealGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#096B65" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#096B65" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtShortDate}
                    tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: any) => `₹${v}`}
                    tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    formatter={(value: any) => [fmtCurrency(Number(value) || 0), "Revenue"]}
                    labelFormatter={(label: any) => fmtShortDate(String(label))}
                    contentStyle={{
                      borderRadius: "var(--radius-card)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(14px)",
                      boxShadow: "0 10px 25px -4px rgba(22, 40, 38, 0.10)",
                      fontSize: "12px",
                      color: "var(--color-text)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#096B65"
                    strokeWidth={2.5}
                    fill="url(#warmTealGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: "#096B65", stroke: "#FAF7F2", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* RIGHT: Medicine Stock Distribution by Category Doughnut Chart (spans 5 cols on desktop) */}
        <div className="lg:col-span-5 glass-panel rounded-[var(--radius-card)] p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-text">Stock by Category</h2>
              <p className="text-xs text-text-muted">Available units across active batches</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sage text-primary border border-sage-accent/30">
              {categoryStock?.length ?? 0} Categories
            </span>
          </div>

          {catLoading ? (
            <div className="h-64 bg-ivory-subtle animate-pulse rounded-[var(--radius-control)]" />
          ) : !categoryStock?.length ? (
            <div className="h-64 flex items-center justify-center text-sm text-text-muted">
              No active stock available across batches.
            </div>
          ) : (
            <div>
              {/* Doughnut Chart with Center Total Units Label */}
              <div className="relative w-full h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStock}
                      dataKey="total_stock"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      cornerRadius={4}
                    >
                      {categoryStock.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                          stroke="#FAF7F2"
                          strokeWidth={1.5}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, _name: any, item: any) => {
                        const count = Number(value) || 0;
                        const pct = totalCategoryStockUnits > 0
                          ? ((count / totalCategoryStockUnits) * 100).toFixed(1)
                          : "0";
                        return [`${count} units (${pct}%)`, item.payload.category];
                      }}
                      contentStyle={{
                        borderRadius: "var(--radius-card)",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(14px)",
                        boxShadow: "0 10px 25px -4px rgba(22, 40, 38, 0.10)",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">Total</span>
                  <span className="text-lg font-extrabold text-text leading-tight">
                    {totalCategoryStockUnits.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[9px] text-text-muted">units</span>
                </div>
              </div>

              {/* Category Legend */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-border/60 max-h-24 overflow-y-auto">
                {categoryStock.slice(0, 6).map((cat, idx) => {
                  const pct = totalCategoryStockUnits > 0
                    ? ((cat.total_stock / totalCategoryStockUnits) * 100).toFixed(0)
                    : "0";
                  return (
                    <div key={cat.category} className="flex items-center justify-between text-xs pr-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        />
                        <span className="text-text font-medium truncate">{cat.category}</span>
                      </div>
                      <span className="text-text-muted text-[11px] font-semibold shrink-0 ml-1">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Section E & F: Inventory Alerts & Recent Sales ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Inventory Alerts (visible to Admin & Pharmacist only) */}
        {canViewAlerts && (
          <div className="lg:col-span-5 glass-panel rounded-[var(--radius-card)] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-white/40">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-base font-bold text-text">Inventory Alerts</h2>
              </div>
              <Link to="/batches" className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5">
                Batches <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {alertsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-11 bg-ivory-subtle animate-pulse rounded" />
                ))}
              </div>
            ) : alertsError ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-coral">
                <span className="p-2.5 rounded-full bg-coral-tint text-coral mb-2">
                  <AlertCircle className="w-5 h-5" />
                </span>
                <p className="text-sm font-semibold">Failed to load inventory alerts</p>
                <p className="text-xs text-text-muted mt-0.5">Please check your network connection or retry.</p>
              </div>
            ) : !alerts?.length ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <span className="p-2.5 rounded-full bg-sage text-primary mb-2">
                  <Sparkles className="w-5 h-5" />
                </span>
                <p className="text-sm font-semibold text-text">All batches in good standing</p>
                <p className="text-xs text-text-muted mt-0.5">No stockouts or immediate expiry warnings.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50 overflow-y-auto max-h-80">
                {alerts.map((alert) => (
                  <div key={alert.batch_no} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-white/60 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{alert.med_name}</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Batch #{alert.batch_no} · <span className="font-semibold text-text">{alert.qty_in_stock}</span> units in stock
                        {alert.exp_date ? ` · Exp: ${fmtDate(alert.exp_date)}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={alert.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right: Recent Sales Table */}
        <div className={`${canViewAlerts ? "lg:col-span-7" : "lg:col-span-12"} glass-table-container rounded-[var(--radius-card)] overflow-hidden flex flex-col justify-between`}>
          <div>
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between bg-white/40">
              <div>
                <h2 className="text-base font-bold text-text">Recent Transactions</h2>
                <p className="text-xs text-text-muted">Latest completed patient and walk-in sales</p>
              </div>
              <Link to="/sales" className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5">
                View all sales <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {salesLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-ivory-subtle animate-pulse rounded" />
                ))}
              </div>
            ) : !recentSales?.items?.length ? (
              <div className="p-8 text-center text-sm text-text-muted">No transactions recorded today yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="glass-table-header border-b border-border/70 text-[11px] uppercase text-text-muted font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Bill #</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Payment</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="glass-table-body divide-y divide-border/50">
                    {recentSales.items.map((sale) => (
                      <tr key={sale.bill_no} className="hover:bg-sage/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-text">#{sale.bill_no}</td>
                        <td className="px-4 py-3 text-text-muted text-xs">{fmtDate(sale.sale_date)}</td>
                        <td className="px-4 py-3 text-text font-medium">
                          {sale.cust_name || <span className="italic text-text-muted">Walk-in Customer</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-md border border-border/80 bg-white/90 text-text shadow-2xs">
                            {sale.payment_mode}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {fmtCurrency(sale.total_amt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
