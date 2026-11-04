-- The indexer remembers the hash of the block each cursor ended on. If that block is no longer canonical on
-- the next run (a reorg), it rewinds and indexes again instead of trusting the old range.
alter table cursors add column block_hash text;
