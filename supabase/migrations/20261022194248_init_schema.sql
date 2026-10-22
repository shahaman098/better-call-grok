-- Better Call Grok v2 schema (spec §8).
-- Money columns are bigint pence. RLS is enabled on every table.
-- No policies for anon or authenticated: bcg and Edge Functions use the service role.
-- command_idempotency is the store for --idempotency-key (spec §6.3).

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.force_web_supplier_flags()
returns trigger
language plpgsql
as $$
begin
  if new.source = 'WEB_RESEARCH' then
    new.verification := 'UNVERIFIED';
    new.outreach_allowed := false;
  end if;
  return new;
end;
$$;

create or replace function private.prevent_offer_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'offers are insert-only'
    using errcode = '55000';
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.force_web_supplier_flags() from public, anon, authenticated;
revoke all on function private.prevent_offer_mutation() from public, anon, authenticated;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  telegram_chat_id text,
  whatsapp_id text,
  phone_e164 text,
  preferred_channel text not null default 'TELEGRAM'
    check (preferred_channel in ('TELEGRAM', 'WHATSAPP', 'PHONE', 'VOICE_CHAT')),
  created_at timestamptz not null default now(),
  constraint customers_name_not_blank check (length(btrim(name)) > 0)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  telegram_chat_id text,
  whatsapp_id text,
  phone_e164 text,
  channel text not null default 'TELEGRAM'
    check (channel in ('TELEGRAM', 'WHATSAPP', 'PHONE')),
  location_city text,
  country text,
  categories text[] not null default '{}',
  techniques text[] not null default '{}',
  min_qty integer,
  max_qty integer,
  typical_lead_days integer,
  typical_unit_price_minor bigint,
  quality_rating smallint,
  source text not null check (source in ('SEEDED', 'WEB_RESEARCH', 'MANUAL')),
  source_url text,
  verification text not null check (verification in ('VERIFIED', 'UNVERIFIED', 'FICTIONAL')),
  outreach_allowed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  constraint suppliers_name_not_blank check (length(btrim(name)) > 0),
  constraint suppliers_min_qty check (min_qty is null or min_qty > 0),
  constraint suppliers_max_qty check (max_qty is null or max_qty > 0),
  constraint suppliers_qty_order check (min_qty is null or max_qty is null or min_qty <= max_qty),
  constraint suppliers_lead_days check (typical_lead_days is null or typical_lead_days >= 0),
  constraint suppliers_price_nonnegative check (
    typical_unit_price_minor is null or typical_unit_price_minor >= 0
  ),
  constraint suppliers_quality check (quality_rating is null or quality_rating between 1 and 5),
  constraint suppliers_fictional_no_outreach check (
    verification <> 'FICTIONAL' or outreach_allowed = false
  ),
  constraint suppliers_country_code check (country is null or country ~ '^[A-Z]{2}$')
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  status text not null default 'SPEC_CONFIRMED'
    check (status in (
      'SPEC_CONFIRMED',
      'DESIGN_SENT',
      'DESIGN_APPROVED',
      'NEGOTIATING',
      'DEAL_READY',
      'AWAITING_CUSTOMER_YES',
      'INVOICED',
      'PAID',
      'SUPPLIER_CONFIRMED',
      'CANCELLED',
      'NEEDS_HUMAN'
    )),
  spec_json jsonb not null,
  priority text not null check (priority in ('CHEAPEST', 'ASAP', 'BEST_QUALITY')),
  quantity integer not null check (quantity > 0 and quantity <= 1000),
  needed_by date,
  budget_max_minor bigint check (budget_max_minor is null or budget_max_minor >= 0),
  currency text not null default 'GBP' check (currency = 'GBP'),
  approved_design_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.design_versions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  version integer not null check (version > 0),
  prompt text not null,
  storage_path text,
  exact_text_ok boolean not null default false,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  unique (order_id, version)
);

alter table public.orders
  add constraint orders_approved_design_fk
  foreign key (approved_design_id) references public.design_versions (id);

create table public.supplier_candidates (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  supplier_id uuid not null references public.suppliers (id),
  rank integer check (rank is null or rank > 0),
  eligible boolean not null,
  exclusion_reasons text[] not null default '{}',
  score_json jsonb not null default '{}',
  found_via text not null check (found_via in ('DB', 'WEB')),
  unique (order_id, supplier_id)
);

create table public.negotiations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  supplier_id uuid not null references public.suppliers (id),
  status text not null check (status in (
    'CONTACTED',
    'QUOTED',
    'COUNTERING',
    'AGREED_PROVISIONAL',
    'CONFIRMED',
    'DECLINED',
    'NO_RESPONSE',
    'ABOVE_BUDGET'
  )),
  rounds integer not null default 0 check (rounds >= 0 and rounds <= 3),
  opening_total_minor bigint check (opening_total_minor is null or opening_total_minor >= 0),
  current_offer_total_minor bigint check (
    current_offer_total_minor is null or current_offer_total_minor >= 0
  ),
  agreed_total_minor bigint check (agreed_total_minor is null or agreed_total_minor >= 0),
  agreed_lead_days integer check (agreed_lead_days is null or agreed_lead_days >= 0),
  includes_vat text check (
    includes_vat is null or includes_vat in ('YES', 'NO', 'NOT_REGISTERED', 'UNKNOWN')
  ),
  includes_delivery text check (
    includes_delivery is null or includes_delivery in ('YES', 'NO', 'UNKNOWN')
  ),
  terms_json jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id),
  negotiation_id uuid references public.negotiations (id),
  party text not null check (party in ('CUSTOMER', 'SUPPLIER', 'BOT')),
  bot_name text check (bot_name is null or bot_name in ('Concierge', 'Scout', 'Negotiator')),
  channel text not null check (channel in ('TELEGRAM', 'WHATSAPP', 'PHONE', 'VOICE_CHAT')),
  direction text not null check (direction in ('IN', 'OUT')),
  chat_id text,
  body text,
  media_path text,
  external_id text,
  created_at timestamptz not null default now(),
  unique (channel, external_id)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.negotiations (id),
  from_party text not null check (from_party in ('SUPPLIER', 'AGENT')),
  unit_price_minor bigint not null check (unit_price_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  lead_days integer check (lead_days is null or lead_days >= 0),
  includes_vat text not null check (includes_vat in ('YES', 'NO', 'NOT_REGISTERED', 'UNKNOWN')),
  includes_delivery text not null check (includes_delivery in ('YES', 'NO', 'UNKNOWN')),
  source_message_id uuid references public.messages (id),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  negotiation_id uuid not null references public.negotiations (id),
  stripe_invoice_id text,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null check (currency = 'GBP'),
  status text not null check (status in ('DRAFT', 'OPEN', 'PAID', 'VOID')),
  hosted_url text,
  pdf_url text,
  livemode boolean not null default false check (livemode = false),
  paid_at timestamptz,
  unique (stripe_invoice_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id),
  actor text not null check (actor in (
    'Concierge', 'Scout', 'Negotiator', 'Customer', 'Supplier', 'System'
  )),
  type text not null,
  details_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.command_idempotency (
  idempotency_key text primary key,
  command text not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  constraint command_idempotency_key_not_blank check (length(btrim(idempotency_key)) > 0)
);

create index orders_customer_id_idx on public.orders (customer_id);
create index orders_approved_design_id_idx on public.orders (approved_design_id);
create index supplier_candidates_supplier_id_idx on public.supplier_candidates (supplier_id);
create index negotiations_order_id_idx on public.negotiations (order_id);
create index negotiations_supplier_id_idx on public.negotiations (supplier_id);
create index messages_order_created_idx on public.messages (order_id, created_at);
create index messages_negotiation_id_idx on public.messages (negotiation_id);
create index messages_chat_created_idx on public.messages (chat_id, created_at);
create index offers_negotiation_id_idx on public.offers (negotiation_id);
create index offers_source_message_id_idx on public.offers (source_message_id);
create index invoices_order_id_idx on public.invoices (order_id);
create index invoices_negotiation_id_idx on public.invoices (negotiation_id);
create index events_order_created_idx on public.events (order_id, created_at);

create unique index customers_telegram_chat_id_uidx
  on public.customers (telegram_chat_id)
  where telegram_chat_id is not null;

create unique index suppliers_telegram_chat_id_uidx
  on public.suppliers (telegram_chat_id)
  where telegram_chat_id is not null;

create unique index invoices_one_active_per_order
  on public.invoices (order_id)
  where status in ('DRAFT', 'OPEN', 'PAID');

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

create trigger negotiations_set_updated_at
  before update on public.negotiations
  for each row execute function private.set_updated_at();

create trigger suppliers_force_web_flags
  before insert on public.suppliers
  for each row execute function private.force_web_supplier_flags();

create trigger offers_no_mutation
  before update or delete on public.offers
  for each row execute function private.prevent_offer_mutation();

alter table public.customers enable row level security;
alter table public.customers force row level security;
alter table public.suppliers enable row level security;
alter table public.suppliers force row level security;
alter table public.orders enable row level security;
alter table public.orders force row level security;
alter table public.design_versions enable row level security;
alter table public.design_versions force row level security;
alter table public.supplier_candidates enable row level security;
alter table public.supplier_candidates force row level security;
alter table public.negotiations enable row level security;
alter table public.negotiations force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.offers enable row level security;
alter table public.offers force row level security;
alter table public.invoices enable row level security;
alter table public.invoices force row level security;
alter table public.events enable row level security;
alter table public.events force row level security;
alter table public.command_idempotency enable row level security;
alter table public.command_idempotency force row level security;

revoke all privileges on table public.customers from anon, authenticated;
revoke all privileges on table public.suppliers from anon, authenticated;
revoke all privileges on table public.orders from anon, authenticated;
revoke all privileges on table public.design_versions from anon, authenticated;
revoke all privileges on table public.supplier_candidates from anon, authenticated;
revoke all privileges on table public.negotiations from anon, authenticated;
revoke all privileges on table public.messages from anon, authenticated;
revoke all privileges on table public.offers from anon, authenticated, service_role;
revoke all privileges on table public.invoices from anon, authenticated;
revoke all privileges on table public.events from anon, authenticated;
revoke all privileges on table public.command_idempotency from anon, authenticated;

grant select, insert, update, delete on table public.customers to service_role;
grant select, insert, update, delete on table public.suppliers to service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.design_versions to service_role;
grant select, insert, update, delete on table public.supplier_candidates to service_role;
grant select, insert, update, delete on table public.negotiations to service_role;
grant select, insert, update, delete on table public.messages to service_role;
grant select, insert on table public.offers to service_role;
grant select, insert, update, delete on table public.invoices to service_role;
grant select, insert, update, delete on table public.events to service_role;
grant select, insert, update, delete on table public.command_idempotency to service_role;

-- Private design images. No storage policies: anon cannot read the bucket.
insert into storage.buckets (id, name, public)
values ('designs', 'designs', false)
on conflict (id) do nothing;
