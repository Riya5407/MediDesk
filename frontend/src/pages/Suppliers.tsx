import React, { useState, useEffect } from "react";
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from "../api/suppliers";
import type { Supplier, SupplierInput } from "../api/types";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Truck,
  Phone,
  PlusCircle,
  X,
} from "lucide-react";

export default function Suppliers() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Supplier | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SupplierInput>({
    sup_name: "",
    address: "",
    gst_no: "",
    phones: [""],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: supplierData, isLoading, isError, error, refetch } = useSuppliers({
    search: debouncedSearch || undefined,
    page,
    page_size: pageSize,
  });

  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();
  const deleteMutation = useDeleteSupplier();

  const openAddModal = () => {
    setEditingSup(null);
    setFormData({ sup_name: "", address: "", gst_no: "", phones: [""] });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sup: Supplier) => {
    setEditingSup(sup);
    setFormData({
      sup_name: sup.sup_name,
      address: sup.address || "",
      gst_no: sup.gst_no || "",
      phones: sup.phones.length > 0 ? [...sup.phones] : [""],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const addPhoneField = () => {
    setFormData({ ...formData, phones: [...formData.phones, ""] });
  };

  const removePhoneField = (index: number) => {
    const updated = formData.phones.filter((_, i) => i !== index);
    setFormData({ ...formData, phones: updated.length ? updated : [""] });
  };

  const updatePhoneField = (index: number, val: string) => {
    const updated = [...formData.phones];
    updated[index] = val;
    setFormData({ ...formData, phones: updated });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sup_name.trim()) {
      setFormError("Supplier name is required.");
      return;
    }

    const cleanedPhones = formData.phones.map((p) => p.trim()).filter(Boolean);

    try {
      if (editingSup) {
        await updateMutation.mutateAsync({
          sup_no: editingSup.sup_no,
          data: { ...formData, phones: cleanedPhones },
        });
      } else {
        await createMutation.mutateAsync({ ...formData, phones: cleanedPhones });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.detail || "Failed to save supplier.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteMutation.mutateAsync(deleteCandidate.sup_no);
      setDeleteCandidate(null);
    } catch (err: any) {
      alert(err?.detail || "Failed to delete supplier.");
    }
  };

  const totalPages = supplierData ? Math.ceil(supplierData.total / pageSize) : 1;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">Suppliers</h1>
          <p className="text-xs md:text-sm text-text-muted mt-1">
            Vendor records, contact lines, GST registry, and purchase sources.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-[var(--radius-control)] hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4 shadow-2xs flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by supplier name or GST..."
            className="w-full pl-9 pr-4 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

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
            <h3 className="text-base font-semibold text-text">Failed to load suppliers</h3>
            <p className="text-sm text-text-muted mt-1 mb-4">
              {(error as any)?.detail || "Could not retrieve vendor records."}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : !supplierData?.items?.length ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-text">No suppliers found</p>
            <p className="text-sm text-text-muted mt-1">Register a vendor record above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="glass-table-header border-b border-border/80 text-xs uppercase text-text-muted font-medium tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Sup #</th>
                  <th className="px-6 py-3.5">Supplier Name</th>
                  <th className="px-6 py-3.5">GST Number</th>
                  <th className="px-6 py-3.5">Contact Numbers</th>
                  <th className="px-6 py-3.5">Address</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="glass-table-body divide-y divide-border/60">
                {supplierData.items.map((sup) => (
                  <tr key={sup.sup_no} className="hover:bg-sage/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-text">
                      S-{sup.sup_no}
                    </td>
                    <td className="px-6 py-4 font-medium text-text flex items-center gap-2">
                      <Truck className="w-4 h-4 text-primary" />
                      {sup.sup_name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-text">
                      {sup.gst_no || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {sup.phones && sup.phones.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {sup.phones.map((phone, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs bg-sage/50 border border-border/80 text-text font-medium"
                            >
                              <Phone className="w-3 h-3 text-text-muted" /> {phone}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-muted">{sup.address || "—"}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(sup)}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="Edit supplier"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(sup)}
                        className="p-1 text-text-muted hover:text-coral transition-colors"
                        title="Delete supplier"
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

        {supplierData && supplierData.total > 0 && (
          <div className="glass-table-header border-t border-border/80 px-6 py-3 flex items-center justify-between text-xs md:text-sm text-text-muted">
            <div>
              Showing <span className="font-medium text-text">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-medium text-text">
                {Math.min(page * pageSize, supplierData.total)}
              </span>{" "}
              of <span className="font-medium text-text">{supplierData.total}</span> suppliers
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
              {editingSup ? "Edit Supplier" : "Add New Supplier"}
            </h2>

            {formError && (
              <div className="p-3 bg-coral-tint border border-coral/20 text-coral text-sm rounded-[var(--radius-control)]">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sup_name}
                  onChange={(e) => setFormData({ ...formData, sup_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Apex Pharma Distributors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">GST Number</label>
                <input
                  type="text"
                  value={formData.gst_no || ""}
                  onChange={(e) => setFormData({ ...formData, gst_no: e.target.value })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. 24ZXCVB1122N1Z4"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-text">
                    Phone Numbers
                  </label>
                  <button
                    type="button"
                    onClick={addPhoneField}
                    className="text-xs text-primary flex items-center gap-1 hover:underline font-medium"
                  >
                    <PlusCircle className="w-3 h-3" /> Add phone
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.phones.map((phone, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => updatePhoneField(idx, e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        placeholder="e.g. 9812345678"
                      />
                      {formData.phones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhoneField(idx)}
                          className="p-1 text-text-muted hover:text-coral transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Supplier business address"
                />
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

      {deleteCandidate && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-text">Confirm Deletion</h2>
            <p className="text-sm text-text-muted">
              Are you sure you want to delete supplier{" "}
              <strong className="text-text">{deleteCandidate.sup_name}</strong>?
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
                className="px-4 py-2 bg-coral text-white rounded-[var(--radius-control)] text-sm font-medium hover:bg-coral/90 transition-colors disabled:opacity-50 shadow-xs shadow-coral/25"
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
