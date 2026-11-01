# HexHarbor

[Open the live demo](https://systemh4rd.github.io/hexharbor/) · [Deployment checks](https://github.com/SystemH4rd/hexharbor/actions)

Cyberpunk OSINT workspace: phone, email and photo inputs, source cards, a relationship map and JSON export. The UI is in Russian. This release is a **static demonstration**. Every result and score is synthetic, including the "verified" examples.

## Run

Node.js 22+ is needed only for checks. The website has no dependencies and no build step.

```sh
npm test
npm run check
python3 -m http.server 8000 --directory docs
```

Open http://localhost:8000. All public files are inside `docs/`. The module loads only same-origin JSON fixtures; no real OSINT services are called. There are no accounts, analytics, persistent query history or API keys. Selected images stay in browser memory and are never uploaded. Export includes only demo records, never the user's input or image.

## GitHub Pages

Publish this repository as a project site named `hexharbor`. In Settings → Pages choose Source → GitHub Actions. The workflow `.github/workflows/pages.yml` runs behavior tests and validates public files, then deploys only `docs/` on pushes to `main` or manual dispatch. It requires the standard ephemeral Pages permissions, not a personal access token.

Alternative: choose Deploy from a branch → main → /docs. The `.nojekyll` file disables Jekyll processing.

Assets and fixture paths work beneath the project prefix. Tabs use hash navigation, including direct links `#phone`, `#email`, `#photo`, `#sources` and `#about`. If the repository name changes, update the two `/hexharbor/` references in `docs/404.html`.

## Structure

- `docs/index.html`: application shell and accessible forms.
- `docs/assets/app.js`: navigation, local image preview, mock scenarios, cards, map and export.
- `docs/assets/core.js`: validation, filters, summaries and export contract.
- `docs/assets/styles.css`: responsive cyberpunk styling and reduced motion.
- `docs/data/demo.json`: 9 synthetic results, three per mode.
- `docs/data/sources.json`: explicit synthetic source registry.
- `docs/schema/result.schema.json`: shared result contract.
- `tests/core.test.mjs`: behavior regression tests.
- `scripts/check.mjs`: public artifact/reference/fixture and credential-pattern checks.
- `ACCEPTANCE.md`: validation results and publication status.
- `ARCHITECTURE.md`: component relationships and future adapter boundary.

## Limitations

This is not live monitoring, phone owner lookup, email verification, reverse image search or facial recognition. Demo results are independent of entered values. "Verified" means verified only within a synthetic example. Real protected integrations require a separate backend and source-specific authorization; never put server secrets in client code. A private repository does not itself make a Pages site private.

License: MIT.

