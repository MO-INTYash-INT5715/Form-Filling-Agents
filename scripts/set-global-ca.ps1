param(
    [string]$Path = "C:\certs\corp-root-ca.pem",
    [switch]$AlsoGit
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

try {
    [System.Environment]::SetEnvironmentVariable("NODE_EXTRA_CA_CERTS", $Path, [System.EnvironmentVariableTarget]::Machine)
    $env:NODE_EXTRA_CA_CERTS = $Path
    Write-Output "NODE_EXTRA_CA_CERTS set at machine level: $Path"
} catch {
    Write-Error "Failed to set NODE_EXTRA_CA_CERTS: $_"
    exit 4
}

if ($AlsoGit) {
    try {
        git --version > $null 2>&1
        git config --system http.sslCAInfo "$Path"
        Write-Output "Git system http.sslCAInfo set to: $Path"
    } catch {
        Write-Warning "Failed to set Git system config (requires Git in PATH and admin): $_"
    }
}

Write-Output "All done. Restart any terminals/IDEs/CI agents to pick up the new machine environment variable."
