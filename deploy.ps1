# 🔥 YAGO SPORTS 배포 스크립트 (PowerShell)

Write-Host "🔨 빌드 시작..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 빌드 성공!" -ForegroundColor Green
    Write-Host "🚀 배포 시작..." -ForegroundColor Yellow
    firebase deploy --only hosting
} else {
    Write-Host "❌ 빌드 실패. 배포를 중단합니다." -ForegroundColor Red
    exit 1
}
