# Dhow Trade Navigator

Salut je veux créé un projet pour un concours j'ai reçu un prompt : 

Build "Dhow" — an autonomous AI trade & logistics agent designed for global merchants, freight forwarders, and infrastructure builders connecting Dubai, Asia, and Africa.



### Design & Aesthetic

- Color palette: Deep Maritime Navy (#0B192C, #1E3E62), Crisp Off-White/Slate backgrounds, and Warm Desert Gold (#D4AF37 / #E5A93C) for AI badges, key metrics, and primary action buttons.

- Layout: Sleek, high-density dashboard inspired by modern fintech and freight-tech platforms (Flexport, Stripe, Freightos).

- Language: 100% English.



### Core Screens & Features



1. Header & Navigation:

   - Logo: "Dhow" with a sleek sail / compass glyph and an active status badge: "Autonomous Agent Active (v1.0)".

   - Navigation links: Mission Control, Route Optimizer, Customs & Compliance, Autonomous Dispatch, Demo Scenarios.

   - Quick action: "Launch New Cargo Request" and a fast 1-click "Load Hackathon Demo Scenario" button.



2. Mission Control (Dashboard Overview):

   - 4 Hero KPI Cards:

     * Active Shipments Monitored (e.g., 24 Containers)

     * Average Transit Cost Saved (e.g., -18.4% vs Spot Rate)

     * Customs Clearance Time (e.g., 4.2 hrs vs 5 days standard)

     * Automated Dispatches Pending Approval (e.g., 3 actions)

   - Live Interactive Shipment Map / Route Visualizer: Showing primary trade corridors (Ningbo/Shanghai → Jebel Ali Port, Dubai → Cotonou / West Africa).

   - Real-time AI Agent Event Stream: Live terminal-style activity feed showing autonomous reasoning steps (e.g., "Analyzing weather disruption in Suez Canal...", "Matched Carrier Maersk with -12% contract rate", "Classified HS Code 8541.43 for Solar Panels").



3. Autonomous Route & Freight Optimizer:

   - Input Form: Origin Port/City, Destination Port/City, Cargo Type, Weight (tons) & Volume (CBM), Target Deadline.

   - 3 Auto-Generated Dynamic Comparisons:

     * Option A (Fastest Air / Sea-Air via Dubai World Central): Days, Cost, CO2.

     * Option B (Most Cost-Effective Ocean FCL via Jebel Ali): Days, Cost, CO2.

     * Option C (Dhow AI Optimized Multimodal): Smart balance with highest reliability score.

   - Risk & Disruption Index: AI-calculated probability of port congestion and customs delays.



4. Smart Customs, HS Code & Compliance Engine:

   - Instant HS code search & automatic classification with confidence score.

   - Duty & Tariff breakdown table (Import duties, VAT, port fees).

   - 1-Click Document Generator: Generates ready-to-export Commercial Invoice, Packing List, and draft Bill of Lading with realistic trade details.



5. Pre-Loaded Hackathon Demo Scenarios (Crucial for Judges):

   - Provide 2 instant 1-click scenarios so any judge can immediately test without typing:

     * Scenario 1: "500 kW Solar Farm Equipment (Ningbo → Jebel Ali → Cotonou)"

     * Scenario 2: "10,000 Consumer Electronics Units (Shenzhen → Dubai Logistics City)"

   - Clicking a scenario fills the form, runs the agent's multi-step reasoning with realistic animated steps, and displays optimal routing + compliance docs.



Ensure responsive design, clean modular components, smooth tab transit

ions, and interactive toast notifications.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a4640067-9424-4f77-a4d0-5906c4778d64).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
