# Arnfa — Strategy (v2)

> Sharpened from a grounded multi-agent audit + the BDI Hackathon 2026 field notes
> (19 Jun forum: Envi Link · City Signal · "FACT not estimation" · Agentic-from-start).
> One page, deliberately narrow. For the Soft Pitch (10 Jul) → Demo Day (25 Jul).

## The one sentence
**"บอกฟ้า แล้วได้ทริปที่ฝนพังไม่ได้." — Tell it the sky, get a trip the rain can't ruin.**

Verb-first, pain-first. Not "AI-powered", not "20,000 POIs", not "real-time data."

## 1 · Customer + pain
**"นักวางแผนสุดสัปดาห์ / the weekend optimizer"** — urban Thai 22–35 who plans café / market /
park / day-trips and keeps getting **burned by rain, PM2.5, and heat**. Weather apps give a
**forecast**; nobody turns it into a **decision** — *ไปไหน, ตอนไหน, เลี่ยงฝน/ฝุ่นยังไง*. Result:
wasted, cancelled, or miserable outings. Chronic Bangkok PM2.5 + erratic monsoon make "should I
go out, and where?" a **daily** question — and the open data to answer it is finally free + good.

## 2 · MVP (one sharp product)
Input *where + when* → a day-plan that **re-ranks places by the forecast at the hour you'll
arrive**, swaps outdoor→indoor when rain is due, with on-screen provenance — plus **"ไปไหนดี"**
(rank all Thailand by today's sky) and **Arnfa AI** (`/ai`, free-text Thai → the same engine,
narrated). All live at arnfa.vercel.app.

**The ONE killer demo to obsess over — the rain-swap on a timeline.** Type "คาเฟ่ชิลๆ บ่ายนี้" →
a plan appears → a sky-fit timeline pins each stop at its arrival hour, and the 16:00 stop
**swaps outdoor→indoor exactly where the rain band hits**, the card warm-shifting with a one-line
Thai reason. No generic LLM trip-planner can fake that — it needs Arnfa's per-hour fit data.

## 3 · The moat: a flywheel, not an algorithm (the durability answer)
**Honest diagnosis:** the "weather-fit profile" of each place started as ~40 category defaults
(`lib/poi/profile.ts`) — reproducible by any model in an afternoon. **That is not a moat. The
data it learns is.** So we ship the loop the BDI organizers explicitly blessed
(*"มีน้อยดีกว่าไม่มี — ถ้าไม่เริ่มใช้ มันก็ไม่มีวันพัฒนา"*):

- Every stop asks **"ฟ้าตรงไหมตรงนี้? 👍/👎"** → `arnfa.feedback` (private) + an instant public
  aggregate `arnfa.poi_crowd`.
- The engine **reads it back** (`lib/poi/crowdApply.ts`): crowd-confirmed places gain confidence,
  and "good in the rain?" is **learned from real verdicts given while it was raining**.
- A **"เรียนรู้จาก N ครั้ง"** chip makes the moat visible.

Once thousands of real Thai visits label which cafés are *actually* good in rain, that dataset
beats any zero-shot LLM heuristic **and is not on the open web to scrape.** It exists only because
Arnfa is operated. As foundation models get better, Arnfa's agent gets a better reasoning engine
*for free* while keeping its private data — **the moat widens, not narrows.**

**Four durable moats** (a frontier model has no private senses): ① Thailand-specific,
weather-conditioned POI ground truth · ② civic distribution + SME relationships (a model can't
get itself deployed by BMA) · ③ trust through verifiable Thai provenance ("ดูข้อมูลดิบ" = the
hackathon's *FACT not estimation*) · ④ habit — SkyWindow's daily go/wait/stay ritual.

**STOP defending (frontier models commoditize these):** the NIM narration glue (swappable infra),
generic itinerary UX, the `weatherFit()` algorithm itself (elegant but legible), and
breadth-for-breadth data layers (marine/FIRMS/satellite — keep as proof, don't market or expand).

## 4 · Business model (users free forever)
- **First ฿1 = a geographic beachhead, not the platform.** Own ONE dense neighborhood
  (Thonglor/Ari). Offer 3–5 SMEs: *"we send you foot traffic on rainy days you'd otherwise lose —
  ฿300/month, 3-month pilot, ฿0 if we don't deliver a tracked visit."* One closed loop (user sees
  rain-swap → goes to a paid venue → venue confirms) kills the cold-start objection.
- **Distribution unlock = BMA.** The hackathon is partnered with กทม. and promises good ideas get
  **deployed by the city** — that's Arnfa's 0→10k-user path (the channel it otherwise lacks).
- **Endgame = B2B2C demand-routing** (venues pay to be the weather-matched rec) + a licensed
  engine/API. **Don't build the merchant dashboard or pricing page until one café has paid.**

## 5 · Roadmap
- **P0 — before Demo Day (in progress):** ✅ kill the fabricated home stat → real live pick ·
  ⏳ the feedback flywheel (built; one migration + flag from live) · sky-fit timeline · card
  weather-tint · a Thai-LLM "sovereign mode" + 2 real BMA datasets (flood/cooling-centers) ·
  pitch around the one-liner + BMA + the FACT ladder.
- **P1 (post-Demo-Day):** multi-turn refine on `/ai` (patch intent, re-run the same grounded
  engine — *not* a free-roaming tool-loop) · recruit 50 real users · 1 SME pilot live.
- **P2:** auth-gated taste learning once ≥1k feedback events exist · merchant attribution *after*
  the first paying café.
- **Cut from the critical path:** MCP server, sky-photo vision, notification cron, GPU/cuDF,
  Nemotron-for-prestige, more data sources.

## 6 · BDI Hackathon positioning (Track 1)
Arnfa **is** what BDI asked for: **Envi Link + City Signal** for Bangkok's environment, climbing
their own ladder — **เข้าใจ** (real Open-Meteo + Air4Thai + BMA data, on-screen provenance =
*FACT not estimation*) → **ทำนาย** (the engine re-ranks by forecast at arrival; the prediction
model is "just one tool", exactly NVIDIA's Agentic framing) → **จัดการ** (the rain-swap changes
your decision, and the feedback loop is the city getting smarter over time). Lead with the
field-notes blessing: *"เราเริ่มด้วย POI profile ที่ยังไม่สมบูรณ์ แล้ว ship the loop ที่ทำให้มันฉลาดขึ้นทุกวัน"* —
that turns the thin-profile weakness into the strategy. Adopt the **Thai LLM** (sovereign mode)
and **2 BMA datasets** because they genuinely strengthen the product; skip Nemotron-for-prestige,
GPU, and Blueprints (theater for a weather-decision engine).

---
**If you only do 3 things:** (1) finish + activate the feedback loop with read-back — it converts
the moat 0%→real, *is* the durability answer, and is exactly what BDI told you to build. (2) Keep
the home page honest (done) and ship the sky-fit timeline — the two surfaces judges see first.
(3) Rewrite the pitch around the one-liner + BMA distribution + the FACT ladder, plus the Thai-LLM
mode and 2 BMA datasets. Everything else waits.
