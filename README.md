# MediDeck — Pharmacy Management System

A comprehensive Pharmacy Management System designed for pharmacy staff (pharmacists, cashiers, and store managers). Built with **FastAPI**, **PostgreSQL** (raw SQL, trigger-driven inventory & bill totals), and **React** with **Tailwind CSS**.

---

## 🌟 Key Features

- **Dashboard**: Live KPI summaries (revenue, bills, stock status, expiring batches), 7/14/30-day interactive sales trend charts, and real-time stock alert feeds.
- **Medicines & Batches**: Complete catalog management, batch tracking with manufacturing & expiry dates, automated expiry status calculation, and low-stock indicators.
- **Point of Sale (POS)**: Fast billing workflow with medicine search, automated oldest-batch selection (FIFO), line-item discounts, employee attribution, and stock deduction.
- **Sales History**: Searchable, date-filtered transaction ledger with receipt inspection and one-click cancellation (with stock restoration via triggers).
- **Purchase Orders**: Vendor procurement workflow from creation (`Pending`), cancellation, to inventory intake (`POST /receive`) creating batches directly.
- **Prescriptions**: Doctor prescription records linked to customers and prescribed dosages/durations.
- **Customers & Suppliers**: Customer purchase/prescription history and vendor phone directories.
- **Employees**: Staff registry with role and wage details.
- **Reports**: Analytical reports for sales by date, top-selling medicines, expired stock valuation, and vendor purchases, with **CSV export**.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12+, FastAPI, psycopg 3 (`psycopg_pool`), Pydantic v2, pytest.
- **Database**: PostgreSQL (Raw SQL queries with parameterized statements, no ORM; trigger-enforced consistency).
- **Frontend**: Vite, React 19, TypeScript, Tailwind CSS v4, TanStack Query, Recharts, Lucide Icons.

---

## 🚀 Local Development Setup

### 1. Database Setup
1. Ensure PostgreSQL is installed and running locally on port `5432`.
2. Create the database:
   ```sql
   CREATE DATABASE "Pharmacy_Management";
   ```
3. Run the migration and schema scripts in order:
   - `docs/db/pharmacy_schema.sql` (schema & sample data)
   - `docs/db/01_schema_fixes.sql` (constraints & optimizations)
   - `docs/db/02_triggers.sql` (triggers for stock & bill totals)

> 📊 **Entity-Relationship Diagram**: See the complete schema diagram at [`docs/erd.png`](docs/erd.png).

---

### 2. Backend Setup
1. Open PowerShell and navigate to the `backend/` directory:
   ```powershell
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure your environment:
   - Copy `.env.example` to `.env`:
     ```powershell
     Copy-Item .env.example .env
     ```
   - Update `DATABASE_URL` with your PostgreSQL username and password:
     ```env
     DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/Pharmacy_Management
     ```
5. Run the development server:
   ```powershell
   python run_server.py
   ```
   *The backend will be live at `http://127.0.0.1:8000` (docs at `http://127.0.0.1:8000/docs`).*

6. Run the test suite:
   ```powershell
   pytest -v tests/
   ```

---

### 3. Frontend Setup
1. Open a new terminal and navigate to the `frontend/` directory:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ☁️ Public Cloud Deployment Guide

To deploy this project online with live database records:

### Step 1: Cloud PostgreSQL Database
Use a managed cloud PostgreSQL provider such as **Neon.tech**, **Supabase**, or **Render**:
1. Create a free PostgreSQL instance.
2. Open its SQL Query Console and execute the three files in order:
   1. `docs/db/pharmacy_schema.sql`
   2. `docs/db/01_schema_fixes.sql`
   3. `docs/db/02_triggers.sql`
3. Copy the public connection string:
   `postgresql://username:password@hostname:5432/dbname?sslmode=require`

---

### Step 2: Deploy Backend (Render / Railway)
1. Push your repository to GitHub.
2. In [Render](https://render.com) or [Railway](https://railway.app), create a new **Web Service** from your GitHub repo.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables:
   - `DATABASE_URL`: *(Your cloud database connection string from Step 1)*
   - `CORS_ORIGINS`: `https://your-frontend-domain.vercel.app` *(or `*` temporarily)*
   - `LOW_STOCK_THRESHOLD`: `20`
   - `EXPIRY_WARNING_DAYS`: `30`
   - `PAYMENT_MODES`: `Cash,Card,UPI`

---

### Step 3: Deploy Frontend (Vercel / Netlify / Render)
1. In [Vercel](https://vercel.com) or [Netlify](https://netlify.com), import your repository.
2. Configure settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Set Environment Variable:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com`
4. Deploy! Your MediDeck application is now live on the internet.

---

## 🧪 Testing

- **Backend Tests (36 tests)**:
  ```powershell
  cd backend
  pytest -v tests/
  ```
- **Frontend Tests**:
  ```powershell
  cd frontend
  npm test
  ```
- **Frontend Typecheck & Production Build**:
  ```powershell
  cd frontend
  npm run build
  ```

