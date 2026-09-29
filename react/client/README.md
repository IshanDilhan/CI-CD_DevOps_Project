# Todo frontend

Existing React 17 todo components, originally bootstrapped with Create React App.
See ../../../ATTRIBUTION.md for upstream provenance (repository-root ATTRIBUTION.md).
The lab uses esbuild for a small production build instead of the old development
server. Run `npm ci`, `npm test`, and `npm run build` here with Node 22 or newer.
Express serves `build/` after the multi-stage Docker build copies it to `/app/public`.
API calls use the same origin; no public IP is baked into JavaScript.
The existing Bootstrap/jQuery styling and modal scripts use public CDNs and need
browser internet access. No frontend environment variable should contain secrets.
