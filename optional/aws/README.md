# Optional historical AWS reference — not a deployment quick start

These files preserve the imported Terraform and three-host Ansible design.
They are **not validated, not called by Jenkins, and not ready to apply**.
The legacy Dockerfiles are retained for reference; the active build is the root
Dockerfile. Its single app image replaces the legacy frontend/backend images.

Known gaps: fixed region/AMI/key/bucket names; broad IAM permissions; public SSH,
database and application security-group rules; old bootstrap/package assumptions;
no TLS; old playbook image names and split-host layout. The embedded database
password has been removed. If it was ever used, rotate it: removing it from the
working tree does not erase Git history. No history was rewritten.

For an optional cloud extension, provision one Linux Docker host separately,
use a TLS registry, copy `ansible/inventory.ssh.example.ini` to a private inventory,
verify its SSH host key, install Docker and Python requests, and use the current
`ansible/deploy.yml`. Use a restricted deployment identity, private database
networking, and an app ingress rule limited to your IP. Use short-lived cloud
credentials and scoped registry permissions. Review cost and `terraform plan`
before any cloud provisioning; do not run these historical files unchanged.

The current playbook verifies Docker instead of installing it. Docker Desktop
provides the engine locally; a remote host must have Docker installed beforehand.
