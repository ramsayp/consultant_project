# Security Policies

## Core Principle

**Bare minimal access.** Grant only the permissions actively required. Revoke or deactivate when no longer needed. Never expand access speculatively.

This applies to every layer of the system: MCP servers, connected apps, permission sets, Apex sharing, API credentials, and CI/CD pipelines.

## Policies

| Policy                | Scope                                                     |
| --------------------- | --------------------------------------------------------- |
| [MCP Servers](mcp.md) | Salesforce hosted MCP servers and Claude Code MCP tooling |

## Related

Setup and configuration guides live in [`.claude/integrations/`](../integrations/) — separate from policy so the two concerns don't mix.

## General Rules

- Prefer scoped access over broad access — narrow to the exact resource needed
- Document the reason before expanding any permission or scope
- Prefer reversible changes — deactivate before delete so rollback is possible
- All Salesforce data access respects FLS and sharing rules — nothing bypasses org permissions
- Review active permissions periodically; remove anything no longer in use
