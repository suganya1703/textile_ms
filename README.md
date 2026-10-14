# "Loomdo" Textile Mill Management System

Loomdo is a local-first mill management system for **Everest Textile Mills**, built for the **Odoo x NMIT Bangalore Hackathon 2026** (problem statement: Textile Manufacturing System). It is designed to work alongside an ERP like Odoo, not imitate it.

**Screenshots:** add images of the Dashboard, Production Board, Quality, Dispatch, Roll Passport and Buyer Tracking pages in `docs/screenshots/` and link them here.

---

## 1. The problem

Everest Textile Mills runs on notebooks and phone calls:

| Today | Result |
|---|---|
| Raw material stock in a notebook | Nobody knows real stock or gets a low-stock warning |
| Machine and order status by walking the floor | Machines sit idle, orders get delayed |
| Quality checks on paper slips | Defects cannot be traced to a machine or yarn batch |
| Order updates for buyers over phone calls | Someone walks to the floor and calls back later |
| Attendance and wages in a register | Nobody knows the real cost of a single roll |

Loomdo gives the mill one system where every step is entered once and flows into stock, quality, buyer updates and the owner's report.

---

## 2. What Loomdo does

| Mill scene | Module | What you get |
|---|---|---|
| Yarn arrives at the gate | Inventory | Log arrivals (supplier, type, colour, kg, cost/kg, linked order), live stock, low-stock warnings, and a "Can we start this order?" check that states the exact shortfall in kg |
| The floor, mid-shift | Production | One card per machine (status, order, stage, progress, output today, operator), idle and breakdown lists, job assignment, live refresh every 5 seconds, and an SVG Floor Map |
| Checking fabric | Quality | Four-point grading (ASTM D5430) with Grade A / B / Reject, pending / pass / rework / reject lists, full roll traceability |
| Buyer asks about an order | Orders and Tracking | Public tracking page with a stage timeline and expected delivery, English and Tamil, and a copyable status message |
| Loading the truck | Dispatch | Only QC-passed, undispatched rolls, a dye-lot guard, an invoice that matches the selected rolls, finished stock derived from rolls |
| Attendance and wages | Workforce | Attendance, job assignments and wages generated from attendance and hours (never typed), with overtime |
| Owner closes the books | Dashboard and Costing | Cost per order (yarn, labour, overhead, wastage), P&L, wages, payments received versus due, loss-making order alerts, wage reconciliation |
| Mill-floor intelligence | Insights | Defect root-cause statements, yield and wastage, delay-risk per order, order feasibility and profit simulator |

---

## 3. Highlights

- **Roll Passport (QR):** scanning a roll's QR opens its full journey: supplier, yarn batch, order, machine, operator and shift, defects and grade, dispatch and invoice.
- **Delay-risk engine:** compares the required daily output with the current rate and shows green / amber / red with the reason, e.g. "needs 40 m/day, currently 22 m/day", plus a suggested action.
- **Audit trail:** every change to stock, QC results, dispatch and payments is logged (who, what, before, after, when).
- **Machine safety:** a repaired machine never keeps the old job.
- **Safe public pages:** they never expose costs, margins or wages, return the same generic message for any wrong input, and rate-limit repeated failures.
- **Odoo export:** CSV files for Odoo users.

---

## 4. Roles

| Role | Access |
|---|---|
| Owner | Everything, including costing, dashboard, settings and the demo reset |
| Store | Inventory and dispatch |
| Floor | Production, floor map and operator mode |
| QC | Quality inspection |
| Public (no login) | Buyer order tracking and Roll Passport (read-only) |

---

## 5. How data flows

**Inputs**

| Who | Input | Where |
|---|---|---|
| Store | Yarn arrivals: supplier, type, colour, kg, cost/kg | Inventory |
| Office | New orders: buyer, fabric, colour, quantity, deadline, price | Orders |
| Floor supervisor | Job assignment, machine status, progress, output | Production |
| Machine feed (simulated) | Status and metres produced, every few seconds | Simulator |
| QC inspector | Defect type and size per roll | Quality |
| Dispatch clerk | Buyer, QC-passed rolls, vehicle number | Dispatch |
| Supervisor | Attendance | Workforce |
| Owner | Payments, other expenses, thresholds | Dashboard, Settings |

**Outputs**

| Output | Audience |
|---|---|
| Live stock, low-stock warnings, "can we start this order" | Store |
| Machine cards and floor map | Floor |
| Pending / pass / rework / reject lists, roll traceability | QC |
| Order status page and copyable status message | Buyer |
| Finished stock and invoices | Warehouse |
| P&L, cost per order, machine output, wages, loss alerts | Owner |
| Root-cause insights and delay-risk | Management |
| Odoo CSV files | Odoo users |

Yarn (in kg) is processed into fabric (in metres).

**API:** REST, with auto-generated docs at http://localhost:8000/docs. All screens read live data from the API. The only static data is the seed script.

---

## 6. Setup

**Prerequisites:** Python 3.10+, Node.js 18+, Git.

```bash
# 1. Clone
git clone https://github.com/suganya1703/textile_ms.git
cd textile_ms

# 2. Backend
cd backend
python -m venv venv
# Windows: venv\Scripts\activate    macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then set SECRET_KEY (see Security)
# Create tables and load demo data (adjust the command if your seed entry point differs)
python -m app.db.seed
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Everything works with the internet turned off after `npm install` and `pip install`.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Owner | owner@everesttextiles.in | owner@123|
| Store | store@everesttextiles.in|  store@123|


### Resetting the demo

Settings has a **Reset demo data** button (owner only) that re-runs the seed and restores the planted story.

### Testing the Roll Passport QR from a phone

1. Connect the phone and the laptop to the same WiFi.
2. In Settings, set `public_base_url` to the laptop's network address, e.g. `http://192.168.1.20:5173`.
3. Open a roll in Quality, show its QR code, and scan it with the phone's camera.

A dispatch with two clashing dye lots triggers the dye-lot guard.

---

## 7. Project structure

```text
textile_ms/
├── backend/
│   ├── app/
│   │   ├── api/         # FastAPI routers (inventory, production, quality, orders, dispatch, ...)
│   │   ├── core/        # config, database, Odoo export config
│   │   ├── db/          # schema creation and seed script
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   └── services/    # grading, wages, delay risk, simulator, Odoo export
│   └── tests/
├── frontend/
│   └── src/
│       ├── api/         # API client
│       ├── auth/        # roles
│       ├── components/  # shared UI components
│       └── views/       # one view per module
└── docs/                # requirements, design, tasks, module notes
```

---

## 8. Data model (summary)

- **Master data:** Supplier, Buyer, Machine (stage, status, capacity, floor position), Worker, Setting
- **Yarn and orders:** YarnBatch, Order, ProductionJob, YarnConsumption, yarn damage and supplier claim records
- **Rolls and quality:** Roll (linked to order, machine, yarn batch, job, dye lot), Defect
- **Dispatch and money:** Dispatch, Invoice, Payment, Expense
- **Labour:** Attendance, JobAssignment, Wage (generated from attendance and job hours)
- **System:** User, AuditLog

Finished stock is not a separate table; it is derived from rolls.

---

## 9. Design decisions

- **Why local-first:** the production board must keep working if the mill's internet drops.
- **Data:** demo data is synthetic, generated by the seed script (`backend/app/db/seed.py`).
- **Wages:** generated, never typed: regular hours times the hourly rate, plus overtime hours times the rate and the overtime multiplier.
- **Dispatch safety:** dispatch runs in a single database transaction. The selected rolls are locked, `qc_status = 'pass'` and `dispatched = false` are re-verified, the rolls are marked dispatched, the invoice is created and the audit entry is written. If any roll fails the check, the whole dispatch is rejected.

### Validation rules

- Quantities, kg, lengths and amounts must be greater than 0
- Deadlines cannot be in the past
- An order cannot start without enough yarn, and the message states the shortfall
- Rolls that have not passed QC, or are already dispatched, cannot be dispatched
- A broken-down or busy machine cannot be assigned a job
- A worker cannot be double-booked in a shift, assigned while absent, or paid twice
- Required fields, valid dates and enum values, unique invoice numbers

---

## 10. Security

Role-based login (owner, store, floor, QC). Menus and API access depend on the role. The token-signing key comes from the `SECRET_KEY` environment variable in `.env`, which is git-ignored. `.env.example` shows the format. The only public pages are order tracking and the Roll Passport. They are read-only and expose no costs, margins or wages.

---

## 11. UI

One colour palette, one font family (bundled locally), one reusable component set (Card, Table, Badge, Button, FormField, Modal, Toast, EmptyState, PageHeader), a left sidebar with one entry per module, and a layout that stays responsive down to about 360px.

---

## 12. Odoo integration

The Odoo export column names live in one config file (`backend/app/core/odoo_config.py`) so they can be adjusted to Odoo's official import templates.

---

## 13. Tests

```bash
cd backend
pytest
```

Tests cover the validation rules, four-point grading, wage calculation, the dispatch transaction (including concurrent double-dispatch), derived finished stock, job transfer, yarn damage, buyer tracking, and the public endpoints leaking no private fields.

---

## 14. Limitations

- SQLite suits one mill and a handful of concurrent users.
- Cloud sync is future scope.
- Not yet piloted in a real mill.

---

## 15. Future scope

- Connect real machine counters (IoT) to the production feed.
- Buyer notifications by SMS or WhatsApp.

---



Built for the Odoo x NMIT Bangalore Hackathon 2026.
