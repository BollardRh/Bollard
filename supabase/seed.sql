-- Local development seed. Indexer cursors for Robinhood Chain testnet (46630). Block 0 means "start from
-- START_BLOCK_RHC", which the deploy script records in contracts/deployments/rhc-testnet.json.
-- No fake ratings, agents or attesters: those only ever come from the chain.

insert into cursors (chain_id, stream, block)
values (46630, 'rating_registry', 0),
       (46630, 'attester_registry', 0),
       (46630, 'fee_router', 0),
       (46630, 'arena_bounty', 0),
       (46630, 'safe_rating_guard', 0)
on conflict (chain_id, stream) do nothing;
