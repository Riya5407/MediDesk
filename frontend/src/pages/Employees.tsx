import React, { useState, useEffect } from "react";
import {
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "../api/employees";
import type { Employee, EmployeeInput } from "../api/types";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  UserCheck,
} from "lucide-react";

export default function Employees() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Employee | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<EmployeeInput>({
    emp_name: "",
    emp_role: "",
    salary: undefined,
    phone_no: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: employeeData, isLoading, isError, error, refetch } = useEmployees({
    search: debouncedSearch || undefined,
    page,
    page_size: pageSize,
  });

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const openAddModal = () => {
    setEditingEmp(null);
    setFormData({ emp_name: "", emp_role: "Cashier", salary: undefined, phone_no: "" });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setFormData({
      emp_name: emp.emp_name,
      emp_role: emp.emp_role || "",
      salary: emp.salary ?? undefined,
      phone_no: emp.phone_no || "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.emp_name.trim()) {
      setFormError("Employee name is required.");
      return;
    }

    try {
      if (editingEmp) {
        await updateMutation.mutateAsync({
          emp_no: editingEmp.emp_no,
          data: formData,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.detail || "Failed to save employee.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteMutation.mutateAsync(deleteCandidate.emp_no);
      setDeleteCandidate(null);
    } catch (err: any) {
      alert(err?.detail || "Failed to delete employee.");
    }
  };

  const totalPages = employeeData ? Math.ceil(employeeData.total / pageSize) : 1;

  const formatCurrency = (val?: number | null) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">Employees</h1>
          <p className="text-xs md:text-sm text-text-muted mt-1">
            Staff management, role assignments, and sales permissions.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-[var(--radius-control)] hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4 shadow-2xs flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, role, or phone..."
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
            <h3 className="text-base font-semibold text-text">Failed to load staff records</h3>
            <p className="text-sm text-text-muted mt-1 mb-4">
              {(error as any)?.detail || "Could not retrieve employee list."}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-[var(--radius-control)] text-sm font-medium hover:bg-white/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        ) : !employeeData?.items?.length ? (
          <div className="p-12 text-center">
            <p className="text-base font-medium text-text">No staff found</p>
            <p className="text-sm text-text-muted mt-1">
              Register a new employee record above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="glass-table-header border-b border-border/80 text-xs uppercase text-text-muted font-medium tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Emp #</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Monthly Salary</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="glass-table-body divide-y divide-border/60">
                {employeeData.items.map((emp) => (
                  <tr key={emp.emp_no} className="hover:bg-sage/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-text">
                      E-{emp.emp_no}
                    </td>
                    <td className="px-6 py-4 font-medium text-text flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      {emp.emp_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-sage text-primary border border-primary/20">
                        {emp.emp_role || "Staff"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted">{emp.phone_no || "—"}</td>
                    <td className="px-6 py-4 font-medium text-text">{formatCurrency(emp.salary)}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(emp)}
                        className="p-1 text-text-muted hover:text-primary transition-colors"
                        title="Edit employee"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => setDeleteCandidate(emp)}
                        className="p-1 text-text-muted hover:text-coral transition-colors"
                        title="Delete employee"
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

        {employeeData && employeeData.total > 0 && (
          <div className="glass-table-header border-t border-border/80 px-6 py-3 flex items-center justify-between text-xs md:text-sm text-text-muted">
            <div>
              Showing <span className="font-medium text-text">{(page - 1) * pageSize + 1}</span> to{" "}
              <span className="font-medium text-text">
                {Math.min(page * pageSize, employeeData.total)}
              </span>{" "}
              of <span className="font-medium text-text">{employeeData.total}</span> employees
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

      {isModalOpen && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-text">
              {editingEmp ? "Edit Employee" : "Add New Employee"}
            </h2>

            {formError && (
              <div className="p-3 bg-coral-tint border border-coral/20 text-coral text-sm rounded-[var(--radius-control)]">
                {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.emp_name}
                  onChange={(e) => setFormData({ ...formData, emp_name: e.target.value })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Ramesh Patel"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Role</label>
                <input
                  type="text"
                  value={formData.emp_role || ""}
                  onChange={(e) => setFormData({ ...formData, emp_role: e.target.value })}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Pharmacist, Cashier, Manager"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone_no || ""}
                    onChange={(e) => setFormData({ ...formData, phone_no: e.target.value })}
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="e.g. 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text mb-1">Salary (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salary ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salary: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/90 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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

      {deleteCandidate && (
        <div className="glass-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-modal rounded-[var(--radius-card)] border border-border shadow-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-text">Confirm Deletion</h2>
            <p className="text-sm text-text-muted">
              Are you sure you want to delete{" "}
              <strong className="text-text">{deleteCandidate.emp_name}</strong>?
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