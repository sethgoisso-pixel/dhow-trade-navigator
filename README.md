# ⚓ Dhow: a trade agent for Dubai's corridors

> An AI agent that helps a trader or freight forwarder in Dubai answer one question before a container moves: **what will this shipment really cost, which route, and what paperwork does it need?**

Live demo: https://dhow-trade-navigator.lovable.app

**Principle: the model proposes, tools compute, a verifier enforces.** Numbers never come from the language model, and every step the agent takes is shown in a trace.

---

## The problem

Asia → Africa trade through Dubai means comparing sea, air and sea-air options, guessing the HS code, and estimating duties, often by phone and spreadsheet, across several forwarders. A wrong HS code or a missed chokepoint costs days and money. Dhow does the first pass in one run and shows its work so a broker can check it instead of trusting it.

## Built from a smartphone

Dhow was designed, debugged and shipped entirely from a phone, with no PC. That constraint shaped the product: small screens, short sessions, and a strict habit of testing what is real and removing what only looks real.

---

## What is real, what is estimated, what is planned

| | Status | How it works |
|---|---|---|
| HS classification | **Real** | Search over the full HS-2022 nomenclature (5,613 six-digit subheadings, UN Comtrade open data). The model may only choose among real candidates, and the verifier rejects any code outside the list. The "match score" is a text-match score, not a probability or a legal ruling. |
| Duty rates | **Real bands, estimated rate** | The model proposes a rate; the verifier snaps it to the legal bands of the destination customs union (ECOWAS, GCC, EAC, CEMAC). Tariff-line rates are not looked up yet. |
| Landed cost | **Estimated** | CIF, duty, VAT (indicative table) and flat port/brokerage fees, computed in code. Flat fees are labelled "assumed". |
| Marine weather | **Real, live** | Wave heights at Hormuz, Bab-el-Mandeb and Malacca from the Open-Meteo Marine API. They feed the weather index of each plan, and the briefing cites the measurement time. If the API does not answer, the screen says "fallback values" instead of "live". |
| Exchange rates | **Real, live** | USD to AED/EUR from open.er-api.com (AED is pegged at 3.6725). If the API does not answer, a fallback table is used and labelled as such. |
| Routes | **Estimated** | Great-circle distance (Haversine) and fixed speeds through Jebel Ali or another hub, with chokepoint exposure (Hormuz, Red Sea / Suez, Malacca). Not carrier quotes. Congestion and customs indices are geography heuristics. |
| Compliance screen | **Indicative** | Small red-flag list (review jurisdictions, controlled goods, lithium-battery dangerous goods). It is not a lookup against OFAC, EU, UN or UAE lists. |
| Agent trace | **Real** | Every tool call and verification is recorded and shown. If the AI is unavailable, a deterministic tool pipeline runs and says so. |
| Documents | **Drafts** | Commercial invoice, packing list, bill of lading drafts with placeholders for unknown parties, and a SHA-256 fingerprint of their content. Not official documents. |
| Dossier registry | **Real, not tamper-proof** | Saved plans in a Lovable Cloud (Postgres) table with a reference, viewable at `/dossier/[REF]`. |
| Dispatch tower | **Human-in-the-loop, no transmission** | Booking and customs pre-declaration drafts wait for approval. Nothing is sent to carriers or customs yet. |
| External data APIs (tariffs, sanctions lists, freight rates) | **Planned** | Each figure will carry its source and date. |
| Carrier / customs integration | **Planned** | See the roadmap. |
| Privacy-preserving manifests | **Planned** | Selective disclosure with hash commitments first; real zero-knowledge proofs as a later phase. |

## Architecture

```
Request ─▶ agent loop (LLM picks the next tool, max 6 calls)
              ├─ resolve_port · search_hs_code · screen_compliance · estimate_routes · estimate_landed_cost
              └─ verifier: HS exists? duty on a legal band? ports resolved?
        ─▶ plan (route, cost, compliance, drafts) + trace
Fallback: deterministic tool pipeline (no AI), same tools, same verifier.
```

| Module | Route | Role |
| :--- | :--- | :--- |
| Mission Control | `/` | Overview, map, recent dossiers |
| Route Optimizer | `/optimizer` | Runs the agent, shows routes, cost, compliance, drafts and trace |
| Customs Engine | `/customs` | HS search, AI choice among verified candidates, duty estimate |
| Dispatch Tower | `/dispatch` | Approve or reject drafts |
| Architecture | `/scenarios` | How the agent and the Dubai corridor fit together |

Code: `src/lib/agent/` (tools, loop, verifier, tests), `src/lib/dhow-ai.functions.ts` (server functions and demo quota guard), `src/lib/dhow-plan.ts` (route/cost model and drafts).

## Roadmap

1. **More sourced data**: tariffs by HS line, sanctions screening and freight rates, with source and date next to every figure (marine weather and FX are already live).
2. **Measured accuracy**: benchmark of HS classification (agent vs plain LLM) on a public test set.
3. **Real artifacts on approval**: PDF dossier and email draft for the broker.
4. **Selective-disclosure manifests**, then **zero-knowledge proofs** (Noir or circom).
5. **Carrier and customs gateways** (post-funding): licensing, UN/EDIFACT messages (IFTMIN, CUSDEC), Dubai Trade (Mirsal II), ASYCUDA.
6. **TMS synchronisation** (CargoWise, SAP TM).

## Limits

Not legal or customs advice: a licensed broker must review before any filing. No live vessel, freight-rate or tariff-line feed yet. The demo caps AI runs per hour to protect its credits and falls back to the tool pipeline.

## Stack

TanStack Start (React 19, Vite), Tailwind v4, MapLibre GL, Lovable Cloud (Postgres), Zod, Vitest.

## Run locally

```bash
bun install
bun dev        # http://localhost:8080
bun run test
```

AI features need `LOVABLE_API_KEY` on the server; without it Dhow still works through the tool pipeline.

## Data sources

HS-2022: UN Comtrade via [datasets/harmonized-system](https://github.com/datasets/harmonized-system) (ODC-PDDL). VAT rates are indicative and dated.

## License

MIT, see `LICENSE`.
