$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$tokenPath = Join-Path $repoRoot '.local\jenkins-home\secrets\ci-api-token.txt'
if (!(Test-Path $tokenPath)) { throw 'Start Jenkins and wait for initialization first.' }
$token = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
$encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('ci-admin:' + $token))
$headers = @{ Authorization = 'Basic ' + $encoded }
$baseUrl = 'http://127.0.0.1:8080'
# API-token authentication is exempt from Jenkins CSRF crumbs.
$response = Invoke-WebRequest -Uri "$baseUrl/job/devops-ci/build" -Method Post -Headers $headers -UseBasicParsing
$queueUrl = [string]$response.Headers.Location
if (!$queueUrl.StartsWith("$baseUrl/queue/item/")) { throw 'Unexpected Jenkins queue URL; inspect the job before retriggering.' }
Write-Output 'One manual build queued.'
$deadline = (Get-Date).AddMinutes(22)
$buildUrl = $null
while ((Get-Date) -lt $deadline) {
    if (!$buildUrl) {
        $queue = Invoke-RestMethod -Uri ($queueUrl + 'api/json') -Headers $headers
        if ($queue.cancelled) { throw 'Jenkins queue item was cancelled.' }
        if ($queue.executable) {
            $buildUrl = [string]$queue.executable.url
            if (!$buildUrl.StartsWith("$baseUrl/job/devops-ci/")) { throw 'Unexpected Jenkins build URL.' }
            Write-Output "Build started: $buildUrl"
        }
    } else {
        $build = Invoke-RestMethod -Uri ($buildUrl + 'api/json') -Headers $headers
        if (!$build.building -and $build.result) {
            Write-Output "Build result: $($build.result)"
            Write-Output "Console: ${buildUrl}console"
            if ($build.result -ne 'SUCCESS') { exit 1 }
            exit 0
        }
    }
    Start-Sleep -Seconds 5
}
throw 'Timed out waiting. Inspect the existing build before triggering another one.'
