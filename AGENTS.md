<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Shipment plans share one `Plan` shape (src/lib/dhow-plan.ts): AI output (dhow-ai.functions.ts) and the local `simulatePlan` fallback must both produce it, so the UI never depends on the AI being up.
- The world map uses MapLibre with a keyless OpenFreeMap style, lazy-loaded behind ClientOnly — CARTO tiles need an API key.
