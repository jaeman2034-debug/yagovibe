# 🔍 문제 진단 체크리스트

## ✅ 문제 1: Google 지도 로드 실패

### 즉시 확인할 사항

#### 1. 브라우저 콘솔 확인 (F12 → Console)

다음 명령어를 실행하세요:

```javascript
// 환경 변수 확인
checkGoogleMapsEnv()

// 또는 직접 확인
console.log("API Key:", import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
```

**예상 결과:**
- ✅ `API Key: AIzaSy...` → API 키 설정됨
- ❌ `API Key: undefined` → 환경 변수 누락

#### 2. 콘솔 에러 메시지 확인

다음 중 하나가 나타나는지 확인:

- `Google Maps JavaScript API error`
- `InvalidKeyMapError`
- `RefererNotAllowedMapError`
- `This API project is not authorized to use this API`

#### 3. Network 탭 확인 (F12 → Network)

1. **필터:** `maps.googleapis.com`
2. **요청 URL 확인:**
   ```
   https://maps.googleapis.com/maps/api/js?key=...
   ```
3. **응답 상태:**
   - ✅ `200 OK` → 정상
   - ❌ `403 Forbidden` → API 키 또는 도메인 제한 문제
   - ❌ `400 Bad Request` → API 키 형식 오류

#### 4. Google Cloud Console 확인

**필수 확인 사항:**

1. **API & Services → Credentials**
   - Maps API 키 선택
   - **Application Restrictions → HTTP website restrictions**
   - 다음 도메인들이 **모두** 등록되어 있는지 확인:
     ```
     https://yagovibe.com
     https://yagovibe.com/*
     https://www.yagovibe.com
     https://www.yagovibe.com/*
     http://localhost:5173
     http://localhost:5173/*
     ```

2. **API Library**
   - 다음 API들이 **Enabled** 상태인지 확인:
     - ✅ Maps JavaScript API
     - ✅ Geocoding API
     - ✅ Places API
     - ✅ Geolocation API (선택)

3. **Billing**
   - 결제 계정이 활성화되어 있는지 확인

---

## ✅ 문제 2: 마켓 페이지 "상품 로드 중입니다..." 무한 로딩

### 즉시 확인할 사항

#### 1. 브라우저 콘솔 확인 (F12 → Console)

다음 에러 메시지를 확인:

- `permission-denied`
- `missing or insufficient permissions`
- `Uncaught FirebaseError`
- `FirestoreError`

#### 2. Network 탭 확인 (F12 → Network)

1. **필터:** `firestore.googleapis.com`
2. **요청 확인:**
   - `marketProducts` 컬렉션 요청
   - 응답 상태 코드:
     - ✅ `200 OK` → 정상
     - ❌ `403 Forbidden` → Firestore 규칙 문제
     - ❌ `401 Unauthorized` → 인증 문제

#### 3. Firestore 규칙 확인

**Firebase Console → Firestore → Rules:**

현재 규칙:
```javascript
match /marketProducts/{productId} {
  allow read, write: if true;  // ✅ 테스트 모드
}
```

**확인 사항:**
- 규칙이 배포되었는지 확인
- `firebase deploy --only firestore:rules` 실행 필요할 수 있음

#### 4. 로그인 상태 확인

**디버그 패널 접속:**
```
https://yagovibe.com/debug
```

**확인 사항:**
- 사용자 정보에 UID가 있는지
- 로그인되지 않았다면 로그인 후 다시 시도

#### 5. Firestore 데이터 확인

**Firebase Console → Firestore Database:**

1. **`marketProducts` 컬렉션 존재 확인**
2. **데이터가 있는지 확인**
3. **데이터가 없으면 테스트 데이터 추가**

---

## 🚀 즉시 실행할 진단 명령어

### 브라우저 콘솔에서 실행:

```javascript
// 1. Google Maps API 확인
checkGoogleMapsEnv()

// 2. Firestore 연결 확인
import { db } from '/src/lib/firebase.js';
console.log("Firestore:", db);

// 3. 로그인 상태 확인
import { auth } from '/src/lib/firebase.js';
console.log("Current User:", auth.currentUser);

// 4. 마켓 상품 쿼리 테스트
import { collection, getDocs } from 'firebase/firestore';
const q = collection(db, "marketProducts");
getDocs(q).then(snap => {
  console.log("상품 개수:", snap.size);
  snap.docs.forEach(doc => {
    console.log("상품:", doc.id, doc.data());
  });
}).catch(err => {
  console.error("Firestore 에러:", err);
});
```

---

## 📋 결과 보고서

다음 정보를 알려주시면 즉시 원인을 확정할 수 있습니다:

1. **브라우저 콘솔 에러 메시지** (전체 텍스트)
2. **Network 탭에서 실패한 요청** (URL + 상태 코드)
3. **checkGoogleMapsEnv() 실행 결과**
4. **Firestore 규칙 현재 상태** (스크린샷 또는 텍스트)
5. **로그인 상태** (디버그 패널에서 확인)

이 정보만 있으면 100% 확정 가능합니다!

