import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import Medicines from "./pages/Medicines";
import Batches from "./pages/Batches";
import NewSale from "./pages/NewSale";
import SalesHistory from "./pages/SalesHistory";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import PurchaseOrders from "./pages/PurchaseOrders";
import Prescriptions from "./pages/Prescriptions";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import { useCurrentUser } from "./api/auth";
import { Loader2 } from "lucide-react";

export default function App() {
  const { data: user, isLoading } = useCurrentUser();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initial authentication check loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent gap-3">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="MediDeck Logo"
            className="h-10 w-10 object-contain animate-pulse"
          />
          <span className="text-xl font-bold tracking-wide text-primary">MediDeck</span>
        </div>
        <div className="flex items-center gap-2 text-text-muted text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Verifying session...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, display login screen
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Authenticated application layout with role-based route guards
  return (
    <div className="flex min-h-screen bg-transparent text-text">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <div
        className="flex flex-1 flex-col transition-[margin-left] duration-200 ease-out"
        style={{
          marginLeft: isSidebarCollapsed
            ? "var(--sidebar-width-collapsed, 72px)"
            : "var(--sidebar-width-expanded, 250px)",
        }}
      >
        <TopBar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/medicines" element={<Medicines />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/new-sale" element={<NewSale />} />
            <Route path="/sales" element={<SalesHistory />} />
            <Route path="/customers" element={<Customers />} />
            
            {/* Pharmacist & Admin restricted routes */}
            <Route
              path="/suppliers"
              element={
                ["admin", "pharmacist"].includes(user.role) ? (
                  <Suppliers />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/purchase-orders"
              element={
                ["admin", "pharmacist"].includes(user.role) ? (
                  <PurchaseOrders />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route
              path="/prescriptions"
              element={
                ["admin", "pharmacist"].includes(user.role) ? (
                  <Prescriptions />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            {/* Admin only restricted routes */}
            <Route
              path="/employees"
              element={
                user.role === "admin" ? <Employees /> : <Navigate to="/" replace />
              }
            />

            <Route path="/reports" element={<Reports />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
