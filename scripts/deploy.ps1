# YAGO VIBE AI 리포트 시스템 배포 스크립트 (PowerShell)
# Usage: .\scripts\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 YAGO VIBE AI 리포트 시스템 배포 시작..." -ForegroundColor Cyan

# 1. React 빌드
Write-Host "📦 React 프로젝트 빌드 중..." -ForegroundColor Yellow
npm run build

if (-Not (Test-Path "dist")) {
    Write-Host "❌ 빌드 실패: dist 폴더가 생성되지 않았습니다." -ForegroundColor Red
    exit 1
}

Write-Host "✅ React 빌드 완료" -ForegroundColor Green

# 2. Functions 빌드
Write-Host "📦 Functions 빌드 중..." -ForegroundColor Yellow
Set-Location functions
npm run build
Set-Location ..

Write-Host "✅ Functions 빌드 완료" -ForegroundColor Green

# 3. Firebase 배포
Write-Host "🚀 Firebase 배포 시작..." -ForegroundColor Cyan
firebase deploy --only hosting,functions

Write-Host "✅ 배포 완료!" -ForegroundColor Green

# 4. 배포 알림 테스트 (선택사항)
$response = Read-Host "배포 알림을 Slack에 전송하시겠습니까? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "📤 Slack 배포 알림 전송 중..." -ForegroundColor Yellow
    # 프로젝트 ID를 환경 변수에서 가져오거나 수동으로 설정
    $projectId = (firebase projects:list | Select-String -Pattern "│" | Select-Object -First 1 | ForEach-Object { $_.Line.Trim() -split '\s+' | Select-Object -Last 1 })
    if ($projectId) {
        try {
            $url = "https://asia-northeast3-${projectId}.cloudfunctions.net/notifyDeployment"
            Invoke-WebRequest -Uri $url -Method GET -UseBasicParsing | Out-Null
            Write-Host "✅ 배포 알림 전송 완료" -ForegroundColor Green
        } catch {
            Write-Host "⚠️ 배포 알림 전송 실패 (함수가 아직 배포되지 않았을 수 있습니다)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️ 프로젝트 ID를 찾을 수 없습니다. 수동으로 알림을 전송하세요." -ForegroundColor Yellow
    }
}

Write-Host "🎉 배포 프로세스 완료!" -ForegroundColor Green

