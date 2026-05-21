# ✅ 배포 검증 체크리스트

## 📌 배포 전 최종 확인

### 1️⃣ 환경 분기 코드 ✅

**파일**: `src/lib/firebase.ts`

**현재 코드**: `hostname` 기반 체크
```typescript
const isLocalhost = typeof window !== "undefined" && 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

if (isLocalhost) {
  connectFirestoreEmulator(db, "localhost", 8086);
  connectAuthEmulator(auth, "http://localhost:9099");
}
```

**상태**: ✅ **안전** - 프로덕션 환경에서 자동 해제됨

---

## 📊 배포 단계별 체크리스트

### Step 1: Rules 배포

- [ ] `firebase deploy --only firestore:rules` 실행
- [ ] Firebase Console에서 Rules 반영 확인
- [ ] `isAdmin()` 함수 확인
- [ ] `members/{uid}` 경로 규칙 확인

### Step 2: 운영 Firestore 초기 세팅

- [ ] Association 문서 생성 (`associations/{associationId}`)
- [ ] Admin 멤버 문서 생성 (`associations/{associationId}/members/{ownerUid}`)
- [ ] 필드 확인 (name, ownerUid, status, createdAt, role, joinedAt)

### Step 3: 프론트 빌드

- [ ] `npm run build` 실행
- [ ] 빌드 성공 확인
- [ ] `dist/` 폴더 생성 확인

### Step 4: 프론트 배포

- [ ] `firebase deploy --only hosting` 실행
- [ ] 배포 성공 확인
- [ ] 실도메인 접속 확인

### Step 5: 실도메인 검증

- [ ] `https://실도메인` 접속
- [ ] Network 탭에서 `localhost:9099`, `localhost:8086` 요청 없음
- [ ] 콘솔 로그 확인 (프로덕션 모드)

### Step 6: 기능 테스트

**Admin 계정**:
- [ ] 공지 작성 성공
- [ ] 팀원 추가 성공

**Member 계정**:
- [ ] 공지 읽기 OK
- [ ] 공지 write → 차단 (permission-denied)
- [ ] 팀원 write → 차단 (permission-denied)

**비로그인**:
- [ ] 공지 읽기 OK
- [ ] 팀원 목록 조회 불가 (로그인 필요)

---

## 🎯 배포 완료 기준

모든 체크리스트 항목이 ✅ 상태면 배포 완료
