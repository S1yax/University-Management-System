$ErrorActionPreference = 'Stop'
$serverPath = Join-Path $PSScriptRoot '../server'
$vault = Join-Path $env:LOCALAPPDATA 'KBTU UMS'
$null = New-Item -Path $vault -ItemType Directory -Force

$start = [System.Diagnostics.ProcessStartInfo]::new()
$start.FileName = (Get-Command node -ErrorAction Stop).Source
$start.WorkingDirectory = (Resolve-Path -LiteralPath $serverPath).Path
$start.Arguments = 'src/bootstrap.js'
$start.UseShellExecute = $false
$start.CreateNoWindow = $true
$start.RedirectStandardInput = $true
$start.RedirectStandardOutput = $true
$start.EnvironmentVariables['UMS_BOOTSTRAP_PIPE'] = 'windows-dpapi'
$process = [System.Diagnostics.Process]::Start($start)

try {
    $raw = $process.StandardOutput.ReadLine()
    if (-not $raw) { throw 'Account setup produced no vault data.' }
    $records = @($raw | ConvertFrom-Json)
    if ($records.Count -gt 0) {
        $id = [Guid]::NewGuid().ToString('N')
        $pendingPath = Join-Path $vault "initial-access-$id.pending.json"
        $vaultPath = Join-Path $vault "initial-access-$id.json"
        $protected = foreach ($account in $records) {
            $secure = ConvertTo-SecureString -String $account.password -AsPlainText -Force
            [PSCustomObject]@{
                username = $account.username
                role = $account.role
                protectedPassword = ConvertFrom-SecureString -SecureString $secure
            }
        }
        ConvertTo-Json -InputObject @($protected) | Set-Content -LiteralPath $pendingPath -Encoding UTF8
    }
    $process.StandardInput.WriteLine('commit')
    $process.StandardInput.Close()
    $process.WaitForExit()
    if ($process.ExitCode -ne 0) { throw 'Account setup failed. Existing credentials were preserved.' }
    if ($records.Count -gt 0) {
        Move-Item -LiteralPath $pendingPath -Destination $vaultPath
        Write-Output "Initial passwords created for $($records.Count) accounts. Vault: $vaultPath"
    } else {
        Write-Output 'No new account passwords were needed.'
    }
} finally {
    $process.Dispose()
}
