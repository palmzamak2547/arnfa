# Arnfa — Strategy (target customer · MVP · business model)

> Sharpened for the BDI Hackathon 2026 Soft Pitch (Track 1: "Data for better Journey"),
> per mentor feedback. One page, deliberately narrow. Vault copy: projects/arnfa/08-strategy.

## 1 · Target customer + the pain (be specific)
**Primary persona — "นักวางแผนสุดสัปดาห์ / the weekend optimizer"**: urban Thai, 22–35, Bangkok &
big cities, plans café / market / park / day-trips, and *repeatedly gets burned* by rain, PM2.5,
and heat that ruin the outing.

**The pain (the wedge):** weather apps give a **forecast**, not a **decision**. The real question is
*"มีเวลาว่าง อยากออกไป — แต่ไปไหน, ตอนไหน, เลี่ยงฝน/ฝุ่นยังไง?"* → decision paralysis, cancelled or
wasted outings. Nobody turns the forecast into *where to go and in what order*.

**Why now:** chronic PM2.5 + erratic rain make "should I go out?" a daily Bangkok question, and
open weather/air/satellite/POI data is finally free and good enough to answer it.

## 2 · MVP (one sharp product — not the kitchen sink)
**Core MVP:** *input where + when → a day-plan that re-ranks places by the forecast **at arrival**,
swaps outdoor→indoor the moment rain is due, with honest provenance* — plus **"ไปไหนดี"** (rank all
of Thailand by today's sky). The signature "wow" = the warm-shift **swap card** + the nationwide pick.

**The upgrade (this build) → "Arnfa AI":** natural language *("อยากไปคาเฟ่ชิลๆ เลี่ยงฝน พรุ่งนี้บ่าย")*
→ an **agentic** layer understands the intent → calls Arnfa's real engine (forecast + POIs + air) →
returns a plan **and** a friendly Thai explanation grounded in real data + sources. (Ticks the
judges' **Thai-LLM / Agentic-AI** box; makes the engine usable without learning the UI.)

**Explicitly NOT the MVP headline** (kept as depth, not the pitch): satellite layers, marine mode,
accounts, MCP server. They prove "real data," they don't lead.

## 3 · Business model (user stays FREE)
- **Primary — B2B2C demand-routing.** Venues (cafés, malls, attractions) pay to be the
  **weather-matched recommendation** — e.g. the indoor place Arnfa swaps you to when rain hits
  nearby. Arnfa owns the *"where should I go given the weather right now"* moment → it routes
  **weather-displaced foot traffic** to partner SMEs on the exact days they'd otherwise lose
  customers. Already seeded: the honest deals rail + MerchantCTA (no fake deals, ever).
- **Secondary — B2B engine / API + data.** License the weather→plan **engine** (REST + MCP, already
  built) to tourism (TAT, hotels), city/gov (BMA), and other apps; sell **anonymized
  "weather-displaced demand"** insight to retail/tourism (privacy-careful, aggregate only).
- **Users: free forever** → mass adoption + civic good, aligned with the hackathon's public theme.

## 4 · Moat (why Arnfa wins, not a weather app)
1. Owns the **decision** moment (the plan), not just the forecast.
2. **Honest provenance / data-as-trust** — which *is* the hackathon's "cite source + License" rule, built in.
3. **Nationwide real data** (20k+ OSM POIs · NASA satellite/FIRMS · Thai-gov Air4Thai) — hard to copy fast.
4. **Agentic + MCP-native** → composable, future-proof.

## 5 · Hackathon framing (Track 1 fit + judging map)
- **Track 1 "Data for better Journey":** route/trip planning + weather/PM2.5/events + AI decision
  assistant — Arnfa is the textbook fit.
- **Judging:** real Thai problem ✓ · Thai-LLM / Agentic-AI ✓ (Arnfa AI) · working MVP ✓ (live) ·
  social + business value ✓ (SME demand-routing) · **user validation = the one gap → go get N real users to confirm the pain before Demo Day.**
- **Pitch arc (Mayday! Design Thinking):** user pain → the *decision gap* → live demo (the swap +
  Arnfa AI) → validation/traction → business model. Lead with the pain, not the feature list.
