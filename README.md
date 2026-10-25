# Hunch Command Center site

The Hunch front end: a Vite + React static site on the Command Center SDK. It shows a person's
takes, builds and practises them, publishes them to the leaderboard, links brokerage accounts,
funds takes, approves or auto-pilots proposals, reads reviews and notifications, and talks to the
Hunch Agent. The API it calls is the `hunchapi` repository.

## Run it locally

```bash
npm ci
npm run dev        # http://127.0.0.1:5601
```

The dev server expects the loopback Hunch API on `http://127.0.0.1:8601` and the local Tau runtime
of the Hunch Agent on `http://127.0.0.1:8602`; `scripts/dev_stack.sh` in the hunchapi repository
starts both (and this site). Override the origins with `HUNCH_LOCAL_API_ORIGIN` and
`HUNCH_LOCAL_TAU_ORIGIN`.

- `/v1`, `/health` and `/healthz` are proxied to the API, which injects its own identity: the
  browser sends no `Authorization` header.
- `/tau` is the SDK's `localAgentProxy()` to the Tau runtime; only the chat's routes pass.
- `/__mainsequence__` is the SDK's `platformRequestProxy()`, used only when the API reports a
  platform-deployed Agent. It signs requests with the session `npx command-center-sdk login`
  saved on this machine (or `MAINSEQUENCE_ACCESS_TOKEN`).

## Build

```bash
npm run build      # tsc -b && vite build → dist/
npm run typecheck
npm run theme:audit
```

A hosted build framed by Command Center reads `VITE_COMMAND_CENTER_ORIGIN` (set by the platform)
and `VITE_HUNCH_API_RELEASE_UID` (the Hunch API release of that Environment) and calls the API
through the host's delegated FastAPI transport.

## Layout

- `src/app`: shell, routes, theme, startup gate, notices, the assistant engine.
- `src/api`: the fetch client and `ApiError`, the transport, typed endpoints, `useQuery`.
- `src/pages/<page>`: one folder per destination.
- `src/components`: shared pieces (dialogs, fields, chart, markdown, notices).
