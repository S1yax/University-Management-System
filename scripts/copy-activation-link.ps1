param(
    [Parameter(Mandatory = $true)][string] $Username,
    [uri] $PortalUrl = 'http://localhost:5173/'
)

$ErrorActionPreference = 'Stop'
if (-not $PortalUrl.IsAbsoluteUri -or ($PortalUrl.Scheme -ne 'https' -and
    -not ($PortalUrl.Scheme -eq 'http' -and $PortalUrl.IsLoopback))) {
    throw 'Use an HTTPS portal URL or the local development URL.'
}
$vault = Join-Path $env:LOCALAPPDATA 'KBTU UMS'
$files = Get-ChildItem -LiteralPath $vault -Filter 'activation-*.json' -File |
    Where-Object { $_.Name -notlike '*.pending.json' } | Sort-Object LastWriteTime -Descending
foreach ($file in $files) {
    $record = Get-Content -Raw -LiteralPath $file.FullName | ConvertFrom-Json |
        Where-Object { $_.username -eq $Username } | Select-Object -First 1
    if ($record) {
        $secure = ConvertTo-SecureString -String $record.protectedToken
        $token = [System.Net.NetworkCredential]::new('', $secure).Password
        $builder = [UriBuilder]::new($PortalUrl)
        $builder.Fragment = 'activate=' + $token
        Set-Clipboard -Value $builder.Uri.AbsoluteUri
        Write-Output "Copied the private activation link for $Username."
        return
    }
}
throw 'No activation link found for that username.'
