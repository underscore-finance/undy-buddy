# Undy Buddy

An AI agent companion for [Underscore Finance](https://underscore.finance) — a tiny workspace that gives any MCP-aware coding agent (Claude Code, Cursor, Codex, Zed, Continue) live, typed access to the full Underscore protocol on Base.

Ships an MCP server wired to [`@underscore-finance/sdk@1.2.19`](https://www.npmjs.com/package/@underscore-finance/sdk) and a persona file (`AGENTS.md`) that teaches the agent to talk about the protocol like a seasoned Underscore dev — "Undy Buddy".

## What this is

- **Zero-code protocol exploration.** Ask *"what's the total supply of UndyUsd?"*, *"which legos support USDC?"*, *"simulate a swap of 1 ETH → USDC via AeroClassic"* — the agent runs the right contract calls behind the scenes.
- **Live example of DappQL's plugin-discovery.** No `dap.config.js` here. The SDK ships a `dappql` manifest; `@dappql/mcp` finds it in `node_modules` and exposes all 76 contracts to the agent automatically.
- **A persona-driven agent config.** The `AGENTS.md` file documents the protocol's structural idioms (`UndyHq.getAddr(departmentId)`, `LegoBook`, templates, simulate-before-execute) so the agent doesn't flail.

## Setup

```bash
npm install
```

Then open this folder in your MCP client. It reads `.mcp.json`, spawns `@dappql/mcp` via stdio, and also auto-loads `AGENTS.md` so the agent adopts the Undy Buddy persona.

Sanity check — ask: *"what contracts can you see?"* → agent calls `listContracts` and names 76 of them.

### Overriding the RPC with a local `.env`

The committed `.mcp.json` ships with a public Base RPC under `DAPPQL_DEFAULT_RPC_URL` — fine for discovery and light reads, rate-limited for anything heavy.

For your own RPC (Alchemy, QuickNode, self-hosted), drop a `.env`:

```
DAPPQL_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
DAPPQL_PRIVATE_KEY=0x...      # optional, only if writes are enabled
```

`@dappql/mcp` auto-loads `.env` from the launch directory (Node ≥20.12). `DAPPQL_RPC_URL` wins over `DAPPQL_DEFAULT_RPC_URL`. `.env` is gitignored — don't commit it.

## What the agent can do

76 contracts under `source="@underscore-finance/sdk"`: `UndyHq`, `Ledger`, `MissionControl`, `UndyUsd`, `UserWallet`, `AaveV3`, `AeroClassic`, `AeroSlipstream`, `Curve`, `Morpho`, `Fluid`, `Euler`, `Moonwell`, `LegoBook`, `Switchboard`, `Appraiser`, `Billing`, `ChequeBook`, `Hatchery`, `LegoTools`, `LevgVault`, and more.

Each contract: full ABI, address (when known), per-method read/write/event surface.

### Tools available

**Metadata (free, no RPC):** `listContracts`, `getContract`, `searchMethods`, `projectInfo`, `chainState`, `listPlugins`, `getDappqlReference`.

**Chain reads:** `callRead`, `multicall`, `getEvents`, `getTransaction`.

**Chain writes:** `simulateWrite` (always safe), `callWrite` (gated, off by default).

### Example prompts

See [`AGENTS.md`](./AGENTS.md) for the full catalog — the agent picks up curated prompt patterns from there. Quick flavor:

- *"What's Underscore and how is it structured?"*
- *"Total supply of UndyUsd, number of user wallets, current block — one multicall."*
- *"For UserWallet 0xabc…: owner, USDC balance, ETH balance."*
- *"Which legos support yield on USDC?"*
- *"Simulate depositing 1000 USDC into AaveV3 from my wallet 0xabc…"*
- *"Show Transfer events for UndyUsd in the last 500 blocks."*

## Enabling writes (gated, off by default)

Writes are deliberately disabled. Agents can always `simulateWrite` to preview, but signing requires:

1. A signing key in a local `.env` (never in `.mcp.json`):
   ```
   DAPPQL_PRIVATE_KEY=0x...
   ```
2. An explicit opt-in. Since this workspace has no `dap.config.js`, the simplest way is to set `DAPPQL_ALLOW_WRITES=true` in `.env` (when supported) or add a minimal `dap.config.js` with `mcp: { allowWrites: true }`.

**Default position: keep writes disabled on mainnet.** An agent with write access has blast radius equivalent to a deploy key. Burner wallet + testnet is the right posture for experimentation.

## Files

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Agent persona + curated prompts. Auto-loaded by Claude Code / Cursor. |
| `.mcp.json` | MCP client config — launches `@dappql/mcp` with the committed default RPC. |
| `package.json` | Pins `@underscore-finance/sdk@1.2.19` + installs `@dappql/mcp`. |
| `.env` *(gitignored, optional)* | Your local RPC key + signing key — overrides the committed default. |

No `dap.config.js` needed. `@dappql/mcp` runs in **plugin-only mode** — it discovers `@underscore-finance/sdk` in `node_modules` via the SDK's `dappql` manifest and exposes its contracts directly.

## Links

- [Underscore Finance](https://underscore.finance)
- [Underscore SDK on npm](https://www.npmjs.com/package/@underscore-finance/sdk)
- [DappQL](https://dappql.com) — the data layer under the hood
- [`@dappql/mcp` on npm](https://www.npmjs.com/package/@dappql/mcp)
