# 🏁 STEP 4: 실서비스 배포 체크리스트

## 📌 목표
Emulator → 실서비스 전환을 코드 변경 최소로, 실수 0으로 완료

---

## 1️⃣ 환경 분기 최종 점검 (가장 중요)

### ✅ 확인 필요 사항

**DEV 환경에서만 Emulator 연결**
```typescript
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFirestoreEmulator(db, 'localhost', 8086);
}
```

### 검증 포인트

- [ ] `DEV=false` 빌드에서 위 코드 실행 안 됨
- [ ] `https://` 실도메인에서 접속 시 Emulator 포트로 안 붙음
- [ ] **중요**: 이거 하나 틀리면 운영에서 전부 로컬로 붙는 사고 발생

### 확인 방법

1. **빌드 테스트**
   ```bash
   npm run build
   ```
   - 빌드 결과에서 Emulator 연결 코드가 포함되지 않았는지 확인

2. **프로덕션 모드 테스트**
   - `https://실도메인` 접속
   - Network 탭에서 `localhost:9099` 또는 `localhost:8086`로 요청 없음 확인

---

## 2️⃣ Firestore Rules 배포 순서 (필수)

### ✅ 순서 고정

1. **Rules 먼저 배포**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **그 다음 프론트 배포**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### 검증

- [ ] 운영 콘솔에서 Rules 반영 확인
- [ ] member 계정 write → permission-denied 확인

---

## 3️⃣ 운영 Firestore 초기 세팅 (최소 세트)

### 반드시 수동으로 만들어야 할 것

#### 1. Association 문서
**경로**: `associations/{associationId}`

**필드**:
- `name` (string)
- `ownerUid` (string) - 운영 admin UID
- `status` (string): `"active"`
- `createdAt` (timestamp)

#### 2. Admin 멤버 문서
**경로**: `associations/{associationId}/members/{ownerUid}`

**필드**:
- `role` (string): `"admin"`
- `status` (string): `"active"`
- `joinedAt` (timestamp)

### ⚠️ 주의사항

- **운영에는 Emulator 데이터 안 옮긴다** (새로 시작)
- 최소 Association 문서 + Admin 멤버 문서만 생성
- 나머지는 운영 중에 UI로 생성

---

## 4️⃣ 공지/팀원 경로 최종 점검

### ✅ 코드에서 반드시 이것만 사용

```
associations/{associationId}/notices
associations/{associationId}/members
```

### ❌ 금지

- `collection(db, "notices")` - 루트 notices 참조 금지
- 루트 notices 컬렉션 직접 참조

### 확인 방법

```bash
# 루트 notices 참조 검색
grep -r 'collection(db.*"notices"' src/
grep -r "collection(db.*'notices'" src/
```

---

## 5️⃣ 레거시 데이터 정리 (선택)

### 루트 notices 컬렉션

- [ ] 코드 참조 0개 확인 후
- [ ] Emulator에서만 삭제 (운영 영향 없음)

### 확인 사항

- [ ] `src/` 폴더에서 `collection(db, "notices")` 검색 결과 없음
- [ ] 모든 공지 조회가 `associations/{id}/notices` 경로 사용

---

## 6️⃣ 운영 전 최종 테스트 시나리오 (5분 컷)

### Admin 로그인

- [ ] 공지 작성 성공
- [ ] 팀원 추가 성공

### Member 로그인

- [ ] 공지 읽기 OK
- [ ] 공지/팀원 write → 차단

### 로그아웃 사용자

- [ ] 공지 읽기 OK (정책에 따라)

---

## 📊 배포 전 체크리스트

- [ ] 환경 분기 코드 확인 (`import.meta.env.DEV`)
- [ ] Firestore Rules 배포 (`firebase deploy --only firestore:rules`)
- [ ] 운영 Firestore 초기 세팅 (Association + Admin 멤버)
- [ ] 루트 notices 참조 제거 확인
- [ ] 최종 테스트 시나리오 통과

---

## 🔄 다음 단계 선택

다음 중 하나를 선택:

1. **🚀 배포 진행**: 실제 배포 단계로 진행
2. **🧹 레거시 정리**: 코드 정리 및 레거시 데이터 삭제
3. **➕ 다음 확장**: 대회/시설 권한 확장

---

## 🎯 최종 선언

이 구조는 프로토타입이 아니라,
그대로 실서비스에 써도 되는 완성 구조다.
