# Loomdo — Implementation Tasks & Roadmap
**Tagline:** "Every roll, traced from yarn to invoice."  
**Event:** Odoo x NMIT Bangalore Hackathon 2026  
**Demo Client:** Everest Textile Mills  

---

## Team Parallelization Strategy (3 Developer Tracks)

To enable 3 developers to build concurrently without merge conflicts or architectural drift:
- **Core Architecture & Schema** (Milestone 1) is completed first to establish stable models, SQLite DB, Pydantic schemas, and API contracts.
- **Frontend Foundation** (Milestone 2) sets up the Vite React app, Tailwind styling tokens (`#714B67` / `#5BC8B0`), routing shell, and reusable components.
- **Milestone 3 (Parallel Development Tracks):**
  - **Track A (Dev 1 - Material & Money):** Inventory Module + Orders Module + Costing Module + Order Feasibility Simulator.
  - **Track B (Dev 2 - Operations & IoT):** Production Board + Floor Map + Mobile Mill-Floor Mode + Simulated Machine Sensor Feed.
  - **Track C (Dev 3 - Traceability & Compliance):** Quality (4-Point Engine) + Roll Passport + Dispatch (Dye-Lot Guard) + Workforce (Wage Engine) + Owner Dashboard + Insights + Odoo Export.
- **Milestone 4 (Integration, Planted Demo Story & Automated Testing):** Rigorous unit and integration test suite (concurrent double-dispatch test, wage math verification, 4-point grading verification), full realistic seed script with all 8 planted story points.
- **Milestone 5 (Polish, Offline Verification & Single-Command Setup):** Packaging, offline asset checks, documentation, and single-click startup scripts.

---

## Detailed Task Breakdown

### Milestone 1: Core Backend Architecture & Database Layer
- [ ] **Task 1.1: Backend Project Skeleton & Dependency Setup**
  - Initialize `backend/` directory with Python virtual environment structure.
  - Create `requirements.txt` (`fastapi`, `uvicorn`, `sqlalchemy>=2.0`, `pydantic>=2.0`, `pytest`, `httpx`).
  - Configure `backend/app/core/config.py` and `database.py` with SQLite WAL mode and foreign key PRAGMA enforcement.
- [ ] **Task 1.2: SQLAlchemy ORM Models**
  - Create `models/master.py` (`Supplier`, `Buyer`, `Machine`, `Worker`, `Setting`).
  - Create `models/yarn_order.py` (`YarnBatch`, `Order`, `ProductionJob`, `YarnConsumption`).
  - Create `models/quality.py` (`Roll`, `Defect`, indexed on `(qc_status, dispatched)`).
  - Create `models/dispatch_finance.py` (`Dispatch`, `Invoice`, `Payment`, `Expense`).
  - Create `models/workforce.py` (`Attendance`, `JobAssignment`, `Wage`).
  - Create `models/system.py` (`AuditLog`).
- [ ] **Task 1.3: Pydantic DTOs & Schemas**
  - Define input/output schemas for all entities with strict validation (positive quantities, future deadlines, valid enums).
- [ ] **Task 1.4: Database Init & Seed Foundation**
  - Create `backend/app/db/init_db.py` to auto-create schema tables and populate default `Setting` entries (mill name, 4-point grading thresholds, yield ratios, tax rate).

---

### Milestone 2: Frontend Foundation & Design System Kit
- [ ] **Task 2.1: React (Vite) Project Setup with Tailwind CSS**
  - Scaffold `frontend/` using Vite + React.
  - Install dependencies: `lucide-react`, `qrcode.react`, `@fontsource/inter`, `clsx`, `tailwind-merge`.
  - Configure Tailwind with exact design tokens:
    - Primary Purple `#714B67`, Dark `#56384E`, Deep `#3D2837`.
    - Teal Accent `#5BC8B0`, Dark `#48A38F`.
    - Status colors: Green `#22C55E`, Amber `#F59E0B`, Red `#EF4444`.
- [ ] **Task 2.2: Reusable Component Library (`frontend/src/components/common/`)**
  - `Card.jsx` / `CardHeader.jsx` / `CardContent.jsx`: Unified card styling.
  - `Table.jsx`: Responsive table with automatic mobile stacked-card rendering.
  - `Badge.jsx`: Unified status badges (running, idle, breakdown, grade A/B/reject).
  - `Button.jsx`: Primary, secondary, outline, danger states.
  - `FormField.jsx`: Label, input/select/textarea, inline error message.
  - `Modal.jsx`: Accessible modal dialog with backdrop and keyboard close.
  - `Toast.jsx`: Lightweight notification system for success/error feedback.
  - `EmptyState.jsx`: Clean empty list placeholder with action trigger.
  - `PageHeader.jsx`: Title, breadcrumbs, action button group.
- [ ] **Task 2.3: Layout & Navigation Shell**
  - Build `AppLayout.jsx` with persistent sidebar containing 11 modules in strict order.
  - Implement mobile hamburger menu for screen widths $< 768$px.
  - Setup React Router DOM with routes for all 11 modules + standalone views (`/track/:order_id`, `/passport/:roll_id`, `/floor-mode`).

---

### Milestone 3: Module Implementation (Parallel Tracks)

#### Track A: Material & Orders & Financial Costing
- [ ] **Task 3.A.1: Module 1 — Inventory (Yarn at the Gate)**
  - Backend: `GET /api/inventory/yarn`, `POST /api/inventory/yarn/arrival`, `GET /api/inventory/yarn/summary`.
  - Frontend: Yarn arrival form with batch generation, stock overview cards, low-stock threshold alerts.
  - Feature: "Can we start this order?" yarn sufficiency widget with shortfall kg calculation and 1-click draft PO copy.
- [ ] **Task 3.A.2: Module 5 — Orders Management**
  - Backend: `GET /api/orders`, `POST /api/orders`, `GET /api/orders/:id`, `PATCH /api/orders/:id/status`.
  - Frontend: Order pipeline cards by stage (`Created` $\rightarrow$ `Dispatched`), WhatsApp notification copy button.
  - Differentiating Feature: Order Feasibility & Profitability Simulator (checks yarn, machines, deadline, margin $\rightarrow$ outputs Accept / Renegotiate / Decline).
  - Standalone View: Public Buyer Tracking page (`/track/:order_id`) with English/Tamil toggle and zero login.
- [ ] **Task 3.A.3: Module 8 — Costing & Profitability**
  - Backend: `GET /api/costing/orders`, `GET /api/costing/orders/:id/breakdown`.
  - Business Logic: Compute Yarn Cost + Direct Labour + Machine Overhead + Wastage + Rework.
  - Frontend: Granular order costing table, gross margin %, and Red Loss-Making Alert badges.

#### Track B: Production Operations, IoT & Floor Map
- [ ] **Task 3.B.1: Module 2 — Production Board**
  - Backend: `GET /api/production/machines`, `POST /api/production/jobs/assign`, `PATCH /api/production/machines/:id/status`, `PATCH /api/production/jobs/:id/progress`.
  - Frontend: Machine cards with color status (Green, Amber, Red), stage, current order, operator, output today.
  - Tabs for All / Running / Idle / Breakdown. Machine assignment validation (prevents busy/broken machines).
  - 5-second polling implementation with smooth UI updates.
- [ ] **Task 3.B.2: Module 10 — Interactive SVG Floor Map**
  - Backend: Machine spatial coordinates and live telemetry endpoint.
  - Frontend: Stylized 2D architectural SVG map of Everest Textile Mills (Spinning, Weaving, Dyeing). Interactive machine blocks with live color coding. Popover details on click.
- [ ] **Task 3.B.3: Differentiating Feature — Simulated Machine Sensor Feed**
  - Backend: Background runner or periodic tick simulator (`POST /api/simulation/tick`) that increments meters and simulates random loom events.
  - Distinctly labeled in the UI: *"Simulated Machine Feed (Ready for Hardware Counters)"*.
- [ ] **Task 3.B.4: Differentiating Feature — Mobile Mill-Floor Mode (`/floor-mode`)**
  - Large touch-target UI for floor operators: fast QR/Roll entry, 1-tap machine status toggles, quick output meters logger (+10m, +50m), rapid defect logger.

#### Track C: Quality, Traceability, Dispatch, Workforce & Executive Views
- [ ] **Task 3.C.1: Module 3 — Quality Control (Perch Station)**
  - Backend: `GET /api/quality/rolls`, `POST /api/quality/rolls/:id/defects`, `POST /api/quality/rolls/:id/grade`.
  - Logic: ASTM D5430 Four-Point Grading calculation (points/100 sq yd $\rightarrow$ Grade A / B / Reject).
  - Frontend: Roll inspection modal, defect logging form, queue tabs (Pending, Pass, Rework, Reject).
  - Pedigree View: Visual lineage tree (Roll $\rightarrow$ Order $\rightarrow$ Machine $\rightarrow$ Yarn Batch $\rightarrow$ Supplier $\rightarrow$ Operator).
- [ ] **Task 3.C.2: Differentiating Feature — Roll Passport & Printable Label**
  - Standalone View: `/passport/:roll_id` with locally rendered canvas QR code using `qrcode.react`.
  - Printable roll sticker layout (Roll ID, Order No, Fabric, Length, Grade, Operator, Inspection Date).
  - Complete roll journey timeline from yarn gate to dispatch invoice.
- [ ] **Task 3.C.3: Module 6 — Dispatch & Finished Stock**
  - Backend: `GET /api/dispatch/finished-stock` (derived from `Rolls WHERE qc_status='pass' AND dispatched=false`).
  - `POST /api/dispatch`: Atomic transaction locking rolls, re-verifying pass/undispatched, setting `dispatched=true`, generating `Invoice`, logging `AuditLog`.
  - Dye-Lot Guard: Detects mixed dye lots, suggests single-lot combinations, requires explicit override reason logged to audit trail.
- [ ] **Task 3.C.4: Module 7 — Workforce & Automated Wage Generation**
  - Backend: `GET /api/workforce/workers`, `GET /api/workforce/attendance`, `POST /api/workforce/attendance`, `POST /api/workforce/generate-wages`.
  - Logic: Generated wages from Attendance $\times$ Job Assignment (Regular + OT + Idle). Zero manual wage typing.
  - Frontend: Worker roster, attendance register, wage report with idle wage breakdown.
- [ ] **Task 3.C.5: Module 9 — Insights & Root-Cause Analytics**
  - Backend: `GET /api/insights/anomalies`, `GET /api/insights/delay-risk`, `GET /api/insights/wastage`.
  - Logic: Machine defect rate comparison, yarn batch defect correlation, shift rework disparities, defect heatmap matrix, rule-based delay risk engine.
  - Frontend: Heatmap visualizer, insights cards with plain-language diagnostic sentences.
- [ ] **Task 3.C.6: Module 4 — Owner Dashboard & Executive Reconciliation**
  - Backend: `GET /api/dashboard/summary`, `GET /api/dashboard/reconciliation`.
  - Metrics: Metres produced, machine utilization, monthly revenue vs expenses, idle labour cost line.
  - Labour Reconciliation Widget: $\sum \text{Order Labour} + \sum \text{Idle Labour} + \sum \text{General Labour} == \sum \text{Total Shift Wages}$ with verified badge.
- [ ] **Task 3.C.7: Module 11 — Settings, Audit Trail, Shift Report & Odoo Export**
  - Settings management for factory constants.
  - Searchable audit trail table.
  - 1-click printable Shift Handover Report.
  - Odoo CSV Export generator (`products`, `lots`, `stock`, `invoices`) with externalized mapping dictionary.

---

### Milestone 4: Planted Demo Seed Data & Automated Test Suite
- [ ] **Task 4.1: Comprehensive Seed Data Script (`backend/app/db/seed.py`)**
  - Tenant: Everest Textile Mills.
  - 6 Suppliers, 8 Buyers, 12 Machines (3 Spinning, 5 Weaving, 4 Dyeing), 18 Workers.
  - 1 week of historical attendance, job assignments, and generated wages.
  - 65+ Rolls across all states.
  - Plant 8 Demo Story Points:
    1. Loom W-03 has 3x average defect points.
    2. Yarn Batch `YB-2026-0412` has high scrap wastage (14.5%).
    3. Order `ORD-2026-003` flagged Red by Delay-Risk Engine.
    4. Loom W-04 in breakdown state.
    5. Cotton 30s Dyed Black below low-stock threshold.
    6. Order `ORD-2026-006` with clashing dye lots staged for dispatch.
    7. Thursday night shift with heavy overtime.
    8. Order `ORD-2026-008` loss-making with margin alert.
- [ ] **Task 4.2: Automated Backend Test Suite (`pytest`)**
  - Concurrency test: Double-dispatch race condition test verifying atomic rollback.
  - Validation test: Cannot start order with insufficient yarn (verifying shortfall message).
  - Validation test: Cannot assign job to broken or busy machine.
  - Validation test: Cannot double-book worker or generate wages twice.
  - Business logic test: ASTM D5430 four-point grading points and classification.
  - Financial test: Labour reconciliation formula and order costing math.

---

### Milestone 5: Offline Packaging, Single-Command Setup & Verification
- [ ] **Task 5.1: Offline Asset Verification**
  - Verify zero external HTTP requests on page load in browser network tab.
  - Verify local font bundling, local icons, and local QR code generation.
- [ ] **Task 5.2: One-Command Startup Scripts**
  - `start.bat` (Windows PowerShell / CMD) & `start.sh` (Linux / macOS): Auto-installs dependencies, seeds database, and boots backend (port 8000) and frontend (port 5173).
- [ ] **Task 5.3: Documentation & Module Explanations**
  - Complete `README.md` with product story, tech stack, 1-command launch, demo script walkthrough.
  - Module documentation in `/docs` explaining key formulas and database queries for hackathon judges' Q&A.
