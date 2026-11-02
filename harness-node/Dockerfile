# Bollard harness node image. Runs inside an Intel TDX CVM on dstack (Phala Cloud).
# Pin the base image by digest before building a release: the image digest goes into app-compose.json,
# whose SHA-256 is the compose hash governance allowlists on-chain.
FROM oven/bun:1.3.13-slim

WORKDIR /app/services
COPY services/package.json services/bun.lock ./
RUN bun install --frozen-lockfile --production
COPY services/src ./src
COPY services/corpus ./corpus

ENV ROLE=harness
USER bun
CMD ["bun", "src/node/main.ts"]
