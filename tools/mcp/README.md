# aptatlas-mcp

An MCP server for the [Atlas of Proteomic Technologies](https://aptatlas.org): platform data, both recommendation engines, protein coverage and evidence claims, for use from an AI assistant or any MCP client.

For research use only. Scores and recommendations reflect the authors' assessment of published literature, offered as opinion to guide study design. They are not clinical or purchasing advice.

- **Same results as the site.** The server runs the same engine code as Help Me Choose and Help Me Combine, over the published data.
- **Offline and pinned.** Data ships in the package, at one APT release. Every response states its `version` and `last_updated`.
- **Private.** The server makes no network calls and logs nothing. The site's recommendation logging does not apply.

## Install

You need Node 20 or later.

### Claude Code

```bash
claude mcp add aptatlas -- npx -y aptatlas-mcp
```

### Claude Desktop

Add this to `claude_desktop_config.json`, then restart the app:

```json
{
  "mcpServers": {
    "aptatlas": {
      "command": "npx",
      "args": ["-y", "aptatlas-mcp"]
    }
  }
}
```

### Any other MCP client

Run it as a stdio server with the command `npx -y aptatlas-mcp`. Most clients take the same `command` and `args` as the block above.

To stay on one release, pin the version, for example `aptatlas-mcp@4.6.0`.

## Tools

| Tool | What it does |
|---|---|
| `list_platforms` | The six assessed platforms, the 46-platform catalogue, or both |
| `get_platform` | One platform, with scores if it is assessed |
| `compare_platforms` | Two or more assessed platforms across the ten scored dimensions |
| `recommend` | Ranks platforms for a study, with the same inputs and scoring as Help Me Choose |
| `recommend_pair` | Ranks platform pairs, with the same inputs and scoring as Help Me Combine |
| `coverage_lookup` | Which platforms list each gene symbol or UniProt accession |
| `evidence_search` | Claims by platform, topic or text, with DOIs and source locations |

See [SKILL.md](SKILL.md) for when to use each one and how to read the results.

## Testing

From a clone of the repository, build the site first, because the package data comes from `dist/data`:

```bash
npm run build
cd tools/mcp
npm install
npm test
npm run test:identity
```

`npm test` calls each tool over stdio. `npm run test:identity` sends every published fairness scenario through the `recommend` and `recommend_pair` tools over stdio, about 1.6 million calls, and compares the regenerated files with the ones on the [Reproducibility page](https://aptatlas.org/reproducibility), byte for byte.

## Licence and citation

Code: MIT. Data: CC BY 4.0, with third-party sources listed in each file at [aptatlas.org/data](https://aptatlas.org/data). Some Help Me Combine fields are derived from ChEMBL (CC BY-SA 3.0), and `recommend_pair` responses say so.

Whelan CD, Smith-Byrne K. Atlas of Proteomic Technologies: an evidence-based framework for selecting and combining commercial proteomics platforms. bioRxiv 2026. https://doi.org/10.64898/2026.09.10.750723
