# 🏁 STEP 1: 팀 생성 검증 체크리스트

## 📌 목표
협회에 팀을 등록하고, 관리자만 생성 가능하며, 모든 로그인 사용자가 조회할 수 있는 기능 검증

---

## 📂 데이터 구조 (확정)

### Firestore 경로
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

## 🔍 검증 체크리스트

### Gate 1: 팀 생성 UI ✅

- [ ] 관리자 계정으로 `/association/{associationId}/admin/teams` 접속
- [ ] "팀 추가" 버튼 표시됨
- [ ] 버튼 클릭 시 폼 표시 (팀 이름, 감독 이름, 연락처)
- [ ] 모든 필드 입력 후 "팀 등록" 버튼 클릭
- [ ] 성공 토스트 메시지 표시됨
- [ ] 폼 자동 초기화 및 닫힘

### Gate 2: 팀 리스트 즉시 반영 ✅

- [ ] 팀 생성 후 리스트에 즉시 추가됨 (onSnapshot)
- [ ] 새로고침 후에도 유지됨 (Firestore 기준)
- [ ] 팀 카드에 name, managerName, phone, createdAt 표시됨
- [ ] 검색 기능 동작 (팀 이름, 감독, 연락처)

### Gate 3: 권한 검증 ✅

- [ ] 관리자 계정 → "팀 추가" 버튼 보임
- [ ] 일반 계정 → "팀 추가" 버튼 숨김
- [ ] 일반 계정 → 팀 리스트 조회 가능
- [ ] 일반 계정이 강제로 write 시도 시 permission-denied

### Gate 4: Firestore 구조 확인 ✅

- [ ] `associations/{associationId}/teams/{teamId}` 경로 확인
- [ ] 필드 구조 확인 (name, managerName, phone, status, createdAt)
- [ ] Rules 확인 (admin만 write, 모두 read)

### Gate 5: 실서비스 동작 확인 ✅

- [ ] 실서비스 URL (`https://yago-vibe-spt.web.app`)에서 동일 동작
- [ ] 관리자 계정으로 팀 생성 성공
- [ ] 일반 계정으로 리스트 조회 성공

---

## 📊 완료 증거 3종

### 1️⃣ 스크린샷
- [ ] 관리자 화면: 팀 추가 폼 + 팀 리스트
- [ ] 일반 유저 화면: 팀 리스트만 (추가 폼 없음)

### 2️⃣ 콘솔 로그
- [ ] 팀 생성 성공 로그
- [ ] 일반 유저 write 시도 시 permission-denied 로그

### 3️⃣ Firestore Emulator UI
- [ ] `associations/{associationId}/teams/{teamId}` 컬렉션 확인
- [ ] 필드 구조 확인

---

## 🎯 PASS 조건

모든 Gate (1-5)가 ✅ 상태면 STEP 1 완료

---

## 🔜 다음 단계

STEP 1 완료 후:
- **STEP 2: 대진표 자동 생성 (토너먼트)**
- **STEP 3: 경기 진행 (라운드별)**
- **STEP 4: 결승**
- **STEP 5: 결과 공유 (카톡)**
