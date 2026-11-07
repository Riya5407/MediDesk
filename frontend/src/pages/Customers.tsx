import React, { useState, useEffect } from "react";
import {
  useCustomers,
  useCustomerHistory,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "../api/customers";
import type { Customer, CustomerInput } from "../api/types";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  History,
  X,
  Receipt,
  FileText,
} from "lucide-react";

export default function Customers() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCust, setEditingCust] = useState<Customer | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Customer | null>(null);
  const [historyCust, setHistoryCust] = useState<Customer | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CustomerInput>({
    cust_name: "",
    age: undefined,
    phone_no: "",
    address: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: customerData, isLoading, isError, error, refetch } = useCustomers({
    search: debouncedSearch || undefined,
    page,
    page_size: pageSize,
  });

  const { data: historyData, isLoading: historyLoading } = useCustomerHistory(
    historyCust?.cust_no
  );

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const openAddModal = () => {
    setEditingCust(null);
    setFormData({ cust_name: "", age: undefined, phone_no: "", address: "" });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCust(cust);
    setFormData({
      cust_name: cust.cust_name,
      age: cust.age ?? undefined,
      phone_no: cust.phone_no || "",
      address: cust.address || "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cust_name.trim()) {
      setFormError("Customer name is required.");
      return;
    }

    try {
      if (editingCust) {
        await updateMutation.mutateAsync({
          cust_no: editingCust.cust_no,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.detail || "Failed to save customer.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteMutation.mutateAsync(deleteCandidate.cust_no);
      setDeleteCandidate(null);
    } catch (err: any) {
      alert(err?.detail || "Failed to delete customer.");
    }
  };

  const totalPages = customerData ? Math.ceil(customerData.total / pageSize) : 1;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">Customers</h1>
          <p className="text-xs md:text-sm text-text-muted mt-1">
            Maintain customer records, prescription histories, and billing files.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-[var(--radius-control)] hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4 shadow-2xs flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by customer name or phone..."
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
            <h3 className="text-base font-semibold text-text">Failed to load customer records</h3>
            <p className="text-sm text-text-muted mt-1 mb-4">
              {(error as any)?.detail || "Could not retrieve customer database."}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : !customerData?.items?.length ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-text">No customers found</p>
            <p className="text-sm text-text-muted mt-1">Register a new customer above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="glass-table-header border-b border-border/80 text-xs uppercase text-text-muted font-medium tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Cust #</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5 text-center">Age</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Address</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="glass-table-body divide-y divide-border/60">
                {customerData.items.map((cust) => (
                  <tr key={cust.cust_no} className="hover:bg-sage/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-text">
                      C-{cust.cust_no}
                    </td>
                    <td className="px-6 py-4 font-medium text-text">{cust.cust_name}</td>
                    <td className="px-6 py-4 text-center text-text-muted">{cust.age ?? "—"}</td>
                    <td className="px-6 py-4 text-text-muted">{cust.phone_no || "—"}</td>
                    <td className="px-6 py-4 text-text-muted">{cust.address || "—"}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => setHistoryCust(cust)}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="View history"
                      >
                        <History className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => openEditModal(cust)}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="Edit customer"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(cust)}
                        className="p-1 text-text-muted hover:text-coral transition-colors"
                        title="Delete customer"
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

        {customerData && customerData.total > 0 && (
          <div className="glass-table-header border-t border-border/80 px-6 py-3 flex items-center justify-between text-xs md:text-sm text-text-muted">
            <div>
              Showing <span className="font-medium text-text">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-medium text-text">
                {Math.min(page * pageSize, customerData.total)}
              </span>{" "}
              of <span className="font-medium text-text">{customerData.total}</span> customers
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

      {/* History Modal */}
      {historyCust && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h2 className="text-lg font-bold text-text">
                  Customer History: {historyCust.cust_name}
                </h2>
                <p className="text-xs text-text-muted">ID: C-{historyCust.cust_no}</p>
              </div>
              <button
                onClick={() => setHistoryCust(null)}
                className="text-text-muted hover:text-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {historyLoading ? (
                <div className="p-8 text-center text-text-muted">Loading customer history...</div>
              ) : (
                <>
                  {/* Sales */}
                  <div>
                    <h3 className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-primary" /> Past Bills (
                      {historyData?.sales.length || 0})
                    </h3>
                    {!historyData?.sales.length ? (
                      <p className="text-xs text-text-muted bg-ivory-subtle p-3 rounded-[var(--radius-control)]">
                        No purchase records found.
                      </p>
                    ) : (
                      <div className="glass-table-container rounded-[var(--radius-control)] border border-border/80 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="glass-table-header text-text-muted border-b border-border/60">
                            <tr>
                              <th className="px-3 py-2">Bill #</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Billed By</th>
                              <th className="px-3 py-2">Items</th>
                              <th className="px-3 py-2">Mode</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="glass-table-body divide-y divide-border/60">
                            {historyData.sales.map((s) => (
                              <tr key={s.bill_no} className="hover:bg-sage/40 transition-colors">
                                <td className="px-3 py-2 font-mono font-medium">#{s.bill_no}</td>
                                <td className="px-3 py-2 text-text-muted">{formatDate(s.sale_date)}</td>
                                <td className="px-3 py-2">{s.emp_name || "—"}</td>
                                <td className="px-3 py-2 text-text-muted">{s.item_count} items</td>
                                <td className="px-3 py-2">{s.payment_mode}</td>
                                <td className="px-3 py-2 text-right font-semibold text-text">
                                  {formatCurrency(s.total_amt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Prescriptions */}
                  <div>
                    <h3 className="text-sm font-bold text-text mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" /> Prescriptions (
                      {historyData?.prescriptions.length || 0})
                    </h3>
                    {!historyData?.prescriptions.length ? (
                      <p className="text-xs text-text-muted bg-ivory-subtle p-3 rounded-[var(--radius-control)]">
                        No registered prescriptions found.
                      </p>
                    ) : (
                      <div className="glass-table-container rounded-[var(--radius-control)] border border-border/80 overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="glass-table-header text-text-muted border-b border-border/60">
                            <tr>
                              <th className="px-3 py-2">Pres #</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Doctor</th>
                              <th className="px-3 py-2">Diagnosis</th>
                              <th className="px-3 py-2 text-right">Medicines</th>
                            </tr>
                          </thead>
                          <tbody className="glass-table-body divide-y divide-border/60">
                            {historyData.prescriptions.map((p) => (
                              <tr key={p.pres_no} className="hover:bg-sage/40 transition-colors">
                                <td className="px-3 py-2 font-mono font-medium">RX-{p.pres_no}</td>
                                <td className="px-3 py-2 text-text-muted">{formatDate(p.pres_date)}</td>
                                <td className="px-3 py-2 font-medium text-text">{p.doc_name || "—"}</td>
                                <td className="px-3 py-2 text-text-muted">
                                  {p.diagnosis || "—"}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-text">
                                  {p.item_count}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-text">
              {editingCust ? "Edit Customer" : "Add New Customer"}
            </h2>

            {formError && (
              <div className="p-3 bg-coral-tint border border-coral/20 text-coral text-sm rounded-[var(--radius-control)]">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.cust_name}
                  onChange={(e) => setFormData({ ...formData, cust_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Suresh Shah"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Age</label>
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={formData.age ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        age: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. 42"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone_no || ""}
                    onChange={(e) => setFormData({ ...formData, phone_no: e.target.value })}
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. 9898776655"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Address</label>
                <textarea
                  rows={2}
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="Residential address / locality"
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

      {/* Delete Confirmation */}
      {deleteCandidate && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-text">Confirm Deletion</h2>
            <p className="text-sm text-text-muted">
              Are you sure you want to delete customer{" "}
              <strong className="text-text">{deleteCandidate.cust_name}</strong>?
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
