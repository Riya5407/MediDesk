import React, { useState, useEffect } from "react";
import {
  useMedicines,
  useCategories,
  useCreateMedicine,
  useUpdateMedicine,
  useDeleteMedicine,
} from "../api/medicines";
import type { Medicine, MedicineInput } from "../api/types";
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
} from "lucide-react";

export default function Medicines() {
  const { data: user } = useCurrentUser();
  const canManage = user?.role === "admin" || user?.role === "pharmacist";

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Medicine | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs
  const [formData, setFormData] = useState<MedicineInput>({
    med_name: "",
    category: "",
    manufacturer: "",
    unit: "",
    mrp: undefined,
  });

  // Debounce search by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: categories = [] } = useCategories();

  const {
    data: medicineData,
    isLoading,
    isError,
    error,
    refetch,
  } = useMedicines({
    search: debouncedSearch || undefined,
    category: selectedCategory || undefined,
    status: selectedStatus || undefined,
    page,
    page_size: pageSize,
  });

  const createMutation = useCreateMedicine();
  const updateMutation = useUpdateMedicine();
  const deleteMutation = useDeleteMedicine();

  const openAddModal = () => {
    setEditingMed(null);
    setFormData({
      med_name: "",
      category: categories[0] || "",
      manufacturer: "",
      unit: "",
      mrp: undefined,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medicine) => {
    setEditingMed(med);
    setFormData({
      med_name: med.med_name,
      category: med.category || "",
      manufacturer: med.manufacturer || "",
      unit: med.unit || "",
      mrp: med.mrp ?? undefined,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.med_name.trim()) {
      setFormError("Medicine name is required.");
      return;
    }

    try {
      if (editingMed) {
        await updateMutation.mutateAsync({
          med_no: editingMed.med_no,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.detail || "Failed to save medicine.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteMutation.mutateAsync(deleteCandidate.med_no);
      setDeleteCandidate(null);
    } catch (err: any) {
      alert(err?.detail || "Failed to delete medicine.");
    }
  };

  const totalPages = medicineData ? Math.ceil(medicineData.total / pageSize) : 1;

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
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">Medicine Inventory</h1>
          <p className="text-xs md:text-sm text-text-muted mt-0.5">
            Manage pharmaceutical catalog, dosage units, real-time stock levels, and MRPs
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs md:text-sm font-semibold rounded-[var(--radius-control)] hover:bg-primary-hover transition-all shadow-xs shadow-primary/25 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Medicine
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-[var(--radius-card)] p-4 border border-border flex flex-wrap gap-3 items-center justify-between shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by medicine name or manufacturer..."
            className="w-full pl-9 pr-4 py-2 border border-border/80 rounded-[var(--radius-control)] text-xs md:text-sm bg-white/80 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-xs md:text-sm bg-white/80 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-xs md:text-sm bg-white/80 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
          >
            <option value="">All Stock Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Main Table / State View */}
      <div className="glass-table-container rounded-[var(--radius-card)] overflow-hidden border border-border shadow-2xs">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-ivory-subtle animate-pulse rounded-[var(--radius-control)]" />
            ))}
          </div>
        ) : isError ? (
          <div className="p-12 text-center flex flex-col items-center">
            <AlertCircle className="w-10 h-10 text-coral mb-3" />
            <h3 className="text-base font-bold text-text">Failed to load medicines</h3>
            <p className="text-xs md:text-sm text-text-muted mt-1 mb-4">
              {(error as any)?.detail || "Could not retrieve catalog records."}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-[var(--radius-control)] text-xs font-semibold text-text hover:bg-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        ) : !medicineData?.items?.length ? (
          <div className="p-12 text-center">
            <p className="text-base font-bold text-text">No medicines found</p>
            <p className="text-xs md:text-sm text-text-muted mt-1">
              Try adjusting your search criteria or add a new medicine to the system.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="glass-table-header border-b border-border/70 text-[11px] uppercase text-text-muted font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Medicine</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Manufacturer</th>
                  <th className="px-6 py-3.5">Unit</th>
                  <th className="px-6 py-3.5">MRP</th>
                  <th className="px-6 py-3.5 text-center">Available Stock</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Nearest Expiry</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="glass-table-body divide-y divide-border/60">
                {medicineData.items.map((med) => (
                  <tr key={med.med_no} className="hover:bg-sage/40 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-text">{med.med_name}</td>
                    <td className="px-6 py-3.5 text-text-muted text-xs">{med.category || "—"}</td>
                    <td className="px-6 py-3.5 text-text-muted text-xs">{med.manufacturer || "—"}</td>
                    <td className="px-6 py-3.5 text-text-muted text-xs">{med.unit || "—"}</td>
                    <td className="px-6 py-3.5 font-semibold text-primary">{formatCurrency(med.mrp)}</td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        med.total_stock > 20
                          ? "bg-sage text-primary border-sage-accent/30"
                          : med.total_stock > 0
                          ? "bg-amber-tint text-amber-800 border-amber/30"
                          : "bg-coral-tint text-coral border-coral/30"
                      }`}>
                        {med.total_stock}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={med.status} />
                    </td>
                    <td className="px-6 py-3.5 text-text-muted text-xs">{formatDate(med.nearest_expiry)}</td>
                    <td className="px-6 py-3.5 text-right space-x-1">
                      {canManage ? (
                        <>
                          <button
                            onClick={() => openEditModal(med)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-sage/50 transition-colors cursor-pointer"
                            title="Edit medicine"
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(med)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-coral hover:bg-coral-tint transition-colors cursor-pointer"
                            title="Delete medicine"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination Bar */}
        {medicineData && medicineData.total > 0 && (
          <div className="glass-table-header border-t border-border px-6 py-3.5 flex items-center justify-between text-xs text-text-muted">
            <div>
              Showing{" "}
              <span className="font-semibold text-text">
                {(page - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-text">
                {Math.min(page * pageSize, medicineData.total)}
              </span>{" "}
              of <span className="font-semibold text-text">{medicineData.total}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg border border-border/80 bg-white/70 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-text transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-border/80 bg-white/70 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white text-text transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border p-6 space-y-4 w-full max-w-md">
            <h2 className="text-lg font-bold text-text">
              {editingMed ? "Edit Medicine" : "Add New Medicine"}
            </h2>

            {formError && (
              <div className="p-3 bg-coral-tint text-coral text-xs font-medium rounded-[var(--radius-control)] border border-coral/20">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.med_name}
                  onChange={(e) => setFormData({ ...formData, med_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Paracetamol 500mg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Category
                </label>
                <input
                  type="text"
                  list="category-suggestions"
                  value={formData.category || ""}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Antibiotic"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">
                  Manufacturer
                </label>
                <input
                  type="text"
                  value={formData.manufacturer || ""}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Sun Pharma"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unit || ""}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. Strip of 10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1">
                    MRP (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.mrp ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mrp: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border text-xs font-semibold text-text-muted hover:text-text rounded-[var(--radius-control)] hover:bg-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-[var(--radius-control)] hover:bg-primary-hover transition-colors shadow-xs shadow-primary/20 cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingMed
                    ? "Update Medicine"
                    : "Save Medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border p-6 space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-coral-tint text-coral">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text">Delete Medicine?</h3>
                <p className="text-xs text-text-muted">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Are you sure you want to remove <span className="font-semibold text-text">{deleteCandidate.med_name}</span>? 
              Deletion will fail if existing batches, sales, or orders reference this item.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="px-3.5 py-1.5 border border-border text-xs font-semibold text-text-muted hover:text-text rounded-[var(--radius-control)] hover:bg-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 bg-coral text-white text-xs font-semibold rounded-[var(--radius-control)] hover:opacity-90 transition-opacity shadow-xs shadow-coral/20 cursor-pointer disabled:opacity-50"
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
