# HexHarbor acceptance — 2026-11-01

Status: static demo implemented and locally checked. Repository https://github.com/SystemH4rd/hexharbor created; Pages source is GitHub Actions; HTTPS is enforced on the default domain. First deployment and live-site acceptance are pending.

## Implemented

Phone/email/photo tabs, input validation, local raster image preview, synthetic scenarios (success/empty/source error), 9 clearly marked demo results, verified/unverified filters, source links and dates, illustrative confidence scores, a relationship graph, shared metrics, JSON export without input or image, source registry, result schema, mobile menu, keyboard tabs, focus indicators, reduced motion, static 404 page, docs, and a Pages workflow that deploys only docs/.

## Validation actually performed

| Check | Result |
| --- | --- |
| Node behavior tests | 6 passed: phone/email/file validation, filters, summaries, export privacy, stale-response cancellation |
| Static verification | 11 publishable files; referenced resources present; 9 fixture records valid for the required fields; source URLs restricted to example domains; no credential-pattern matches |
| JavaScript syntax | app.js and core.js parse successfully |
| Browser phone example | 3 cards; unverified filter shows 1 |
| Browser email example | 3 cards |
| Browser photo example | 3 cards |
| Local PNG picker/preview | pixel.png loaded and displayed; synthetic analysis works |
| JSON export | Download completed; demonstration results only |
| Empty result | Correct empty state, 0 cards |
| Source error | Error state with retry control |
| Empty input | Visible error: “Введите номер телефона.” |
| Sources dialog | 3 synthetic source entries, working modal navigation |
| Project prefix | Browser app loaded in a nested test directory; local assets, JSON and phone demo worked |
| Responsive layout | iframe viewports 360, 390, 768, 1440 px; document scrollWidth equals clientWidth at each size |
| Mobile navigation | Keyboard toggle and source modal tested successfully |
| Privacy/source review | Generated source contains no real OSINT records, private user files, accounts, analytics or server credentials; user input is not persisted or sent to external APIs |
| Browser console | No application errors observed; unrelated browser-extension metadata errors excluded |

Responsive verification used browser iframes, not a physical Android/iOS device. This is not a full WCAG certification. Credential-pattern checks supplement source review and are not a guarantee about arbitrary future edits.

## Deployment contract

Separate repository name: hexharbor, owner to be verified at creation. Source: main. Public artifact: docs/. Preferred workflow: .github/workflows/pages.yml with GitHub Pages source set to GitHub Actions. Standard short-lived Pages permissions only; no personal access token required by the workflow.

Before claiming deployment complete: verify successful GitHub Pages deployment, actual public URL, HTTPS certificate, HTTP-to-HTTPS behavior, assets, navigation and demo behavior on that URL. Then record repository URL, published SHA and live URL in AWA-7.

## Linear relationships

AWA-5: implemented static interface.
AWA-6: result schema, provenance display and synthetic source registry implemented for demo; live source integration remains outside this release.
AWA-7: consumes the checked static interface; public deployment pending GitHub authentication.

No live monitoring, reverse image search or real owner lookup is implemented.

