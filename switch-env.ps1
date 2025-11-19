param(
    [ValidateSet("dev", "prod")]
    [string]$env
)

$devFile = ".env.local"
$prodFile = ".env.prod"
$targetFile = ".env"

if ($env -eq "dev") {
    Copy-Item $devFile $targetFile -Force
    Write-Host "✅ Switched to DEVELOPMENT environment (.env.local → .env)"
    Write-Host "🧩 Starting Firebase Emulators..."
    firebase emulators:start
}
elseif ($env -eq "prod") {
    Copy-Item $prodFile $targetFile -Force
    Write-Host "🚀 Switched to PRODUCTION environment (.env.prod → .env)"
}
else {
    Write-Host "⚠️ Usage: .\switch-env.ps1 dev or .\switch-env.ps1 prod"
}

