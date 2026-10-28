# ⚓ DHOW · Autonomous Multimodal Trade & Logistics Navigator

> **Next-Generation Sovereign Trade Intelligence connecting Asia, the Middle East, and Africa.**  
> *Engineered for the Global AI & Logistics Economy · 100% Real-Time AI · Zero Simulated Data.*

[![Architecture](https://img.shields.io/badge/Architecture-TanStack%20Start%20v1-blue.svg)](https://tanstack.com)
[![Persistence](https://img.shields.io/badge/Database-Lovable%20Cloud-gold.svg)](#)
[![Cartography](https://img.shields.io/badge/Mapping-MapLibre%20GL-emerald.svg)](https://maplibre.org)
[![Nomenclature](https://img.shields.io/badge/Customs-WCO%20HS%202026-navy.svg)](#)

---

## 🌍 Executive Summary

Global supply chains connecting Asian industrial hubs (Shenzhen, Ningbo, Busan) to emerging African and European consumer markets face systemic friction:
- **Red Sea & Geopolitical Bottlenecks**: Maritime routes face +14 days transit and surging insurance premiums.
- **Customs Misclassification**: Over 5,000 WCO HS subheadings cause costly border delays and fiscal penalties.
- **Data Opacity**: Independent shippers spend 48 to 72 hours aggregating freight forwarder quotes across Air, Ocean, and Land.

**DHOW** is an autonomous trade agent that arbitrates multimodal logistics in seconds. Anchored by the world's most strategic neutral crossroads—leveraging bonded Sea-Air corridors (Jebel Ali Port ⇄ Al Maktoum International Airport DWC)—Dhow synthesizes optimal routes, assigns certified Harmonized System (HS) classifications, generates auditable trade dossiers, and presents structured operational actions for human verification.

---

## ⚡ The Origin Story: Built From a Smartphone

> *"Logistics happens on the ground, across container terminals, bonded warehouses, and transit checkpoints. Dhow was conceived, architected, debugged, and shipped entirely from a mobile phone."*

Building an institutional-grade, full-stack AI logistics system on a mobile interface required overcoming acute technical constraints:
- **Mobile-First Dev Environment**: Orchestrating complex server functions, schema migrations, and Git revisions on a touch screen without a secondary desktop display.
- **The War on "Simulation"**: Actively stripping out canned mock data, decorative tickers, and fake EDI generators in favor of a 100% truthful, verifiable architecture where every computation connects to real LLM reasoning, real databases, and actual geographical coordinates.
- **Rigorous Responsive Engineering**: Guaranteeing that Mission Control, MapLibre interactive cartography, and institutional document viewers render flawlessly on both field smartphones and operations room control towers.

This genesis reflects Dhow's core philosophy: **empowering global merchants with enterprise-grade trade intelligence directly in the palm of their hand.**

---

## 🏛️ Core System Architecture

Dhow is structured into 4 fully functional institutional modules:

| Module | Route | Real-World Operational Engine |
| :--- | :--- | :--- |
| **Mission Control** | `/` | Real-time operations dashboard, live system telemetry, geodesic MapLibre route projection, and immutable **Trade Dossier Registry** backed by Lovable Cloud. |
| **Route Optimizer** | `/optimizer` | Multimodal AI agent arbitrating **Air Express**, **Direct Ocean**, and **Sovereign Sea-Air** corridors. Computes transit duration, dynamic landed costs, CO₂ impact, and route risk profiles. |
| **Customs Engine** | `/customs` | Live WCO HS classification engine. Translates any natural-language commodity into 6-digit Harmonized System codes with destination tariff breakdowns and compliance document checklists. |
| **Dispatch Tower** | `/dispatch` | **Human-in-the-Loop (HITL)** governance portal. Generates auditable operational orders (Carrier Slot Booking, Customs Pre-filing) for human operator approval prior to execution. |

---

## 🔒 Commitment to Authenticity: No Mock Data

Dhow adheres to a strict code of engineering honesty:
1. **Live LLM Intelligence**: Corridor optimization and HS classifications are executed dynamically via server-side AI reasoning models using strict JSON schemas.
2. **Persistent Audit Registry**: Every processed shipment receives an immutable tracking identifier (`DHOW-2026-XXXXXXXXXX`) permanently stored in the Lovable Cloud database and auditable at `/dossier/[REF]`.
3. **Scannable Verification**: Every generated document package includes a dynamic QR verification code linking directly to the cloud dossier proof of origin.
4. **Human Governance**: Operational dispatches remain pending until explicitly reviewed and locked by an authorized human controller.

---

## 🗺️ Production Roadmap & Enterprise Scaling

Dhow currently serves as an **Autonomous Logistics Intelligence & Human-in-the-Loop Routing Engine**. 

To transition from autonomous intelligence to physical carrier execution, the post-competition roadmap focuses on institutional integration:

### 1. Direct EDI & Carrier Protocols (Post-Funded Phase)
* **Accreditations**: Securing IATA cargo agent licensing and Federal Maritime Commission (FMC) ocean freight forwarding certification.
* **EDIFACT Gateways**: Implementing AS2 secure communication servers to transmit certified **UN/EDIFACT IFTMIN** (Transport Instruction) and **CUSDEC** (Customs Declaration) messages directly to ocean liners (Maersk, MSC, CMA CGM) and air cargo carriers.

### 2. Port Community Systems & Single Windows
* Direct API connectors with national single-window clearing systems:
  * **Dubai Trade (Mirsal II)**
  * **UN ASYCUDA** (Automated System for Customs Data)
  * **EU Customs Data Model (EUCDM)**

### 3. Enterprise TMS Synchronization
* Webhook-driven bidirectional synchronization with Tier-1 Transportation Management Systems (CargoWise, SAP TM, Flexport).

---

## 🛠️ Technology Stack

* **Framework**: TanStack Start v1 (Full-stack React 19, Server Functions, SSR/SSG on Vite 7).
* **Styling**: Tailwind CSS v4 with dual-palette design tokens (*Deep Maritime Navy* & *Cloudy Azure Glass*).
* **Mapping**: MapLibre GL with keyless OpenFreeMap dark/light vector cartography and geodesic arc calculations.
* **Database / Backend**: Lovable Cloud (PostgreSQL with Row-Level Security, Server-Side Admin Client).
* **Validation**: Zod runtime schema validation for LLM inputs and responses.

---

## 🚀 Local Development

```bash
# Clone the repository
git clone https://github.com/<your-username>/<your-repo-name>.git

# Install dependencies
bun install

# Start local development server
bun dev

The application will be accessible at http://localhost:8080.

📄 Compliance & Neutrality Notice
Dhow operates as a globally neutral trade corridor navigator. Manifest data and routing intelligence are computed without geopolitical alignment, adhering strictly to World Customs Organization (WCO) standards, international maritime law, and zero-knowledge data privacy principles.
