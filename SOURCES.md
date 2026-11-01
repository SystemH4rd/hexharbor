# Source registry — v2

| Source | Retrieval and scope | Version / license | Data exposure and limits |
| --- | --- | --- | --- |
| [Google Public DNS JSON](https://developers.google.com/speed/public-dns/docs/doh/json) | HTTPS GET for MX, A, AAAA and TXT; only domain names | Public DNS service; [privacy](https://developers.google.com/speed/public-dns/privacy) and service policies apply | Domain and normal connection metadata reach Google; ECS is set to 0.0.0.0/0; no email local part, phone or photo |
| [Cloudflare DNS JSON](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-json/) | Secondary fixed resolver after primary error/timeout | Public DNS service; [privacy](https://developers.cloudflare.com/1.1.1.1/privacy/public-dns-resolver/) and service policies apply | Domain and normal connection metadata reach Cloudflare; actual answering provider appears in each card |
| [libphonenumber-js](https://github.com/catamphetamine/libphonenumber-js) | Local metadata/max parsing and numbering rules | Pinned **1.13.7**; MIT code; Google metadata Apache-2.0 | No runtime network access. Validity/type reflects bundled rules, not live subscriber status |
| [exifr](https://github.com/MikeKovarik/exifr) | Local selective EXIF reading | Pinned **7.1.3**, MIT | No upload. JPEG/PNG EXIF only here; WebP EXIF explicitly unavailable. Tags can be edited |
| Browser Web Crypto | Local SHA-256 of selected bytes | Browser implementation | Requires secure context; identifies bytes, not author, provenance or authenticity |

The build copies all third-party licenses into docs/v2/vendor/ and records package versions and SHA-256 of generated JS in provenance.json. npm integrity is pinned by package-lock.json. There is no runtime CDN dependency. Updating a library requires updating the pin, build attribution, tests and user-facing version together.

DNS observations retain question, actual provider URL, retrieval time, TTL, response status and resolver AD attestation. Only matching SPF/DMARC TXT values are displayed; full policy evaluation, SPF recursion and organizational-domain DMARC inheritance are not implemented. NXDOMAIN, NODATA and Null MX have distinct meanings. Neither positive nor negative DNS proves the existence or owner of an individual mailbox.

Public DNS is the only external evidence source in the Pages release. There are no breach databases, leaked records, subscriber databases, reverse image providers or face recognition integrations. The application contains no source API keys or protected provider credentials. Test fixtures stay in tests/; legacy synthetic records stay in the explicitly labeled v1 demo.
