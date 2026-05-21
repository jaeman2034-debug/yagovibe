# ✅ 커서 개발자 즉시 체크/수정 지시문

## 🎯 목표
남은 3가지 이슈 해결:
1. Google Maps 로딩/키/도메인 제한
2. Firebase Functions 호출 실패 (간헐) + CORS/인증/에뮬레이터
3. Firestore 인덱스/쿼리

---

## A. Google Maps 관련 (최우선)

### A-1) "google is not defined" 재발 방지 (MapPickerModal)

**파일**: `src/components/schedule/MapPickerModal.tsx`

**체크리스트**:
- [ ] `window.google?.maps` 접근을 무조건 가드
- [ ] `@googlemaps/js-api-loader` 사용 시 `Loader.load()` 완료 후에만 map 초기화
- [ ] 초기화 실패 시 에러 UI 표시

**수정 포인트**:
```typescript
// ✅ 올바른 패턴
useEffect(() => {
  if (!window.google?.maps) {
    setMapsError("지도를 불러올 수 없습니다.");
    return;
  }
  // map 초기화
}, []);

// ✅ Loader 사용 시
useEffect(() => {
  const initMap = async () => {
    try {
      await loadGoogleMapsAPI(); // 완료 대기
      if (!window.google?.maps) {
        throw new Error("Google Maps API 로드 실패");
      }
      // map 초기화
    } catch (error) {
      setMapsError("지도를 불러올 수 없습니다.");
    }
  };
  initMap();
}, []);
```

**현재 상태 확인**:
- [x] `MapPickerModal.tsx`에서 `window.google` 체크 여부 확인 ✅ (131-135번 줄)
- [x] 로딩 상태 관리 (`mapsLoading`, `mapsError`) 확인 ✅ (32-33번 줄)
- [ ] 에러 발생 시 재시도 버튼 제공 여부 확인 (현재는 새로고침 버튼만 있음)

**추가 개선 사항**:
- [ ] `reverseGeocode` 함수에서도 `window.google` 체크 강화 (41번 줄에 있지만 더 명확하게)

---

### A-2) "REQUEST_DENIED" 해결 (키 제한/허용 도메인)

**문제**: Geocoding Google Maps 직접 호출 시 `REQUEST_DENIED` 발생

**Google Cloud Console에서 확인**:

1. **API Key 설정 확인**:
   - [ ] Google Cloud Console → APIs & Services → Credentials
   - [ ] API Key 선택 (또는 새로 생성)

2. **Application restrictions 설정**:
   - [ ] 개발 환경: `None` (임시)
   - [ ] 또는 HTTP referrers에 다음 추가:
     ```
     http://localhost:5173/*
     http://127.0.0.1:5173/*
     https://yagovibe.com/*
     https://*.yagovibe.com/*
     ```

3. **API restrictions 확인**:
   - [ ] Maps JavaScript API → **Enabled**
   - [ ] Geocoding API → **Enabled**
   - [ ] Places API → **Enabled** (MapPicker에서 places 사용 시)

**주의사항**:
- `VITE_GOOGLE_MAPS_API_KEY` (프론트용) ≠ `GOOGLE_GEOCODING_API_KEY` (Functions Secret)
- 프론트 키: 브라우저 referrer 제한
- 서버 키: IP/서비스 제한

**체크리스트**:
- [ ] `.env.local`에 `VITE_GOOGLE_MAPS_API_KEY` 설정 확인
- [ ] Firebase Functions Secret에 `GOOGLE_GEOCODING_API_KEY` 설정 확인
- [ ] 두 키가 서로 다른 용도로 사용되는지 확인

---

## B. geocodeLocation Functions 호출 실패 처리

### B-1) 클라이언트 호출 방식 통일

**파일**: `src/utils/getAddressFromLatLng.ts`

**체크리스트**:
- [ ] `getFunctions(app, "asia-northeast3")`로 region 강제 설정 확인
- [ ] 로컬에서 에뮬레이터 연결 여부 확인 (`connectFunctionsEmulator` 사용 시 prod URL로 안 감)
- [ ] REST 직접 호출 코드가 있으면 `httpsCallable`로 통일

**수정 포인트**:
```typescript
// ✅ 올바른 패턴
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

const functions = getFunctions(app, "asia-northeast3");
const geocodeLocation = httpsCallable(functions, "geocodeLocation");

const result = await geocodeLocation({ latitude, longitude });
```

**현재 상태 확인**:
- [x] `getAddressFromLatLng.ts`에서 호출 방식 확인 ✅ (28번 줄: `fetch` 사용 중)
- [ ] `getAddressFromLatLngViaFunctions` 함수가 `httpsCallable` 사용하는지 확인 ❌ (현재 `fetch` 사용)
- [ ] 에뮬레이터 연결 코드가 있는지 확인

**수정 필요**:
- [ ] `src/utils/getAddressFromLatLng.ts` 16-77번 줄: `fetch` → `httpsCallable`로 변경
- [ ] `getFunctions(app, "asia-northeast3")`로 region 강제 설정

---

### B-2) 실패해도 "활동 시작/생성"은 계속 진행

**문제**: 주소 변환 실패 시 전체 flow fail

**파일**: `src/hooks/useActivitySession.ts` 또는 활동 시작 관련 코드

**수정 지시**:
- [ ] `startActivity()` 또는 `useActivitySession()`에서
  `address === null`이어도 **throw 하지 말고** `address: null`로 진행
- [ ] 주소는 "나중에 비동기 업데이트" 가능하게 설계
  - 먼저 세션/활동 생성 → 이후 address `updateDoc`

**수정 포인트**:
```typescript
// ✅ 올바른 패턴
const startActivity = async () => {
  try {
    // 주소 변환 시도 (실패해도 계속 진행)
    let address = null;
    try {
      address = await getAddressFromLatLng(lat, lng);
    } catch (e) {
      console.warn("주소 변환 실패 (계속 진행):", e);
    }

    // 활동 생성 (주소 없어도 OK)
    const activityRef = await addDoc(collection(db, "activities"), {
      // ... 기타 필드
      address: address || null, // null 허용
    });

    // 주소가 나중에 변환되면 업데이트
    if (!address) {
      getAddressFromLatLng(lat, lng)
        .then((addr) => {
          if (addr) {
            updateDoc(activityRef, { address: addr });
          }
        })
        .catch(() => {
          // 실패해도 무시
        });
    }
  } catch (error) {
    // 주소 변환 실패가 아닌 다른 에러만 throw
    throw error;
  }
};
```

**체크리스트**:
- [ ] 활동 시작 코드에서 주소 변환 실패 시 throw 여부 확인
- [ ] 주소를 optional 필드로 처리하는지 확인
- [ ] 주소 비동기 업데이트 로직 추가 여부 확인

**파일**: `src/features/activity/startActivity.ts`

**현재 상태** (83-94번 줄):
```typescript
console.log("🔍 [startActivity] 행정동 변환 중...");
const dong = await getAddressFromLatLngDetailed(
  finalLocation.lat,
  finalLocation.lng
);
console.log("✅ [startActivity] 행정동 변환 완료:", dong);
```

**수정 필요**:
- [ ] 주소 변환 실패 시 `dong = null`로 처리하고 계속 진행
- [ ] 세션 생성 후 주소 비동기 업데이트 로직 추가

---

## C. Firestore 인덱스/쿼리 문제

### C-1) ActivityFeed / MarketFeed 인덱스 확인

**문제**: "The query requires an index" 에러 발생

**체크리스트**:
- [ ] ActivityFeed 쿼리에서 `where` + `orderBy` 조합 확인
- [ ] Market list 쿼리에서 복합 인덱스 필요 여부 확인
- [ ] Firebase 콘솔 링크 뜨면 인덱스 생성 후 재테스트

**임시 해결책** (인덱스 생성 전까지):
- [ ] `orderBy` 제거하거나
- [ ] 쿼리 조건 축소해서 임시 운영 가능

**파일**: `src/features/activity/ActivityFeed.tsx`

**확인할 쿼리**:
```typescript
// 예시: 이런 쿼리는 인덱스 필요
query(
  collection(db, "activityLogs"),
  where("sport", "==", sport),
  where("type", "==", type), // 복합 인덱스 필요
  orderBy("createdAt", "desc")
);
```

**인덱스 생성 방법**:
1. Firebase Console → Firestore → Indexes
2. 콘솔 에러 링크 클릭 또는 수동 생성
3. Collection: `activityLogs`
4. Fields: `sport` (Ascending), `type` (Ascending), `createdAt` (Descending)

---

## D. 팀 생성 이후 "teamId=null" 문제

**문제**: 팀 생성 성공 화면인데 URL에 `teamId=null`이 붙어있음

**파일**: `src/pages/team/TeamCreateForm.tsx`

**체크리스트**:
- [ ] `createTeam` 함수 성공 응답 payload에 `{ teamId }`가 실제로 들어오는지 확인
- [ ] 프론트 `TeamCreateForm`에서 응답 `teamId` 받으면 즉시 `navigate(/teams/${teamId})` 또는
- [ ] step=2 라우팅에 `teamId`를 query로 주입

**수정 포인트**:
```typescript
// ✅ 올바른 패턴
try {
  const result = await createTeam(teamData);
  const teamId = result.data?.teamId || result.teamId;
  
  if (!teamId) {
    throw new Error("팀 ID를 받지 못했습니다.");
  }
  
  // 즉시 팀 상세로 이동
  navigate(`/teams/${teamId}`, { replace: true });
  
  // 또는 step=2로 이동
  // navigate(`/sports/${sportType}/team/create?step=2&teamId=${teamId}`, { replace: true });
} catch (error) {
  // 에러 처리
}
```

**현재 상태 확인**:
- [x] `TeamCreateForm.tsx`에서 `createTeam` 응답 처리 확인 ✅ (134번 줄)
- [x] `teamId` 추출 로직 확인 ✅ (134번 줄: `result.data.teamId`)
- [x] `navigate` 호출 시 `teamId` 전달 여부 확인 ✅ (139번 줄, 170번 줄)

**추가 확인 필요**:
- [ ] `createTeam` Cloud Function이 실제로 `teamId`를 반환하는지 확인
- [ ] `result.data.teamId`가 `undefined`일 경우 처리 로직 추가

---

## 🎯 개발자 최종 "테스트 시나리오"

### 테스트 1: 지도 모달
- [ ] `/activity/schedule/create` → 위치 선택 모달 열기
- [ ] 지도 정상 표시
- [ ] 위치 클릭 → lat/lng 반영

### 테스트 2: 활동 시작 (주소 변환 실패 허용)
- [ ] 활동 시작 (home) → 주소 변환 실패해도 "활동 시작" 자체는 성공
- [ ] 주소 없이 활동 생성 가능한지 확인

### 테스트 3: Activity 탭
- [ ] Activity 탭 → 거래/팀/이벤트 필터 정상 로딩
- [ ] 인덱스 에러 없이 데이터 표시

### 테스트 4: 팀 생성
- [ ] 팀 생성 → 생성 후 `teamId=null` 없이 팀 상세로 이동
- [ ] URL에 올바른 `teamId` 포함되는지 확인

---

## 📋 PR 단위 분리 (선택사항)

### PR1: MapLoader & MapPickerModal 안정화
- [ ] `MapPickerModal.tsx` 가드 로직 강화
- [ ] Google Maps API 로딩 상태 관리 개선
- [ ] 에러 처리 및 재시도 로직 추가

### PR2: geocodeLocation 호출 단일화 + startActivity non-blocking
- [ ] `getAddressFromLatLng.ts`에서 `httpsCallable` 통일
- [ ] 활동 시작 코드에서 주소 변환 실패 허용
- [ ] 주소 비동기 업데이트 로직 추가

### PR3: 인덱스/쿼리 정리 + teamId 라우팅 픽스
- [ ] Firestore 인덱스 생성 및 확인
- [ ] `TeamCreateForm.tsx`에서 `teamId` 라우팅 수정
- [ ] 쿼리 최적화 (필요 시)

---

## ✅ 완료 체크리스트

- [ ] A-1: MapPickerModal 가드 로직 확인/수정
- [ ] A-2: Google Maps API 키 제한 설정 확인
- [ ] B-1: geocodeLocation 호출 방식 통일
- [ ] B-2: 활동 시작 시 주소 변환 실패 허용
- [ ] C-1: Firestore 인덱스 생성/확인
- [ ] D: 팀 생성 후 teamId 라우팅 수정
- [ ] 테스트 시나리오 4개 모두 통과

---

**작성일**: 2025-01-XX  
**버전**: v1.0  
**상태**: 실행 지시문 완료
