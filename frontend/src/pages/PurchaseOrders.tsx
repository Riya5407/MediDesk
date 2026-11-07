import React, { useState, useEffect } from "react";
import {
  usePurchaseOrders,
  usePurchaseOrder,
  useCreatePurchaseOrder,
  useCancelPurchaseOrder,
  useReceivePurchaseOrder,
} from "../api/purchaseOrders";
import type { POLineInput, POReceiveLine } from "../api/purchaseOrders";
import { getErrorMessage } from "../api/client";
import { useSuppliers } from "../api/suppliers";
import { useMedicines } from "../api/medicines";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Package,
  Eye,
  X,
  Trash2,
  CheckCircle,
  ChevronDown,
} from "lucide-react";

const statusColors: Record<string, string> = {
  Pending: "bg-amber-tint text-amber border-amber/30",
  Delivered: "bg-sage text-primary border-primary/20",
  Cancelled: "bg-coral-tint text-coral border-coral/30",
};

export default function PurchaseOrders() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [viewPurNo, setViewPurNo] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Create PO form state
  const [createSupNo, setCreateSupNo] = useState<number | "">("");
  const [createLines, setCreateLines] = useState<{ med_no: number | ""; qty_ordered: number; rate: number }[]>([
    { med_no: "", qty_ordered: 1, rate: 0 },
  ]);

  // Receive PO form state
  const [receiveLines, setReceiveLines] = useState<{ med_no: number; mfg_date: string; exp_date: string; qty_received: number | "" }[]>([]);

  const { data, isLoading, isError, error, refetch } = usePurchaseOrders({
    status: statusFilter || undefined,
    page,
    page_size: pageSize,
  });

  const { data: viewPO, isLoading: viewLoading } = usePurchaseOrder(viewPurNo ?? undefined);
  const { data: supData } = useSuppliers({ page_size: 100 });
  const { data: medData } = useMedicines({ page_size: 100 });

  const createMutation = useCreatePurchaseOrder();
  const cancelMutation = useCancelPurchaseOrder();
  const receiveMutation = useReceivePurchaseOrder();

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const openReceive = (pur_no: number) => {
    setIsReceiveOpen(pur_no);
    setReceiveLines([]);
    setFormError(null);
  };

  // When viewPO changes and we're trying to open receive modal, seed receive lines
  useEffect(() => {
    if (isReceiveOpen !== null && viewPO && viewPO.pur_no === isReceiveOpen) {
      setReceiveLines(
        viewPO.lines.map((l) => ({
          med_no: l.med_no,
          mfg_date: "",
          exp_date: "",
          qty_received: l.qty_ordered,
        }))
      );
    }
  }, [viewPO, isReceiveOpen]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!createSupNo) { setFormError("Select a supplier."); return; }
    const lines: POLineInput[] = createLines
      .filter((l) => l.med_no !== "")
      .map((l) => ({ med_no: l.med_no as number, qty_ordered: l.qty_ordered, rate: l.rate }));
    if (!lines.length) { setFormError("Add at least one medicine line."); return; }
    try {
      await createMutation.mutateAsync({ sup_no: createSupNo as number, lines });
      setIsCreateOpen(false);
      setCreateSupNo("");
      setCreateLines([{ med_no: "", qty_ordered: 1, rate: 0 }]);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, "Failed to create purchase order."));
    }
  };

  const handleCancel = async (pur_no: number) => {
    if (!confirm(`Cancel Purchase Order #${pur_no}?`)) return;
    try {
      await cancelMutation.mutateAsync(pur_no);
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Failed to cancel order."));
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isReceiveOpen) return;
    const missing = receiveLines.find((l) => !l.exp_date);
    if (missing) { setFormError("All lines require an expiry date."); return; }
    const lines: POReceiveLine[] = receiveLines.map((l) => ({
      med_no: l.med_no,
      mfg_date: l.mfg_date || null,
      exp_date: l.exp_date,
      qty_received: l.qty_received !== "" ? l.qty_received : undefined,
    }));
    try {
      await receiveMutation.mutateAsync({ pur_no: isReceiveOpen, data: { lines } });
      setIsReceiveOpen(null);
      setViewPurNo(null);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, "Failed to receive order."));
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN");
  const fmtCurrency = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">Purchase Orders</h1>
          <p className="text-xs md:text-sm text-text-muted mt-1">Manage stock replenishment from suppliers.</p>
        </div>
        <button
          onClick={() => { setIsCreateOpen(true); setFormError(null); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-[var(--radius-control)] hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4 shadow-2xs flex flex-wrap gap-4 items-center">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none pr-8"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <ChevronDown className="w-4 h-4 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="glass-table-container rounded-[var(--radius-card)] border border-border overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-ivory-subtle animate-pulse rounded-[var(--radius-control)]" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-coral mb-3" />
            <h3 className="text-base font-semibold text-text">Failed to load purchase orders</h3>
            <p className="text-sm text-text-muted mt-1 mb-4">{getErrorMessage(error, "Could not retrieve records.")}</p>
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : !data?.items?.length ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-60" />
            <p className="text-base font-medium text-text">No purchase orders found</p>
            <p className="text-sm text-text-muted mt-1">Create a new order to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="glass-table-header border-b border-border/80 text-xs uppercase text-text-muted font-medium tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">PO #</th>
                  <th className="px-6 py-3.5">Supplier</th>
                  <th className="px-6 py-3.5">Order Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Total</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="glass-table-body divide-y divide-border/60">
                {data.items.map((po) => (
                  <tr key={po.pur_no} className="hover:bg-sage/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-text">#{po.pur_no}</td>
                    <td className="px-6 py-4 text-text">{po.sup_name || `Supplier #${po.sup_no}`}</td>
                    <td className="px-6 py-4 text-text-muted">{fmtDate(po.order_date)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[po.status] || "bg-sage/40 border-border text-text"}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-text">{fmtCurrency(po.total)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => { setViewPurNo(po.pur_no); }}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="View order"
                      >
                        <Eye className="w-4 h-4 inline" />
                      </button>
                      {po.status === "Pending" && (
                        <>
                          <button
                            onClick={() => { setViewPurNo(po.pur_no); setIsReceiveOpen(po.pur_no); setFormError(null); }}
                            className="p-1 text-text-muted hover:text-primary transition-colors"
                            title="Receive order"
                          >
                            <CheckCircle className="w-4 h-4 inline" />
                          </button>
                          <button
                            onClick={() => handleCancel(po.pur_no)}
                            className="p-1 text-text-muted hover:text-coral transition-colors"
                            title="Cancel order"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </>
                      )}
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
              of <span className="font-medium text-text">{data.total}</span> orders
            </div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 rounded-lg border border-border/80 bg-white/70 hover:bg-white text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium px-2">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="p-1.5 rounded-lg border border-border/80 bg-white/70 hover:bg-white text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View PO Modal */}
      {viewPurNo !== null && isReceiveOpen === null && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-lg font-bold text-text">Purchase Order #{viewPurNo}</h2>
              <button onClick={() => setViewPurNo(null)} className="p-1 text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            {viewLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-ivory-subtle animate-pulse rounded" />)}</div>
            ) : viewPO ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-text-muted text-xs">Supplier</span><p className="font-medium text-text">{viewPO.sup_name}</p></div>
                  <div><span className="text-text-muted text-xs">Date</span><p className="font-medium text-text">{fmtDate(viewPO.order_date)}</p></div>
                  <div><span className="text-text-muted text-xs">Status</span>
                    <div><span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[viewPO.status] || "bg-sage/40 border-border text-text"}`}>{viewPO.status}</span></div>
                  </div>
                  <div><span className="text-text-muted text-xs">Total</span><p className="font-bold text-primary">{fmtCurrency(viewPO.total)}</p></div>
                </div>
                <div className="glass-table-container border border-border/80 rounded-[var(--radius-control)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="glass-table-header text-xs uppercase text-text-muted tracking-wider border-b border-border/60">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Medicine</th>
                        <th className="px-4 py-2.5 text-right">Qty</th>
                        <th className="px-4 py-2.5 text-right">Rate</th>
                        <th className="px-4 py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="glass-table-body divide-y divide-border/60">
                      {viewPO.lines.map((line) => (
                        <tr key={line.med_no} className="hover:bg-sage/40 transition-colors">
                          <td className="px-4 py-2.5 text-text font-medium">{line.med_name}</td>
                          <td className="px-4 py-2.5 text-right text-text">{line.qty_ordered}</td>
                          <td className="px-4 py-2.5 text-right text-text">{fmtCurrency(line.rate)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-text">{fmtCurrency(line.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
            <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
              <button onClick={() => setViewPurNo(null)} className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {isCreateOpen && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-lg font-bold text-text">New Purchase Order</h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>

            {formError && (
              <div className="p-3 bg-coral-tint border border-coral/20 text-coral text-sm rounded-[var(--radius-control)]">{formError}</div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">Supplier *</label>
                <div className="relative">
                  <select
                    value={createSupNo}
                    onChange={(e) => setCreateSupNo(e.target.value ? parseInt(e.target.value) : "")}
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none pr-8"
                  >
                    <option value="">Select supplier...</option>
                    {supData?.items.map((s) => (
                      <option key={s.sup_no} value={s.sup_no}>{s.sup_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-text">Order Lines *</label>
                  <button
                    type="button"
                    onClick={() => setCreateLines((l) => [...l, { med_no: "", qty_ordered: 1, rate: 0 }])}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3 h-3" /> Add line
                  </button>
                </div>
                {createLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                    <div className="relative">
                      <select
                        value={line.med_no}
                        onChange={(e) => {
                          const updated = [...createLines];
                          updated[idx] = { ...updated[idx], med_no: e.target.value ? parseInt(e.target.value) : "" };
                          setCreateLines(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-xs bg-white/90 text-text focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-6"
                      >
                        <option value="">Medicine...</option>
                        {medData?.items.map((m) => (
                          <option key={m.med_no} value={m.med_no}>{m.med_name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <input
                      type="number" min={1} value={line.qty_ordered}
                      onChange={(e) => { const u = [...createLines]; u[idx] = { ...u[idx], qty_ordered: parseInt(e.target.value) || 1 }; setCreateLines(u); }}
                      className="w-16 px-2 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-xs bg-white/90 text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Qty"
                    />
                    <input
                      type="number" min={0} step={0.01} value={line.rate}
                      onChange={(e) => { const u = [...createLines]; u[idx] = { ...u[idx], rate: parseFloat(e.target.value) || 0 }; setCreateLines(u); }}
                      className="w-20 px-2 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-xs bg-white/90 text-text focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Rate ₹"
                    />
                    {createLines.length > 1 && (
                      <button type="button" onClick={() => setCreateLines((l) => l.filter((_, i) => i !== idx))} className="p-1 text-text-muted hover:text-coral transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-white rounded-[var(--radius-control)] text-sm font-medium hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 disabled:opacity-50">
                  {createMutation.isPending ? "Creating..." : "Create Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive PO Modal */}
      {isReceiveOpen !== null && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-lg font-bold text-text">Receive Order #{isReceiveOpen}</h2>
              <button onClick={() => { setIsReceiveOpen(null); }} className="p-1 text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-text-muted">Enter batch details for each medicine. Qty defaults to ordered quantity.</p>

            {formError && (
              <div className="p-3 bg-coral-tint border border-coral/20 text-coral text-sm rounded-[var(--radius-control)]">{formError}</div>
            )}

            {viewLoading || receiveLines.length === 0 ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-ivory-subtle animate-pulse rounded" />)}</div>
            ) : (
              <form onSubmit={handleReceiveSubmit} className="space-y-4">
                {receiveLines.map((line, idx) => {
                  const medName = viewPO?.lines.find((l) => l.med_no === line.med_no)?.med_name || `Med #${line.med_no}`;
                  return (
                    <div key={line.med_no} className="border border-border/80 rounded-[var(--radius-control)] p-3 space-y-2 bg-white/40">
                      <p className="text-sm font-medium text-text">{medName}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-text-muted">Qty Received</label>
                          <input
                            type="number" min={1}
                            value={line.qty_received}
                            onChange={(e) => { const u = [...receiveLines]; u[idx] = { ...u[idx], qty_received: e.target.value ? parseInt(e.target.value) : "" }; setReceiveLines(u); }}
                            className="w-full px-2 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-text-muted">Mfg Date (optional)</label>
                          <input
                            type="date"
                            value={line.mfg_date}
                            onChange={(e) => { const u = [...receiveLines]; u[idx] = { ...u[idx], mfg_date: e.target.value }; setReceiveLines(u); }}
                            className="w-full px-2 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-text-muted">Expiry Date *</label>
                          <input
                            type="date" required
                            value={line.exp_date}
                            onChange={(e) => { const u = [...receiveLines]; u[idx] = { ...u[idx], exp_date: e.target.value }; setReceiveLines(u); }}
                            className="w-full px-2 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                  <button type="button" onClick={() => setIsReceiveOpen(null)} className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors">Cancel</button>
                  <button type="submit" disabled={receiveMutation.isPending} className="px-4 py-2 bg-primary text-white rounded-[var(--radius-control)] text-sm font-medium hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 disabled:opacity-50">
                    {receiveMutation.isPending ? "Receiving..." : "Confirm Receipt"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
