-- Demo seed. Three suppliers are fictional and cannot be contacted.
-- Friend Prints is the consenting teammate. telegram_chat_id stays empty until
-- `bcg supplier link`. Spec §8.3 documents these four rows.

insert into public.customers (id, name, preferred_channel)
values (
  '11111111-1111-4111-8111-111111111111',
  'Andrew',
  'TELEGRAM'
)
on conflict (id) do nothing;

insert into public.suppliers (
  id, name, channel, location_city, country, categories, techniques,
  min_qty, max_qty, typical_lead_days, typical_unit_price_minor, quality_rating,
  source, verification, outreach_allowed, notes
) values (
  '22222222-2222-4222-8222-222222222222',
  'Friend Prints',
  'TELEGRAM',
  'London',
  'GB',
  array['TSHIRT', 'HOODIE', 'STICKER'],
  array['screen-print'],
  10,
  300,
  5,
  900,
  4,
  'MANUAL',
  'VERIFIED',
  true,
  'Consenting teammate. Link telegram_chat_id before the demo. About 900 pence per shirt, 5-day lead, MOQ 10.'
)
on conflict (id) do nothing;

insert into public.suppliers (
  id, name, channel, location_city, country, categories, techniques,
  min_qty, max_qty, typical_lead_days, typical_unit_price_minor, quality_rating,
  source, verification, outreach_allowed, notes
) values (
  '33333333-3333-4333-8333-333333333333',
  'MegaTee Factory (fictional)',
  'TELEGRAM',
  'Manchester',
  'GB',
  array['TSHIRT', 'HOODIE'],
  array['screen-print'],
  500,
  null,
  7,
  450,
  3,
  'SEEDED',
  'FICTIONAL',
  false,
  'Fictional. MOQ 500 excludes a 50-shirt order. Do not contact.'
)
on conflict (id) do nothing;

insert into public.suppliers (
  id, name, channel, location_city, country, categories, techniques,
  min_qty, max_qty, typical_lead_days, typical_unit_price_minor, quality_rating,
  source, verification, outreach_allowed, notes
) values (
  '44444444-4444-4444-8444-444444444444',
  'StickerSprint (fictional)',
  'TELEGRAM',
  'Bristol',
  'GB',
  array['STICKER'],
  array['vinyl'],
  10,
  5000,
  3,
  40,
  4,
  'SEEDED',
  'FICTIONAL',
  false,
  'Fictional. Stickers only, so excluded for T-shirts. Do not contact.'
)
on conflict (id) do nothing;

insert into public.suppliers (
  id, name, channel, location_city, country, categories, techniques,
  min_qty, max_qty, typical_lead_days, typical_unit_price_minor, quality_rating,
  source, verification, outreach_allowed, notes
) values (
  '55555555-5555-4555-8555-555555555555',
  'QuickPrint London (fictional)',
  'TELEGRAM',
  'London',
  'GB',
  array['TSHIRT'],
  array['dtg'],
  1,
  200,
  2,
  1400,
  null,
  'SEEDED',
  'FICTIONAL',
  false,
  'Fictional. Eligible on lead time and category for 50 shirts, 1400 pence each, quality unknown. Not contactable.'
)
on conflict (id) do nothing;
