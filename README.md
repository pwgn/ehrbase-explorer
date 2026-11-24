# EHRbase explorer

Small React + Vite app for exploring an [EHRbase](https://github.com/ehrbase/ehrbase)
openEHR CDR:

- **Browse** – overview (patient, composition and template counts), templates →
  patients → compositions, rendered as labelled sections using the template's web template.
  A field explorer lets you tick fields of a template and get one row per
  composition, plus the generated AQL.
- **AQL** – editor for ad-hoc queries (Ctrl/Cmd+Enter runs), with the uploaded
  templates listed in the sidebar for starter queries.

Every view has its own URL fragment (`#/ehrs/<id>`, `#/templates/<id>/fields?f=…`,
`#/aql?q=…`; see `src/lib/route.ts`), so links can be shared and the back button
works. Hash routing needs no server-side config.

Stack: React, TypeScript, Vite, TanStack Query, TanStack Table, CodeMirror, Tailwind,
shadcn/ui-style components (Radix primitives, Lucide icons). Light and dark themes.

## Requirements

An EHRbase instance (tested with 2.24) reachable without authentication
(`SECURITY_AUTHTYPE=NONE`), by default at `http://localhost:8081/ehrbase`.
`cdr/` has one ready to run.

> **Note:** the app has no login and proxies every request to EHRbase, so anyone
> who can reach it can read and modify all records. Only run it on localhost
> (the commands below bind to `127.0.0.1`).

## Local CDR

`cdr/compose.yaml` runs EHRbase 2.24.0 and its Postgres, with EHRbase published
on `127.0.0.1:8081` only. Data lives in `cdr/data/<service>`, and the DB
passwords come from `cdr/.env` (git-ignored).

```sh
cd cdr
cp .env.example .env            # then set real passwords
docker compose up -d --wait     # EHRbase takes ~30 s to become healthy
./seed.sh                       # needs curl, jq, GNU date
```

`seed.sh` uploads the OPTs in `cdr/templates/` (IDCR Vital Signs Encounter,
Problem List and Laboratory Test Report, from EHRbase's test data). It then creates
20 synthetic patients (`SYN-0001`…, namespace `ehrbase-explorer:synthetic`),
each with 2–4 vital-signs encounters, a problem list and sometimes a lab report.
The data is deterministic, and reruns skip templates and patients that already
exist. `PATIENTS=50 ./seed.sh` makes more, and `EHRBASE_URL` points the script elsewhere.

To start from nothing, remove the data directory as well; `down -v` doesn't
touch bind mounts, and the files belong to the Postgres container's user:

```sh
docker compose down -v
docker run --rm -v "$PWD/data:/data" ehrbase/ehrbase-v2-postgres:16.2 sh -c 'rm -rf /data/*'
```

`compose.box.yaml` is only for hosts where Docker's embedded DNS doesn't work
(e.g. a gVisor sandbox). Enable it with `COMPOSE_FILE=compose.yaml:compose.box.yaml` in `.env`.

> **Run the CDR in one place only.** `cdr/data/postgres` is a bind mount, so a
> second `docker compose up` from another Docker daemon that sees the same folder
> (e.g. the host *and* the dev box, which mounts this repo at `/work`) starts a
> second Postgres on the same data directory. The two don't detect each other
> across containers, and that can corrupt the database. Check `docker ps` in both
> places before starting it.

## Run

```sh
npm install
npm run dev       # http://localhost:9001
npm run build
npm run lint
```

`npm run dev:box` binds `0.0.0.0:9001` instead. Use it only behind the dev
box's proxy (https://ehrbase-explorer.dev.lokalhost.one, the one host Vite
accepts; see `allowedHosts` in `vite.config.ts`), because of the note above.

The dev server proxies `/ehrbase/*` to EHRbase, so no CORS config is needed.
Override the target with `EHRBASE_URL`, e.g. `EHRBASE_URL=http://localhost:8080 npm run dev`.

Without Node on the host, npm can run in a container; `--network=host` lets the
Vite proxy reach EHRbase on `localhost`:

```sh
alias npm='podman run --rm -it --userns=keep-id --network=host -v "$PWD":/work:Z -w /work -e npm_config_cache=/tmp/npm docker.io/library/node:22 npm'
# or with Docker
alias npm='docker run --rm -it --network=host -v "$PWD":/work -w /work -u "$(id -u):$(id -g)" -e npm_config_cache=/tmp/npm docker.io/library/node:22 npm'
```

## Dev box

On the dev box everything runs inside the project container
(`proj-ehrbase-explorer`, repo mounted at `/work`). The container has its own
Docker daemon, so the CDR stack runs there, not on the host. Vite serves the app at
https://ehrbase-explorer.dev.lokalhost.one through the host's Caddy proxy.

```sh
# from the host; drop the `docker exec … bash -c` wrapper when already inside the box
docker exec -u dev proj-ehrbase-explorer bash -c 'cd /work/cdr && docker compose ps'   # CDR status
docker exec -u dev proj-ehrbase-explorer bash -c 'cd /work/cdr && docker compose up -d --wait'

# (re)start the app; logs go to /tmp/vite-box.log in the box
docker exec -u dev proj-ehrbase-explorer bash -c '
  pkill -f "[v]ite --host" ; cd /work &&
  nohup setsid npm run dev:box > /tmp/vite-box.log 2>&1 < /dev/null &'
```

## Updating

**Code changes** (`src/`, `index.css`) hot-reload; nothing to restart.

**Dependencies:** after `npm install` or a `package.json` change, restart Vite
(see above or stop and rerun `npm run dev`). It pre-bundles dependencies at
startup and won't pick up new ones reliably until it restarts. Check the result with
`npm run build && npm run lint` (`build` runs the type check).

**UI components** follow [shadcn/ui](https://ui.shadcn.com) conventions, but
they are maintained by hand in `src/components/ui/`, not generated by the
shadcn CLI. There's no `components.json` and no `@/` path alias. To add one:

1. Install what it needs. Radix primitives come from the single `radix-ui`
   package (`import { Checkbox as CheckboxPrimitive } from 'radix-ui'`) and icons from `lucide-react`.
2. Copy the component source from ui.shadcn.com into `src/components/ui/<name>.tsx`.
3. Change `@/lib/utils` to the relative `../../lib/utils`, and drop any
   variants or colours that don't exist here.
4. Use the theme's colour classes (`bg-card`, `text-muted-foreground`, `border`,
   `bg-primary-soft`, `bg-warning-soft`, …). Raw Tailwind colours like `gray-500`
   don't follow dark mode.

Keep `ui/` files to components only (no exported constants or helpers), or
oxlint's `only-export-components` rule warns.

**Theme:** colours, radii and fonts are CSS variables in `src/index.css`. `:root` is
light, `.dark` is dark, and `@theme inline` exposes them as Tailwind classes. To add a
colour, define it in both `:root` and `.dark` and map it in `@theme inline`.
`index.html` sets the `dark` class before first paint (from `localStorage`
`theme`, else the system preference), and `src/lib/theme.ts` keeps React in step.
The fonts (Inter, JetBrains Mono) are bundled via `@fontsource-variable/*`, so
the app works without internet access.

**EHRbase / Postgres:** bump the image tags in `cdr/compose.yaml`, then
`docker compose up -d --wait` in `cdr/`, wherever the CDR runs. Back up or
reset `cdr/data/` first when the Postgres major version changes. New templates
go in `cdr/templates/` and are uploaded by `seed.sh`.

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

- `src/App.tsx` – sidebar navigation, top bar (breadcrumbs, theme toggle); the browse and AQL views stay mounted and remember their state
- `src/index.css` – design tokens (colours, radii, fonts) for light and dark mode
- `src/api/ehrbase.ts` – typed fetch wrapper for the openEHR REST API
- `src/api/browse.ts` – AQL-backed React Query hooks for the browse views (counts aggregated client-side)
- `src/lib/route.ts` – hash routing (`parseHash` / `toHash` / `useHashRoute`)
- `src/lib/webTemplate.ts` – labels and hidden RM attributes from web templates
- `src/lib/flat.ts` – FLAT composition → sections → entries → fields
- `src/lib/fieldTree.ts` – field explorer tree and AQL generation
- `src/lib/format.ts` – date and unit formatting
- `src/views/` – Browse views (overview, templates, patient list, patient, composition, field explorer, breadcrumbs) and the AQL view
- `src/components/ui/` – shadcn/ui-style primitives (button, card, badge, table, alert, …)
- `src/components/` – shared tables, field tree, template list, empty/loading/error states
- `cdr/` – local EHRbase + Postgres (`compose.yaml`), templates and `seed.sh`
- `nginx/default.conf.template` – production server config (rendered with `envsubst` by the nginx image)

## License

MIT – see [LICENSE](LICENSE).
