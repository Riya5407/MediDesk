import React, { useState, useEffect } from "react";
import { useSales, useSale, useCancelSale } from "../api/sales";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Receipt,
  X,
  Trash2,
  Eye,
} from "lucide-react";

export default function SalesHistory() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [viewBillNo, setViewBillNo] = useState<number | null>(null);
  const [cancelCandidate, setCancelCandidate] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch } = useSales({
    search: debouncedSearch || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    page,
    page_size: pageSize,
  });

  const { data: saleDetail, isLoading: detailLoading } = useSale(viewBillNo ?? undefined);
  const cancelMutation = useCancelSale();

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const handleCancel = async () => {
    if (!cancelCandidate) return;
    try {
      await cancelMutation.mutateAsync(cancelCandidate);
      setCancelCandidate(null);
      if (viewBillNo === cancelCandidate) setViewBillNo(null);
    } catch (err: any) {
      alert(err?.detail || "Failed to cancel sale.");
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN");
  const fmtCurrency = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">Sales History</h1>
          <p className="text-xs md:text-sm text-text-muted mt-1">All bills, receipts, and transactions.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4 shadow-2xs flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search bill # or customer name..."
            className="w-full pl-9 pr-4 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted whitespace-nowrap">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted whitespace-nowrap">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {(fromDate || toDate || debouncedSearch) && (
          <button
            onClick={() => { setFromDate(""); setToDate(""); setSearchInput(""); setDebouncedSearch(""); setPage(1); }}
            className="text-xs text-text-muted hover:text-text flex items-center gap-1 font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass-table-container rounded-[var(--radius-card)] border border-border overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-ivory-subtle animate-pulse rounded-[var(--radius-control)]" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-coral mb-3" />
            <h3 className="text-base font-semibold text-text">Failed to load sales</h3>
            <p className="text-sm text-text-muted mt-1 mb-4">
              {(error as any)?.detail || "Could not retrieve sales records."}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : !data?.items?.length ? (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-60" />
            <p className="text-base font-medium text-text">No sales found</p>
            <p className="text-sm text-text-muted mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="glass-table-header border-b border-border/80 text-xs uppercase text-text-muted font-medium tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Bill #</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Employee</th>
                  <th className="px-6 py-3.5">Payment</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5 text-right">Total</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="glass-table-body divide-y divide-border/60">
                {data.items.map((sale) => (
                  <tr key={sale.bill_no} className="hover:bg-sage/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-text">#{sale.bill_no}</td>
                    <td className="px-6 py-4 text-text-muted">{fmtDate(sale.sale_date)}</td>
                    <td className="px-6 py-4 text-text">{sale.cust_name || <span className="text-text-muted italic">Walk-in</span>}</td>
                    <td className="px-6 py-4 text-text">{sale.emp_name || "—"}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-0.5 rounded text-xs bg-sage/60 border border-border/80 text-text font-medium">
                        {sale.payment_mode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{sale.item_count}</td>
                    <td className="px-6 py-4 text-right font-semibold text-text">{fmtCurrency(sale.total_amt)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setViewBillNo(sale.bill_no)}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="View receipt"
                      >
                        <Eye className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => setCancelCandidate(sale.bill_no)}
                        className="p-1 text-text-muted hover:text-coral transition-colors"
                        title="Cancel bill"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <div className="glass-table-header border-t border-border/80 px-6 py-3 flex items-center justify-between text-xs md:text-sm text-text-muted">
            <div>
              Showing <span className="font-medium text-text">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-medium text-text">{Math.min(page * pageSize, data.total)}</span>{" "}
              of <span className="font-medium text-text">{data.total}</span> bills
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-border/80 bg-white/70 hover:bg-white text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium px-2">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-border/80 bg-white/70 hover:bg-white text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {viewBillNo !== null && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-lg font-bold text-text">Receipt — Bill #{viewBillNo}</h2>
              <button onClick={() => setViewBillNo(null)} className="p-1 text-text-muted hover:text-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-ivory-subtle animate-pulse rounded-[var(--radius-control)]" />
                ))}
              </div>
            ) : saleDetail ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-text-muted text-xs">Date</span>
                    <p className="font-medium text-text">{fmtDate(saleDetail.sale_date)}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-xs">Payment Mode</span>
                    <p className="font-medium text-text">{saleDetail.payment_mode}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-xs">Customer</span>
                    <p className="font-medium text-text">{saleDetail.cust_name || "Walk-in"}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-xs">Employee</span>
                    <p className="font-medium text-text">{saleDetail.emp_name || "—"}</p>
                  </div>
                </div>

                <div className="glass-table-container border border-border/80 rounded-[var(--radius-control)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="glass-table-header text-xs uppercase text-text-muted tracking-wider border-b border-border/60">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Medicine</th>
                        <th className="px-4 py-2.5 text-center">Batch</th>
                        <th className="px-4 py-2.5 text-center">Qty</th>
                        <th className="px-4 py-2.5 text-right">Price</th>
                        <th className="px-4 py-2.5 text-right">Disc%</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="glass-table-body divide-y divide-border/60">
                      {saleDetail.lines.map((line) => (
                        <tr key={`${line.med_no}-${line.batch_no}`} className="hover:bg-sage/40 transition-colors">
                          <td className="px-4 py-2.5 text-text font-medium">{line.med_name}</td>
                          <td className="px-4 py-2.5 text-center font-mono text-text-muted text-xs">#{line.batch_no}</td>
                          <td className="px-4 py-2.5 text-center text-text">{line.qty_sold}</td>
                          <td className="px-4 py-2.5 text-right text-text">{fmtCurrency(line.sale_price)}</td>
                          <td className="px-4 py-2.5 text-right text-text-muted">
                            {line.discount_pct > 0 ? `${line.discount_pct.toFixed(1)}%` : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-text">{fmtCurrency(line.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-border/80 bg-sage/30">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 font-semibold text-text text-right">Grand Total</td>
                        <td className="px-4 py-3 font-bold text-primary text-right">{fmtCurrency(saleDetail.total_amt)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
                  <button
                    onClick={() => { setCancelCandidate(viewBillNo); setViewBillNo(null); }}
                    className="px-4 py-2 bg-coral text-white rounded-[var(--radius-control)] text-sm font-medium hover:bg-coral/90 transition-colors shadow-xs shadow-coral/25"
                  >
                    Cancel Bill
                  </button>
                  <button
                    onClick={() => setViewBillNo(null)}
                    className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Confirm Cancel Modal */}
      {cancelCandidate !== null && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-text">Cancel Bill #{cancelCandidate}?</h2>
            <p className="text-sm text-text-muted">
              This will permanently cancel the bill and restore stock. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelCandidate(null)}
                className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors"
              >
                Keep Bill
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="px-4 py-2 bg-coral text-white rounded-[var(--radius-control)] text-sm font-medium hover:bg-coral/90 transition-colors disabled:opacity-50 shadow-xs shadow-coral/25"
              >
                {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
