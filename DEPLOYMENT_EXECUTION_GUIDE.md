# 🚀 배포 실행 가이드 (안전 루트)

## 📌 목표
사고 없이 운영으로 전환

---

## 1️⃣ Rules 먼저 배포 (필수)

### 실행 명령
```bash
firebase deploy --only firestore:rules
```

### 검증 포인트

- [ ] 운영 콘솔에서 Rules 반영 확인
  - Firebase Console → Firestore → Rules 탭
  - `isAdmin()` 함수 포함 확인
  - `members/{uid}` 경로 규칙 확인
  
- [ ] member write → permission-denied 확인
  - Rules Simulator 또는 실제 테스트

---

## 2️⃣ 운영 Firestore 최소 세팅 (수동)

### Association 문서 생성

**경로**: `associations/{associationId}`

**Firebase Console에서 생성**:
1. Firestore Database → Data 탭
2. "Start collection" → Collection ID: `associations`
3. Document ID: `{associationId}` (예: `RAd4wAbqcsjcVBGLeFiw`)
4. 필드 추가:

| Field ID | Type | Value |
|----------|------|-------|
| `name` | string | 협회 이름 |
| `ownerUid` | string | 운영 admin UID |
| `status` | string | `active` |
| `createdAt` | timestamp | 현재 시간 |

### Admin 멤버 문서 생성

**경로**: `associations/{associationId}/members/{ownerUid}`

**Firebase Console에서 생성**:
1. Association 문서 선택
2. "+ Subcollection" → Subcollection ID: `members`
3. "Add document" → Document ID: `{ownerUid}` (운영 admin UID)
4. 필드 추가:

| Field ID | Type | Value |
|----------|------|-------|
| `role` | string | `admin` |
| `status` | string | `active` |
| `joinedAt` | timestamp | 현재 시간 |

---

## 3️⃣ 프론트 배포

### DEV 분기 확인

**파일**: `src/lib/firebase.ts`

**확인 사항**:
- [ ] Emulator 연결 코드가 `hostname` 기반 체크 사용
- [ ] `localhost` / `127.0.0.1` 체크로 프로덕션 자동 해제

**현재 코드**:
```typescript
const isLocalhost = typeof window !== "undefined" && 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

if (isLocalhost) {
  connectFirestoreEmulator(db, "localhost", 8086);
  connectAuthEmulator(auth, "http://localhost:9099");
}
```

**상태**: ✅ 안전 - 프로덕션에서 자동 해제됨

### 배포 명령

```bash
npm run build
firebase deploy --only hosting
```

### 실도메인 접속 시 Emulator 포트 미접속 확인

- [ ] `https://실도메인` 접속
- [ ] Network 탭에서 `localhost:9099`, `localhost:8086` 요청 없음 확인
- [ ] 콘솔에 "프로덕션 모드" 로그 확인

---

## 4️⃣ 배포 후 5분 검증

### Admin 계정

- [ ] 공지 작성 성공
- [ ] 팀원 추가 성공

### Member 계정

- [ ] 공지 읽기 OK
- [ ] 공지 write → 차단 (permission-denied)
- [ ] 팀원 write → 차단 (permission-denied)

### 비로그인 사용자

- [ ] 공지 읽기 OK (정책에 따라)
- [ ] 팀원 목록 조회 불가 (로그인 필요)

---

## 📊 배포 체크리스트

- [ ] Rules 배포 (`firebase deploy --only firestore:rules`)
- [ ] Rules 반영 확인 (Firebase Console)
- [ ] Association 문서 생성 (운영)
- [ ] Admin 멤버 문서 생성 (운영)
- [ ] 프론트 빌드 (`npm run build`)
- [ ] 프론트 배포 (`firebase deploy --only hosting`)
- [ ] 실도메인 접속 확인
- [ ] Emulator 포트 미접속 확인
- [ ] Admin 테스트 (공지 작성, 팀원 추가)
- [ ] Member 테스트 (읽기 OK, write 차단)
- [ ] 비로그인 테스트 (공지 읽기)

---

## 🔄 다음 단계 (선택)

배포 완료 후:

1. **🧹 레거시 정리**: 루트 notices 참조 0개 확인 후 삭제
2. **➕ 확장**: 대회/시설 권한 바로 추가

---

## ⚠️ 주의사항

1. **Rules 먼저 배포**: 프론트 배포 전에 Rules 배포 필수
2. **운영 Firestore 세팅**: Association + Admin 멤버 문서 필수
3. **Emulator 연결 코드**: 프로덕션에서 자동 해제 확인 필수
