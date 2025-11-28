# Git 히스토리에서 .env 파일 완전 제거 스크립트 (git filter-branch 사용)
# BFG 없이도 실행 가능

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git 히스토리에서 .env 파일 제거" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 현재 브랜치 확인
$currentBranch = git branch --show-current
Write-Host "현재 브랜치: $currentBranch" -ForegroundColor Yellow
Write-Host ""

# 확인 메시지
Write-Host "⚠️  이 작업은 Git 히스토리를 영구적으로 변경합니다!" -ForegroundColor Red
Write-Host "자동 실행 중..." -ForegroundColor Yellow
Write-Host ""

Write-Host "🧹 Git 히스토리에서 .env 파일 제거 중..." -ForegroundColor Yellow

# git filter-branch로 .env 파일 제거
git filter-branch --force --index-filter `
    "git rm --cached --ignore-unmatch .env" `
    --prune-empty --tag-name-filter cat -- --all

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ filter-branch 실행 실패" -ForegroundColor Red
    exit 1
}

Write-Host "✅ .env 파일 제거 완료" -ForegroundColor Green
Write-Host ""

# Git GC 실행
Write-Host "🗑️ Git GC 실행 중..." -ForegroundColor Yellow
git reflog expire --expire=now --all
git gc --prune=now --aggressive
Write-Host "✅ Git GC 완료" -ForegroundColor Green
Write-Host ""

# 결과 확인
Write-Host "📊 히스토리 확인:" -ForegroundColor Cyan
git log --all --full-history -- .env
Write-Host ""

# 강제 push 안내
Write-Host "⚠️  다음 명령을 실행하여 GitHub에 강제 push하세요:" -ForegroundColor Yellow
Write-Host "   git push origin --force --all" -ForegroundColor Cyan
Write-Host "   git push origin --force --tags" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  주의: 강제 push는 협업 중인 경우 팀원과 상의 후 진행하세요!" -ForegroundColor Red
Write-Host ""

