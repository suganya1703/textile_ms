# Loomdo

**Every roll, traced from yarn to invoice.**

Loomdo is a unified textile manufacturing platform that replaces notebooks, paper slips, floor walks, phone calls and registers with one connected system. It is built for the **Odoo x NMIT Bangalore Hackathon 2026** (Problem Statement: Textile Manufacturing System) and is designed to complement an ERP such as Odoo, not imitate it.

The demo client is **Everest Textile Mills**, a mill that buys yarn, processes it through spinning, weaving and dyeing, inspects the fabric, and sells finished rolls to buyers. Everest is seed data; Loomdo is the product.

---

## Team

| Name | Role |
|---|---|
| Suganya Subramaniam | Team Leader |
| Brindha P | Team Member |
| Deepika SM | Team Member |

---

## The problem

Today the mill tracks raw material in a notebook, checks machine status by walking the floor, records quality on paper slips, gives buyers updates over phone calls, and marks attendance in a register. Orders get delayed, machines sit idle, and nobody knows the real cost of a single roll of fabric.

## Our solution

One database, one chain of data:

**Supplier -> Yarn batch -> Order -> Machine -> Roll -> Quality check -> Dispatch -> Invoice -> Cost**

An action in one module updates the others. For example, dispatching a roll reduces finished stock, a QC result changes order progress, and wages feed into the cost of an order.

---

## Modules (one per scene in the problem statement)

| # | Module | What it does |
|---|---|---|
| 1 | **Inventory** | Log yarn arrivals, live stock by type and colour, low-stock warnings, and a "can we start this order?" check |
| 2 | **Production board** | One card per machine with status, current order, progress and output today; list of idle machines |
| 3 | **Quality control** | Log defects per roll, four-point grading (Grade A / B / Reject), pending queue, roll traceability |
| 4 | **Order tracking** | Public page where a buyer enters an order ID and sees its stage and expected delivery |
| 5 | **Dispatch and invoice** | Dispatch only QC-passed, undispatched rolls, dye-lot warning, matching invoice, no double dispatch |
| 6 | **Owner dashboard** | Cost per order, output per machine, wages, payments received vs due, monthly profit and loss |

### Differentiating features

- **Roll Passport**: a QR code per roll that opens the roll's full journey
- **Live machine feed**: a simulator updates machine status and output; the board polls every 5 seconds
- **Dye-lot guard** at dispatch
- **Four-point fabric grading** with configurable thresholds
- **Yield and wastage tracking**, delay-risk engine, order feasibility simulator
- **Defect root-cause insights**, floor map, audit trail
- **Odoo CSV export** (column names are kept in one config file so they can be matched to Odoo's import templates)

> Note: update this list to match what is actually built before final submission.

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, Pydantic |
| ORM and database | SQLAlchemy, SQLite (local file) |
| Frontend | React (Vite), Tailwind CSS |
| Charts | Recharts (bundled via npm); heatmap and floor map in SVG/CSS |
| QR codes | Local library (works offline) |
| Testing | pytest |
| Version control | Git and GitHub |

Everything runs **offline**: no CDN links, no external APIs, no AI or cloud services. The logic is rule-based and explainable.

---

## Project structure

```
loomdo/
  backend/        FastAPI app, models, routers, seed script, tests
  frontend/       React (Vite) app
  docs/           requirements.md, design.md, tasks.md and module notes
  README.md
```

> Adjust folder names above if your structure differs.

---

## Getting started

### Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer and npm
- Git

### 1. Clone the repository

```bash
git clone <repository-url>
cd loomdo
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python seed.py                  # creates the SQLite database and loads demo data
uvicorn app.main:app --reload --port 8000
```

- API runs at `http://localhost:8000`
- Interactive API docs at `http://localhost:8000/docs`

> Replace `app.main:app` with the actual entry point if it differs.

### 3. Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

- App runs at `http://localhost:5173`

### 4. (Optional) Start the live machine feed simulator

```bash
cd backend
python simulator.py
```

> Replace with the actual script name if it differs.

### Reset the demo data

```bash
cd backend
python reset.py
```

> Wipes the database and reseeds it. Replace with the actual script name if it differs.

---

## Demo login

If login is enabled, demo users are created by the seed script.

| Role | Username | Password |
|---|---|---|
| Owner | owner | (set in seed script) |
| Supervisor | supervisor | (set in seed script) |
| Inspector | inspector | (set in seed script) |

The buyer tracking page and Roll Passport page are public.

---

## Testing Roll Passport QR on Mobile Phone (Same WiFi)

Loomdo's Roll Passport is designed to run 100% offline over your local area network (LAN) without needing internet, external APIs or cloud services.

### 1. Network Accessibility
The Vite frontend server is configured with `host: true` in `frontend/vite.config.js`, making it accessible to any device on your local WiFi network. FastAPI backend CORS allows all LAN origins, and API requests use relative `/api` paths.

### 2. Configure `public_base_url` in Settings
1. Open Loomdo in your browser (`http://localhost:5173`).
2. Navigate to **Settings** &rarr; **Roll Passport QR & Network**.
3. Loomdo automatically queries your machine's active network IP (via `GET /api/settings/lan-ip`).
4. Click the helper button: **"Use this computer's network address (<LAN_IP>)"** (for example, `http://192.168.1.20:5173`).
5. Click **Save**.

### 3. Scan & Verify with your Phone
1. Connect your smartphone to the **same WiFi network** as your computer.
2. Open your smartphone's camera or QR reader.
3. Aim at any Roll Passport QR code:
   - On the **Quality Control** page (click **Trace** on any roll).
   - In the **Quality Control** table (click **Label** to view/print the 4&times;2" sticker).
   - On the **Dispatch** page roll list (click **Label**).
4. Tap the link (`http://<LAN_IP>:5173/passport/<roll_code>`).
5. The public **Roll Passport** loads instantly on your phone with zero login required, displaying the roll's complete provenance:
   - Yarn batch arrival and supplier
   - Order specifications and buyer
   - Weaving machine, operator and shift
   - ASTM 4-point perch inspection flaw scores and grade
   - Warehouse dispatch status and invoice details
   - Manufacturing cost breakdown (yarn + overhead)
6. If an invalid roll code is accessed, a friendly "Roll Not Found" screen appears with a roll search bar.

---

## Validation rules

Enforced in both the backend and the frontend:

- Quantities, weights, lengths and amounts must be greater than 0
- Deadlines cannot be in the past
- An order cannot start without enough yarn
- Only QC-passed, undispatched rolls can be dispatched
- A job cannot be assigned to a machine that is broken down or busy
- A worker cannot be double-booked in a shift or paid twice

---

## Running tests

```bash
cd backend
pytest
```

---

## Demo data

The seed script creates Everest Textile Mills with suppliers, buyers, machines, workers, orders at every stage and a set of rolls. It plants a few situations so the dashboards have something to show: one loom with high defect points, one low-stock yarn, one delayed order, one broken-down machine and two clashing dye lots in one buyer's order.

---

## Notes and limitations

- The machine feed is **simulated** and is designed to be replaced by real machine counters.
- Four-point grading thresholds are **configurable** in Settings.
- Odoo export column names are placeholders and should be matched to Odoo's official import templates.

---

## Contributing (team workflow)

- Work on your own branch, for example `feature/backend-core`, `feature/frontend-ui`, `feature/analytics-quality`
- Open a pull request into `main` and get it reviewed by another team member
- Use meaningful commit messages

---

## Acknowledgements

Built for the **Odoo x NMIT Bangalore Hackathon 2026**. Loomdo is an independent hackathon project and is not made by or affiliated with Odoo.


