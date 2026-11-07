# MediDeck — Pharmacy Management System

[![CI](https://github.com/your-username/medidesk/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/medidesk/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)

A production-grade, internal dispensary operations and pharmacy management system designed for clinical staff (**Admin**, **Pharmacist**, and **Cashier**). Built with a high-performance **FastAPI** backend using raw, parameterized **psycopg 3** queries, PostgreSQL database triggers for transactional integrity, and a **React 19** frontend styled with **Tailwind CSS**.

---

## 🌟 Features Overview

- **Executive & Operations Dashboard**: Real-time KPI summaries (medicines count, daily sales, bill volume, low stock, expiring soon, and expired units), interactive 7/14/30-day revenue trend charts, category stock distribution, and live stock alert feeds.
- **Medicine Catalog & Inventory**: Complete catalog management with category filtering, batch tracking, manufacturing and expiry dates, remaining shelf-life calculation, and automated stock indicators.
- **Point of Sale (POS)**: Rapid billing workflow with live medicine search, automated FIFO (First-In, First-Out) oldest-batch allocation, line discounts, employee attribution, and stock verification.
- **Sales History & Audit**: Searchable transaction ledger with receipt inspection and administrator cancellation (trigger-driven automatic stock restoration).
- **Vendor Procurement (Purchase Orders)**: Complete procurement cycle from creation (`Pending`), cancellation, to direct inventory intake (`POST /receive`) creating batches directly.
- **Prescription Records**: Doctor prescriptions linked to registered customers with prescribed dosages and durations.
- **Customer & Supplier Directories**: Patient prescription/purchase histories and vendor multi-line telephone directories.
- **Staff Administration & RBAC**: Employee records with role-based salary masking for non-administrators.
- **Business Intelligence & Reports**: Dedicated analytical reporting for daily sales, top-selling medicines, expired stock valuation, and supplier expenditure, with instant **CSV export**.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.13 / 3.12, FastAPI, psycopg 3 (`psycopg_pool`), Pydantic v2, PyJWT, Argon2-cffi, pytest |
| **Database** | PostgreSQL 16 (Raw parameterized SQL, zero ORM, triggers for stock and totals) |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query v5, Recharts, Lucide Icons |
| **Security** | JWT HTTP-only Cookies, Double-Submit CSRF tokens, Argon2 password hashing, IP & username rate limiting |

---

## 🔐 Role-Based Access Control (RBAC)

MediDeck implements strict role-based access control across all backend endpoints and client navigation:

| Capability / Section | Admin | Pharmacist | Cashier | Notes |
|---|:---:|:---:|:---:|---|
| **POS Billing (New Sale)** | ✅ | ✅ | ✅ | All roles can generate sales |
| **Sales History (View & Inspect)** | ✅ | ✅ | ✅ | Search and view previous bills |
| **Cancel Bill (Restores Stock)** | ✅ | ❌ | ❌ | Restricted to Admin only |
| **Medicines & Batches (View)** | ✅ | ✅ | ✅ | Catalog and stock lookup |
| **Medicines & Batches (Manage)** | ✅ | ✅ | ❌ | Add/edit/delete restricted from Cashier |
| **Stock Alerts Feed** | ✅ | ✅ | ❌ | Low stock / expiry warnings hidden from Cashier |
| **Suppliers & Purchase Orders** | ✅ | ✅ | ❌ | Procurement restricted to Admin & Pharmacist |
| **Receive Purchase Order** | ✅ | ✅ | ❌ | Creates new inventory batches directly |
| **Prescriptions Directory** | ✅ | ✅ | ✅ | Customer prescription records |
| **Customers Directory** | ✅ | ✅ | ✅ | Customer records and history |
| **Staff Directory (Employees)** | ✅ | Masked | Masked | Non-admins see masked salary & phone numbers |
| **Staff Management (Add/Edit/Delete)** | ✅ | ❌ | ❌ | Admin only |
| **Reports: Sales by Date** | ✅ | ❌ | ✅ | Cashier & Admin |
| **Reports: Top Medicines** | ✅ | ❌ | ✅ | Cashier & Admin |
| **Reports: Expired Stock Valuation** | ✅ | ✅ | ❌ | Pharmacist & Admin |
| **Reports: Purchases by Supplier** | ✅ | ❌ | ❌ | Admin only |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Default / Example | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/Pharmacy_Management` | PostgreSQL connection string |
| `ENVIRONMENT` | `development` | `development` or `production` (disables docs in production) |
| `AUTH_ENABLED` | `true` | Enforces authentication (must be `true` in production) |
| `JWT_SECRET` | *(Random 32+ char secret)* | Secret key for signing session JWT tokens |
| `ADMIN_PASSWORD_HASH` | *(Argon2 hash)* | Argon2 password hash for the `admin` account |
| `PHARMACIST_PASSWORD_HASH` | *(Argon2 hash)* | Argon2 password hash for the `pharmacist` account |
| `CASHIER_PASSWORD_HASH` | *(Argon2 hash)* | Argon2 password hash for the `cashier` account |
| `COOKIE_SECURE` | `false` | Set to `true` in production (enforces HTTPS-only cookies) |
| `LOW_STOCK_THRESHOLD` | `20` | Threshold below which medicines/batches trigger low-stock alerts |
| `EXPIRY_WARNING_DAYS` | `30` | Days window to alert for expiring batches |
| `PAYMENT_MODES` | `Cash,Card,UPI` | Comma-separated list of accepted payment modes |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed origins for CORS |
| `FORWARDED_ALLOW_IPS` | `*` | Trusted proxy addresses for proxy-aware rate limiting |

### Frontend (`frontend/.env`)

| Variable | Default / Example | Description |
|---|---|---|
| `VITE_API_URL` | `http://127.0.0.1:8000` | Backend base URL (**no trailing slash**) |

---

## 🔑 Password Hash Generation

MediDeck uses **Argon2id** password hashing. To generate new password hashes for staff accounts, run the following Python command in your terminal:

```bash
python -c "from argon2 import PasswordHasher; ph = PasswordHasher(); print(ph.hash('YourSecretPassword'))"
```

Copy the generated hash string into your `backend/.env` file under the corresponding `*_PASSWORD_HASH` variable.

Default dev credentials:
- **Admin**: `admin` / `Admin@123`
- **Pharmacist**: `pharmacist` / `Pharm@123`
- **Cashier**: `cashier` / `Cashier@123`

---

## 🚀 Local Setup Guide

### 1. Database Setup (All Platforms)

1. Ensure PostgreSQL 14+ is installed and running on `localhost:5432`.
2. Create the database:
   ```sql
   CREATE DATABASE "Pharmacy_Management";
   ```
3. Execute the schema migrations in order:
   - `docs/db/pharmacy_schema.sql` (schema & sample data)
   - `docs/db/01_schema_fixes.sql` (constraints & indexing)
   - `docs/db/02_triggers.sql` (inventory & total calculation triggers)

> 📊 **Entity-Relationship Diagram**: Inspect the complete schema diagram at [`docs/erd.png`](docs/erd.png).

---

### 2. Windows Setup

#### Backend:
```powershell
# Navigate to backend directory
cd backend

# Create virtual environment with Python 3.13
py -3.13 -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install development & test dependencies
pip install -r requirements-dev.txt

# Configure environment
Copy-Item .env.example .env
# Edit .env with your PostgreSQL credentials

# Run tests
pytest -v tests/

# Start server
python run_server.py
```
*Backend runs at `http://127.0.0.1:8000`.*

#### Frontend:
```powershell
# In a new PowerShell window, navigate to frontend
cd frontend

# Install dependencies
npm install

# Run frontend tests
npm test

# Build and verify typecheck
npm run build

# Start development server
npm run dev
```
*Frontend runs at `http://localhost:5173`.*

---

### 3. macOS / Linux Setup

#### Backend:
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install development & test dependencies
pip install -r requirements-dev.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run tests
pytest -v tests/

# Start server
python run_server.py
```

#### Frontend:
```bash
# In a new terminal window, navigate to frontend
cd frontend

# Install dependencies
npm install

# Run tests
npm test

# Build and verify typecheck
npm run build

# Start development server
npm run dev
```

---

## ☁️ Deployment Guide

### Backend Deployment (Render, Railway, or AWS)
1. Set the root directory to `backend`.
2. Build command:
   ```bash
   pip install -r requirements.txt
   ```
3. Start command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'
   ```
4. Set production environment variables:
   - `ENVIRONMENT=production` (automatically disables `/docs`, `/redoc`, and `/openapi.json`)
   - `COOKIE_SECURE=true` (enforces `SameSite=None; Secure` cookies for cross-origin hosting)
   - `DATABASE_URL`: Your managed cloud PostgreSQL connection URL (e.g. Neon, Supabase, Render)
   - `JWT_SECRET`: A secure, random 32+ character string
   - `CORS_ORIGINS`: Your production frontend URL (e.g. `https://medideck.vercel.app`)

### Frontend Deployment (Vercel, Netlify, or Cloudflare Pages)
1. Set the root directory to `frontend`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set environment variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://medideck-api.onrender.com`).
   > ⚠️ **Important**: Do **NOT** include a trailing slash in `VITE_API_URL` (e.g., use `https://api.example.com`, not `https://api.example.com/`).

---

## ⚠️ Important Database Architecture Note

Stock deduction and bill totals are strictly maintained by **PostgreSQL database triggers**:
- `medicine_batch.qty_in_stock` is updated automatically when sales lines are created, when sales are cancelled, and when purchase orders are received.
- `sale.total_amt` is computed automatically from line items.

**Never write to `medicine_batch.qty_in_stock` or `sale.total_amt` from application code.** All writes touching multiple tables run within single, atomic database transactions.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
