$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $repoRoot '.local\jenkins-runtime'
$jenkinsHome = Join-Path $repoRoot '.local\jenkins-home'
$javaExe = Get-ChildItem (Join-Path $runtimeRoot 'java') -Filter java.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName
$nodeExe = Get-ChildItem (Join-Path $runtimeRoot 'node') -Filter node.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName
if (!$javaExe -or !$nodeExe -or !(Test-Path (Join-Path $runtimeRoot 'jenkins.war'))) {
    throw 'Local Java, Node, and Jenkins runtimes are missing. See jenkins/CI-LOCAL.md.'
}
if (Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue) {
    throw 'Port 8080 is already in use. Check the existing process before starting another Jenkins.'
}
New-Item -ItemType Directory -Force (Join-Path $jenkinsHome 'init.groovy.d') | Out-Null
Copy-Item (Join-Path $repoRoot 'jenkins\bootstrap-ci.groovy') (Join-Path $jenkinsHome 'init.groovy.d\bootstrap-ci.groovy') -Force
$env:JENKINS_HOME = $jenkinsHome
$env:CI_LAB_ROOT = $repoRoot
$env:PATH = (Split-Path $nodeExe -Parent) + ';' + $env:PATH
$process = Start-Process -FilePath $javaExe -ArgumentList @(
    '-Xms256m', '-Xmx1024m', '-Djenkins.install.runSetupWizard=false',
    '-jar', ('"' + (Join-Path $runtimeRoot 'jenkins.war') + '"'),
    '--httpListenAddress=127.0.0.1', '--httpPort=8080'
) -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $runtimeRoot 'jenkins.stdout.log') `
  -RedirectStandardError (Join-Path $runtimeRoot 'jenkins.stderr.log')
$process.Id | Set-Content (Join-Path $runtimeRoot 'jenkins.pid')
Write-Output "Jenkins starting on http://127.0.0.1:8080 (PID $($process.Id)). No build triggered."
$deadline = (Get-Date).AddMinutes(3)
while ((Get-Date) -lt $deadline) {
    $process.Refresh()
    if ($process.HasExited) {
        throw 'Jenkins exited during startup. See .local/jenkins-runtime/jenkins.stderr.log. For Java loopback errors, run this script from ordinary Windows PowerShell.'
    }
    if (Test-Path (Join-Path $jenkinsHome 'secrets\ci-api-token.txt')) {
        try {
            $response = Invoke-WebRequest 'http://127.0.0.1:8080/login' -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Output 'Jenkins is ready. Run scripts/run-jenkins-ci.ps1 to trigger one build.'
                return
            }
        } catch { }
    }
    Start-Sleep -Seconds 3
}
throw 'Jenkins has not become ready within three minutes. Inspect the startup logs before retrying.'
