# My gym on ChatGPT Sites

The `sites/` folder holds the app for ChatGPT Sites: the same page, a Cloudflare Worker backend with a D1 database, and an MCP endpoint with tools for ChatGPT.

## What is prepared

```
sites/public/index.html      the page (generated from ../my-gym.html + sites/adapter.js by ../build.mjs)
sites/src/page.ts            the same page as a module the Worker serves (generated)
sites/src/index.ts           Worker: GET / (page), /api/... (JSON for the page), POST /mcp (tools)
sites/src/app.ts             operations shared by HTTP and MCP
sites/src/validate.ts        validation of plan, workout and target documents
sites/src/db.ts              D1 store (binding DB)
sites/src/mcp.ts             MCP endpoint, dual-era, no dependencies
sites/migrations/0001_init.sql
sites/test/smoke.test.mjs    local checks against an in-memory store
```

Architecture: the page talks to the backend over HTTP on the same origin (`/api/plan`, `/api/workouts`, `/api/workouts/{id}`, `/api/targets`, `/api/targets/{tN}`); ChatGPT talks to `POST /mcp` of the same backend; both paths call the same functions in `app.ts` and use the same database. There is no separate storage for the conversation.

Data model: `plans` (one JSON plan document per user), `workouts` (one row per performed workout, JSON document plus the columns the queries filter on), `targets` (one row per training). The JSON shapes are the ones in `AGENTS.md`, identical to the Claude variant. A read-only view `workout_sets` exposes single sets for ad-hoc SQL.

## Identity and privacy

- The backend takes the user's identity **only** from the request header `oai-authenticated-user-id`. Every read and write is scoped to that id. A request without it gets HTTP 401. No `user_id` is accepted from a form, a query string or a tool argument.
- This trusts the header, which is only safe behind the authentication layer of Sites. **Do not deploy this Worker on a public host without that layer**: anyone could set the header.
- Writes from the page must be same-origin requests with the header `X-Requested-With: my-gym`; a foreign `Origin` or `Sec-Fetch-Site` is rejected with 403.
- `POST /mcp` rejects a present `Origin` header that is not the Site's own origin (403). Additional allowed origins can be given in the environment variable `MCP_ALLOWED_ORIGINS` (comma separated).
- All responses carry `Cache-Control: no-store`. No secrets live in the page.
- Privacy of the data is access control, not local processing: the Site's code, the D1 rows and the logs sit in the platform's infrastructure. Do not put medical details in the profile or the notes.

## Protocol notes

The MCP endpoint follows the published specification (modelcontextprotocol.io):

- Revision 2026-07-28: every request carries `_meta` with `io.modelcontextprotocol/protocolVersion` and `io.modelcontextprotocol/clientCapabilities`; no `initialize` handshake; `server/discover` returns `supportedVersions`; results carry `resultType: "complete"`; the HTTP headers `MCP-Protocol-Version`, `Mcp-Method` and (for `tools/call`) `Mcp-Name` must match the body, otherwise 400 with error `-32020`; an unsupported version answers 400 with `-32022` and the supported list; an unknown method answers 404 with `-32601`; notifications answer 202; `GET` and `DELETE` on the endpoint answer 405; a present and foreign `Origin` answers 403.
- Revisions 2025-03-26 to 2025-11-25: `initialize` with version negotiation (echo the requested version when supported, otherwise the server's latest), `notifications/initialized` answered with 202, `ping`, `tools/list`, `tools/call`; a missing `MCP-Protocol-Version` header is treated as 2025-03-26.
- The server picks the era per request: a body with `_meta["io.modelcontextprotocol/protocolVersion"]` is modern, anything else is legacy. It is stateless and never issues a session id.
- Tool results carry `content` (text with the JSON), `structuredContent` and `isError`; input validation errors come back as tool execution errors (`isError: true`) so the model can correct the call; an unknown tool is a protocol error `-32602`.
- The endpoint is written by hand, without the MCP SDK, so the backend has no dependencies. The tools and their handlers (`TOOLS`, `IMPL` in `mcp.ts`) do not depend on the transport, so swapping the transport for the SDK is a contained change.

## Platform details to confirm in your environment

- The identity headers `oai-authenticated-user-id` and `oai-authenticated-user-email` set by Sites on authenticated requests (the Worker reads the first one; change `USER_HEADER` in `index.ts` if your platform names it differently).
- The fields of `.openai/hosting.json` (`"d1": "DB"`, `"r2": null`, `"capabilities": ["mcp"]`, `project_id`).
- How Sites packages a Worker, runs the D1 migration, serves static files and exposes the Site's MCP endpoint as a plugin.
- The same-origin checks (`sameOriginWrite`, `originAllowed` in `index.ts`) compare the `Origin` header with the origin of `request.url` as the Worker sees it. If a proxy rewrites the URL or the Host before the Worker, writes from the page answer 403 and the page shows "nie zapisano"; look there first if that symptom appears.
- `db.ts` validates documents again when reading them. Everything is validated on write, so this cannot fail today; if a validation rule is ever tightened, switch the reads to parse-only so one old row cannot break `GET /api/workouts`.

## For the agent that deploys it

The user who opened this repository in ChatGPT, Codex or another Sites-capable environment wants a private page on their phone, with saving and with the tools, at the end of this session. Do the whole job and finish with the link and a few words on how to use the page (see "Start here" in `AGENTS.md`). Where this repository's assumptions differ from the Sites documentation in your environment (identity header, configuration file, packaging, migrations), the documentation wins: adjust the code, keep the data contract from `AGENTS.md`, and record what you changed in this file.

1. Create a **new private ChatGPT Site** for this app. Keep access at owner only. Do not change the access of any existing deployment.
2. Use the current Sites starter and the instructions available in your environment for packaging a Worker, binding D1 and declaring the MCP capability. The exact build and publish commands depend on that environment and are deliberately not written here.
3. Configuration: the Sites configuration lives in `.openai/hosting.json`. It should declare the D1 binding `DB`, no R2 (`"r2": null`), and `"capabilities": ["mcp"]`. The `project_id` is assigned when the Site is created: never type an invented one and never copy one from another deployment.
4. Apply `sites/migrations/0001_init.sql` to the Site's D1 database before the first request. The Worker never creates tables.
5. Serve the page: `sites/src/index.ts` returns `PAGE` from `sites/src/page.ts` on `GET /`. If your packaging serves static files from `sites/public/` with an `ASSETS` binding, the Worker delegates to it first.
6. The MCP endpoint is `POST /mcp`. Sites handles the connection and OAuth of the plugin; after deployment the platform may offer the Site's MCP as a private plugin. Installing and connecting that plugin in ChatGPT is a separate step from publishing the page.
7. Do not add a local MCP server as a stand-in for the Site's endpoint and do not ask the user to copy data between the conversation and the app.
8. Before handing over, regenerate the page if `my-gym.html` changed (`node build.mjs`) and run `cd sites && npm run check`.

Example configuration (confirm the fields against the current Sites documentation):

```json
{
  "project_id": "<assigned when the Site is created>",
  "d1": "DB",
  "r2": null,
  "capabilities": ["mcp"]
}
```

## Checklist after deployment

- [ ] The page opens on the phone at the Site's address, signed in; the status bar says "dziennik gotowy" and not "zapis tylko w tym telefonie".
- [ ] A whole workout can be done on the page alone: ticking sets, the rest timer, corrections, the finish button.
- [ ] After a reload the plan and the history are still there (they come from D1, not from localStorage).
- [ ] A set saved on the page is returned by `get_last_workout` in ChatGPT.
- [ ] `update_next_workout` in ChatGPT shows up on the page as "Cel na dziś" after a reload.
- [ ] `update_plan` changes the tabs and exercises; the saved workouts are unchanged.
- [ ] A second account sees none of the first account's data.
- [ ] An unsigned visit to the address is refused by the platform.
