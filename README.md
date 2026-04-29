# Undy Buddy

An AI agent companion for [Underscore Finance](https://underscore.finance) — a tiny workspace that gives any MCP-aware coding agent (Claude Code, Cursor, Codex, Zed, Continue) live, typed access to the full Underscore protocol on Base.

Ships an MCP server wired to [`@underscore-finance/sdk@1.2.19`](https://www.npmjs.com/package/@underscore-finance/sdk) and a persona file (`AGENTS.md`) that teaches the agent to talk about the protocol like a seasoned Underscore dev — "Undy Buddy".

## What this is

- **Zero-code protocol exploration.** Ask *"what's the total supply of UndyUsd?"*, *"which legos support USDC?"*, *"simulate a swap of 1 ETH → USDC via AeroClassic"* — the agent runs the right contract calls behind the scenes.
- **Live example of DappQL's plugin-discovery.** No `dap.config.js` here. The SDK ships a `dappql` manifest; `@dappql/mcp` finds it in `node_modules` and exposes all 76 contracts to the agent automatically.
- **A persona-driven agent config.** The `AGENTS.md` file documents the protocol's structural idioms (`UndyHq.getAddr(departmentId)`, `LegoBook`, templates, simulate-before-execute) so the agent doesn't flail.
- **Two ways to run it.** Clone + install for a local stdio server, or deploy to Vercel for a shared HTTP endpoint your whole team can point any MCP client at.

## Setup

```bash
npm install
```

Then point your MCP-aware client at `@dappql/mcp` in this folder. Each client has its own config location — **project-level `.mcp.json` is Claude Code only.**

### Claude Code

Already wired via the committed `.mcp.json`. Open the folder; it auto-spawns `@dappql/mcp` and auto-loads `CLAUDE.md` + `AGENTS.md` (the Undy Buddy persona).

### Codex / Cursor / others

Codex and Cursor don't read project-level MCP config — they use a user-level file in your home directory. Copy-paste blocks are prepared in [`clients/`](./clients):

- [`clients/codex.config.toml`](./clients/codex.config.toml) → append to `~/.codex/config.toml`
- [`clients/cursor.mcp.json`](./clients/cursor.mcp.json) → merge into `~/.cursor/mcp.json`

Then launch your client from this directory (`cd undy-buddy && codex` / reload Cursor with this folder open) so `@dappql/mcp` finds `@underscore-finance/sdk` in `node_modules`.

For any other MCP-aware client: the invocation is always `npx -y @dappql/mcp`, launched from this directory. Register it wherever your client expects MCP server configs.

### Sanity check

Ask: *"what contracts can you see?"* → agent should call `listContracts` (an MCP tool) and name 76 of them. If it instead tries to write Node/viem scripts, the MCP server isn't connected — fix the client config first.

## Hosted (Vercel)

For a shared endpoint that anyone on your team (or external partners) can plug into without cloning anything, this repo also ships as a Vercel function.

### What's in the repo

- `api/mcp.ts` — Vercel handler running `@dappql/mcp` in **stateless** HTTP mode (every request creates a fresh transport + server, required for serverless).
- `vercel.json` — rewrites `/mcp` and `/health` to the function, sets `maxDuration: 30`.
- `tsconfig.json` — types for the function file.
- `.env.example` — env vars to set in Vercel project settings.

### Deploy

```bash
npm install
vercel link        # one-time, link to your Vercel project
vercel env add DAPPQL_DEFAULT_RPC_URL  # paste your RPC URL when prompted
vercel deploy --prod
```

Or use the dashboard: import this repo into Vercel, set `DAPPQL_DEFAULT_RPC_URL` under Settings → Environment Variables, and let it auto-deploy.

After deploy, hit `https://<your-deploy>.vercel.app/health` — it should return `{"ok":true,"chainId":8453,"contracts":0,"plugins":["@underscore-finance/sdk@1.2.19"]}`.

### DNS setup

The deploy is wired to **`mcp.underscore.finance`**:

1. **Vercel side** — Project Settings → Domains → Add `mcp.underscore.finance`. Vercel shows the required DNS record.
2. **DNS side** (whatever provider hosts `underscore.finance`) — add a `CNAME` for `mcp` pointing to `cname.vercel-dns.com.`. If your apex is on a provider that doesn't allow CNAMEs at subdomains (rare), use the `A` record Vercel suggests.
3. Wait for propagation (~minutes), then Vercel auto-provisions a TLS cert.

### Connect a remote MCP client

Once DNS is live, users add the endpoint without installing anything:

```json
{
  "mcpServers": {
    "undy-buddy": {
      "url": "https://mcp.underscore.finance/mcp"
    }
  }
}
```

This `url`-form is supported by Claude Desktop, Claude Code (recent), Cursor (recent), and any MCP client that speaks streamable HTTP.

Health check after deploy: `curl https://mcp.underscore.finance/health` should return:

```json
{"ok":true,"chainId":8453,"contracts":0,"plugins":["@underscore-finance/sdk@1.2.19"]}
```

### Hosted-mode safety

- **No signing keys**, ever, on a hosted deploy. `DAPPQL_PRIVATE_KEY` and `MNEMONIC` must stay unset. `simulateWrite` is fine; `callWrite` should be hard off (it is by default).
- **Rate-limit at the edge.** Each MCP request triggers one or more chain reads. If you publish the URL widely, add Vercel WAF / Upstash Ratelimit to keep RPC bills bounded.
- **Pin one chain per host.** Single deploy = single RPC URL = single chain. For multi-chain protocols, ship one Vercel project per chain (e.g. `mcp.base.underscore.finance`, `mcp.optimism.underscore.finance`).

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
| `AGENTS.md` | Agent persona + curated prompts. Auto-loaded by Claude Code, Codex, Cursor, and other AGENTS.md-aware clients. |
| `CLAUDE.md` | Claude Code–specific hook that re-asserts the Undy Buddy identity and points at AGENTS.md. |
| `.mcp.json` | Claude Code MCP config — launches `@dappql/mcp` with the committed default RPC. Codex/Cursor need user-level config. |
| `clients/` | Reference MCP configs for Codex and Cursor — copy-paste into your user-level config file. See [`clients/README.md`](./clients/README.md). |
| `api/mcp.ts` | Vercel function — hosted streamable-HTTP MCP. See [Hosted (Vercel)](#hosted-vercel). |
| `vercel.json` | Vercel routing + function config. |
| `.env.example` | Reference env vars for the Vercel deploy. |
| `package.json` | Pins `@underscore-finance/sdk@1.2.19` + installs `@dappql/mcp`. |
| `.env` *(gitignored, optional)* | Your local RPC key + signing key — overrides the committed default. |

No `dap.config.js` needed. `@dappql/mcp` runs in **plugin-only mode** — it discovers `@underscore-finance/sdk` in `node_modules` via the SDK's `dappql` manifest and exposes its contracts directly.

## Links

- [Underscore Finance](https://underscore.finance)
- [Underscore SDK on npm](https://www.npmjs.com/package/@underscore-finance/sdk)
- [DappQL](https://dappql.com) — the data layer under the hood
- [`@dappql/mcp` on npm](https://www.npmjs.com/package/@dappql/mcp)
