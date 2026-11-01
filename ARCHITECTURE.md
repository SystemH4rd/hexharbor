# Components and dependencies

The browser loads index.html, styles.css and app.js. app.js imports core.js and reads the two same-origin demo JSON files. Rendering uses DOM textContent rather than interpolated HTML. User input and local image object URLs stay in memory. Changing mode invalidates any pending mock response. The selected scenario returns synthetic success, empty or error results. Filters, metrics, graph and JSON export all consume the same result array.

The public result fields are inputType, source, sourceUrl, observedAt, confidence, verificationStatus and summary, plus a stable id, category and explanatory detail. The contract is docs/schema/result.schema.json. confidence is an illustrative score and not a calibrated probability.

Future source adapters must return the same contract, preserve provenance and distinguish verified/unverified findings. Protected API calls belong on a separately authorized server; this repository contains no backend, credentials or live source adapters.

The Pages workflow depends on successful behavior and artifact checks. Deployment uses only docs/. Tests, documentation, local preview configuration and source-control metadata are not included in the Pages artifact.

Linear relationships: AWA-5 defines UI behavior, AWA-6 defines demo sources/data contract, AWA-7 depends on their tested static output. Issue status must reflect completed work; public HTTPS acceptance happens after a real deployment.

