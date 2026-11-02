-- Supabase Queues (pgmq) replace BullMQ, and Supabase Storage holds run bundles (doc §8, adapted).
-- Supabase-only: needs the pgmq extension and the storage schema.

create extension if not exists pgmq;

-- doc §8 queue names: runs (lead), cosign, post (per chain), alerts
select pgmq.create('runs');
select pgmq.create('cosign');
select pgmq.create('post');
select pgmq.create('alerts');

-- Queues are reached only through the API's server connection, never through the Data API.
revoke all on schema pgmq from anon, authenticated;
revoke all on all tables in schema pgmq from anon, authenticated;
revoke all on all functions in schema pgmq from anon, authenticated;

-- bundles: public part of each run bundle (content-addressed, read by anyone)
-- holdout:  holdout ciphertext, readable only by co-signers through the API
-- quotes:   raw TDX quotes and dstack event logs for registered enclave keys
insert into storage.buckets (id, name, public)
values ('bundles', 'bundles', true),
       ('holdout', 'holdout', false),
       ('quotes', 'quotes', false)
on conflict (id) do nothing;
