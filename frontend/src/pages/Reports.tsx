import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  useSalesByDate,
  useTopMedicines,
  useExpiredStock,
  usePurchasesBySupplier,
  csvUrl,
} from "../api/reports";
import { useCurrentUser } from "../api/auth";
import {
  Download,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Package,
  Truck,
  XCircle,
} from "lucide-react";

// ── Date helpers ─────────────────────────────────────────────────────────────
function defaultDates(days = 30) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title,
  icon,
  csvHref,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  csvHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-[var(--radius-card)] border border-border shadow-2xs overflow-hidden">
      <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold text-text">{title}</h2>
        </div>
        {csvHref && (
          <a
            href={csvHref}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-xs font-medium text-text bg-white/70 hover:bg-white shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </a>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Loading / Error states ────────────────────────────────────────────────────
function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-8 bg-ivory-subtle animate-pulse rounded-[var(--radius-control)]" />
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center py-8 gap-3">
      <AlertCircle className="w-8 h-8 text-coral" />
      <p className="text-sm text-text-muted">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-[var(--radius-control)] text-sm hover:bg-white/80 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );
}

// ── Date Range picker ─────────────────────────────────────────────────────────
function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-text-muted text-xs font-medium">From</label>
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        className="px-2.5 py-1 border border-border/80 rounded-[var(--radius-control)] text-xs bg-white/80 text-text focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <label className="text-text-muted text-xs font-medium">To</label>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        className="px-2.5 py-1 border border-border/80 rounded-[var(--radius-control)] text-xs bg-white/80 text-text focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Reports() {
  const { data: user } = useCurrentUser();
  const role = user?.role || "admin";

  const canSalesAndTop = role === "admin" || role === "cashier";
  const canExpired = role === "admin" || role === "pharmacist";
  const canPurchases = role === "admin";

  const defaults = defaultDates(30);
  const [salesDates, setSalesDates] = useState(defaults);
  const [topMedDates, setTopMedDates] = useState(defaults);
  const [supDates, setSupDates] = useState(defaults);
  const [topLimit, setTopLimit] = useState(10);

  const salesQuery = useSalesByDate(salesDates, { enabled: canSalesAndTop });
  const topMedQuery = useTopMedicines({ ...topMedDates, limit: topLimit }, { enabled: canSalesAndTop });
  const expiredQuery = useExpiredStock({ enabled: canExpired });
  const supQuery = usePurchasesBySupplier(supDates, { enabled: canPurchases });

  const fmtCurrency = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="pb-2 border-b border-border/60">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">Reports</h1>
        <p className="text-xs md:text-sm text-text-muted mt-1">Analytics and exports for pharmacy operations.</p>
      </div>

      {/* 1. Sales by Date */}
      {canSalesAndTop && (
        <Section
          title="Sales by Date"
          icon={<TrendingUp className="w-4 h-4 text-primary" />}
          csvHref={csvUrl("sales-by-date", salesDates)}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <DateRangePicker
              from={salesDates.from}
              to={salesDates.to}
              onChange={(f, t) => setSalesDates({ from: f, to: t })}
            />
          </div>
          {salesQuery.isLoading ? (
            <LoadingSkeleton rows={3} />
          ) : salesQuery.isError ? (
            <ErrorState message="Could not load sales data." onRetry={salesQuery.refetch} />
          ) : !salesQuery.data?.length ? (
            <p className="text-sm text-text-muted text-center py-6">No sales in this date range.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesQuery.data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number | string) => `₹${v}`}
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      fmtCurrency(Number(value) || 0),
                      "Revenue",
                    ]}
                    labelFormatter={(l: React.ReactNode) => fmtDate(String(l))}
                    contentStyle={{
                      borderRadius: "var(--radius-card)",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      fontSize: "12px",
                      boxShadow: "var(--shadow-card)",
                    }}
                  />
                  <Bar dataKey="total" fill="#096B65" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 glass-table-container border border-border/80 rounded-[var(--radius-control)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="glass-table-header text-xs uppercase text-text-muted tracking-wider border-b border-border/60">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Date</th>
                      <th className="px-4 py-2.5 text-right">Bills</th>
                      <th className="px-4 py-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="glass-table-body divide-y divide-border/60">
                    {salesQuery.data.map((row) => (
                      <tr key={row.date} className="hover:bg-sage/40 transition-colors">
                        <td className="px-4 py-2.5 text-text">{fmtDate(row.date)}</td>
                        <td className="px-4 py-2.5 text-right text-text">{row.bills}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-text">{fmtCurrency(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border/80 bg-sage/30">
                    <tr>
                      <td className="px-4 py-2.5 font-semibold text-text">Total</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-text">
                        {salesQuery.data.reduce((s, r) => s + r.bills, 0)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-primary">
                        {fmtCurrency(salesQuery.data.reduce((s, r) => s + r.total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </Section>
      )}

      {/* 2. Top Medicines */}
      {canSalesAndTop && (
        <Section
          title="Top Medicines by Revenue"
          icon={<Package className="w-4 h-4 text-primary" />}
          csvHref={csvUrl("top-medicines", { ...topMedDates, limit: topLimit })}
        >
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <DateRangePicker
              from={topMedDates.from}
              to={topMedDates.to}
              onChange={(f, t) => setTopMedDates({ from: f, to: t })}
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted font-medium">Top</label>
              <select
                value={topLimit}
                onChange={(e) => setTopLimit(parseInt(e.target.value))}
                className="px-2.5 py-1 border border-border/80 rounded-[var(--radius-control)] text-xs bg-white/80 text-text focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[5, 10, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {topMedQuery.isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : topMedQuery.isError ? (
            <ErrorState message="Could not load medicine data." onRetry={topMedQuery.refetch} />
          ) : !topMedQuery.data?.length ? (
            <p className="text-sm text-text-muted text-center py-6">No sales in this period.</p>
          ) : (
            <div className="glass-table-container border border-border/80 rounded-[var(--radius-control)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="glass-table-header text-xs uppercase text-text-muted tracking-wider border-b border-border/60">
                  <tr>
                    <th className="px-4 py-2.5 text-left">#</th>
                    <th className="px-4 py-2.5 text-left">Medicine</th>
                    <th className="px-4 py-2.5 text-right">Qty Sold</th>
                    <th className="px-4 py-2.5 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="glass-table-body divide-y divide-border/60">
                  {topMedQuery.data.map((row, idx) => (
                    <tr key={row.med_no} className="hover:bg-sage/40 transition-colors">
                      <td className="px-4 py-2.5 text-text-muted font-medium">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-text font-medium">{row.med_name}</td>
                      <td className="px-4 py-2.5 text-right text-text">{row.qty_sold.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-primary">{fmtCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* 3. Expired Stock */}
      {canExpired && (
        <Section
          title="Expired Stock"
          icon={<XCircle className="w-4 h-4 text-coral" />}
          csvHref={csvUrl("expired-stock", {})}
        >
          {expiredQuery.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : expiredQuery.isError ? (
            <ErrorState message="Could not load expired stock." onRetry={expiredQuery.refetch} />
          ) : !expiredQuery.data?.items?.length ? (
            <p className="text-sm text-text-muted text-center py-6">No expired stock.</p>
          ) : (
            <>
              <div className="mb-3 p-3 rounded-[var(--radius-control)] bg-coral-tint border border-coral/20 text-sm text-coral font-medium">
                Total expired value: {fmtCurrency(expiredQuery.data.total_value)}
              </div>
              <div className="glass-table-container border border-border/80 rounded-[var(--radius-control)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="glass-table-header text-xs uppercase text-text-muted tracking-wider border-b border-border/60">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Medicine</th>
                      <th className="px-4 py-2.5 text-left">Batch #</th>
                      <th className="px-4 py-2.5 text-left">Expired</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Pur. Price</th>
                      <th className="px-4 py-2.5 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="glass-table-body divide-y divide-border/60">
                    {expiredQuery.data.items.map((item) => (
                      <tr key={item.batch_no} className="hover:bg-sage/40 transition-colors">
                        <td className="px-4 py-2.5 text-text font-medium">{item.med_name}</td>
                        <td className="px-4 py-2.5 font-mono text-text-muted text-xs">#{item.batch_no}</td>
                        <td className="px-4 py-2.5 text-coral font-medium">
                          {item.exp_date ? new Date(item.exp_date).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-text">{item.qty_in_stock}</td>
                        <td className="px-4 py-2.5 text-right text-text-muted">
                          {item.pur_price != null ? fmtCurrency(item.pur_price) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-coral">{fmtCurrency(item.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border/80 bg-sage/30">
                    <tr>
                      <td colSpan={5} className="px-4 py-2.5 font-semibold text-text text-right">Total Loss</td>
                      <td className="px-4 py-2.5 text-right font-bold text-coral">{fmtCurrency(expiredQuery.data.total_value)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </Section>
      )}

      {/* 4. Purchases by Supplier */}
      {canPurchases && (
        <Section
          title="Purchases by Supplier"
          icon={<Truck className="w-4 h-4 text-primary" />}
          csvHref={csvUrl("purchases-by-supplier", supDates)}
        >
          <div className="mb-4">
            <DateRangePicker
              from={supDates.from}
              to={supDates.to}
              onChange={(f, t) => setSupDates({ from: f, to: t })}
            />
          </div>

          {supQuery.isLoading ? (
            <LoadingSkeleton rows={5} />
          ) : supQuery.isError ? (
            <ErrorState message="Could not load supplier data." onRetry={supQuery.refetch} />
          ) : !supQuery.data?.length ? (
            <p className="text-sm text-text-muted text-center py-6">No purchases in this date range.</p>
          ) : (
            <div className="glass-table-container border border-border/80 rounded-[var(--radius-control)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="glass-table-header text-xs uppercase text-text-muted tracking-wider border-b border-border/60">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Supplier</th>
                    <th className="px-4 py-2.5 text-right">Orders</th>
                    <th className="px-4 py-2.5 text-right">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="glass-table-body divide-y divide-border/60">
                  {supQuery.data.map((row) => (
                    <tr key={row.sup_no} className="hover:bg-sage/40 transition-colors">
                      <td className="px-4 py-2.5 text-text font-medium">{row.sup_name}</td>
                      <td className="px-4 py-2.5 text-right text-text">{row.orders}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-primary">{fmtCurrency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-border/80 bg-sage/30">
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-text">Total</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-text">
                      {supQuery.data.reduce((s, r) => s + r.orders, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary">
                      {fmtCurrency(supQuery.data.reduce((s, r) => s + r.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Section>
      )}

      {!canSalesAndTop && !canExpired && !canPurchases && (
        <div className="glass-panel p-8 rounded-[var(--radius-card)] text-center text-text-muted">
          You do not have permission to view any reports.
        </div>
      )}
    </div>
  );
}