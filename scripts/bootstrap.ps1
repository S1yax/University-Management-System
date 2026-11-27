param([switch] $Activation)

$ErrorActionPreference = 'Stop'
$serverPath = Join-Path $PSScriptRoot '../server'
$vault = Join-Path $env:LOCALAPPDATA 'KBTU UMS'
$null = New-Item -Path $vault -ItemType Directory -Force

$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = (Get-Command node -ErrorAction Stop).Source
$start.WorkingDirectory = (Resolve-Path -LiteralPath $serverPath).Path
$start.Arguments = if ($Activation) { 'src/issue-activation.js' } else { 'src/bootstrap.js' }
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardInput = $true
$start.RedirectStandardOutput = $true
$start.EnvironmentVariables['UMS_BOOTSTRAP_PIPE'] = 'windows-dpapi'
$start.EnvironmentVariables['UMS_ACTIVATION_VAULT'] = 'windows-dpapi'
$process = [System.Diagnostics.Process]::Start($start)

try {
    $raw = $process.StandardOutput.ReadLine()
    if (-not $raw) { throw 'Account setup produced no vault data.' }
    $records = @($raw | ConvertFrom-Json)
    if ($records.Count -gt 0) {
        $id = [Guid]::NewGuid().ToString('N')
        $name = if ($Activation) { "activation-$id" } else { "initial-access-$id" }
        $pendingPath = Join-Path $vault "$name.pending.json"
        $vaultPath = Join-Path $vault "$name.json"
        $protected = foreach ($account in $records) {
            $secret = if ($Activation) { $account.token } else { $account.password }
            $secure = ConvertTo-SecureString -String $secret -AsPlainText -Force
            $entry = @{ username = $account.username; role = $account.role }
            $field = if ($Activation) { 'protectedToken' } else { 'protectedPassword' }
            $entry[$field] = ConvertFrom-SecureString -SecureString $secure
            [PSCustomObject] $entry
        }
        ConvertTo-Json -InputObject @($protected) | Set-Content -LiteralPath $pendingPath -Encoding UTF8
    }
    $process.StandardInput.WriteLine('commit')
    $process.StandardInput.Close()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'Account setup failed. Existing credentials were preserved.' }
    if ($records.Count -gt 0) {
        Move-Item -LiteralPath $pendingPath -Destination $vaultPath
        $method = if ($Activation) { "Activation links" } else { "Initial passwords" }
        Write-Output "$method created for $($records.Count) accounts. Vault: $vaultPath"
    } else {
        Write-Output 'No new account passwords were needed.'
    }
} finally {
    if (-not $process.HasExited) { $process.StandardInput.Close() }
    $process.Dispose()
}
