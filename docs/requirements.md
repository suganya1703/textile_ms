# Loomdo — System Requirements Specification (SRS)
**Tagline:** "Every roll, traced from yarn to invoice."  
**Event:** Odoo x NMIT Bangalore Hackathon 2026  
**Demo Client:** Everest Textile Mills  
**Target Architecture:** 100% Offline, Rule-Based, ERP-Complementary Textile Manufacturing Platform  

---

## 1. Executive Summary & Product Vision

### 1.1 Problem Statement
Small-to-midsize textile mills in India (e.g., in Tirupur, Surat, Salem, Coimbatore, Erode) still run floor operations on physical registers, handwritten chalkboards, torn paper slips, phone calls, and manual floor walks. Traditional Tier-1 ERPs (such as SAP or complex Odoo enterprise suites) are often too heavy for mill-floor operators wearing dusty gloves, resulting in delayed data entry, lost roll traceability, mixed dye-lot shipments, unchecked scrap wastage, and end-of-month wage disputes.

### 1.2 The Loomdo Solution
**Loomdo** is a unified, offline-first mill-floor manufacturing and traceability platform designed to complement ERPs like Odoo—not imitate or duplicate back-office accounting. Loomdo digitizes every physical event at the exact second it occurs:
1. **Gate to Cone:** Yarn arrival, batch assignment, and stock reservation.
2. **Spindle to Loom:** Machine status tracking, shift assignment, and live production feed.
3. **Loom to Roll:** Four-point fabric inspection, automated grading (Grade A / B / Reject), and instant QR Roll Passport generation.
4. **Roll to Truck:** Strict single-lot dispatch verification, dye-lot clash prevention, and atomic invoice generation.
5. **Worker to Rupee:** Generated shift wages based on attendance and machine run-hours without manual typing.
6. **Floor to ERP:** Clean CSV export pipelines formatted specifically for Odoo 16/17/18 product, lot, stock, and invoice import screens.

### 1.3 Offline & Explainability Mandate
- **Zero Cloud / Zero External Calls:** No CDNs, no Google Fonts, no external analytics, no payment gateways, no cloud databases.
- **Zero AI / LLM Calls:** 100% deterministic, explainable, rule-based algorithms. Every calculation (yield, defect grading, delay risk, wage generation) can be explained by a student in two sentences.
- **Single-Command Setup:** Seamless local boot using standard Python/Node tools on any air-gapped machine.

---

## 2. User Personas & Core Journeys

| Persona | Role | Key Jobs to Be Done | Primary Modules |
| :--- | :--- | :--- | :--- |
| **Murugan S.** | Mill Owner / MD | View daily P&L, monitor machine output, inspect margin alerts, check labour wage reconciliation, download Odoo exports. | Owner Dashboard, Costing, Settings |
| **Karthik R.** | Production Supervisor | Allocate orders to machines, monitor real-time loom status, review shift handover reports, unblock machine bottlenecks. | Production Board, Floor Map, Insights |
| **Selvam M.** | Machine Operator / Weaver | Check machine assignments, log hourly meterage output, report machine breakdown instantly. | Mobile Floor Mode, Production Board |
| **Anitha P.** | Quality Inspector | Inspect rolls on the perch table, log defect types and dimensions, compute ASTM 4-point grades, generate Roll Passports. | Quality, Roll Passport |
| **Venkatesh K.** | Warehouse & Dispatch Head | Verify yarn arrivals, check order yarn sufficiency, stage finished rolls, prevent dye-lot mixing, generate dispatch invoices. | Inventory, Dispatch |
| **Suresh Textiles** | Garment Buyer (External) | Check live order progress timeline via phone or QR code without requiring mill login credentials. | Public Order Tracking |

---

## 3. Functional Requirements by Module

### Module 1: Inventory (Yarn at the Gate)
- **FR-1.1 Yarn Arrival Intake:** Capture supplier, yarn type (e.g., Cotton 30s, Cotton 40s, Poly-Cotton), colour/shade, gross weight (kg), unit cost (₹/kg), storage rack location, and optional linked customer order.
- **FR-1.2 Automatic Batch Identification:** Generate structured unique batch codes (`YB-YYYYMMDD-XXX`) with receiving timestamp and operator signature.
- **FR-1.3 Live Stock Balance:** Display available stock grouped by yarn type and shade. Maintain `kg_remaining = kg_received - sum(kg_issued) + sum(kg_returned)`.
- **FR-1.4 Low-Stock Alert System:** Compare available kg against configurable threshold settings. Highlight low stock in amber/red with visual badges.
- **FR-1.5 Order Feasibility & Yarn Sufficiency Checker:** Given an order ID or required metres, compute required yarn (kg) based on fabric grams-per-square-metre (GSM) and expected yield. If short, display exact deficit (`Shortfall: X.X kg`) and generate a 1-click copyable Purchase Order draft text for WhatsApp/Email to suppliers.

### Module 2: Production Board (Floor Live Operations)
- **FR-2.1 Machine Status Cards:** Display each machine's current operational state: `Running` (Green), `Idle` (Amber), `Breakdown` (Red). Card displays machine code, stage (Spinning / Weaving / Dyeing), active order, operator, shift, output today (metres), and progress %.
- **FR-2.2 Sub-Views:** Instant tab filtering for All Machines, Running, Idle, and Breakdown.
- **FR-2.3 Job Assignment Workflow:** Assign pending production jobs to machines. Strict validation: cannot assign to a machine in `Breakdown` state or already `Running` an active job.
- **FR-2.4 Live Polling:** Client automatically polls the backend machine status endpoint every 5 seconds without full page refreshes.
- **FR-2.5 Production Progress Updates:** Enable operators/supervisors to log incremental output (metres) and update job progress percentage.

### Module 3: Quality Control & Roll Traceability
- **FR-3.1 Roll Registration:** Rolls created upon completion of a weaving/dyeing stage with length (m), width (inches), weight (kg), dye lot, machine ID, yarn batch ID, shift, and operator.
- **FR-3.2 Inspection Workstation:** Quality Inspector selects an uninspected roll (`qc_status = 'pending'`). Inspector adds visual defects with defect type (`hole`, `colour_mismatch`, `uneven_weave`, `stain`, `other`) and defect length (inches).
- **FR-3.3 Four-Point Grading Engine (ASTM D5430):**
  - Defect length up to 3 inches $\rightarrow$ 1 point.
  - Defect length > 3 inches up to 6 inches $\rightarrow$ 2 points.
  - Defect length > 6 inches up to 9 inches $\rightarrow$ 3 points.
  - Defect length > 9 inches $\rightarrow$ 4 points.
  - Holes and openings: up to 1 inch $\rightarrow$ 2 points; > 1 inch $\rightarrow$ 4 points.
  - Penalty point rate:
    $$\text{Points per } 100 \text{ sq yd} = \frac{\text{Total Defect Points} \times 3600}{\text{Length (yards)} \times \text{Width (inches)}} \quad (\text{where } \text{Length (yd)} = \text{Length (m)} \times 1.09361)$$
  - Classification Rules (Configurable in Settings):
    - Points $\le 20$ points/100 sq yd $\rightarrow$ **Grade A** (`Pass`)
    - Points $> 20$ and $\le 40$ points/100 sq yd $\rightarrow$ **Grade B** (`Pass with concession / markdown`)
    - Points $> 40$ points/100 sq yd $\rightarrow$ **Reject** (`Reject`)
- **FR-3.4 QC Queues:** Explicit tabs for Pending Inspection, Passed (Grade A & B), Rework Required, and Rejected.
- **FR-3.5 Roll Lineage & Pedigree Tree:** End-to-end traceability view: Roll $\rightarrow$ Order $\rightarrow$ Machine $\rightarrow$ Yarn Batch $\rightarrow$ Supplier $\rightarrow$ Operator, Shift, and Inspection Record.

### Module 4: Order Tracking & Customer Transparency
- **FR-4.1 Internal Order Lifecycle:** Manage orders through stages: `Created` $\rightarrow$ `Yarn reserved` $\rightarrow$ `Spinning` $\rightarrow$ `Weaving` $\rightarrow$ `Dyeing` $\rightarrow$ `QC` $\rightarrow$ `Ready` $\rightarrow$ `Dispatched`.
- **FR-4.2 One-Click Dispatch Notification Generator:** Generates localized SMS/WhatsApp text strings for staff copy-paste (e.g., *"Dear Suresh Textiles, your order #ORD-104 (Cotton 40s Navy Blue) is currently in Dyeing at Everest Textile Mills. Expected completion: 18 Oct 2026."*).
- **FR-4.3 Public Buyer Tracking View (`/track/:order_id`):** Standalone zero-login screen accessible by buyers via direct URL or invoice QR code. Shows order status timeline, percentage completion, and estimated dispatch date.
- **FR-4.4 Bilingual Interface (English & Tamil):** Instant localized toggle on the tracking screen with offline dictionary (no external translation APIs).

### Module 5: Dispatch & Finished Stock
- **FR-5.1 Derived Finished Stock:** NO separate `FinishedGoods` table. Finished stock is derived dynamically via repository view query:
  $$\text{Finished Stock} = \text{Rolls WHERE } qc\_status \in (\text{'pass'}) \text{ AND } dispatched = \text{false}$$
  Grouped by `fabric_type`, `colour`, `dye_lot`, and `grade`. Dispatched stock is queried as `Rolls WHERE dispatched = true JOIN dispatches`.
- **FR-5.2 Dispatch Staging Wizard:** Select buyer $\rightarrow$ display only eligible (passed, undispatched) rolls. Show dynamic meterage and roll counters.
- **FR-5.3 Dye-Lot Clash Guard:**
  - Evaluates staged rolls for differing `dye_lot` codes.
  - If multiple dye lots are mixed for a single buyer delivery, emit an alert showing potential shading variation.
  - Suggest alternative rolls of the same dye lot to complete the metre requirement.
  - If the dispatcher chooses to override, require a mandatory written justification reason, logged permanently to `AuditLog`.
- **FR-5.4 Atomic Single-Transaction Dispatch:**
  - Enforce atomic database transaction with roll locks (`SELECT ... FOR UPDATE` or SQLite transaction lock).
  - Re-verify every selected roll is `qc_status='pass'` and `dispatched=false`.
  - Mark `dispatched=true` and associate `dispatch_id`.
  - Automatically generate `Invoice` with line items, tax, and grand total.
  - Write audit log entry.
  - Atomic rollback if any roll fails verification or is double-dispatched.
- **FR-5.5 Double-Dispatch Protection:** Concurrency-safe validation preventing two dispatchers from shipping the same roll concurrently.

### Module 6: Workforce & Automated Wage Generation
- **FR-6.1 Worker Profiles:** Maintain worker name, role (Spinner, Weaver, Dyer, QC, Maintenance), skill level, standard hourly rate (₹/hr), overtime multiplier (e.g., 1.5x), and default shift (Morning, Evening, Night).
- **FR-6.2 Daily Attendance Register:** Record check-in, check-out, status (`present`, `absent`, `leave`), and auto-computed `hours_worked`.
- **FR-6.3 Shift Job Assignments:** Record worker assignment to a specific `production_job` and machine for a shift duration.
- **FR-6.4 Zero-Manual-Entry Wage Generator:**
  - Wages are purely generated by system formulas:
    $$\text{Job Wage} = (\text{Regular Hours} \times \text{Hourly Rate}) + (\text{Overtime Hours} \times \text{Hourly Rate} \times \text{OT Multiplier})$$
  - Unallocated shift hours (present worker with no active job due to breakdown/idle loom) are automatically booked as `wage_type = 'idle'`.
  - General plant maintenance/cleaning hours booked as `wage_type = 'general'`.
  - Strict invariants: No manual wage typing; no duplicate wage records per worker per shift; no wage generation for absent workers.
  - Order direct labour cost = $\sum \text{Wage.amount WHERE order\_id is set}$.

### Module 7: Costing & Profitability
- **FR-7.1 Granular Order Cost Breakdown:**
  - **Yarn Cost:** $\sum (\text{kg\_issued} - \text{kg\_returned}) \times \text{cost\_per\_kg}$
  - **Direct Labour Cost:** $\sum \text{Wage.amount}$ linked to the order's jobs.
  - **Overhead Allocation:** Machine hours run $\times$ factory overhead rate per hour (from Settings).
  - **Wastage Cost:** Cost of yarn consumed exceeding expected yield.
  - **Rework Cost:** Additional operator hours and machine run time incurred on reworked rolls.
- **FR-7.2 Order Profit & Margin Analysis:** Compare Total Order Revenue ($\text{metres} \times \text{price\_per\_m}$) against Total Manufacturing Cost. Calculate Gross Margin %.
- **FR-7.3 Loss-Making Margin Alerts:** System flags any order where Total Cost > Revenue with a prominent Red Badge and margin deficit warning.

### Module 8: Owner Dashboard & Executive Reconciliation
- **FR-8.1 Operational & Financial KPIs:** Metres produced today, active machine utilization %, total revenue this month, total wages paid, outstanding buyer receivables.
- **FR-8.2 Factory P&L Summary:** Live ledger comparing Invoiced Revenue against Yarn Expense, Direct Labour, Idle Labour, Overhead, and Maintenance.
- **FR-8.3 Dedicated Idle Labour Line:** Highlighting cost of machine downtime directly as paid idle labour in rupees.
- **FR-8.4 Labour Reconciliation Engine:**
  - Mathematically verifies factory wage distribution:
    $$\sum \text{Order Direct Labour} + \sum \text{Idle Labour} + \sum \text{General Labour} = \sum \text{Total Shift Wages}$$
  - Renders a real-time "Reconciliation Verified" green badge on the dashboard.

### Module 9: Insights & Root-Cause Analytics
- **FR-9.1 Machine Defect Concentration:** Aggregates defect points per 100 metres by machine. Generates plain-English statements (e.g., *"Loom W-03 has 3.1x higher defect points than mill average"*).
- **FR-9.2 Yarn Batch Defect Correlation:** Identifies correlation between defect types and yarn supplier lots (e.g., *"Colour mismatch defects are 78% concentrated in yarn batch YB-2026-0412"*).
- **FR-9.3 Shift Defect Disparity:** Compares defect and rework rates across shifts (e.g., *"Night shift rework rate is 18.2% vs 5.8% on Day shift"*).
- **FR-9.4 Interactive Defect Heatmap:** Matrix plotting Machines (rows) vs Defect Types (columns).
- **FR-9.5 Yield & Scrap Wastage Tracker:** Evaluates actual fabric output kg against yarn consumed kg vs standard yield benchmark. Identifies abnormal scrap rates.
- **FR-9.6 Rule-Based Delay-Risk Engine:**
  - For every active order, computes required daily output:
    $$\text{Required Rate} = \frac{\text{Remaining Metres}}{\text{Days Until Deadline}}$$
  - Compares against Current Rate (average output today across assigned machines).
  - Assigns status:
    - `Green`: Current Rate $\ge$ Required Rate.
    - `Amber`: Current Rate between 70% and 99% of Required Rate.
    - `Red`: Current Rate < 70% of Required Rate.
  - Proposes concrete rule-based action (e.g., *"Order #ORD-103 needs 45 m/day, currently 20 m/day. Suggestion: Loom W-05 is idle, allocate remaining 250 m to W-05"*).

### Module 10: Interactive SVG Floor Map
- **FR-10.1 Real-Time Mill Layout:** Stylized 2D architectural SVG map showing Spinning Shed, Weaving Shed, and Dyeing House.
- **FR-10.2 Dynamic Machine Nodes:** Machines positioned at $(x, y)$ coordinates with live status colors (Green, Amber, Red).
- **FR-10.3 Quick Inspection Popover:** Clicking any machine node opens an interactive inspection card showing current job, operator name, current speed/output, and quick toggle buttons.

### Module 11: Settings, Audit Trail & Odoo Integration
- **FR-11.1 Configurable Factory Settings:** Mill Name (`Everest Textile Mills`), default tax rate (GST %), low-stock yarn threshold (kg), overhead rate (₹/hr), standard yield ratio, four-point grading thresholds.
- **FR-11.2 Searchable Audit Trail:** Comprehensive table logging every write operation: `user`, `action`, `entity`, `entity_id`, `before_state`, `after_state`, and `timestamp`. Filterable by entity and action.
- **FR-11.3 Odoo CSV Export Engine:**
  - Prepares Odoo-compliant CSV exports with configurable header mappings:
    1. Products (`loomdo_odoo_products.csv`)
    2. Serial Numbers & Lots (`loomdo_odoo_lots.csv`)
    3. Stock Quantities (`loomdo_odoo_stock.csv`)
    4. Customer Invoices (`loomdo_odoo_invoices.csv`)
- **FR-11.4 Shift Handover Report Generator:** Printable 1-click modal summarizing shift throughput, machine downtime incidents, pending QC rolls, low stock warnings, and flagged delayed orders.

---

## 4. Differentiating Offline Capabilities

### Feature D-1: Roll Passport & Printable Label
- Standalone view at `/passport/:roll_id`.
- Fully offline QR-code generation rendering direct link to the passport.
- Printable roll tag formatted for industrial sticker printers (Roll ID, Order No, Fabric Type, Length, Width, Grade, Operator, Inspection Date, QR code).
- Interactive journey breadcrumb displaying full provenance (Yarn Supplier $\rightarrow$ Batch $\rightarrow$ Loom $\rightarrow$ Inspection $\rightarrow$ Dispatch $\rightarrow$ Invoice).

### Feature D-2: Live Machine Feed Simulator
- Background event simulator simulating physical electronic loom counters.
- Randomly increments running machine outputs and occasionally triggers simulated sensor idle/breakdown events.
- Distinctly labeled in the UI as *"Simulated Machine Sensor Feed (Ready for Hardware MQTT/Serial Integration)"*. Can be paused or triggered manually.

### Feature D-3: Order Feasibility & Profitability Simulator
- Pre-order quote calculator on the Orders screen:
  - Input: Fabric Type, Colour, Quantity (metres), Target Deadline, Buyer Offered Price (₹/m).
  - Simulator queries: Yarn stock sufficiency, free machine capacities, standard production speeds.
  - Output:
    - Earliest achievable delivery date.
    - Estimated manufacturing cost breakdown (Yarn + Labour + Overhead).
    - Projected gross profit margin %.
    - Strategic Recommendation: **ACCEPT** (profitable and on time), **RENEGOTIATE** (insufficient time or slim margin), or **DECLINE** (loss-making or impossible deadline).

### Feature D-4: Mobile Mill-Floor Mode
- Specialized responsive touch interface (`/floor-mode`) with high-contrast, large-button design suitable for tablet/phone mounted at machine perches:
  - Scan / enter Roll ID.
  - One-tap Machine Status toggle (Running / Idle / Breakdown).
  - Rapid roll output logger (+10m, +50m, custom).
  - Rapid defect logger (select defect type $\rightarrow$ select size band $\rightarrow$ save).

---

## 5. Planted Demo Story Specifications

The demo seed data must explicitly demonstrate Everest Textile Mills' realistic operating challenges:
1. **Loom W-03 (High Defect Anomaly):** Weaving loom W-03 has a worn shuttle causing uneven weave and yarn snarls. Its rolls accumulate 3.2x higher defect points than the rest of the mill (highlighted in Insights and Quality).
2. **Yarn Batch YB-2026-0412 (High Wastage Anomaly):** A batch of Cotton 30s from a secondary supplier exhibits poor tensile strength, causing 14.5% scrap wastage against an expected 3% threshold (flagged in Yield & Wastage).
3. **Order ORD-2026-003 (Delay-Risk Trigger):** Order for FabIndia Exports falling behind schedule (needs 48 m/day, running at 19 m/day). Delay-Risk engine flags Red and suggests idle Loom W-05.
4. **Machine Loom W-04 (Breakdown):** Loom W-04 in breakdown state due to motor bearing failure, generating idle labour cost for the assigned weaver.
5. **Cotton 30s Dyed Black (Low-Stock Alert):** Inventory shows 42 kg remaining against a 100 kg threshold. Generates a 1-click draft PO.
6. **Order ORD-2026-006 (Dye-Lot Clash Warning):** Buyer Raymond Apparel order has 6 rolls in Lot L-101 and 2 rolls in Lot L-102. Staging both triggers the Dye-Lot Clash Guard in Dispatch.
7. **Shift Overtime Anomaly:** Thursday night shift suffered loom breakdowns and had to run 4.5 hours of emergency overtime, visible in the Workforce report.
8. **Order ORD-2026-008 (Loss-Making Order):** Under-quoted order where actual yarn and labour costs exceeded the agreed selling price, triggering the Costing Red Margin Alert.

---

## 6. Non-Functional & Offline Requirements
- **NFR-1 Offline Execution:** 100% operable without internet connectivity. All assets, fonts (Inter), icons, and scripts locally bundled.
- **NFR-2 Performance & Response Time:** Local REST API response time $< 50$ ms for typical queries; full client-side filter rendering $< 16$ ms (60 FPS).
- **NFR-3 Responsive Design:** Clean layout responsive from 1920px desktop down to 360px mobile. Tables convert to stacked, swipeable card lists on small viewports.
- **NFR-4 Data Integrity & Concurrency:** ACID transactions on SQLite with WAL mode enabled. Concurrency tests verifying no double-dispatch or oversold inventory.
- **NFR-5 Code Maintainability:** Clean separation of concerns (Schemas, Models, Repositories, Routers, Components, Services) allowing 3 team members to contribute in parallel without merge conflicts.
