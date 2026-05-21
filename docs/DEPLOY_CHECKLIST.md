# 🚀 실서비스 배포 직전 체크리스트

> **"망하지 않게 하는 것들" 위주로 정리**

---

## ✅ 1️⃣ 서버 / 데이터 체크 (필수)

### ✔ Firestore 인덱스 생성

- [ ] **geohash + createdAt 복합 인덱스 생성**
  ```bash
  # firestore.indexes.json 확인 후
  firebase deploy --only firestore:indexes
  ```
  - [ ] `market` 컬렉션: `geohash` (Ascending)
  - [ ] `marketProducts` 컬렉션: `geohash` (Ascending)
  - [ ] 인덱스 생성 완료 확인 (몇 분 소요)

- [ ] **Geo 쿼리 테스트**
  - [ ] 반경 1km 쿼리 정상 동작
  - [ ] 반경 5km 쿼리 정상 동작
  - [ ] 반경 20km 쿼리 정상 동작
  - [ ] 빈 화면 나오지 않는지 확인
  - [ ] 에러 로그 확인

- [ ] **읽기 비용 체크**
  - [ ] 지도 이동 시 read 횟수 확인 (Firebase Console)
  - [ ] 무료 한도 초과 여부 확인 (일일 50,000 read)
  - [ ] 예상 비용 계산 (초과 시 경고 설정)

---

## ✅ 2️⃣ 지도 성능 체크 (필수)

### ✔ idle fetch debounce 적용됨?

- [x] **300ms throttle 적용 확인**
  - 파일: `src/components/market/OptimizedProductMap.tsx`
  - 위치: `bounds_changed` 이벤트 리스너
  - 상태: ✅ 구현 완료

### ✔ 마커 diff 업데이트 적용됨?

- [x] **Map<id, Marker> 구조 사용**
  - 파일: `src/components/market/OptimizedProductMap.tsx`
  - 위치: `markersMapRef` 사용
  - 상태: ✅ 구현 완료

### ✔ 클러스터 동작 정상?

- [ ] **줌 레벨별 클러스터 테스트**
  - [ ] 줌 레벨 < 14: 클러스터 표시
  - [ ] 줌 레벨 >= 14: 개별 마커 표시
  - [ ] 클러스터 클릭 시 확대 동작 확인

### ✔ 1,000개 마커 테스트

- [ ] **대량 마커 성능 테스트**
  - [ ] 1,000개 마커 렌더 시간 < 1초
  - [ ] 메모리 사용량 확인
  - [ ] 프레임 드롭 없음 확인

---

## ✅ 3️⃣ UX 체크 (출시 직전 핵심)

### ✔ 위치 권한 거부 시 동작

- [x] **Fallback 위치 표시**
  - 파일: `src/hooks/useUserLocation.ts`
  - 기본값: 서울 시청 (37.5665, 126.9780)
  - localStorage에 저장된 위치 우선 사용
  - 상태: ✅ 구현 완료

- [ ] **안내 메시지 표시**
  - [ ] 위치 권한 거부 시 사용자 안내
  - [ ] 설정 페이지로 이동 링크

### ✔ GPS 늦게 잡힐 때 로딩 처리

- [x] **로딩 상태 관리**
  - 파일: `src/hooks/useUserLocation.ts`
  - `loading` 상태 제공
  - 상태: ✅ 구현 완료

- [ ] **스켈레톤/Spinner 표시**
  - [ ] 지도 로딩 중 스켈레톤 표시
  - [ ] 위치 로딩 중 스피너 표시

### ✔ 길찾기 버튼 동작

- [ ] **구글맵 정상 열림**
  - [ ] 앱에서 테스트 (iOS/Android)
  - [ ] 웹에서 테스트 (Chrome/Safari)
  - [ ] URL 형식 확인: `https://www.google.com/maps/dir/?api=1&destination=...`

### ✔ 네비 / 시트 / 지도 충돌 없음

- [ ] **모바일 실제 기기 테스트**
  - [ ] iPhone Safari 테스트
  - [ ] Android Chrome 테스트
  - [ ] 시트 드래그 시 지도 동작 확인
  - [ ] 네비게이션 중 지도 인터랙션 차단 확인

---

## ✅ 4️⃣ 모바일 실제 테스트 (필수)

### ✔ iPhone Safari 테스트

- [ ] **vh 계산 문제**
  - [ ] 지도 높이 정상 표시
  - [ ] safe-area 적용 확인
  - [ ] 주소창 숨김 시 레이아웃 깨짐 없음

### ✔ Android Chrome 테스트

- [ ] **위치 권한 다르게 동작**
  - [ ] 권한 요청 팝업 정상
  - [ ] 거부 시 fallback 동작
  - [ ] 설정에서 권한 변경 시 반영

### ✔ 3G 네트워크 테스트

- [ ] **느린 네트워크 테스트**
  - [ ] 이미지 로딩 시간 확인
  - [ ] Geo 쿼리 fetch 시간 확인
  - [ ] 타임아웃 처리 확인 (10초)

---

## ✅ 5️⃣ 보안 체크

### ✔ Firestore Rules 확인

- [x] **로그인 사용자만 write 가능**
  - 파일: `firestore.rules`
  - `market` 컬렉션: `allow create: if isSignedIn()`
  - 상태: ✅ 구현 완료

- [ ] **좌표 위조 방지**
  - [ ] 클라이언트에서 좌표 검증
  - [ ] 서버에서 좌표 범위 검증 (선택)

### ✔ API 키 숨김

- [ ] **Google Maps API 키**
  - [ ] Referrer 제한 설정 확인
  - [ ] 도메인 제한 확인
  - [ ] API 키 노출 방지 (환경 변수 사용)

- [ ] **Firebase 설정**
  - [ ] Firebase domain 제한 확인
  - [ ] CORS 설정 확인

---

## ✅ 6️⃣ 이미지 / CDN 체크

### ✔ 이미지 lazy loading 적용

- [ ] **카드 스크롤 성능**
  - [ ] `loading="lazy"` 속성 확인
  - [ ] Intersection Observer 사용 확인
  - [ ] 스크롤 성능 테스트

### ✔ 썸네일 크기 제한

- [ ] **이미지 최적화**
  - [ ] 업로드 시 리사이징 확인
  - [ ] 썸네일 크기 300kb 이하
  - [ ] WebP 포맷 사용 (선택)

### ✔ Cloudflare / Firebase CDN 적용

- [ ] **CDN 설정**
  - [ ] Firebase Storage CDN 활성화
  - [ ] Cloudflare 설정 (선택)
  - [ ] 캐시 헤더 확인

---

## ✅ 7️⃣ 에러 대응

### ✔ 네트워크 실패 시 UI

- [x] **재시도 버튼 있음**
  - 파일: `src/components/map/StatusPill.tsx`
  - 파일: `src/pages/GeneralMapPage.tsx` (AIOverlayPhase37)
  - 상태: ✅ 구현 완료

- [ ] **빈 지도 방지**
  - [ ] 네트워크 실패 시 기본 마커 표시
  - [ ] 에러 메시지 표시
  - [ ] 재시도 버튼 동작 확인

### ✔ 위치 못 잡으면 fallback

- [x] **Fallback 위치 사용**
  - 파일: `src/hooks/useUserLocation.ts`
  - 기본값: 서울 시청
  - 상태: ✅ 구현 완료

---

## ✅ 8️⃣ 출시 후 모니터링

### ✔ Firebase Analytics 이벤트

- [x] **Analytics 연결 확인**
  - 파일: `src/lib/analytics.ts`
  - 파일: `src/analytics/ga.ts`
  - 상태: ✅ 구현 완료

- [ ] **필수 이벤트 추가**
  - [ ] `map_opened` - 지도 열림
  - [ ] `product_clicked` - 상품 클릭
  - [ ] `navigation_started` - 길찾기 시작
  - [ ] `map_moved` - 지도 이동 (throttle)

### ✔ Crash 로그 연결

- [ ] **Sentry / Firebase Crashlytics**
  - [ ] Sentry 설정 확인 (파일: `src/main.tsx`)
  - [ ] Crashlytics 설정 확인
  - [ ] 에러 로그 수집 확인

---

## 🏁 최종 체크 (출시 버튼 누르기 전)

출시 전 이 5개만 확인:

```markdown
- [ ] 지도 이동 시 데이터 정상 로드 ✔
- [ ] 실제 휴대폰에서 정상 동작 ✔
- [ ] 길찾기 버튼 정상 ✔
- [ ] Firestore 비용 폭증 없음 ✔
- [ ] 위치 권한 거부 시 UX 정상 ✔
```

👉 **이 5개 통과하면 배포 가능**

---

## 📋 체크리스트 실행 순서

1. **개발 환경에서 테스트**
   - [ ] 모든 기능 정상 동작
   - [ ] 콘솔 에러 없음

2. **Firestore 인덱스 배포**
   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **프로덕션 빌드**
   ```bash
   npm run build:production
   ```

4. **실제 기기 테스트**
   - [ ] iPhone Safari
   - [ ] Android Chrome
   - [ ] 3G 네트워크

5. **최종 체크 5개 항목 확인**

6. **배포**
   ```bash
   firebase deploy
   ```

---

## ⚠️ 위험 요소

### 🔴 높은 위험도

1. **Firestore 인덱스 미생성**
   - 증상: Geo 쿼리 실패
   - 해결: 인덱스 생성 후 배포

2. **무료 한도 초과**
   - 증상: 서비스 중단
   - 해결: 비용 알림 설정, 읽기 최적화

3. **위치 권한 거부 시 빈 화면**
   - 증상: 사용자 이탈
   - 해결: Fallback 위치 + 안내 메시지

### 🟡 중간 위험도

1. **대량 마커 성능 저하**
   - 증상: 지도 느림
   - 해결: 클러스터링 활성화, 페이지네이션

2. **이미지 로딩 느림**
   - 증상: UX 저하
   - 해결: CDN 적용, lazy loading

3. **모바일 레이아웃 깨짐**
   - 증상: 사용성 저하
   - 해결: 실제 기기 테스트, safe-area 적용

---

## 🎯 배포 후 모니터링

### 첫 24시간 체크

- [ ] Firebase Console: 읽기 횟수 확인
- [ ] Analytics: 사용자 이벤트 확인
- [ ] Crashlytics: 에러 로그 확인
- [ ] 사용자 피드백 수집

### 주간 체크

- [ ] 비용 추이 확인
- [ ] 성능 메트릭 확인
- [ ] 사용자 행동 패턴 분석

---

## 📝 체크리스트 완료 기록

- [ ] 체크리스트 완료 날짜: ___________
- [ ] 배포 담당자: ___________
- [ ] 배포 시간: ___________
- [ ] 특이사항: ___________

---

**마지막 확인**: 모든 항목 체크 후 배포 진행 🚀
