-- Builder actions move to EIP-712 typed data (security review). setEndpoint signatures carry an issuedAt; the
-- API keeps the last accepted one per request and refuses any signature that is not strictly newer, so an old
-- signature cannot be replayed to revert the endpoint or fetch the run token.
alter table run_requests add column endpoint_signed_at bigint;

comment on column run_requests.endpoint_signed_at is 'issuedAt (unix seconds) of the last accepted EIP-712 SetEndpoint signature';
