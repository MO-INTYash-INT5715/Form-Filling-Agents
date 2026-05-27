param(
    [string]$Path = "C:\certs\corp-root-ca.pem"
)

function Test-IsAdmin {
    $id = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $p = New-Object System.Security.Principal.WindowsPrincipal($id)
    return $p.IsInRole([System.Security.Principal.WindowsBuiltinRole]::Administrator)
}

if (-not (Test-IsAdmin)) {
    Write-Error "Please run this script as Administrator."
    exit 2
}

if (-not (Test-Path $Path)) {
    Write-Error "File not found: $Path"
    exit 3
}

$bytes = [System.IO.File]::ReadAllBytes($Path)
$checkLen = [Math]::Min(64, $bytes.Length - 1)
$hasNulls = $false
for ($i=0; $i -le $checkLen; $i++) {
    if ($bytes[$i] -eq 0) { $hasNulls = $true; break }
}

if ($hasNulls) {
    if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
        $text = [System.Text.Encoding]::Unicode.GetString($bytes)
    } elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
        $text = [System.Text.Encoding]::BigEndianUnicode.GetString($bytes)
    } else {
        $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    }
    $fixedPath = "$Path.fixed.pem"
    [System.IO.File]::WriteAllText($fixedPath, $text, [System.Text.Encoding]::ASCII)
} else {
    $fixedPath = $Path
}

try {
    $raw = Get-Content -Raw -ErrorAction Stop $fixedPath
} catch {
    Write-Error "Unable to read $fixedPath: $_"
    exit 4
}

if ($raw -notmatch '-----BEGIN CERTIFICATE-----') {
    Write-Error "No PEM header found in $fixedPath. Aborting."
    exit 5
}

Write-Output "Importing certificate to LocalMachine\Root (requires admin)..."
$certutilArgs = "-addstore -f Root `"$fixedPath`""
$proc = Start-Process -FilePath certutil -ArgumentList $certutilArgs -NoNewWindow -Wait -PassThru
if ($proc.ExitCode -ne 0) {
    Write-Error "certutil failed with exit code $($proc.ExitCode)"
    exit $proc.ExitCode
}

if ($fixedPath -ne $Path) { Remove-Item -Path $fixedPath -Force }

Write-Output "Import successful."
