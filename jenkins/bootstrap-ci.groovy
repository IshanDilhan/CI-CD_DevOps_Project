// Used only by scripts/start-jenkins-ci.ps1 for the private local CI instance.
import jenkins.model.Jenkins
import jenkins.install.InstallState
import hudson.security.HudsonPrivateSecurityRealm
import hudson.security.FullControlOnceLoggedInAuthorizationStrategy
import jenkins.security.ApiTokenProperty
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition

def instance = Jenkins.get()
def root = new File(System.getenv('CI_LAB_ROOT'))
def passwordFile = new File(instance.rootDir, 'secrets/ci-admin-password.txt')
if (!passwordFile.exists()) {
    passwordFile.parentFile.mkdirs()
    passwordFile.text = UUID.randomUUID().toString() + UUID.randomUUID().toString()
}
def realm = instance.securityRealm
if (!(realm instanceof HudsonPrivateSecurityRealm)) {
    realm = new HudsonPrivateSecurityRealm(false)
    instance.setSecurityRealm(realm)
}
def account = hudson.model.User.getById('ci-admin', false)
if (account == null) {
    account = realm.createAccount('ci-admin', passwordFile.text.trim())
}
def authorization = new FullControlOnceLoggedInAuthorizationStrategy()
authorization.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(authorization)
instance.setNumExecutors(1)
instance.setSlaveAgentPort(-1)
instance.setInstallState(InstallState.INITIAL_SETUP_COMPLETED)

def tokenFile = new File(instance.rootDir, 'secrets/ci-api-token.txt')
if (!tokenFile.exists()) {
    def token = account.getProperty(ApiTokenProperty.class).tokenStore.generateNewToken('local-ci-automation')
    tokenFile.text = token.plainValue
    account.save()
}
def job = instance.getItem('devops-ci')
if (job == null) {
    job = instance.createProject(WorkflowJob.class, 'devops-ci')
}
job.setDescription('Manual CI only: GitHub checkout, locked dependencies, tests, and frontend build. No deployment or scheduled triggers.')
job.setDefinition(new CpsFlowDefinition(new File(root, 'Jenkinsfile.ci').getText('UTF-8'), true))
job.save()
instance.save()
println('Local CI job configured; authentication required. No build has been scheduled by bootstrap.')
