import React, { useState, useEffect, useMemo } from "react";
import { usePosMedicines, useCreateSale } from "../api/sales";
import type { PosMedicine, SaleLineInput } from "../api/sales";
import { useEmployees } from "../api/employees";
import { request } from "../api/client";
import type { MetaResponse } from "../api/types";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Plus,
  Trash2,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CartItem {
  med_no: number;
  med_name: string;
  batch_no: number;
  exp_date: string;
  qty_in_stock: number;
  mrp: number;
  qty_sold: number;
  sale_price: number;
}

function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => request<MetaResponse>("/api/meta"),
  });
}

export default function NewSale() {
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [empNo, setEmpNo] = useState<number | "">("");
  const [custNo, setCustNo] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const { data: meds, isLoading: medsLoading } = usePosMedicines(debouncedQ);
  const { data: empData } = useEmployees({ page_size: 100 });
  const { data: meta } = useMeta();
  const createSale = useCreateSale();

  const paymentModes = meta?.payment_modes ?? ["Cash", "Card", "UPI"];

  const addToCart = (med: PosMedicine) => {
    const firstBatch = med.batches[0];
    if (!firstBatch) return;
    const exists = cart.find(
      (c) => c.med_no === med.med_no && c.batch_no === firstBatch.batch_no
    );
    if (exists) return;
    setCart((prev) => [
      ...prev,
      {
        med_no: med.med_no,
        med_name: med.med_name,
        batch_no: firstBatch.batch_no,
        exp_date: firstBatch.exp_date,
        qty_in_stock: firstBatch.qty_in_stock,
        mrp: med.mrp ?? 0,
        qty_sold: 1,
        sale_price: med.mrp ?? 0,
      },
    ]);
  };

  const updateCart = (idx: number, field: "qty_sold" | "sale_price" | "batch_no", value: number) => {
    setCart((prev) => {
      const updated = [...prev];
      if (field === "batch_no") {
        updated[idx] = { ...updated[idx], batch_no: value };
      } else {
        updated[idx] = { ...updated[idx], [field]: value };
      }
      return updated;
    });
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const grandTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty_sold * item.sale_price, 0),
    [cart]
  );

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!empNo) { setSubmitError("Please select the employee processing this sale."); return; }
    if (cart.length === 0) { setSubmitError("Add at least one item to the cart."); return; }

    const lines: SaleLineInput[] = cart.map((item) => ({
      med_no: item.med_no,
      batch_no: item.batch_no,
      qty_sold: item.qty_sold,
      sale_price: item.sale_price,
    }));

    try {
      const result = await createSale.mutateAsync({
        cust_no: custNo ? parseInt(custNo, 10) : null,
        emp_no: empNo as number,
        payment_mode: paymentMode,
        lines,
      });
      setSubmitSuccess(result.bill_no);
      setCart([]);
    } catch (err: any) {
      setSubmitError(err?.detail || "Failed to create sale.");
    }
  };

  const fmtCurrency = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="pb-2 border-b border-border/60">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text">New Sale (POS)</h1>
        <p className="text-xs md:text-sm text-text-muted mt-1">Search medicines, add to cart, and complete payment.</p>
      </div>

      {submitSuccess !== null && (
        <div className="p-4 bg-sage/80 border border-primary/20 rounded-[var(--radius-card)] flex items-center gap-3 shadow-2xs">
          <CheckCircle className="w-5 h-5 text-primary" />
          <div>
            <p className="font-semibold text-primary">Sale created — Bill #{submitSuccess}</p>
            <p className="text-xs text-text-muted">
              <button onClick={() => navigate("/sales")} className="underline hover:no-underline font-medium text-text">
                View in Sales History
              </button>
            </p>
          </div>
          <button onClick={() => setSubmitSuccess(null)} className="ml-auto text-text-muted hover:text-text text-sm">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left: Medicine search */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          <div className="glass-panel rounded-[var(--radius-card)] border border-border p-4 shadow-2xs">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search medicines by name..."
                className="w-full pl-9 pr-4 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                autoFocus
              />
            </div>
          </div>

          <div className="glass-table-container rounded-[var(--radius-card)] border border-border overflow-hidden shadow-2xs">
            {medsLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 bg-ivory-subtle animate-pulse rounded-[var(--radius-control)]" />
                ))}
              </div>
            ) : !meds?.length ? (
              <div className="p-10 text-center">
                <p className="text-sm text-text-muted">
                  {debouncedQ ? "No in-stock medicines matching your search." : "Start typing to search medicines."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 max-h-[60vh] overflow-y-auto">
                {meds.map((med) => {
                  const inCart = cart.some((c) => c.med_no === med.med_no && c.batch_no === med.batches[0]?.batch_no);
                  return (
                    <div
                      key={med.med_no}
                      className="flex items-center justify-between px-4 py-3 hover:bg-sage/40 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-text text-sm">{med.med_name}</p>
                        <p className="text-xs text-text-muted">
                          {med.unit || ""} · Stock: {med.total_stock} · {med.batches.length} batch(es)
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm text-primary">{fmtCurrency(med.mrp ?? 0)}</span>
                        <button
                          onClick={() => addToCart(med)}
                          disabled={inCart || med.batches.length === 0}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-[var(--radius-control)] hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                          {inCart ? "Added" : "Add"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-full lg:w-96 flex-shrink-0 space-y-4">
          <div className="glass-panel rounded-[var(--radius-card)] border border-border p-5 shadow-2xs space-y-3">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> Cart ({cart.length} item{cart.length !== 1 ? "s" : ""})
            </h2>

            {cart.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-6">No items in cart.</p>
            ) : (
              <div className="divide-y divide-border/60 max-h-64 overflow-y-auto">
                {cart.map((item, idx) => (
                  <div key={idx} className="py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text truncate">{item.med_name}</p>
                        <p className="text-xs text-text-muted">Batch #{item.batch_no} · Exp: {item.exp_date}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="p-1 text-text-muted hover:text-coral transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-text-muted">Qty</label>
                        <input
                          type="number"
                          min={1}
                          max={item.qty_in_stock}
                          value={item.qty_sold}
                          onChange={(e) => updateCart(idx, "qty_sold", Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-2 py-1 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted">Sale Price (₹)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.sale_price}
                          onChange={(e) => updateCart(idx, "sale_price", parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-right text-text-muted">
                      Subtotal: <span className="font-medium text-text">{fmtCurrency(item.qty_sold * item.sale_price)}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <div className="border-t border-border/60 pt-3 text-right">
                <p className="text-xs text-text-muted">Grand Total</p>
                <p className="text-xl font-bold text-primary">{fmtCurrency(grandTotal)}</p>
              </div>
            )}
          </div>

          {/* Sale Details */}
          <div className="glass-panel rounded-[var(--radius-card)] border border-border p-5 shadow-2xs space-y-3">
            <h2 className="font-semibold text-text text-sm">Sale Details</h2>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Employee *</label>
              <div className="relative">
                <select
                  value={empNo}
                  onChange={(e) => setEmpNo(e.target.value ? parseInt(e.target.value) : "")}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none pr-8"
                >
                  <option value="">Select employee...</option>
                  {empData?.items.map((emp) => (
                    <option key={emp.emp_no} value={emp.emp_no}>
                      {emp.emp_name} {emp.emp_role ? `(${emp.emp_role})` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Customer # (optional)</label>
              <input
                type="number"
                value={custNo}
                onChange={(e) => setCustNo(e.target.value)}
                placeholder="Leave blank for walk-in"
                className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text mb-1">Payment Mode</label>
              <div className="relative">
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-border/80 rounded-[var(--radius-control)] text-sm bg-white/80 text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none pr-8"
                >
                  {paymentModes.map((mode) => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {submitError && (
              <div className="p-3 bg-coral-tint border border-coral/20 text-coral text-sm rounded-[var(--radius-control)] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={createSale.isPending || cart.length === 0}
              className="w-full px-4 py-2.5 bg-primary text-white rounded-[var(--radius-control)] text-sm font-semibold hover:bg-primary-hover transition-colors shadow-xs shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createSale.isPending ? "Processing..." : `Complete Sale · ${fmtCurrency(grandTotal)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
