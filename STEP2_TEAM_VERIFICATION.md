# ✅ STEP 2 검증 체크리스트

## 📊 완료 증거 3종

### 1️⃣ 스크린샷
- [ ] 관리자 화면: 팀 추가 폼 + 팀 리스트
- [ ] 일반 유저 화면: 팀 리스트만 (추가 폼 없음)

### 2️⃣ 콘솔 로그
- [ ] 팀 생성 성공 로그 확인
- [ ] 일반 유저 write 시도 시 permission-denied 확인

### 3️⃣ Firestore Emulator UI
- [ ] `associations/{associationId}/teams/{teamId}` 경로 확인
- [ ] 필드 구조 확인 (name, managerName, phone, status, createdAt)

---

## 🔍 검증 게이트

### Gate 1: 팀 리스트 표시 ✅
- [ ] 팀 목록이 정상적으로 로드됨
- [ ] 팀 이름, 감독, 연락처, 생성일 표시됨
- [ ] 실시간 업데이트 (새 팀 추가 시 즉시 반영)

### Gate 2: 관리자 권한 ✅
- [ ] 관리자 로그인 시 "팀 추가" 버튼 표시됨
- [ ] 관리자가 팀 추가 폼 입력 가능
- [ ] 관리자가 팀 생성 성공

### Gate 3: 일반 유저 조회 ✅
- [ ] 일반 유저가 팀 리스트 조회 가능
- [ ] 일반 유저 화면에 "팀 추가" 버튼 안 보임
- [ ] 일반 유저가 강제로 write 시도 시 permission-denied

### Gate 4: Firestore 구조 ✅
- [ ] 경로: `associations/{associationId}/teams/{teamId}` 확인
- [ ] 필드: name, managerName, phone, status, createdAt 확인
- [ ] Rules: admin만 write, 모두 read 확인

---

## 🎯 PASS 조건

모든 Gate가 ✅ 상태면 STEP 2 완료

---

## 🔜 다음 단계

STEP 2 완료 후:
- **STEP 3: 대진표 생성 (토너먼트)**
