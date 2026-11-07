import React, { useState, useEffect } from "react";
import {
  useBatches,
  useCreateBatch,
  useUpdateBatch,
  useDeleteBatch,
} from "../api/batches";
import { useMedicines } from "../api/medicines";
import type { Batch, BatchInput } from "../api/types";
import { getErrorMessage } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { useCurrentUser } from "../api/auth";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Pill,
  CalendarClock,
  CalendarX,
} from "lucide-react";

export default function Batches() {
  const { data: user } = useCurrentUser();
  const canManage = user?.role === "admin" || user?.role === "pharmacist";

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Batch | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs
  const [formData, setFormData] = useState<BatchInput>({
    med_no: 0,
    mfg_date: "",
    exp_date: "",
    qty_in_stock: 0,
    pur_price: undefined,
  });

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: batchData, isLoading, isError, error, refetch } = useBatches({
    search: debouncedSearch || undefined,
    status: selectedStatus || undefined,
    page,
    page_size: pageSize,
  });

  // Load medicines list for the dropdown
  const { data: medicinesData } = useMedicines({ page: 1, page_size: 100 });
  const medicines = medicinesData?.items || [];

  const createMutation = useCreateBatch();
  const updateMutation = useUpdateBatch();
  const deleteMutation = useDeleteBatch();

  const openAddModal = () => {
    setEditingBatch(null);
    setFormData({
      med_no: medicines[0]?.med_no || 0,
      mfg_date: "",
      exp_date: "",
      qty_in_stock: 100,
      pur_price: undefined,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      med_no: batch.med_no,
      mfg_date: batch.mfg_date || "",
      exp_date: batch.exp_date || "",
      qty_in_stock: batch.qty_in_stock,
      pur_price: batch.pur_price ?? undefined,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.med_no) {
      setFormError("Please select a medicine.");
      return;
    }
    if (formData.qty_in_stock < 0) {
      setFormError("Quantity cannot be negative.");
      return;
    }

    try {
      if (editingBatch) {
        await updateMutation.mutateAsync({
          batch_no: editingBatch.batch_no,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, "Failed to save batch."));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteMutation.mutateAsync(deleteCandidate.batch_no);
      setDeleteCandidate(null);
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Failed to delete batch."));
    }
  };

  const totalPages = batchData ? Math.ceil(batchData.total / pageSize) : 1;
  const counts = batchData?.counts || { total: 0, valid: 0, expiring_soon: 0, expired: 0 };

  const formatCurrency = (val?: number | null) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">Batches &amp; Expiry</h1>
          <p className="text-xs md:text-sm text-text-muted mt-1">
            Track batches, monitor upcoming expirations, and maintain stock health.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-[var(--radius-control)] hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Batch
          </button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-[var(--radius-card)] border border-border p-5 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-control)] bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 text-primary border border-primary/20 shadow-2xs flex items-center justify-center">
            <Pill className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-xs uppercase font-medium text-text-muted tracking-wide">Total Batches</div>
            <div className="text-2xl font-bold text-text mt-0.5">{counts.total}</div>
          </div>
        </div>

        <div className="glass-panel rounded-[var(--radius-card)] border border-border p-5 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-control)] bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 text-primary border border-primary/20 shadow-2xs flex items-center justify-center">
            <CheckCircle className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-xs uppercase font-medium text-text-muted tracking-wide">Valid Batches</div>
            <div className="text-2xl font-bold text-text mt-0.5">{counts.valid}</div>
          </div>
        </div>

        <div className="glass-panel rounded-[var(--radius-card)] border border-border p-5 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-control)] bg-gradient-to-br from-amber/20 via-amber/10 to-amber/5 text-amber border border-amber/30 shadow-2xs flex items-center justify-center">
            <CalendarClock className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-xs uppercase font-medium text-text-muted tracking-wide">Expiring Soon</div>
            <div className="text-2xl font-bold text-amber mt-0.5">{counts.expiring_soon}</div>
          </div>
        </div>

        <div className="glass-panel rounded-[var(--radius-card)] border border-border p-5 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-[var(--radius-control)] bg-gradient-to-br from-coral/20 via-coral/10 to-coral/5 text-coral border border-coral/30 shadow-2xs flex items-center justify-center">
            <CalendarX className="w-6 h-6" strokeWidth={1.75} />
          </div>
          <div>
            <div className="text-xs uppercase font-medium text-text-muted tracking-wide">Expired Batches</div>
            <div className="text-2xl font-bold text-coral mt-0.5">{counts.expired}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4 shadow-2xs flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by medicine name..."
            className="w-full pl-9 pr-4 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Batch Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Main Table / State View */}
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
            <h3 className="text-base font-semibold text-text">Failed to load batches</h3>
            <p className="text-sm text-text-muted mt-1 mb-4">
              {getErrorMessage(error, "Could not retrieve batch records.")}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : !batchData?.items?.length ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-text">No batches found</p>
            <p className="text-sm text-text-muted mt-1">
              Try adjusting your search criteria or register a new batch.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="glass-table-header border-b border-border/80 text-xs uppercase text-text-muted font-medium tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Batch #</th>
                  <th className="px-6 py-3.5">Medicine</th>
                  <th className="px-6 py-3.5">Mfg Date</th>
                  <th className="px-6 py-3.5">Exp Date</th>
                  <th className="px-6 py-3.5 text-center">Expires In</th>
                  <th className="px-6 py-3.5 text-center">In Stock</th>
                  <th className="px-6 py-3.5">Purchase Price</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="glass-table-body divide-y divide-border/60">
                {batchData.items.map((batch) => {
                  const isExpired = batch.days_to_expiry !== null && batch.days_to_expiry! < 0;
                  const isExpSoon =
                    batch.days_to_expiry !== null &&
                    batch.days_to_expiry! >= 0 &&
                    batch.days_to_expiry! <= 30;

                  return (
                    <tr key={batch.batch_no} className="hover:bg-sage/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-text">
                        B-{batch.batch_no}
                      </td>
                      <td className="px-6 py-4 font-medium text-text">{batch.med_name || "—"}</td>
                      <td className="px-6 py-4 text-text-muted">{formatDate(batch.mfg_date)}</td>
                      <td className="px-6 py-4 font-medium">{formatDate(batch.exp_date)}</td>
                      <td className="px-6 py-4 text-center font-medium">
                        {batch.days_to_expiry === null ? (
                          "—"
                        ) : isExpired ? (
                          <span className="text-coral font-semibold bg-coral-tint px-2 py-0.5 rounded text-xs">
                            Expired ({Math.abs(batch.days_to_expiry!)}d ago)
                          </span>
                        ) : isExpSoon ? (
                          <span className="text-amber font-semibold bg-amber-tint px-2 py-0.5 rounded text-xs">
                            {batch.days_to_expiry} days
                          </span>
                        ) : (
                          <span className="text-text-muted">{batch.days_to_expiry} days</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold">{batch.qty_in_stock}</td>
                      <td className="px-6 py-4 text-text-muted">{formatCurrency(batch.pur_price)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={batch.status} />
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {canManage ? (
                          <>
                            <button
                              onClick={() => openEditModal(batch)}
                              className="p-1 text-text-muted hover:text-primary transition-colors cursor-pointer"
                              title="Edit batch"
                            >
                              <Edit2 className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => setDeleteCandidate(batch)}
                              className="p-1 text-text-muted hover:text-coral transition-colors cursor-pointer"
                              title="Delete batch"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination Bar */}
        {batchData && batchData.total > 0 && (
          <div className="glass-table-header border-t border-border/80 px-6 py-3 flex items-center justify-between text-xs md:text-sm text-text-muted">
            <div>
              Showing{" "}
              <span className="font-medium text-text">
                {(page - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-text">
                {Math.min(page * pageSize, batchData.total)}
              </span>{" "}
              of <span className="font-medium text-text">{batchData.total}</span> items
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-border/80 bg-white/70 hover:bg-white text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium px-2">
                Page {page} of {totalPages}
              </span>
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-text">
              {editingBatch ? `Edit Batch B-${editingBatch.batch_no}` : "Add New Batch"}
            </h2>

            {formError && (
              <div className="p-3 bg-coral-tint border border-coral/20 text-coral text-sm rounded-[var(--radius-control)]">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Medicine *
                </label>
                <select
                  required
                  value={formData.med_no}
                  onChange={(e) => setFormData({ ...formData, med_no: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value={0} disabled>
                    Select Medicine
                  </option>
                  {medicines.map((m) => (
                    <option key={m.med_no} value={m.med_no}>
                      {m.med_name} {m.unit ? `(${m.unit})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Mfg Date
                  </label>
                  <input
                    type="date"
                    value={formData.mfg_date || ""}
                    onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Exp Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.exp_date || ""}
                    onChange={(e) => setFormData({ ...formData, exp_date: e.target.value })}
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Quantity In Stock *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.qty_in_stock}
                    onChange={(e) =>
                      setFormData({ ...formData, qty_in_stock: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Purchase Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pur_price ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pur_price: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-[var(--radius-control)] text-sm font-medium hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-text">Confirm Deletion</h2>
            <p className="text-sm text-text-muted">
              Are you sure you want to delete batch{" "}
              <strong className="text-text">B-{deleteCandidate.batch_no}</strong> (
              {deleteCandidate.med_name})? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-coral text-white rounded-[var(--radius-control)] text-sm font-medium hover:bg-coral/90 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
