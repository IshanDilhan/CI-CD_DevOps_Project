# Interview Notes

## Architecture and scope

Git → Jenkins → tests → React build → Docker build/tag → registry → Ansible →
Linux Docker engine → Express + React :3000 → private PostgreSQL.

Original application: upstream React/Express/PostgreSQL todo application credited
in ATTRIBUTION.md. Portfolio work: CI/CD, packaging, tests, deployment and operations.
Local Ansible uses the Docker socket from Jenkins; SSH is an optional extension.

## Pipeline stages

Checkout → Install Dependencies → Test → Build → Docker Build → Docker Tag →
Registry Login → Docker Push → Deploy with Ansible → Health Check.

Ansible: validate → verify Docker → authenticate if required → pull → network and
volume → PostgreSQL → table → previous image → app replacement → health.

## Important files

| File | Explain it |
|---|---|
| Jenkinsfile | Stage order, credential binding, version tags, rollback parameter. |
| Dockerfile | Frontend build stage, slim runtime, non-root user, health check. |
| compose.yaml | Local Jenkins/registry and optional app-only preview. |
| jenkins/Dockerfile | CI tools and pinned Ansible collection. |
| ansible/inventory.ini | Local connection to the controller, controlling host Docker. |
| ansible/deploy.yml | Pull-before-replace, persistent DB, convergent app, readiness. |
| nodejs/server/app.test.js | HTTP behavior tested with a stubbed database. |
| react/client/ui.test.js | React rendering and UI control checks. |
| scripts/smoke.mjs | Real deployment health and CRUD round trip. |
| ATTRIBUTION.md / VALIDATION.md | Provenance and honest evidence boundaries. |

## 60-second explanation

I wrapped an existing todo application in a repeatable Jenkins pipeline. It installs
locked dependencies, tests the Express API and React UI, builds a production bundle,
and creates one Docker image for the frontend and backend. The image receives a
build-number and commit tag, then goes through a registry. Ansible pulls the image,
keeps the PostgreSQL volume, and replaces the app container when its image or
configuration changes. A health endpoint checks database readiness, followed by a
CRUD smoke test. Jenkins credentials supply secrets. Rollback means redeploying a
known-good tag; it is manual, with brief downtime and no database restore. The demo
runs locally without AWS. Jenkins's Docker socket access is a deliberate lab
shortcut that gives host-level authority; production would isolate that trust.

## Top 15 questions and answers

1. **What did you build versus reuse?** I reused the credited todo application and
   added the local DevOps workflow, tests, runtime fixes, packaging and documentation.
2. **Why one application image?** Express serves the compiled React UI and API from
   the same origin. This removes a frontend runtime and public-IP build configuration.
3. **What triggers the pipeline?** Build Now/Build with Parameters after SCM setup.
   Automatic webhooks or polling are not configured by these files.
4. **What do tests prove?** API tests use real HTTP with stubbed DB queries; the UI
   test server-renders React. The deployment smoke test verifies real database CRUD.
5. **Why npm ci?** It installs the committed dependency graph and rejects package/lock
   mismatches, making CI dependencies more repeatable than unconstrained installs.
6. **Why a multi-stage Dockerfile?** Build tooling stays in the build stage; the final
   image contains only Node, runtime dependencies, app code and the compiled frontend.
7. **How are releases identified?** A build number plus a 12-character Git SHA. The
   successful job archives the complete image reference in release.txt.
8. **Why use a registry locally?** It demonstrates actual tag/push/pull and separates
   building from deployment. The loopback HTTP registry needs no paid account.
9. **Where are secrets stored?** Jenkins credentials, temporarily bound as environment
   variables. Docker admins can still inspect runtime env values; images contain none.
10. **What is the inventory?** A list of managed hosts and connection settings. The
    default is local to Jenkins; the optional example uses SSH with verified host keys.
11. **What is idempotent here?** Network/volume creation and container convergence.
    Same image/config should not recreate the app; forced pulls may still report changed.
12. **How does health differ from container running?** /health queries the todo table;
    it returns 503 when the database/schema is unavailable, even if Node is alive.
13. **How does rollback work?** Supply a previous successful tag in DEPLOY_TAG. Build
    and push are skipped; Ansible deploys it and repeats health/CRUD checks. No auto-revert.
14. **What happens to data or a failed release?** The named DB volume survives app
    replacement. Pull failures leave the old app; post-replacement failures need manual
    rollback. Rollback does not undo schema changes or restore deleted data.
15. **What would change for production?** Isolate CI agents from the host socket,
    enforce registry TLS/auth/immutability, add app auth/TLS, restrict networking,
    maintain dependencies, back up DB data, and plan migrations and availability.

## Five troubleshooting commands

```sh
docker compose logs --tail=100 jenkins registry
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs --tail=100 todo-app
docker inspect --format '{{json .State.Health}}' todo-app
curl --fail http://localhost:3000/health
```

Start with the first failed stage. Check ports, registry addressing, credentials,
DB readiness and persistent DB password before rebuilding. Do not delete volumes
or run broad Docker pruning to diagnose a failure. Consult VALIDATION.md before
claiming any part of the pipeline has been demonstrated end to end.
