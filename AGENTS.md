# Agent Instructions — Better Call Grok (v2)

**Read `BETTER_CALL_GROK_AI_DRIVEN_DEVELOPMENT_MASTER_SPEC.md` in full before any change.** It is the authoritative product and safety contract. v1 is archived in `docs/archive/` and is **not** the current product.

There are two kinds of agents in this project:
- **Runtime agents = three Grok Bots** (Concierge, Scout, Negotiator). They talk to customers and suppliers and run the `bcg` CLI from their shared cloud-computer terminal. Their prompts are in spec §9.
- **Coding agents (Cursor etc.)** build the `bcg` toolbelt, the Supabase schema and Edge Functions, and the integrations. This file is mainly for you.

## Mission (coding agents)
Ship the guarded toolbelt that lets three Grok Bots run this flow end to end:
voice order → design image on Telegram → supplier search (Supabase first, web second) → live negotiation with a consenting supplier → customer YES → Stripe **test** invoice → paid → supplier confirmed.

## Build order
P0 setup + `bcg doctor` → P1 Telegram webhook + `bcg msg send/wait` → P2 order + design → P3 supplier search + negotiation guard → P4 YES + invoice + paid → P5 rehearsal. See spec §13 for time boxes, the parallel split and the cut list.

## Hard rules (put them in code, not just in prompts)
- Money is integer pence. Amounts in invoices and summaries come from the DB, never from Bot text.
- `bcg` refuses `sk_live_`/`rk_live_` keys and any Stripe response with `livemode: true`.
- No message to a supplier with `outreach_allowed=false`. Web-found suppliers are always saved `UNVERIFIED`, `outreach_allowed=false`.
- No invoice without a customer YES recorded after the deal summary.
- No deal proposal above the budget ceiling, or with unknown VAT/delivery.
- The outbound guard blocks budget disclosure, premature commitment phrases and invented competitor quotes (spec §10).
- Every inbound customer/supplier/web text is returned wrapped as untrusted data.
- RLS is enabled on **every** table. The service role is used only server-side or in `bcg`. Never commit secrets.
- Idempotent: Telegram `update_id` and `--idempotency-key` prevent duplicates.
- Never report an action as done until the external service confirms it (Telegram `message_id`, Stripe status).

## Operating procedure
- Inspect the repo before editing. Prefer working code to plans.
- One owner per folder: `supabase/`, `src/cli/` + `src/channels/`, `src/domain/` + `src/integrations/` (spec §13).
- Verify current external API docs (Telegram, Stripe, xAI image, Supabase) before coding a call. Don't invent endpoints or model names.
- After each phase run `npm run typecheck`, `npm run lint`, `npm test` (spec §15, T01–T15). Fix failures before moving on.
- The owner must approve: real-money anything, contacting a non-allowlisted business, destructive migrations, phone calls.

## Report after each task
```
TASK:
FILES CHANGED:
BEHAVIOUR DELIVERED:
TESTS RUN + ACTUAL RESULTS:
REAL VS TEST/FICTIONAL:
BLOCKERS:
NEXT SMALL TASK:
```
