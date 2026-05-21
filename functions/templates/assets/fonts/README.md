# 한글 폰트 파일

이 디렉토리에 다음 폰트 파일을 배치하세요:

- `NotoSansKR-Regular.woff2`
- `NotoSansKR-Bold.woff2`

## 폰트 다운로드

Google Fonts에서 Noto Sans KR을 다운로드하거나, 아래 링크에서 직접 다운로드:

https://fonts.google.com/noto/specimen/Noto+Sans+KR

또는 CDN에서 직접 다운로드:

```bash
# Regular
curl -o NotoSansKR-Regular.woff2 "https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff2"

# Bold
curl -o NotoSansKR-Bold.woff2 "https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4ITbgNA5Cgm20HTs4JMMuA.woff2"
```

## 확인

폰트 파일이 올바르게 배치되었는지 확인:

```bash
ls templates/assets/fonts
```

예상 출력:
```
NotoSansKR-Regular.woff2
NotoSansKR-Bold.woff2
```

