# ADR 001: Elastic Beanstalk Native Node.js over Docker

**Status:** Accepted  
**Date:** 2026-05-21

## Context

We need to host the Express API on AWS. Options considered:
1. AWS Elastic Beanstalk with native Node.js platform
2. AWS Elastic Beanstalk with Docker
3. AWS ECS/Fargate
4. AWS Lambda + API Gateway

## Decision

Use Elastic Beanstalk's native Node.js platform (no Docker).

## Rationale

- **Simplicity**: No Dockerfile to maintain; EB manages OS, Node.js runtime updates, and auto-scaling natively.
- **`.ebextensions` hooks**: Run `prisma migrate deploy` as a container command before app startup without needing custom Docker entrypoints.
- **PM2 support**: EB's Node.js platform supports PM2 via `ecosystem.config.js`, giving process restart and memory limits without Docker complexity.
- **Cost**: Single EC2 instance tier is cheaper than ECS/Fargate for a fitness booking app at early scale.
- **Team familiarity**: EB CLI (`eb deploy`) is simpler for teams without Docker/K8s experience.

## Trade-offs

- **Less portable**: Tied to EB's Node.js platform version support cycle (Node 18 EOL: April 2025, so will need upgrade).
- **No reproducible builds**: Docker would guarantee identical environments; EB relies on npm install at deploy time.
- **Scaling limits**: EB auto-scaling is less flexible than ECS for burst workloads.

## Consequences

- Must maintain `.ebextensions/01_node.config` to pin Node.js version.
- `ecosystem.config.js` must be present at project root.
- Server must bind to `process.env.PORT || 8080` and `0.0.0.0`.
- Health check at `GET /health` required for EB health monitoring.
