# My gym on ChatGPT Sites: deployment notes

The `sites/` folder holds a variant of the app prepared for ChatGPT Sites: the same page, a Cloudflare Worker backend with a D1 database, and an MCP endpoint with tools for ChatGPT. **This variant has not been deployed or verified on the platform within this repository.** What follows separates what was built against documentation that was actually read from what came as instructions from the ChatGPT side and could not be checked here.

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

## What was read, what was not

**Read and followed (the MCP specification, modelcontextprotocol.io, October 2026):**

- Revision 2026-07-28: every request carries `_meta` with `io.modelcontextprotocol/protocolVersion` and `io.modelcontextprotocol/clientCapabilities`; no `initialize` handshake; `server/discover` returns `supportedVersions`; results carry `resultType: "complete"`; HTTP headers `MCP-Protocol-Version`, `Mcp-Method` and (for `tools/call`) `Mcp-Name` must match the body, otherwise 400 with error `-32020`; an unsupported version answers 400 with `-32022` and the supported list; an unknown method answers 404 with `-32601`; notifications answer 202; `GET` and `DELETE` on the endpoint answer 405; a present and foreign `Origin` answers 403.
- Revisions 2025-03-26 to 2025-11-25 (legacy): `initialize` with version negotiation (echo the requested version when supported, otherwise the server's latest), `notifications/initialized` answered with 202, `ping`, `tools/list`, `tools/call`; a missing `MCP-Protocol-Version` header is treated as 2025-03-26.
- The server picks the era per request: a body with `_meta["io.modelcontextprotocol/protocolVersion"]` is modern, anything else is legacy. It is stateless and never issues a session id.
- Tool results carry `content` (text with the JSON), `structuredContent` and `isError`; input validation errors are returned as tool execution errors (`isError: true`) so the model can correct the call; an unknown tool is a protocol error `-32602`.

**Not verified here (came as instructions from the ChatGPT side, or could not be checked):**

- The header names `oai-authenticated-user-id` and `oai-authenticated-user-email` and the fact that Sites sets them on authenticated requests.
- The Sites configuration file `.openai/hosting.json` and its fields (`"d1": "DB"`, `"r2": null`, `"capabilities": ["mcp"]`, `project_id`).
- The exact way Sites packages a Worker, runs D1 migrations, serves static files and exposes a Site's MCP endpoint as a private plugin.
- Which MCP era ChatGPT's client speaks when it connects to a Site's plugin. The endpoint handles both, but only a real connection shows which path is used.
- The D1 methods used (`prepare().bind().first()/all()/run()`) match Cloudflare's documented API, but no query was run against a real D1.
- The same-origin checks (`sameOriginWrite`, `originAllowed` in `index.ts`) compare the `Origin` header with the origin of `request.url` as the Worker sees it. If the Sites proxy rewrites the URL or the Host before the Worker, every write from the page answers 403 and the page shows "nie zapisano". That is the first thing to look at if this symptom appears after deployment.
- `db.ts` validates documents again when reading them. Today everything is validated on write, so this cannot fail; if a validation rule is ever tightened, one old row that no longer passes would make `GET /api/workouts` and `list_workouts` fail for that user. Switch the reads to parse-only in that case.
- The official MCP SDK was **not** used. Reason: no dependency could be verified against the Sites packaging from here, and a hand-written endpoint of this size can be read in one sitting. If the deploying agent has a working Sites starter with the SDK, swapping `mcp.ts` for it is a contained change: the tools and their handlers in `mcp.ts` (`TOOLS`, `IMPL`) do not depend on the transport.

## For the agent that deploys it

The user who opened this repository in ChatGPT, Codex or another Sites-capable environment wants a working private page on their phone, with saving and with the tools, at the end of this session. Do the whole job and finish with the link and a few words on how to use the page (see "Start here" in `AGENTS.md`). Where this repository's assumptions differ from the Sites documentation in your environment (identity header, configuration file, packaging, migrations), the documentation wins: adjust the code, keep the data contract from `AGENTS.md`, and record what you changed in this file.

1. Create a **new private ChatGPT Site** for this app. Keep access at owner only. Do not change the access of any existing deployment.
2. Use the current Sites starter and the instructions available in your environment for packaging a Worker, binding D1 and declaring the MCP capability. The exact build and publish commands depend on that environment and are deliberately not written here.
3. Configuration: the Sites configuration lives in `.openai/hosting.json`. It should declare the D1 binding `DB`, no R2 (`"r2": null`), and `"capabilities": ["mcp"]`. The `project_id` is assigned when the Site is created: never type an invented one and never copy one from another deployment.
4. Apply `sites/migrations/0001_init.sql` to the Site's D1 database before the first request. The Worker never creates tables.
5. Serve the page: `sites/src/index.ts` returns `PAGE` from `sites/src/page.ts` on `GET /`. If your packaging serves static files from `sites/public/` with an `ASSETS` binding, the Worker delegates to it first.
6. The MCP endpoint is `POST /mcp`. Sites handles the connection and OAuth of the plugin; after deployment the platform may offer the Site's MCP as a private plugin. Installing and connecting that plugin in ChatGPT is a separate step from publishing the page.
7. Do not add a local MCP server as a stand-in for the Site's endpoint and do not ask the user to copy data between the conversation and the app.
8. Before handing over, regenerate the page if `my-gym.html` changed (`node build.mjs`) and run `cd sites && npm run check`.

Example of the configuration the ChatGPT-side instructions describe (verify against the current Sites documentation before use):

```json
{
  "project_id": "<assigned when the Site is created>",
  "d1": "DB",
  "r2": null,
  "capabilities": ["mcp"]
}
```

## Verification checklist after deployment

- [ ] The page opens on the phone at the Site's address, signed in; the status bar says "dziennik gotowy" and not "zapis tylko w tym telefonie".
- [ ] A whole workout can be done on the page alone: ticking sets, the rest timer, corrections, the finish button.
- [ ] After a reload the plan and the history are still there (they come from D1, not from localStorage).
- [ ] A set saved on the page is returned by `get_last_workout` in ChatGPT.
- [ ] `update_next_workout` in ChatGPT shows up on the page as "Cel na dziś" after a reload.
- [ ] `update_plan` changes the tabs and exercises; the saved workouts are unchanged.
- [ ] A second account sees none of the first account's data.
- [ ] An unsigned visit to the address is refused by the platform.

## Status

Prepared in the repository on 2026-10-07. Local checks pass (`npm run check`: build check, type check, 10 tests against an in-memory store). Not deployed, not run against D1, not connected to ChatGPT.
