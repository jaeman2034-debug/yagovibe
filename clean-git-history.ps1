# Git 히스토리에서 .env 파일 완전 제거 스크립트
# BFG Repo-Cleaner 사용

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git 히스토리에서 .env 파일 제거" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. BFG jar 파일 확인
$bfgPath = Get-ChildItem -Path . -Filter "bfg*.jar" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $bfgPath) {
    $bfgPath = Get-ChildItem -Path "$env:USERPROFILE\Downloads" -Filter "bfg*.jar" -ErrorAction SilentlyContinue | Select-Object -First 1
}

if (-not $bfgPath) {
    Write-Host "❌ BFG jar 파일을 찾을 수 없습니다." -ForegroundColor Red
    Write-Host ""
    Write-Host "다음 단계를 따라주세요:" -ForegroundColor Yellow
    Write-Host "1. https://rtyley.github.io/bfg-repo-cleaner/ 접속" -ForegroundColor Yellow
    Write-Host "2. 'Download the BFG Repo-Cleaner' 클릭하여 bfg-1.14.0.jar 다운로드" -ForegroundColor Yellow
    Write-Host "3. 다운로드한 jar 파일을 프로젝트 루트 폴더에 복사" -ForegroundColor Yellow
    Write-Host "4. 이 스크립트를 다시 실행" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ BFG 파일 발견: $($bfgPath.FullName)" -ForegroundColor Green
Write-Host ""

# 2. 백업 확인
$backupPath = "..\yagovibe-clean"
if (-not (Test-Path $backupPath)) {
    Write-Host "📦 Mirror clone 백업 생성 중..." -ForegroundColor Yellow
    $currentDir = Get-Location
    Set-Location ..
    git clone --mirror https://github.com/jaeman2034-debug/yagovibe.git yagovibe-clean
    Set-Location $currentDir
    Write-Host "✅ 백업 완료: $backupPath" -ForegroundColor Green
} else {
    Write-Host "✅ 백업 이미 존재: $backupPath" -ForegroundColor Green
}
Write-Host ""

# 3. Mirror clone에서 .env 파일 제거
Write-Host "🧹 Git 히스토리에서 .env 파일 제거 중..." -ForegroundColor Yellow
Set-Location $backupPath
java -jar $bfgPath.FullName --delete-files .env

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ BFG 실행 실패" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Write-Host "✅ .env 파일 제거 완료" -ForegroundColor Green
Write-Host ""

# 4. Git GC 실행
Write-Host "🗑️ Git GC 실행 중..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive
Write-Host "✅ Git GC 완료" -ForegroundColor Green
Write-Host ""

# 5. 강제 push 확인
Write-Host "⚠️  다음 명령을 실행하여 GitHub에 강제 push하세요:" -ForegroundColor Yellow
Write-Host "   git push --force" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  주의: 강제 push는 협업 중인 경우 팀원과 상의 후 진행하세요!" -ForegroundColor Red
Write-Host ""

Set-Location ..

