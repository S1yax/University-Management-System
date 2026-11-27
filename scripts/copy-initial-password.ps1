param(
    [Parameter(Mandatory = $true)][string] $Username
)

$ErrorActionPreference = 'Stop'
$vault = Join-Path $env:LOCALAPPDATA 'KBTU UMS'
$files = Get-ChildItem -LiteralPath $vault -Filter 'initial-access-*.json' -File |
    Where-Object { $_.Name -notlike '*.pending.json' } |
    Sort-Object LastWriteTime -Descending
foreach ($file in $files) {
    $entry = Get-Content -Raw -LiteralPath $file.FullName | ConvertFrom-Json |
        Where-Object { $_.username -eq $Username } | Select-Object -First 1
    if ($entry) {
        $secure = ConvertTo-SecureString -String $entry.protectedPassword
        $text = [System.Net.NetworkCredential]::new('', $secure).Password
        Set-Clipboard -Value $text
        Write-Output "Copied the initial password for $Username."
        return
    }
}
throw 'No matching password was found in the local vault.'
