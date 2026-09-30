# DevOps Todo Lab

For the **CI-only Windows job** (checkout, install, test, build; no AWS or
deployment), see [jenkins/CI-LOCAL.md](jenkins/CI-LOCAL.md). Its separate pipeline
is `Jenkinsfile.ci`. The local installation is present, but Jenkins startup hit a
Java loopback error in the app's execution environment; a successful Jenkins run
has not yet been verified. The full deployment lab below remains available.

## Project Overview

A small Jenkins → Docker registry → Ansible delivery lab around an existing React,
Express and PostgreSQL todo application. The portfolio contribution is the DevOps
implementation: repeatable builds, tests, image versioning, secret handling,
deployment and operational documentation. Application provenance and existing
license metadata are preserved in [ATTRIBUTION.md](ATTRIBUTION.md).

No AWS account, Kubernetes, or paid infrastructure is required. One application
image contains the compiled React UI and Express API; PostgreSQL runs separately.
The local demo uses the Linux Docker engine supplied by Docker Desktop or Linux.

**Validation status:** See [VALIDATION.md](VALIDATION.md). Application tests and
build have been run; Docker/Jenkins/Ansible execution requires a Docker-capable
machine and has not been verified in the editing environment.

## Architecture

```text
Git
 ↓
Jenkins (checkout and npm dependencies)
 ↓
Test (API and UI)
 ↓
Build React → Docker Build → versioned tag
 ↓
Container Registry (local localhost:5001, or authenticated TLS registry)
 ↓
Ansible
 ↓
Linux/Docker Host
 ↓
Application :3000 → PostgreSQL (private network, persistent volume)
```

Jenkins, registry, app and database share `devops-lab`. The local Ansible inventory
uses `connection=local` inside Jenkins and controls the host engine through the
Docker socket. This demonstrates deployment to a Linux Docker engine, **not SSH
or a separate VM**. A separate inventory example documents the SSH extension.
Only one lab/job should deploy these fixed container names at a time.

## Technologies

Jenkins declarative Pipeline, Docker Engine and Compose v2, Ansible Core and
community.docker, Linux, Git, OCI container registry, Node 22, React 17, esbuild,
Express and PostgreSQL 16. npm lockfiles are used for repeatable dependency installs.

## Deployment

### Fastest complete pipeline demo

Prerequisites: Git, Docker Desktop with **Linux containers** (or Linux Docker
Engine), Compose v2, internet access, and enough memory for Jenkins (4 GB or more
available to Docker is a sensible lab starting point). Run from repository root:

```sh
docker compose up -d --build
docker compose logs --tail=50 jenkins
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

1. Open http://localhost:8080, unlock Jenkins using the displayed initial password,
   complete the setup wizard, and create your own administrator account. The image
   preinstalls Pipeline, Git, Credentials Binding, Timestamper and Stage View plugins.
2. Add a **Secret text** credential with ID `todo-db-password`. Choose a unique
   password of at least 16 characters. Keep the same value across deployments;
   changing the environment value does not rotate an existing PostgreSQL password.
3. Commit these changes to **your own Git repository**, then make them reachable
   from Jenkins. Create a Pipeline job using **Pipeline script from SCM → Git**;
   supply your repository URL, actual branch, and script path `Jenkinsfile`.
   For a private Git repository, select a Jenkins Git credential. The existing
   `origin` points to the upstream author's repository: do not push there.
4. Build the job. On its first run, parameter defaults use `localhost:5001` and
   `devops-todo`. Subsequent runs offer **Build with Parameters**. Leave `DEPLOY_TAG`
   empty for a new release. No registry credentials are needed for this local demo.
5. After the pipeline succeeds, open http://localhost:3000. If Node is installed,
   `node scripts/smoke.mjs` verifies HTTP, DB readiness, and a create/update/delete
   round trip. The pipeline runs this check automatically from Jenkins.

The Docker **daemon** resolves `localhost:5001` while pulling/pushing, so it reaches
its host's published registry port. The Jenkins container calls the app by Docker
DNS (`todo-app:5000`). Do not replace the registry value with `registry:5000`:
that container DNS name is not necessarily resolvable by the host Docker daemon.
The local registry uses HTTP and has no authentication; never expose it publicly.
If the engine rejects HTTP, add `localhost:5001` to Docker Engine's
`insecure-registries` setting, preserving existing settings, and restart Docker.
Only do this for the local loopback lab registry.

### App-only preview (before configuring Jenkins)

```sh
# Copy .env.example to .env and fill DB_PASSWORD with a unique local password.
# PowerShell: Copy-Item .env.example .env
# Linux/macOS: cp .env.example .env
docker compose --profile app up -d --build db app
node scripts/smoke.mjs
```

This uses a separate standalone database volume. Before deploying the pipeline
version, release port 3000 with `docker compose --profile app stop app db`.
The pipeline's `todo-data` database volume is separate; data is not copied between
these two demonstration modes.

### Authenticated registry

Create the repository in your registry. Add a Jenkins **Username with password**
credential (use a scoped registry token as password). Set `REGISTRY_CREDENTIALS_ID`
to its ID, `REGISTRY` to `docker.io` or your TLS registry hostname, and
`IMAGE_REPOSITORY` to e.g. `your-user/devops-todo`. Login uses stdin and a temporary
Docker config under ignored `.local`; post-build cleanup removes the auth file.
The local Ansible process inherits `DOCKER_CONFIG` for authenticated pulls.
Tags are `<build-number>-<12-character-Git-SHA>` and are not reused by this job.
Configure registry immutability if you need protection against external overwrites.

### Optional SSH/Linux deployment

Install Docker Engine and Python 3 with `requests` on the target; grant the deploy
user Docker access (equivalent to root). Install Ansible and the pinned collection
from `jenkins/requirements.yml` on your Linux controller. Copy the example inventory,
replace its documentation IP/user, verify the SSH fingerprint, and use a private key
through ssh-agent. Export `APP_IMAGE`, `DB_PASSWORD`, and, for private registries,
`REGISTRY`, `REGISTRY_USER`, `REGISTRY_PASSWORD` through your secret manager/session.
Use a registry accessible to the remote host; its localhost is not your laptop.

```sh
ansible-galaxy collection install -r jenkins/requirements.yml
ansible -i ansible/inventory.ssh.example.ini docker_hosts -m ping
ansible-playbook -i ansible/inventory.ssh.example.ini ansible/deploy.yml \
  -e health_url=http://127.0.0.1:3000/health
```

The URI task runs on the target, so loopback is appropriate for SSH deployment.
Default app binding stays on loopback. Use an SSH tunnel to view it securely:
`ssh -L 3000:127.0.0.1:3000 deploy@YOUR_HOST`. Ansible verifies Docker and fails
clearly if unavailable; it does not install or replace a host's Docker engine.
The supplied Jenkins job targets the local demo; remote Jenkins SSH credential
binding/inventory selection is an extension, not implemented in that job.
Historical AWS/Terraform files are under `optional/aws/`; read its README before use.

## CI/CD Pipeline

| Stage | Purpose and failure behavior |
|---|---|
| Checkout | Read SCM, validate image parameters, derive build/Git tag. |
| Install Dependencies | `npm ci` for server and frontend; lockfile mismatch fails. |
| Test | Node test runner: HTTP/API behavior and server-rendered React UI. |
| Build | Compile and minify React; no development server in production. |
| Docker Build | Multi-stage build; only runtime dependencies and static UI ship. |
| Docker Tag | Apply the full registry/repository/version reference. |
| Registry Login | Optional credential binding; local registry skips authentication. |
| Docker Push | Publish the version; failure prevents deployment. |
| Deploy with Ansible | Syntax check, pull, ensure DB/schema, converge app, health checks. |
| Health Check | HTTP readiness plus database CRUD smoke check; archive release.txt. |

Failures stop subsequent stages. A 30-minute timeout bounds each job. Concurrent
runs of this job are disabled. No infrastructure is destroyed on failure and no
broad image pruning occurs. Old release images remain available for rollback.
A rollback run skips dependency/test/build/tag/push stages and deploys the chosen
existing version; health and CRUD checks still run.

## Ansible

`ansible/inventory.ini` identifies the local Docker host connection.
`ansible/deploy.yml` contains ordered tasks; roles are unnecessary for one service.
The collection's `docker_image`, `docker_network`, `docker_volume`,
`docker_container`, `docker_container_info`, and `docker_container_exec` modules
manage Docker resources. `assert` checks inputs; `uri` checks HTTP readiness.

Flow: validate secrets → verify Docker → optional registry login → pull first →
ensure network/volume → start DB → wait for DB → create table if missing → log
previous image only → gracefully replace changed app → Docker health → HTTP health.

An unchanged image/config should not recreate the app. The schema operation uses
`IF NOT EXISTS`; volume and network tasks converge existing resources. Pulling is
performed each time and can report changed even if the digest is unchanged, so
this is practical convergence rather than a promise of a completely green recap.
Container replacement has brief downtime. A pull failure leaves the current app
untouched; a failure after replacement can leave the new release unhealthy until
manual rollback. This is not a zero-downtime or automatically rolling-back system.
Module behavior reference: [community.docker docker_container](https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_container_module.html).

## Docker

An **image** is a packaged filesystem/runtime; a **container** is its running
instance. The registry stores tagged images. The root `Dockerfile` builds the UI
in one stage and copies it into a slim Node runtime with production dependencies.
The app runs as the `node` user; its deployment drops capabilities and uses a
read-only root filesystem. PostgreSQL persists data in `todo-data` outside the app.
No custom database image is needed.

Runtime variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_NAME`, `DB_PASSWORD`, and
optional `SERVER_PORT` (5000). `/health` verifies access to the todo table; database
or schema failure produces 503. Browser API requests are same-origin, so promotion
does not require rebuilding public URLs. No secret belongs in React JavaScript.

## Rollback

1. Open the previous **successful** Jenkins build and read its archived `release.txt`.
2. Run **Build with Parameters** using the same registry/repository and put only
   its tag (e.g. `12-a1b2c3d4e5f6`) in `DEPLOY_TAG`.
3. Jenkins pulls that image and Ansible replaces the failed release, then verifies
   health and CRUD. Confirm http://localhost:3000.

The playbook also prints the previous image before replacement. Rollback is manual;
the pipeline does not auto-revert. Do not prune known-good tags or the registry
volume. Database contents persist, and rollback does not restore data or undo
schema migrations. This lab only creates one compatible table; future migrations
require a compatibility and backup strategy. Use one job to own this environment.

## Security and scope

- `.env`, private keys, local tooling and generated output are ignored; `.dockerignore`
  keeps them out of build context. Previously tracked placeholder `.env` files were removed.
- Jenkins stores the DB secret and optional Git/registry credentials. Secrets are
  not interpolated into Groovy commands or echoed; Ansible sensitive tasks use `no_log`.
  Docker administrators can inspect runtime environment values: this is a lab,
  not a secret-isolation boundary. Protect Jenkins home and Docker volumes.
- Jenkins runs as root with the host Docker socket for this local shortcut. It is
  **host-root-equivalent**. Use only trusted repositories/jobs; never run untrusted PRs.
  Production should use an isolated agent/engine and restricted deployment identity.
- No container uses `privileged`. Published lab ports bind to loopback; PostgreSQL
  has no published port. The app itself has no authentication; do not expose it as-is.
- The upstream embedded database password was removed, but remains in Git history.
  Rotate it wherever it was used. History was not rewritten and no new license invented.
- Existing UI Bootstrap/jQuery assets require CDN access. Upstream dependency age
  and production hardening are outside this small lab; review before public deployment.

## Troubleshooting

| Symptom | Check/action |
|---|---|
| Jenkins build fails | Read the first failed stage; confirm credentials ID, branch, Docker socket and plugin installation. |
| Tests fail | Run `npm ci` then `npm test` in the relevant package; inspect the failed assertion. |
| Docker build fails | Check download/network errors, lockfiles and root build context; use `docker build --progress=plain -t devops-todo:debug .`. |
| Registry push fails | Check registry logs, hostname, namespace/token scope and local HTTP setting. |
| Ansible SSH fails | Confirm inventory host/user, verified known_hosts, key, network access and Python; use `ansible ... -m ping`. |
| Container keeps restarting | Read `docker logs todo-app` and `docker logs todo-db`; check DB settings and persisted password. |
| Application inaccessible | Confirm 3000 is free, app is running and localhost is the Docker host; stop standalone preview before pipeline deploy. |
| Health check fails | Query `/health`; verify DB readiness/table/password. A running process alone is not readiness. |
| DB password changed | Restore the existing credential or rotate the DB role password deliberately; changing an env var does not update stored credentials. |

Five useful commands:

```sh
docker compose logs --tail=100 jenkins registry
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
docker logs --tail=100 todo-app
docker inspect --format '{{json .State.Health}}' todo-app
curl --fail http://localhost:3000/health
```

PowerShell users can use `curl.exe` to avoid the older PowerShell curl alias.
`docker compose down` stops Jenkins/registry but keeps their volumes. Containers
created by Ansible are managed separately; stop them with
`docker stop todo-app todo-db`. Do not use volume deletion as routine cleanup.

