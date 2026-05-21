# 로컬 PDF 생성 테스트 실행 스크립트 (PowerShell)
# 사용법: .\run-local-test.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 로컬 PDF 생성 테스트 시작" -ForegroundColor Green
Write-Host ""

# functions 디렉토리로 이동
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$functionsRoot = Split-Path -Parent $scriptPath
Set-Location $functionsRoot

Write-Host "📁 작업 디렉토리: $functionsRoot" -ForegroundColor Cyan
Write-Host ""

# ts-node로 실행
Write-Host "▶️  스크립트 실행 중..." -ForegroundColor Yellow
npx ts-node --project tsconfig.json scripts/localTestPDF.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 테스트 완료!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ 테스트 실패" -ForegroundColor Red
    exit $LASTEXITCODE
}

