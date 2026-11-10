# EHRbase explorer

Small React + Vite app for exploring an [EHRbase](https://github.com/ehrbase/ehrbase)
openEHR CDR:

- **Browse** – overview (patient, composition and template counts) → patients →
  compositions, rendered as labelled sections using the template's web template.
  A field explorer lets you tick fields of a template and get one row per
  composition, plus the generated AQL.
- **AQL** – editor for ad-hoc queries (Ctrl/Cmd+Enter runs), with the uploaded
  templates listed alongside.

Every view has its own URL fragment (`#/ehrs/<id>`, `#/templates/<id>/fields?f=…`,
`#/aql?q=…`; see `src/lib/route.ts`), so links can be shared and the back button
works. Hash routing needs no server-side config.

Stack: React, TypeScript, Vite, TanStack Query, TanStack Table, CodeMirror, Tailwind.

## Requirements

An EHRbase instance (tested with 2.24) reachable without authentication
(`SECURITY_AUTHTYPE=NONE`), by default at `http://localhost:8081/ehrbase`.

> **Note:** the app has no login and proxies every request to EHRbase, so anyone
> who can reach it can read and modify all records. Only run it on localhost
> (the commands below bind to `127.0.0.1`).

## Run

```sh
npm install
npm run dev     # http://localhost:5173
npm run build
npm run lint
```

The dev server proxies `/ehrbase/*` to EHRbase, so no CORS config is needed.
Override the target with `EHRBASE_URL`, e.g. `EHRBASE_URL=http://localhost:8080 npm run dev`.

Without Node on the host, npm can run in a container; `--network=host` lets the
Vite proxy reach EHRbase on `localhost`:

```sh
alias npm='podman run --rm -it --userns=keep-id --network=host -v "$PWD":/work:Z -w /work -e npm_config_cache=/tmp/npm docker.io/library/node:22 npm'
```

## Container

Multi-stage build: Node builds `dist/`, nginx serves it and proxies
`/ehrbase/*` to `EHRBASE_URL` (default `http://host.containers.internal:8081`,
i.e. EHRbase published on the host).

```sh
podman build -t ehrbase-explorer .
podman run -d --rm --name ehrbase-explorer -p 127.0.0.1:8090:80 ehrbase-explorer   # http://127.0.0.1:8090
```

On a shared network with the EHRbase container, point it there instead:
`-e EHRBASE_URL=http://ehrbase:8080`.

## Layout

- `src/App.tsx` – header with Browse / AQL tabs; both stay mounted and remember their state
- `src/api/ehrbase.ts` – typed fetch wrapper for the openEHR REST API
- `src/api/browse.ts` – AQL-backed React Query hooks for the browse views (counts aggregated client-side)
- `src/lib/route.ts` – hash routing (`parseHash` / `toHash` / `useHashRoute`)
- `src/lib/webTemplate.ts` – labels and hidden RM attributes from web templates
- `src/lib/flat.ts` – FLAT composition → sections → entries → fields
- `src/lib/fieldTree.ts` – field explorer tree and AQL generation
- `src/lib/format.ts` – date and unit formatting
- `src/views/` – Browse views (overview, patient list, patient, composition, field explorer, breadcrumbs) and the AQL view
- `src/components/` – shared tables, field tree, template list, loading/error status
- `nginx/default.conf.template` – production server config (rendered with `envsubst` by the nginx image)

## License

MIT – see [LICENSE](LICENSE).
