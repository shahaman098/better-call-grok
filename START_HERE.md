# Better Call Grok — Start Here (v2)

## The idea
A customer talks to a Grok Bot and describes the merch they want: what, how many, sizes, design text, cheapest / fastest / best quality, deadline, budget. Three **Grok Bots** take it from there:
- **Concierge** takes the order and sends the design to the customer's Telegram.
- **Scout** finds a maker (our Supabase supplier book first, the web second).
- **Negotiator** messages the supplier and haggles the price down.

When the deal is agreed, the customer replies YES, gets an invoice, pays (Stripe test mode), and the supplier is told to go ahead.

**Demo:** Andrew is the customer (voice chat with Concierge on his phone). A friend plays the supplier and negotiates live on Telegram.

## The files
- `BETTER_CALL_GROK_AI_DRIVEN_DEVELOPMENT_MASTER_SPEC.md`: the full v2 spec (Bot prompts, `bcg` CLI, schema, rules, build plan, demo script)
- `AGENTS.md`: instructions for coding agents (Cursor)
- `docs/archive/MASTER_SPEC_v1_web_comparison.md`: the old idea, for reference only

## Do these in parallel right now (owner, about 20 min)
1. **Supabase:** create a project; note the URL and service-role key.
2. **Telegram:** create a bot with @BotFather and note the token. Andrew and the friend each open it and press **Start**.
3. **Stripe:** create an account and stay in **test mode**; copy the `sk_test_…` key.
4. **xAI:** get an API key from console.x.ai (used for design images).
5. **Grok Bot:** create Bots **Concierge**, **Scout** and **Negotiator** with the prompts in spec §9.2–9.4, then a group "Better Call Grok — Ops" with all three.
6. **Smoke test (most important):** ask Concierge to run in its terminal: `curl -s https://api.telegram.org && node -v`. If either fails, read spec §6.4 (browser fallback) before building anything else.
7. **Brief the friend** using the cheat sheet in spec §16.

## Prompt for Cursor (short version; the full one is spec §21)
> Read AGENTS.md and the entire BETTER_CALL_GROK_AI_DRIVEN_DEVELOPMENT_MASTER_SPEC.md. You are the lead implementation engineer. Build P0→P4 now: Supabase migration + seed, the Telegram webhook Edge Function, and the guarded `bcg` CLI with the commands in §14 and the rules in §10 and §12. Write tests T01–T15. Stripe test mode only; refuse live keys. Run typecheck, lint and tests after each phase and report real results. Do not contact anyone or move money.

## Then on the Bot cloud computer
Ask a Bot to: clone this repo, run `npm install`, create `~/.bcg/.env` (the owner types the secrets via **Take over**), run `npx bcg doctor`. Post the kickoff message from spec §9.5 in the group.

## Trust boundary
Stripe is test mode. Seeded "(fictional)" suppliers are fictional and never contacted. The friend is a consenting teammate. Nothing is invoiced without the customer's YES, and no business found on the web is contacted without owner approval.
