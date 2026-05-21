# Noto Sans KR 폰트 다운로드 스크립트

$fontsDir = "templates/assets/fonts"

# 디렉토리 확인
if (-not (Test-Path $fontsDir)) {
    New-Item -ItemType Directory -Path $fontsDir -Force | Out-Null
    Write-Host "✅ 폰트 디렉토리 생성: $fontsDir"
}

# Noto Sans KR 폰트 다운로드 (Google Fonts API 사용)
Write-Host "📥 Noto Sans KR 폰트 다운로드 중..."

# 방법 1: Google Fonts API 사용
$apiUrl = "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap"

try {
    # CSS 파일 다운로드
    $css = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing | Select-Object -ExpandProperty Content
    
    # woff2 URL 추출
    $regularMatch = $css | Select-String -Pattern 'url\(([^)]+\.woff2)\)' -AllMatches
    $boldMatch = $css | Select-String -Pattern 'url\(([^)]+\.woff2)\)' -AllMatches
    
    if ($regularMatch.Matches.Count -gt 0) {
        $regularUrl = $regularMatch.Matches[0].Groups[1].Value
        Write-Host "다운로드: $regularUrl"
        Invoke-WebRequest -Uri $regularUrl -OutFile "$fontsDir/NotoSansKR-Regular.woff2"
        Write-Host "✅ NotoSansKR-Regular.woff2 다운로드 완료"
    }
    
    if ($boldMatch.Matches.Count -gt 1) {
        $boldUrl = $boldMatch.Matches[1].Groups[1].Value
        Write-Host "다운로드: $boldUrl"
        Invoke-WebRequest -Uri $boldUrl -OutFile "$fontsDir/NotoSansKR-Bold.woff2"
        Write-Host "✅ NotoSansKR-Bold.woff2 다운로드 완료"
    }
} catch {
    Write-Host "❌ 자동 다운로드 실패: $_"
    Write-Host ""
    Write-Host "📋 수동 다운로드 방법:"
    Write-Host "1. https://fonts.google.com/noto/specimen/Noto+Sans+KR 방문"
    Write-Host "2. 'Download family' 클릭"
    Write-Host "3. 압축 해제 후 woff2 파일을 $fontsDir 에 복사"
    Write-Host ""
    Write-Host "또는 다음 명령어로 직접 다운로드:"
    Write-Host "  Invoke-WebRequest -Uri 'https://fonts.gstatic.com/s/notosanskr/v36/...' -OutFile '$fontsDir/NotoSansKR-Regular.woff2'"
}

# 다운로드 확인
Write-Host ""
Write-Host "📁 폰트 파일 확인:"
Get-ChildItem $fontsDir -Filter "*.woff2" | Select-Object Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}}

