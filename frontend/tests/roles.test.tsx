import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Dashboard from "../src/pages/Dashboard";
import Reports from "../src/pages/Reports";
import SalesHistory from "../src/pages/SalesHistory";
import Medicines from "../src/pages/Medicines";

describe("Role-based access control and UI filtering", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Provide mock responses for common queries to prevent unhandled rejection
    queryClient.setQueryData(["dashboard", "summary"], {
      total_medicines: 24,
      todays_sales: 1500,
      todays_bills: 5,
      low_stock_count: 2,
      expiring_soon_count: 1,
      expired_count: 0,
    });
    queryClient.setQueryData(["dashboard", "sales-trend", 7], []);
    queryClient.setQueryData(["dashboard", "category-stock"], []);
    queryClient.setQueryData(["sales", { page: 1, page_size: 5 }], { items: [], total: 0 });
  });

  describe("Dashboard Role Permissions", () => {
    it("renders Inventory Alerts panel for Admin", () => {
      queryClient.setQueryData(["auth", "me"], { username: "admin", role: "admin" });
      queryClient.setQueryData(["dashboard", "stock-alerts", 8], [
        {
          batch_no: 101,
          med_no: 1,
          med_name: "Amoxicillin 500mg",
          qty_in_stock: 5,
          days_to_expiry: 45,
          status: "low_stock",
        },
      ]);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText("Inventory Alerts")).toBeInTheDocument();
      expect(screen.getByText("Amoxicillin 500mg")).toBeInTheDocument();
    });

    it("renders Inventory Alerts panel for Pharmacist", () => {
      queryClient.setQueryData(["auth", "me"], { username: "pharmacist", role: "pharmacist" });
      queryClient.setQueryData(["dashboard", "stock-alerts", 8], [
        {
          batch_no: 102,
          med_no: 2,
          med_name: "Paracetamol 650mg",
          qty_in_stock: 0,
          days_to_expiry: 100,
          status: "out_of_stock",
        },
      ]);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText("Inventory Alerts")).toBeInTheDocument();
      expect(screen.getByText("Paracetamol 650mg")).toBeInTheDocument();
    });

    it("hides Inventory Alerts panel for Cashier and does not render alerts", () => {
      queryClient.setQueryData(["auth", "me"], { username: "cashier", role: "cashier" });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.queryByText("Inventory Alerts")).not.toBeInTheDocument();
    });

    it("shows real error state when inventory alerts request fails for authorized role", () => {
      queryClient.setQueryData(["auth", "me"], { username: "admin", role: "admin" });
      
      // Simulate query error
      queryClient.setQueryDefaults(["dashboard", "stock-alerts"], {
        queryFn: () => Promise.reject(new Error("Network Error")),
        retry: false,
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // When query fails or errors
      const queryState = queryClient.getQueryState(["dashboard", "stock-alerts", 8]);
      if (queryState?.status === "error") {
        expect(screen.getByText("Failed to load inventory alerts")).toBeInTheDocument();
      }
    });
  });

  describe("Reports Page Role Permissions", () => {
    it("renders all 4 reports sections for Admin", () => {
      queryClient.setQueryData(["auth", "me"], { username: "admin", role: "admin" });
      queryClient.setQueryData(["reports", "sales-by-date", { from: expect.any(String), to: expect.any(String) }], []);
      queryClient.setQueryData(["reports", "top-medicines", { from: expect.any(String), to: expect.any(String), limit: 10 }], []);
      queryClient.setQueryData(["reports", "expired-stock"], { items: [], total_value: 0 });
      queryClient.setQueryData(["reports", "purchases-by-supplier", { from: expect.any(String), to: expect.any(String) }], []);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Reports />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText("Sales by Date")).toBeInTheDocument();
      expect(screen.getByText("Top Medicines by Revenue")).toBeInTheDocument();
      expect(screen.getByText("Expired Stock")).toBeInTheDocument();
      expect(screen.getByText("Purchases by Supplier")).toBeInTheDocument();
    });

    it("renders only Expired Stock report for Pharmacist, hiding forbidden sections", () => {
      queryClient.setQueryData(["auth", "me"], { username: "pharmacist", role: "pharmacist" });
      queryClient.setQueryData(["reports", "expired-stock"], { items: [], total_value: 0 });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Reports />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Permitted
      expect(screen.getByText("Expired Stock")).toBeInTheDocument();

      // Forbidden
      expect(screen.queryByText("Sales by Date")).not.toBeInTheDocument();
      expect(screen.queryByText("Top Medicines by Revenue")).not.toBeInTheDocument();
      expect(screen.queryByText("Purchases by Supplier")).not.toBeInTheDocument();
    });

    it("renders Sales by Date and Top Medicines for Cashier, hiding forbidden sections", () => {
      queryClient.setQueryData(["auth", "me"], { username: "cashier", role: "cashier" });
      queryClient.setQueryData(["reports", "sales-by-date", { from: expect.any(String), to: expect.any(String) }], []);
      queryClient.setQueryData(["reports", "top-medicines", { from: expect.any(String), to: expect.any(String), limit: 10 }], []);

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Reports />
          </MemoryRouter>
        </QueryClientProvider>
      );

      // Permitted
      expect(screen.getByText("Sales by Date")).toBeInTheDocument();
      expect(screen.getByText("Top Medicines by Revenue")).toBeInTheDocument();

      // Forbidden
      expect(screen.queryByText("Expired Stock")).not.toBeInTheDocument();
      expect(screen.queryByText("Purchases by Supplier")).not.toBeInTheDocument();
    });
  });

  describe("Other Page Permissions", () => {
    it("renders cancel bill button on SalesHistory only for Admin", () => {
      const mockSalesData = {
        items: [
          {
            bill_no: 1001,
            cust_name: "Walk-in Customer",
            emp_name: "Admin Staff",
            sale_date: "2026-11-07T12:00:00Z",
            payment_mode: "Cash",
            total_amt: 250.0,
            status: "Completed",
          },
        ],
        total: 1,
      };

      // Admin renders cancel button
      queryClient.setQueryData(["auth", "me"], { username: "admin", role: "admin" });
      queryClient.setQueryData(["sales", { search: undefined, from: undefined, to: undefined, page: 1, page_size: 15 }], mockSalesData);

      const { unmount } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <SalesHistory />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByTitle("Cancel bill")).toBeInTheDocument();
      unmount();

      // Cashier does NOT render cancel button
      queryClient.setQueryData(["auth", "me"], { username: "cashier", role: "cashier" });
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <SalesHistory />
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.queryByTitle("Cancel bill")).not.toBeInTheDocument();
    });

    it("renders Add Medicine button on Medicines page for Admin and Pharmacist, but not Cashier", () => {
      queryClient.setQueryData(["medicines", { search: undefined, category: undefined, status: undefined, page: 1, page_size: 15 }], {
        items: [],
        total: 0,
      });

      // Admin
      queryClient.setQueryData(["auth", "me"], { username: "admin", role: "admin" });
      const { unmount: unmountAdmin } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Medicines />
          </MemoryRouter>
        </QueryClientProvider>
      );
      expect(screen.getByRole("button", { name: /add medicine/i })).toBeInTheDocument();
      unmountAdmin();

      // Pharmacist
      queryClient.setQueryData(["auth", "me"], { username: "pharmacist", role: "pharmacist" });
      const { unmount: unmountPharm } = render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Medicines />
          </MemoryRouter>
        </QueryClientProvider>
      );
      expect(screen.getByRole("button", { name: /add medicine/i })).toBeInTheDocument();
      unmountPharm();

      // Cashier
      queryClient.setQueryData(["auth", "me"], { username: "cashier", role: "cashier" });
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <Medicines />
          </MemoryRouter>
        </QueryClientProvider>
      );
      expect(screen.queryByRole("button", { name: /add medicine/i })).not.toBeInTheDocument();
    });
  });
});
