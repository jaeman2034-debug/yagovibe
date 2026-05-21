# ADB PATH 자동 설정 스크립트
# 관리자 권한으로 실행 필요

$adbPath = "C:\Users\samsung256g\Downloads\platform-tools-latest-windows\platform-tools"

# ADB 파일 존재 확인
if (-not (Test-Path "$adbPath\adb.exe")) {
    Write-Host "❌ ADB를 찾을 수 없습니다: $adbPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ ADB 경로 확인: $adbPath" -ForegroundColor Green

# 현재 사용자 PATH 가져오기
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

# 이미 등록되어 있는지 확인
if ($currentPath -like "*$adbPath*") {
    Write-Host "✅ PATH에 이미 등록되어 있습니다." -ForegroundColor Green
    Write-Host "새 PowerShell 창을 열어서 'adb version'을 테스트하세요." -ForegroundColor Yellow
} else {
    # PATH에 추가
    $newPath = "$currentPath;$adbPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    
    Write-Host "✅ PATH에 추가되었습니다!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⚠️ 중요: 새 PowerShell 창을 열어야 합니다!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "다음 단계:" -ForegroundColor Cyan
    Write-Host "1. 현재 PowerShell 창 닫기" -ForegroundColor White
    Write-Host "2. 새 PowerShell 창 열기" -ForegroundColor White
    Write-Host "3. 'adb version' 실행하여 테스트" -ForegroundColor White
}

# 현재 세션에만 임시로 추가 (즉시 테스트용)
$env:Path += ";$adbPath"
Write-Host ""
Write-Host "현재 세션에 임시로 추가되었습니다. 'adb version'을 테스트할 수 있습니다." -ForegroundColor Cyan

