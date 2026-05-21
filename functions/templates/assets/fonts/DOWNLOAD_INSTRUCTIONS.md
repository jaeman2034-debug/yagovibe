# 한글 폰트 다운로드 안내

## 방법 1: Google Fonts에서 직접 다운로드 (권장)

1. https://fonts.google.com/noto/specimen/Noto+Sans+KR 방문
2. "Download family" 버튼 클릭
3. 압축 파일 다운로드 및 압축 해제
4. `NotoSansKR-Regular.woff2`와 `NotoSansKR-Bold.woff2` 파일을 이 디렉토리에 복사

## 방법 2: CDN에서 직접 다운로드

PowerShell에서 실행:

```powershell
# Regular
Invoke-WebRequest -Uri "https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff2" -OutFile "NotoSansKR-Regular.woff2"

# Bold  
Invoke-WebRequest -Uri "https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff2" -OutFile "NotoSansKR-Bold.woff2"
```

## 방법 3: npm 패키지 사용

```bash
npm install @fontsource/noto-sans-kr
# node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-400-normal.woff2
# node_modules/@fontsource/noto-sans-kr/files/noto-sans-kr-korean-700-normal.woff2
```

## 확인

다운로드 후 다음 명령어로 확인:

```powershell
Get-ChildItem templates/assets/fonts | Select-Object Name, Length
```

예상 출력:
```
NotoSansKR-Regular.woff2  (약 100-200 KB)
NotoSansKR-Bold.woff2     (약 100-200 KB)
```

## 참고

폰트가 없어도 PDF는 생성되지만, 한글이 시스템 기본 폰트로 표시될 수 있습니다.
폰트를 추가하면 더 깔끔한 한글 렌더링이 가능합니다.

