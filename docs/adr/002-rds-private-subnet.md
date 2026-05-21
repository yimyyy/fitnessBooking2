# ADR 002: RDS PostgreSQL in Private Subnet

**Status:** Accepted  
**Date:** 2026-05-21

## Context

The PostgreSQL database stores sensitive user and booking data. We need to decide where to place it in our VPC.

## Decision

Place RDS PostgreSQL in a private subnet with no public IP, accessible only from the EB security group.

## Rationale

- **Security**: A private subnet with no internet gateway route means the database is unreachable from the public internet, even if credentials were compromised.
- **Compliance**: PCI DSS and GDPR best practices require databases with personal data to be isolated from public networks.
- **Defense in depth**: Even if the EB EC2 instance were compromised, the attacker still needs the database credentials to access data.
- **AWS best practice**: AWS Well-Architected Framework explicitly recommends databases in private subnets.

## Implementation

1. Create DB Subnet Group spanning two private subnets (for multi-AZ if needed).
2. Security group rule: allow port 5432 inbound **only** from the EB EC2 security group.
3. RDS instance: `Publicly Accessible = false`.
4. `DATABASE_URL` set via EB environment variable, never committed.

## Trade-offs

- **No direct access**: Developers cannot connect to RDS from their laptops directly. Must use an SSH tunnel through a bastion host or AWS Session Manager port forwarding.
- **Setup complexity**: Requires VPC, subnets, security groups, and subnet group to be configured correctly.

## Consequences

- All database access goes through the EB EC2 instance.
- For emergency access, use: `aws ssm start-session --target <instance-id> --document-name AWS-StartPortForwardingSession --parameters "portNumber=5432,localPortNumber=5433"`.
- Prisma migrations run from within EB via `.ebextensions/02_migrate.config`.
