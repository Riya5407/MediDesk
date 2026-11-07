import React, { useState, useEffect } from "react";
import {
  usePrescriptions,
  usePrescription,
  useCreatePrescription,
  useUpdatePrescription,
  useDeletePrescription,
} from "../api/prescriptions";
import type { PrescriptionCreate } from "../api/prescriptions";
import { useMedicines } from "../api/medicines";
import {
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  FileText,
  Edit2,
  Trash2,
  Eye,
  X,
  ChevronDown,
} from "lucide-react";

interface FormItemRow {
  med_no: number | "";
  dosage: string;
  duration: string;
}

const emptyForm = (): PrescriptionCreate => ({
  cust_no: null,
  doc_name: "",
  pres_date: new Date().toISOString().split("T")[0],
  diagnosis: "",
  items: [],
});

export default function Prescriptions() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [viewPresNo, setViewPresNo] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPresNo, setEditingPresNo] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{ pres_no: number; label: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<PrescriptionCreate>(emptyForm());
  const [formItems, setFormItems] = useState<FormItemRow[]>([{ med_no: "", dosage: "", duration: "" }]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isError, error, refetch } = usePrescriptions({
    search: debouncedSearch || undefined,
    page,
    page_size: pageSize,
  });

  const { data: presDetail, isLoading: detailLoading } = usePrescription(viewPresNo ?? undefined);
  const { data: editDetail } = usePrescription(editingPresNo ?? undefined);
  const { data: medData } = useMedicines({ page_size: 100 });

  const createMutation = useCreatePrescription();
  const updateMutation = useUpdatePrescription();
  const deleteMutation = useDeletePrescription();

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  const openAdd = () => {
    setEditingPresNo(null);
    setFormData(emptyForm());
    setFormItems([{ med_no: "", dosage: "", duration: "" }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEdit = (pres_no: number) => {
    setEditingPresNo(pres_no);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Seed form when edit detail loads
  useEffect(() => {
    if (editingPresNo && editDetail && editDetail.pres_no === editingPresNo) {
      setFormData({
        cust_no: editDetail.cust_no ?? null,
        doc_name: editDetail.doc_name ?? "",
        pres_date: editDetail.pres_date,
        diagnosis: editDetail.diagnosis ?? "",
        items: [],
      });
      setFormItems(
        editDetail.items.length
          ? editDetail.items.map((i) => ({ med_no: i.med_no, dosage: i.dosage ?? "", duration: i.duration ?? "" }))
          : [{ med_no: "", dosage: "", duration: "" }]
      );
    }
  }, [editDetail, editingPresNo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.pres_date) { setFormError("Prescription date is required."); return; }

    const items = formItems
      .filter((r) => r.med_no !== "")
      .map((r) => ({ med_no: r.med_no as number, dosage: r.dosage || null, duration: r.duration || null }));

    const payload: PrescriptionCreate = {
      ...formData,
      cust_no: formData.cust_no || null,
      doc_name: formData.doc_name || null,
      diagnosis: formData.diagnosis || null,
      items,
    };

    try {
      if (editingPresNo) {
        await updateMutation.mutateAsync({ pres_no: editingPresNo, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setIsModalOpen(false);
      setEditingPresNo(null);
    } catch (err: any) {
      setFormError(err?.detail || "Failed to save prescription.");
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteMutation.mutateAsync(deleteCandidate.pres_no);
      setDeleteCandidate(null);
      if (viewPresNo === deleteCandidate.pres_no) setViewPresNo(null);
    } catch (err: any) {
      alert(err?.detail || "Failed to delete prescription.");
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN");

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">Prescriptions</h1>
          <p className="text-xs md:text-sm text-text-muted mt-1">Doctor prescriptions linked to customers and medicines.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-[var(--radius-control)] hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Prescription
        </button>
      </div>

      {/* Search */}
      <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4 shadow-2xs flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by doctor or customer name..."
            className="w-full pl-9 pr-4 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
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
            <h3 className="text-base font-semibold text-text">Failed to load prescriptions</h3>
            <p className="text-sm text-text-muted mt-1 mb-4">{(error as any)?.detail || "Could not retrieve records."}</p>
            <button onClick={() => refetch()} className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : !data?.items?.length ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-60" />
            <p className="text-base font-medium text-text">No prescriptions found</p>
            <p className="text-sm text-text-muted mt-1">Add a prescription record above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="glass-table-header border-b border-border/80 text-xs uppercase text-text-muted font-medium tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Pres #</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Doctor</th>
                  <th className="px-6 py-3.5">Diagnosis</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="glass-table-body divide-y divide-border/60">
                {data.items.map((pres) => (
                  <tr key={pres.pres_no} className="hover:bg-sage/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-text">#{pres.pres_no}</td>
                    <td className="px-6 py-4 text-text-muted">{fmtDate(pres.pres_date)}</td>
                    <td className="px-6 py-4 text-text">{pres.cust_name || <span className="text-text-muted italic">—</span>}</td>
                    <td className="px-6 py-4 text-text">{pres.doc_name || <span className="text-text-muted">—</span>}</td>
                    <td className="px-6 py-4 text-text-muted max-w-[160px] truncate" title={pres.diagnosis ?? ""}>{pres.diagnosis || "—"}</td>
                    <td className="px-6 py-4 text-text-muted">{pres.item_count}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => setViewPresNo(pres.pres_no)} className="p-1 text-text-muted hover:text-primary transition-colors" title="View">
                        <Eye className="w-4 h-4 inline" />
                      </button>
                      <button onClick={() => openEdit(pres.pres_no)} className="p-1 text-text-muted hover:text-primary transition-colors" title="Edit">
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate({ pres_no: pres.pres_no, label: `#${pres.pres_no}` })}
                        className="p-1 text-text-muted hover:text-coral transition-colors" title="Delete"
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
              of <span className="font-medium text-text">{data.total}</span> prescriptions
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

      {/* View Modal */}
      {viewPresNo !== null && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-lg font-bold text-text">Prescription #{viewPresNo}</h2>
              <button onClick={() => setViewPresNo(null)} className="p-1 text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>
            {detailLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-ivory-subtle animate-pulse rounded" />
                ))}
              </div>
            ) : presDetail ? (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-text-muted text-xs">Date</span><p className="font-medium text-text">{fmtDate(presDetail.pres_date)}</p></div>
                  <div><span className="text-text-muted text-xs">Customer</span><p className="font-medium text-text">{presDetail.cust_name || "—"}</p></div>
                  <div><span className="text-text-muted text-xs">Doctor</span><p className="font-medium text-text">{presDetail.doc_name || "—"}</p></div>
                  <div><span className="text-text-muted text-xs">Diagnosis</span><p className="font-medium text-text">{presDetail.diagnosis || "—"}</p></div>
                </div>
                {presDetail.items.length > 0 ? (
                  <div className="glass-table-container border border-border/80 rounded-[var(--radius-control)] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="glass-table-header text-xs uppercase text-text-muted tracking-wider border-b border-border/60">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Medicine</th>
                          <th className="px-4 py-2.5 text-left">Dosage</th>
                          <th className="px-4 py-2.5 text-left">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="glass-table-body divide-y divide-border/60">
                        {presDetail.items.map((item) => (
                          <tr key={item.med_no} className="hover:bg-sage/40 transition-colors">
                            <td className="px-4 py-2.5 text-text font-medium">{item.med_name}</td>
                            <td className="px-4 py-2.5 text-text-muted">{item.dosage || "—"}</td>
                            <td className="px-4 py-2.5 text-text-muted">{item.duration || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted text-center py-4">No medicines listed.</p>
                )}
              </>
            ) : null}
            <div className="flex justify-end gap-3 pt-3 border-t border-border/60">
              <button onClick={() => setViewPresNo(null)} className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-lg font-bold text-text">{editingPresNo ? "Edit Prescription" : "New Prescription"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-text-muted hover:text-text"><X className="w-5 h-5" /></button>
            </div>

            {formError && (
              <div className="p-3 bg-coral-tint border border-coral/20 text-coral text-sm rounded-[var(--radius-control)]">{formError}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Date *</label>
                  <input
                    type="date" required
                    value={formData.pres_date}
                    onChange={(e) => setFormData({ ...formData, pres_date: e.target.value })}
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Customer # (optional)</label>
                  <input
                    type="number"
                    value={formData.cust_no ?? ""}
                    onChange={(e) => setFormData({ ...formData, cust_no: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Customer number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Doctor Name</label>
                <input
                  type="text"
                  value={formData.doc_name ?? ""}
                  onChange={(e) => setFormData({ ...formData, doc_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Dr. Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Diagnosis</label>
                <input
                  type="text"
                  value={formData.diagnosis ?? ""}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Hypertension"
                />
              </div>

              {/* Medicine rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-text">Medicines</label>
                  <button
                    type="button"
                    onClick={() => setFormItems((r) => [...r, { med_no: "", dosage: "", duration: "" }])}
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3 h-3" /> Add medicine
                  </button>
                </div>
                {formItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                    <div className="relative">
                      <select
                        value={item.med_no}
                        onChange={(e) => { const u = [...formItems]; u[idx] = { ...u[idx], med_no: e.target.value ? parseInt(e.target.value) : "" }; setFormItems(u); }}
                        className="w-full px-2 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-xs bg-white/90 text-text focus:outline-none focus:ring-1 focus:ring-primary appearance-none pr-6"
                      >
                        <option value="">Medicine...</option>
                        {medData?.items.map((m) => <option key={m.med_no} value={m.med_no}>{m.med_name}</option>)}
                      </select>
                      <ChevronDown className="w-3 h-3 text-text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <input
                      type="text" value={item.dosage} placeholder="Dosage"
                      onChange={(e) => { const u = [...formItems]; u[idx] = { ...u[idx], dosage: e.target.value }; setFormItems(u); }}
                      className="w-24 px-2 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-xs bg-white/90 text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="text" value={item.duration} placeholder="Duration"
                      onChange={(e) => { const u = [...formItems]; u[idx] = { ...u[idx], duration: e.target.value }; setFormItems(u); }}
                      className="w-24 px-2 py-1.5 border border-border/80 rounded-[var(--radius-control)] text-xs bg-white/90 text-text focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {formItems.length > 1 && (
                      <button type="button" onClick={() => setFormItems((r) => r.filter((_, i) => i !== idx))} className="p-1 text-text-muted hover:text-coral transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors">Cancel</button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="px-4 py-2 bg-primary text-white rounded-[var(--radius-control)] text-sm font-medium hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 disabled:opacity-50">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteCandidate && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-text">Delete Prescription {deleteCandidate.label}?</h2>
            <p className="text-sm text-text-muted">This will permanently delete the prescription and all its line items.</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setDeleteCandidate(null)} className="px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleteMutation.isPending} className="px-4 py-2 bg-coral text-white rounded-[var(--radius-control)] text-sm font-medium hover:bg-coral/90 transition-colors disabled:opacity-50 shadow-xs shadow-coral/25">
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}