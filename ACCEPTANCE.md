# HexHarbor 2.0 acceptance — 2026-11-01

## Release and verification scope

Version 2 introduces actual public DNS observations and local metadata measurements. GitHub Pages hosts the static frontend; the optional Node API is implemented and tested but is not claimed as publicly deployed. Version 1 remains the labeled synthetic demo at the root.

## Checks performed before publication

| Check | Observed result |
| --- | --- |
| Behavior and HTTP integration tests | 27 passed: 6 legacy, 15 live analyzer, 6 HTTP API tests |
| Static artifact verification | 28 public files; local references, both contracts/configs, library pins/licenses and SHA-256 provenance checked; no credential-pattern matches |
| JavaScript and shell syntax | 15 JS/MJS files parsed; publish helper passed bash -n |
| Browser live DNS | example.org returned actual Google DNS answers: Null MX, A/AAAA, SPF and DMARC; source URLs, observation times and TTLs displayed |
| Optional API fallback | Preview server upstream did not complete; visible notice appeared and browser DoH supplied actual answers; no demo substitutions |
| Phone Worker | Reserved test number normalized to +12025550142; numbering-plan facts shown as derived; activity and owner unknown |
| Photo Worker on HTTP preview | Generated PNG measured as 640 x 360, actual 11872 bytes; no EXIF GPS found; SHA-256 marked unknown because remote HTTP lacks Web Crypto |
| Browser JSON download | All 4 photo findings exported; file name hidden by default; no image bytes or raw request included |
| Evidence filtering | Unknown filter showed the 2 applicable HTTP-preview photo findings |
| Input validation | Empty email showed a clear Ukrainian error and focused the input |
| Project prefix and layout | Nested /hexharbor/v2/ loaded correctly; phone results rendered at iframe widths 360, 390, 768, 1440; scrollWidth equaled clientWidth in each |
| Mobile menu and source dialog | Keyboard menu and 4-source registry worked at 360px; no horizontal overflow |
| Source/privacy review | Live code does not read demo fixtures, persist input, upload photos or contain provider credentials; no reverse image or face recognition |

The phone test uses a reserved example number, not a person. Photo fixtures are synthetic. Responsive checks use browser iframe viewports, not physical devices. The credential scan is a supplement to source review, not a guarantee for future edits. Tests simulate provider answers for determinism; the separate browser DNS check above used the actual live service.

## Publication gate

The release branch must pass pull-request verification (npm ci, build, tests and artifact checks) before merging. Main then publishes only docs/ via the existing Pages Actions configuration with HTTPS. Production verification must additionally exercise browser DoH without the preview API and confirm Web Crypto SHA-256 on the actual HTTPS origin. Record the corresponding commit, workflow run and live acceptance below when complete.

## Version 1 record

# HexHarbor acceptance — 2026-11-01

Status: PUBLISHED AND VERIFIED. Live site: https://systemh4rd.github.io/hexharbor/ . Repository: https://github.com/SystemH4rd/hexharbor . GitHub Actions deployment succeeded; HTTPS is enforced on the default domain.

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

Separate repository: SystemH4rd/hexharbor; owner verified in the GitHub creation form and repository UI. Source: main. Public artifact: docs/. Preferred workflow: .github/workflows/pages.yml with GitHub Pages source set to GitHub Actions. Standard short-lived Pages permissions only; no personal access token required by the workflow.

First deployment succeeded: https://github.com/SystemH4rd/hexharbor/actions/runs/41348119717 . Initial published application commit: a687215e2e20e27769ea16903bca43edd4bb6e7c. The subsequent documentation edits do not change the static application files.

Live acceptance: the HTTPS site loaded without a certificate warning; entering the HTTP URL navigated to HTTPS. Phone, email and photo examples each displayed 3 cards. The sources dialog displayed 3 entries and navigation worked. No application console warnings/errors were observed. All 22 remote file blob hashes matched the checked local source at the first application deployment.

## Linear relationships

AWA-5: implemented static interface.
AWA-6: result schema, provenance display and synthetic source registry implemented for demo; live source integration remains outside this release.
AWA-7: static interface published and verified at the live HTTPS URL; deployment evidence is recorded in the issue.

No live monitoring, reverse image search or real owner lookup is implemented.

