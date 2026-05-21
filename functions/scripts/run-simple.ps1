# 간단한 실행 스크립트
# 사용법: .\run-simple.ps1

# 프로젝트 루트로 이동
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$functionsDir = Join-Path $projectRoot "functions"

Write-Host "📁 Functions 디렉토리로 이동: $functionsDir" -ForegroundColor Cyan
Set-Location $functionsDir

Write-Host "🚀 스크립트 실행 중..." -ForegroundColor Yellow
Write-Host ""

# tsx로 실행 (가장 간단하고 빠름)
npx tsx scripts/localTestPDF.ts

