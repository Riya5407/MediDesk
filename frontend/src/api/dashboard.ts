import { useQuery } from "@tanstack/react-query";
import { request } from "./client";

export interface DashboardSummary {
  total_medicines: number;
  todays_sales: number;
  todays_bills: number;
  low_stock_count: number;
  expiring_soon_count: number;
  expired_count: number;
}

export interface SalesTrendPoint {
  date: string;
  total: number;
}

export interface StockAlert {
  batch_no: number;
  med_no: number;
  med_name: string;
  mfg_date?: string | null;
  exp_date?: string | null;
  qty_in_stock: number;
  pur_price?: number | null;
  days_to_expiry: number;
  status: "expired" | "out_of_stock" | "expiring_soon" | "low_stock" | "in_stock";
}

export interface CategoryStockPoint {
  category: string;
  total_stock: number;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => request<DashboardSummary>("/api/dashboard/summary"),
    refetchInterval: 60_000,
  });
}

export function useSalesTrend(days: number = 7) {
  return useQuery({
    queryKey: ["dashboard", "sales-trend", days],
    queryFn: () => request<SalesTrendPoint[]>(`/api/dashboard/sales-trend?days=${days}`),
    refetchInterval: 60_000,
  });
}

export function useStockAlerts(limit: number = 10, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["dashboard", "stock-alerts", limit],
    queryFn: () => request<StockAlert[]>(`/api/dashboard/stock-alerts?limit=${limit}`),
    refetchInterval: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useCategoryStock() {
  return useQuery({
    queryKey: ["dashboard", "category-stock"],
    queryFn: () => request<CategoryStockPoint[]>("/api/dashboard/category-stock"),
    refetchInterval: 60_000,
  });
}

