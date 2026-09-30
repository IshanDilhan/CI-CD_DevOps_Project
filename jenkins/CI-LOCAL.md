# Local Windows CI demonstration

This job performs only checkout, dependency installation, automated tests, and a
frontend production build. It does not call AWS, build/push images, or deploy.
The existing root Jenkinsfile remains the separate full deployment pipeline.

## Run the installed local instance

Java 21, Node 22, Jenkins LTS, plugins, logs and Jenkins state are installed beneath
the ignored `.local/` directory. This is a portable process, not a Windows service.
It does not start automatically after reboot. Do not delete `.local` if you want
to retain this Jenkins installation and its build evidence.

From repository root in PowerShell:

```powershell
.\scripts\start-jenkins-ci.ps1
# After the startup script reports readiness, trigger one run:
.\scripts\run-jenkins-ci.ps1
```

Open http://127.0.0.1:8080/job/devops-ci/ . Sign in as `ci-admin` with the generated
password in `.local/jenkins-home/secrets/ci-admin-password.txt`. Read this file
locally; never paste or commit its value. An API token used by the trigger script
is stored in the same ignored secrets directory.

The server listens only on loopback, anonymous access is disabled, and no webhook,
polling, or timer trigger is configured. Bootstrap configures the job but never
starts a build. Clicking **Build Now** or running the trigger script starts one run.

## Pipeline and source

`Jenkinsfile.ci` is the reviewed pipeline definition. On startup the bootstrap
script copies its text into the job's Pipeline script configuration. It is not
automatically loaded from GitHub: restart this local instance after editing the
definition, or update the job's Pipeline script explicitly.

The Checkout stage clones the real `main` branch from
https://github.com/IshanDilhan/CI-CD_DevOps_Project.git into Jenkins's own workspace.
Local uncommitted application changes are not tested by this job. The build log
records the exact checked-out commit.

The four stages are:

1. Checkout: clone the public GitHub repository.
2. Install Dependencies: npm ci for both packages.
3. Test: four backend HTTP tests with a stubbed database and one React rendering test.
4. Build: compile React and archive HTML, JavaScript, and CSS as build artifacts.

The job supports Windows and Linux agents with Git, Node 22+, and npm on PATH.
It fails when any required command fails. It has a 20-minute timeout and disables
concurrent builds. Test success does not establish PostgreSQL or deployment health.

## Stop and troubleshoot

The process ID is recorded in `.local/jenkins-runtime/jenkins.pid`. Check that the
process is still the Java process for this Jenkins instance before stopping it;
PIDs can be reused. Stop Jenkins through its administration UI when practical.

Logs are in `.local/jenkins-runtime/jenkins.stdout.log` and `jenkins.stderr.log`.
Do not publish the whole Jenkins home: it contains credentials and internal state.
Port 8080 must be free; the startup script refuses to start a second listener.
The trigger script reports the build URL and result without printing credentials.

If `.local` is removed, the portable runtime and plugins must be installed again.
This setup intentionally avoids changing system Java, installing Docker, or creating
a Windows service for a single CI demonstration.

## Installation verification (2026-09-30)

Jenkins LTS 2.568.3, Java 21, Node 22 and 61 plugin archives were installed locally.
Java, Node and Jenkins downloads were checksum-verified. GitHub main was readable
at commit ca4784a6d675ca34d15ae56f415fb5ea657205e7. Both PowerShell scripts passed
PowerShell parser checks.

The attempted server launch from the app's command environment failed before the
job bootstrap with `Unable to establish loopback connection` and
`UnixDomainSockets.connect0: Invalid argument`. No CI build was triggered and no
Jenkins success result is claimed. Run the startup script from an ordinary Windows
PowerShell terminal. A similar Windows execution-context issue is documented at
https://github.com/openai/codex/issues/40902 . Confirm the actual build result after
startup; the earlier application tests do not substitute for a Jenkins run.
