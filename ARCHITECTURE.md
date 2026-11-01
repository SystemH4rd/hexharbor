# HexHarbor 2.0 architecture

The UI consumes one versioned evidence report. It does not create findings or assign invented confidence scores. Input normalization, source querying and interpretation live in separate modules shared by the browser and optional Node API.

| Layer | Modules | Responsibility |
| --- | --- | --- |
| Presentation | docs/v2/app.js, HTML/CSS | Accessible forms, hash navigation, local preview, cancellation, cards, filters and local JSON download |
| Local execution | docs/v2/worker.js | Phone metadata and image parsing in a module Worker; direct module fallback only where Workers are absent |
| Contract | lib/model.js, schema/result.schema.json | Public-domain normalization, input limits, report/status model and export redaction |
| Analysis | lib/email.js, phone.js, photo.js | Meaning of observations; explicit unknown ownership/activity/authenticity |
| DNS transport | lib/dns.js | Fixed DoH endpoints, question validation, deadlines, provider failover, TTL cache for API use |
| Optional HTTP boundary | server/api.mjs, index.mjs | JSON API, allowlisted origins, body/rate limits, static preview; no stored user records |
| Build/publish | scripts/vendor.mjs, Pages workflow | Lockfile install, local dependency/license packaging, validation, artifact-only deployment |

## Data flow

On GitHub Pages an email is reduced to a normalized public domain before network access. Five concurrent DNS checks query MX, A, AAAA, TXT/SPF and _dmarc TXT. Google is the primary resolver; Cloudflare is attempted after an error or timeout. A valid negative answer is evidence, so NXDOMAIN/NODATA does not trigger a fabricated result or unnecessary failover. The actual provider URL and retrieval time accompany each finding. AD=true is the resolver's attestation, not independent client DNSSEC validation. HTTP response reuse is disabled; resolver-side DNS caching still applies and TTLs are shown.

The optional Node deployment uses the same email analyzer and a bounded in-memory TTL cache. Cache hits retain their original observation timestamp and show age. Entries never outlive the smallest returned record TTL or 300 seconds; empty and NXDOMAIN answers are not cached by the application. The backend reports itself as http-api; Pages reports browser-doh. Configured API failure can fall back to real browser DoH, with a visible notice. No path loads v1 fixtures.

Phone and photo processing use local pinned libraries in a Worker. Photo input is limited to 10 MiB and 40 million declared pixels; the UI checks browser decoding and the analyzer independently checks file signatures/MIME and dimensions. SHA-256 measures file bytes through Web Crypto. EXIF reading is selective: GPS presence is reported without coordinates; serial numbers are not selected. Unsupported WebP EXIF or unavailable Web Crypto yields an explicit unknown finding while available checks continue. Header parsing is not a full image-format or authenticity validator.

## Evidence contract

Reports contain schemaVersion 2.0, application version, input type, checked time, transport, aggregate status, findings and notices. Each finding has an ID, title, source URL or local-source description, source version where relevant, observation time, fields and one status:

- observed: returned by a resolver or measured from local bytes.
- derived: interpretation using an identified metadata release.
- unknown: outside the check or unavailable capability.
- error: a requested source failed.

Complete means requested supported checks completed without source errors, not that all questions about a person were answered. Unknown scope findings are intentional. Mixed source errors are partial; no useful observations after source failures is error. Synthetic v1 uses a separate schema and is explicitly labeled at the root.

## Privacy and failure boundaries

Inputs and image object URLs remain in memory and are cleared on request. Changing mode/input cancels outstanding work and prevents stale results from rendering. All dynamic text uses textContent. CSP permits same-origin code/Workers and the two declared DNS origins. There is no analytics, database, persistent query history or file-upload endpoint. The optional API never accepts arbitrary upstream URLs; the fixed resolvers receive normalized domain names only. Origin allowlisting is browser policy, not authentication. The API needs deployment-level TLS and global abuse controls before wider hosting; see API.md.

Public Pages output is strictly docs/, including generated vendor libraries and licenses. Source, tests, server code, lockfile and local preview settings are not served as Pages files. A separate backend is implemented and tested but is not deployed by the Pages workflow.
