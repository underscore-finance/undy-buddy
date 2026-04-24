# Client MCP configs

These files are **reference templates**, not auto-loaded configs. Claude Code's `.mcp.json` lives at the repo root and is functional — but Codex and Cursor read from user-level config files outside this repo, so you have to copy-paste from here into your home directory.

| Client | This file | Merge into |
| --- | --- | --- |
| Codex | [`codex.config.toml`](./codex.config.toml) | `~/.codex/config.toml` |
| Cursor | [`cursor.mcp.json`](./cursor.mcp.json) | `~/.cursor/mcp.json` |
| Claude Code | (none — see root `.mcp.json`) | — auto-loaded from the repo |

## How to use

1. Open the file here that matches your client.
2. Append the MCP server entry to the corresponding user-level config file. If that file already has other MCP servers, merge — don't replace.
3. Restart / reload the client.
4. `cd` into this repo before launching so `@dappql/mcp` finds `@underscore-finance/sdk` in `node_modules`.

## Sanity check

Ask your agent: *"how many user wallets are live right now?"* It should call `multicall` via MCP and return a live number citing the block. If it writes a raw script instead, the MCP server isn't connected — fix the config first.
