# 🚨 Google Maps API 키 설정 수정 필요

## 현재 앱 정상 작동하려면 아래 설정 필수

### 1️⃣ Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택: `yago-vibe-spt`
3. **APIs & Services** → **Credentials** 이동
4. API Key 선택 (또는 새로 생성)

---

### 2️⃣ Application restrictions 수정

#### 🔴 현재 REQUEST_DENIED 원인
👉 **localhost 허용 안됨**

#### ✅ 임시 테스트용 설정 (권장)
```
Application restriction: None
```
⚠️ **주의**: 프로덕션에서는 반드시 제한 설정 필요

#### ✅ 실제 개발용 권장 설정
```
Application restriction: HTTP referrers (web sites)

허용된 참조 페이지:
http://localhost:5173/*
http://127.0.0.1:5173/*
https://yagovibe.com/*
https://*.yagovibe.com/*
```

---

### 3️⃣ API 활성화 확인

반드시 **ON** 상태여야 함:

- ✅ **Maps JavaScript API** (필수)
- ✅ **Geocoding API** (필수)
- ✅ **Places API** (선택, 있으면 좋음)

**확인 방법:**
1. **APIs & Services** → **Enabled APIs**
2. 위 3개 API가 목록에 있는지 확인
3. 없으면 **+ ENABLE APIS AND SERVICES** 클릭하여 활성화

---

## 🎯 이거 안 하면 발생하는 증상

| 증상 | 원인 |
|------|------|
| 지도 안뜸 | Maps JS API 차단 |
| 주소 변환 실패 | Geocoding API 차단 |
| 활동 생성 실패 | 주소 변환 실패 연쇄 |
| 위치 모달 오류 | `google is not defined` |

---

## 📌 결론

👉 **Firebase** ✔️ 정상  
👉 **코드** ✔️ 정상  
👉 **남은 건 Google Maps 키 제한 1개**

**이거 풀면 지금 앱 90% 정상화됨**

---

## 🔧 설정 완료 후 확인 방법

1. 브라우저 콘솔 열기 (F12)
2. Network 탭에서 `maps.googleapis.com` 요청 확인
3. 응답 상태가 `200 OK`인지 확인
4. 지도 모달 열어서 정상 작동 확인

---

## ⚠️ 주의사항

- API 키는 **절대 공개 저장소에 커밋하지 마세요**
- `.env.local` 파일에만 저장
- `.gitignore`에 `.env.local` 포함 확인
