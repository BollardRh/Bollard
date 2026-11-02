-- Fixes from the Supabase advisors after the first deploy.

-- pg_net is not relocatable, so move it by reinstalling it in the extensions schema. Its functions stay in
-- the `net` schema, so private.call_api() is unchanged.
drop extension if exists pg_net;
create extension if not exists pg_net with schema extensions;

-- attack_cases.corpus_root is a foreign key; its primary key leads with id, so index the FK column.
create index if not exists attack_cases_corpus_root on attack_cases (corpus_root);
