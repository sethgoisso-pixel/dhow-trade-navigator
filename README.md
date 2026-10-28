# Dhow — Autonomous AI Trade & Logistics Navigator

Dhow is an autonomous, sovereign AI trade intelligence and multimodal logistics agent built for global merchants, freight forwarders, and trade authorities connecting Asia, Europe, the Middle East, and Africa.

---

## Executive Summary

Global supply chains face four critical bottlenecks: opaque multi-carrier spot rates, complex WCO HS customs tariff classifications, geopolitical chokepoints (Suez, Red Sea), and administrative latency. 

Dhow resolves these challenges through an end-to-end autonomous agentic architecture:
- **Universal Multimodal Route Optimization**: Generates compliant Air, Ocean, and Sea-Air corridors with exact transit days, landed cost models, and carbon indices.
- **Live WCO Tariff & Compliance Intelligence**: Real-time 6-digit Harmonized System (HS) classification, import duty calculation, and mandatory regulatory checklists.
- **Official Institutional Documentation**: Automatic generation of UN/EDIFACT-compliant Commercial Invoices, Packing Lists, and Ocean Bills of Lading equipped with verification QR codes.
- **Human-in-the-Loop Operational Tower**: Autonomous dispatch preparation with strict operator approvals for carrier bookings and customs pre-filings.
- **Tamper-Proof Dossier Registry**: Every planned shipment is cryptographically referenced (`DHOW-2026-XXXXXXXXXX`) and archived in an immutable cloud audit database.

---

## Key Capabilities

| Module | Purpose | Engine |
| :--- | :--- | :--- |
| **Mission Control (`/`)** | Real-time corridor telemetry, interactive MapLibre geodesic routing, and persistent dossier registry | Lovable Cloud + MapLibre GL |
| **Route Optimizer (`/optimizer`)** | Instant multimodal freight engine comparing fastest, lowest-cost, and optimized corridors | AI Gateway (Strict JSON Schema) |
| **Customs Engine (`/customs`)** | Commodity classification, landed duty calculation, and import compliance rules | WCO 2022/2026 Knowledge Base |
| **Autonomous Dispatch (`/dispatch`)** | Human-in-the-loop control tower for operational order execution | Role-based verification |
| **Sovereign Hub (`/scenarios`)** | Institutional deep dive on Dubai's D33 trade agenda, Jebel Ali (DP World), and DWC Air Corridor | Sovereign Logistics Protocol |

---

## Technical Architecture

- **Full-Stack Framework**: TanStack Start v1 (React 19, Vite, Edge-ready).
- **Styling & Design System**: Tailwind CSS v4 with adaptive Sovereign Dark (*Dubai Midnight Gold*) and Light (*Cloudy Azure Glass*) themes.
- **Database & Persistence**: Lovable Cloud (PostgreSQL with Row-Level Security, audited server functions).
- **Mapping & Geodesics**: MapLibre GL with keyless OpenFreeMap dark/light vector tiles and spherical geodesic line generation.
- **Type Safety**: 100% TypeScript with strict Zod validation schemas.

---

## Local Development

Ensure you have Node.js (v20+) and Bun or npm installed.

```bash
# Clone the repository
git clone <repository-url>
cd dhow-route

# Install dependencies
bun install   # or npm install

# Start development server
bun dev       # runs at http://localhost:8080

# Run automated test suite
bunx vitest run
