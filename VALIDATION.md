# Validation report

Validated in the Windows editing environment on 2026-09-30 (Asia/Colombo).
The available bundled runtime was Node 24.19.0; the Dockerfiles target Node 22.
No Docker executable/engine, usable WSL Linux installation, Ansible command,
Terraform command or running Jenkins service was available for runtime validation.

## Successfully executed

- Backend dependency installation and four Node tests: real HTTP requests with a
  stubbed query interface, database/schema health, unavailable DB responses,
  input validation and parameterized CRUD query behavior.
- Frontend dependency installation, one React server-rendering test, and the
  esbuild production build.
- Served the compiled HTML, JavaScript and CSS through Express over a real local
  HTTP listener. The DB was stubbed; this is not a PostgreSQL integration test.
- JavaScript syntax checks for the backend and deployment smoke script.
- YAML parsing of compose.yaml, ansible/deploy.yml and jenkins/requirements.yml.
  Parsing is not Compose schema validation or Ansible module resolution.
- npm dependency audits: backend compatible fixes applied; backend and frontend
  subsequently reported zero known vulnerabilities. This is a registry advisory
  check, not a security certification or container-image scan.
- Reviewed Jenkins stage order, parameter validation, credential binding, fail-fast
  commands and temporary registry-auth cleanup. No Jenkins/Groovy parser was run.

## Not executed / not claimed

- Docker or Jenkins image builds, image pulls/pushes and actual Compose startup.
- PostgreSQL startup, real SQL CRUD, data persistence across container replacement.
- Full Jenkins execution, plugin resolution and declarative pipeline validation.
- ansible-playbook --syntax-check, collection loading, idempotency across two runs,
  Docker health polling, remote SSH deployment and authenticated registry pulls.
- Successful/failed release transitions and manual rollback against real containers.
- Browser interaction with CDN-backed modal assets; React output was tested by
  server rendering, not a browser automation test.
- Terraform validation/provisioning and any paid cloud service.

## Exact remaining verification on a Docker-capable machine

1. `docker compose config --quiet`
2. `docker compose up -d --build`
3. Complete the Jenkins credential/SCM setup described in README.md.
4. Run a normal Jenkins build; inspect every stage and archived release.txt.
5. `node scripts/smoke.mjs` from the host (Node 22+).
6. Repeat deployment with the same successful DEPLOY_TAG; confirm the application
   container is not recreated unnecessarily and the database data survives.
7. Build another release, then set DEPLOY_TAG to the earlier successful tag;
   confirm rollback and preserved data.
8. Test a nonexistent DEPLOY_TAG: image pull should fail before app replacement.

The Jenkins job includes Ansible syntax checking, Docker build, health and real
CRUD checks so these missing validations run when the lab is started. Failures
must be fixed based on actual logs before calling the lab verified end to end.
