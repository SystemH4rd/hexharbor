# HexHarbor 2.0 — Live Evidence

[Open v2](https://systemh4rd.github.io/hexharbor/v2/) · [Original demo](https://systemh4rd.github.io/hexharbor/) · [Deployment checks](https://github.com/SystemH4rd/hexharbor/actions)

An evidence workspace in Ukrainian. Results come from actual DNS responses, numbering-plan metadata or the selected image bytes. Every finding carries a source, observation time and explicit scope. Version 1 remains available as a clearly marked synthetic demonstration.

| Input | Actual result | Boundary |
| --- | --- | --- |
| Email | MX, A, AAAA, SPF and DMARC records from Google DNS, with Cloudflare failover | Only the domain leaves the browser; mailbox existence and owner are unknown |
| Phone | E.164, region, format, possible/valid and type from pinned libphonenumber-js max metadata | Local rules do not establish activity, ownership or current carrier |
| Photo | Header dimensions, byte size, SHA-256 and supported EXIF from the selected JPEG/PNG/WebP | Local processing; no face recognition or reverse search; WebP EXIF is unsupported |

There are no illustrative confidence scores in v2. Status is `observed`, `derived`, `unknown` or `error`. Failure never produces demo answers. The in-app examples execute the same analyzers as user input. A generated test PNG is a test image, not a source fixture.

## Run and verify

Node.js 22+ and npm are required. Dependencies and lockfile are pinned.

```sh
npm ci
npm run build
npm test
npm run check
npm start
```

Open `http://localhost:4173/v2/`. The Node server provides the UI and optional HTTP API. The Pages artifact uses browser DNS over HTTPS directly; Pages does not execute the Node backend. For static-only local testing, serve `docs/` on localhost after building. Web Crypto requires HTTPS or a browser-trusted localhost context. Plain HTTP remote hosts show the hash as unavailable while continuing other photo checks.

## Architecture and files

- `docs/v2/app.js`: forms, cancellation, safe DOM rendering, filtering and export.
- `docs/v2/worker.js`: local phone and photo work off the UI thread.
- `docs/v2/lib/`: shared normalization, evidence model and email/phone/photo analyzers.
- `docs/v2/schema/result.schema.json`: independent v2 evidence contract.
- `server/`: optional Node HTTP API; no database, query history or image-upload endpoint.
- `scripts/vendor.mjs`: generates local browser libraries, licenses and hash provenance from the lockfile installation.
- `tests/`: behavior and HTTP integration tests with isolated deterministic inputs.
- `docs/assets/`, `docs/data/`: retained v1 demo and shared presentation assets.

See [architecture](ARCHITECTURE.md), [source registry](SOURCES.md), [API deployment](API.md), [quick start](START_HERE.md) and [acceptance evidence](ACCEPTANCE.md).

## GitHub Pages

The existing repository uses Settings → Pages → Source: **GitHub Actions**. A pull request runs install, build, tests and artifact checks. A successful push to `main` then deploys **only docs/**. Browser libraries are generated in CI and intentionally excluded from source control. Use `npm ci && npm run build` before local tests; branch publishing of unbuilt source would omit those libraries.

The workflow uses short-lived Pages permissions and needs no personal access token. Relative paths support the /hexharbor/ project prefix. Tabs use hash navigation, so direct links and refresh work without server routing. Keep HTTPS enabled. If renaming the repository, update the two v1 references in docs/404.html and the documentation URLs.

## Privacy and limits

Phone numbers and photos stay in browser memory. DNS providers receive the queried domain and normal connection metadata; their own policies apply. There is no application analytics or persistent search history. JSON export is downloaded locally and hides full phone numbers, file names, EXIF dates and hashes by default; the user can explicitly include them. GPS coordinates and camera serial numbers are never exposed. Source URLs and queried domains remain in DNS reports.

This is technical evidence, not person identification, mailbox verification, active-number lookup or authenticity certification. EXIF can be edited; metadata can become outdated; DNS answers depend on resolver and time. New protected integrations belong on a separately deployed API. Never embed credentials in static files.

Project license: MIT. Included library and metadata licenses are listed in [SOURCES.md](SOURCES.md) and included in the built site.
