# Optional Node API — v2

GitHub Pages hosts static files only. This API is implemented and tested for a separate Node.js 22+ deployment; the Pages workflow does not deploy it. The public v2 works using browser DoH and local phone/photo processing without an API key.

## Start

```sh
npm ci
npm run build
HOST=127.0.0.1 PORT=4173 npm start
```

The server serves the v2 UI at /v2/ and exposes the endpoints below. It dynamically serves a same-origin API config to that UI, with explicit browser DoH fallback. No image-upload endpoint exists. HOST, PORT and HEX_ALLOWED_ORIGINS are the only deployment options; the latter is a comma-separated exact origin allowlist. Set it to the origins you actually use. No credentials are required for the current public DNS adapters.

| Endpoint | Request | Response |
| --- | --- | --- |
| GET /api/v2/health | none | Version, capabilities, no persistent history |
| POST /api/v2/analyze | {"type":"email","domain":"example.org"} | v2 evidence report; no full email accepted as domain |
| POST /api/v2/analyze | {"type":"phone","value":"+1 202 555 0142"} | Same numbering-plan report as local analyzer; Pages normally keeps phones local |
| OPTIONS /api/v2/* | allowed Origin | CORS preflight |

POST requires Content-Type: application/json. Example:

```sh
curl -H 'Content-Type: application/json' \
  --data '{"type":"email","domain":"example.org"}' \
  http://localhost:4173/api/v2/analyze
```

Errors: 400 invalid input, 403 denied Origin, 404 unknown endpoint, 405 wrong method, 413 body too large, 415 non-JSON, 429 rate limit with Retry-After, 502 no useful DNS observations. Partial DNS failure returns 200 with report status partial and explicit error findings. A valid negative DNS response is a completed observation.

## Limits and deployment boundary

Default limits: 4 KiB request body; 20 analyses per socket IP per 60 seconds; at most 256 rate buckets; fixed Google/Cloudflare endpoints only; 6 seconds per provider attempt; 128 in-memory DNS cache entries; TTL bounded by actual record TTL and 300 seconds. Cache hits keep the original observation time. No application query logging, persistence, accounts or secrets. Provider/service and host access logs are outside this application's control.

Origin allowlisting is not authentication and does not stop non-browser clients. Socket-IP limits are per process and deliberately do not trust arbitrary X-Forwarded-For; behind a proxy clients may share one bucket. For a public backend, configure TLS termination, request/connection timeouts, host-level limits and a trusted proxy/global rate limiter appropriate to the deployment. The code server is a minimal reference service, not managed production infrastructure.

## Connect a separately deployed HTTPS API

1. Deploy this source and its lockfile on a Node 22+ host; run install and build before start. Verify /api/v2/health and a domain-only POST on the actual HTTPS host.
2. Allow the exact frontend origin https://systemh4rd.github.io using HEX_ALLOWED_ORIGINS. Do not place any secret in frontend config.
3. Change docs/v2/config.json to `{"version":"2.0.0","transport":"api","apiBase":"https://YOUR-VERIFIED-HOST/api/v2","fallbackToBrowser":true}`.
4. Add that verified API origin to the connect-src directive in docs/v2/index.html. Keep the existing DNS providers only if browser fallback remains enabled.
5. Adjust scripts/check.mjs's deliberate default-Pages config assertion to validate the intended verified HTTPS API host. Run the full checks, publish through a pull request and confirm the browser reports http-api.

No API host is claimed as deployed in this release. If no host is chosen, retain the current default browser configuration.
