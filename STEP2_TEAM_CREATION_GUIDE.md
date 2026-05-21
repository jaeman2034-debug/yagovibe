# 🏁 STEP 2 — 팀 생성 (현실 시뮬레이션 버전)

## 📌 목표
동네 축구 협회가 실제로 하루 운영되는 흐름 구현  
**협회 생성 → 팀 등록 → 대진표 생성 → 경기 진행 → 결승 완료 → 결과 공지 → 카톡 공유**

---

## 1️⃣ Firestore 구조 (확정)

### 경로
```
associations/{associationId}/teams/{teamId}
```

### 필드 구조
```typescript
{
  name: string;              // 팀 이름 (예: "노원FC")
  managerName: string;       // 감독/담당자 이름 (예: "김감독")
  phone: string;             // 연락처 (예: "010-1234-5678")
  status: "active";          // 상태 (active만 사용)
  createdAt: Timestamp;      // 생성 시각
}
```

---

## 2️⃣ 팀 생성 UI 구성

### A. 팀 추가 폼 (관리자 전용)
- 팀 이름 입력
- 감독 이름 입력
- 연락처 입력
- 생성 버튼

### B. 팀 리스트
- 모든 로그인 사용자 조회 가능
- 팀 이름, 감독, 연락처 표시
- 생성일 표시

### C. 관리자 권한 체크
- `useIsAssociationAdmin` Hook 사용
- 관리자만 팀 추가 폼 표시
- 일반 유저는 조회만 가능

---

## 3️⃣ Firestore Rules

### teams 컬렉션 규칙
```javascript
match /associations/{associationId}/teams/{teamId} {
  allow read: if isSignedIn();              // 모든 로그인 사용자 읽기 가능
  allow write: if isAdmin(associationId);   // admin만 작성/수정/삭제
}
```

---

## 4️⃣ 검증 체크리스트

### Gate 1: 팀 리스트 표시 ✅
- [ ] 팀 목록이 정상적으로 로드됨
- [ ] 팀 이름, 감독, 연락처, 생성일 표시됨
- [ ] 실시간 업데이트 (onSnapshot)

### Gate 2: 관리자 권한 ✅
- [ ] 관리자 로그인 시 팀 추가 폼 표시됨
- [ ] 일반 유저 로그인 시 팀 추가 폼 안 보임
- [ ] 관리자가 팀 생성 성공

### Gate 3: 일반 유저 조회 ✅
- [ ] 일반 유저가 팀 리스트 조회 가능
- [ ] 일반 유저가 팀 생성 시도 시 permission-denied

### Gate 4: Firestore 구조 ✅
- [ ] `associations/{associationId}/teams/{teamId}` 경로 확인
- [ ] 필드 구조 (name, managerName, phone, status, createdAt) 확인

---

## 5️⃣ 다음 단계

STEP 2 완료 후:
- **STEP 3: 대진표 생성 (토너먼트)**
- **STEP 4: 경기 진행 → 결승 완료**
- **STEP 5: 결과 공지 자동 생성**
- **STEP 6: 카톡 공유**

---

## 📊 완료 증거 3종

1. **스크린샷**: 팀 리스트 화면 (관리자/일반 유저)
2. **콘솔 로그**: 팀 생성 성공/실패 로그
3. **Firestore Emulator UI**: teams 컬렉션 데이터 확인
