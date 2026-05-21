# PowerShell 스크립트: 시드 데이터 실행
# 사용법: .\run-seed.ps1

Write-Host "🌱 노원구축구협회 시드 데이터 생성 시작..." -ForegroundColor Green

# 현재 디렉토리 확인
$currentDir = Get-Location
Write-Host "📂 현재 디렉토리: $currentDir" -ForegroundColor Cyan

# 서비스 계정 키 파일 경로
$serviceAccountKeyPath = Join-Path $currentDir "serviceAccountKey.json"
$absolutePath = Resolve-Path $serviceAccountKeyPath -ErrorAction SilentlyContinue

if (-not $absolutePath) {
    Write-Host "❌ 서비스 계정 키 파일을 찾을 수 없습니다: $serviceAccountKeyPath" -ForegroundColor Red
    Write-Host "📝 Firebase Console에서 서비스 계정 키를 다운로드하고 functions 디렉토리에 serviceAccountKey.json으로 저장하세요." -ForegroundColor Yellow
    Write-Host "   URL: https://console.firebase.google.com/project/yago-vibe-spt/settings/serviceaccounts/adminsdk" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 서비스 계정 키 파일 확인: $absolutePath" -ForegroundColor Green

# 환경 변수 설정
$env:GOOGLE_APPLICATION_CREDENTIALS = $absolutePath
Write-Host "✅ GOOGLE_APPLICATION_CREDENTIALS 설정 완료" -ForegroundColor Green

# 에뮬레이터 환경 변수 제거
if ($env:FIRESTORE_EMULATOR_HOST) {
    Write-Host "⚠️  FIRESTORE_EMULATOR_HOST 제거: $env:FIRESTORE_EMULATOR_HOST" -ForegroundColor Yellow
    Remove-Item Env:FIRESTORE_EMULATOR_HOST
}
if ($env:FIREBASE_AUTH_EMULATOR_HOST) {
    Remove-Item Env:FIREBASE_AUTH_EMULATOR_HOST
}
if ($env:FIREBASE_STORAGE_EMULATOR_HOST) {
    Remove-Item Env:FIREBASE_STORAGE_EMULATOR_HOST
}

Write-Host "✅ 에뮬레이터 환경 변수 제거 완료" -ForegroundColor Green

# 시드 스크립트 실행
Write-Host "🚀 시드 스크립트 실행 중..." -ForegroundColor Cyan
Write-Host ""

npx ts-node src/migrations/seed-nowon-association.ts

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ 시드 데이터 생성 완료!" -ForegroundColor Green
    Write-Host "🔥 Firestore 콘솔 확인: https://console.firebase.google.com/project/yago-vibe-spt/firestore" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ 시드 데이터 생성 실패 (Exit Code: $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

