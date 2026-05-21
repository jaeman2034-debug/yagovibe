# 🏁 STEP 1: 팀 생성 실행 가이드

## 📌 기준 고정 (변경 금지)

- **associationId**: `RAd4wAbqcsjcVBGLeFiw`
- **기준 경로**: `associations/{associationId}/teams/{teamId}`

---

## 1️⃣ Firestore 구조 (확정)

### 팀 문서 필드
```typescript
{
  "name": "노원FC",
  "managerName": "김감독",
  "phone": "010-1234-5678",
  "createdAt": <timestamp>,
  "status": "active"
}
```

---

## 2️⃣ 프론트 UI 최소 요구사항 (PASS 조건)

### A. 팀 생성 폼
- ✅ 입력: 팀명 / 감독명 / 연락처
- ✅ 관리자만 버튼 보임

### B. 팀 리스트
- ✅ 등록된 팀 목록 표시
- ✅ 새로고침 후에도 유지 (Firestore 기준)

### C. 권한
- ✅ admin: 생성 가능
- ✅ member: 생성 버튼 안 보임
- ✅ member가 강제로 write 시도 → permission-denied

---

## 3️⃣ Firestore 코드 기준

**구현 위치**: `src/pages/association/admin/TeamsManagementPage.tsx`

**코드 예시**:
```typescript
await addDoc(collection(db, `associations/${associationId}/teams`), {
  name: teamName.trim(),
  managerName: managerName.trim(),
  phone: phone.trim(),
  status: "active" as const,
  createdAt: serverTimestamp(),
});
```

---

## 4️⃣ 즉시 검증 체크리스트

### ✅ PASS 조건 (이게 전부 통과해야 다음)

- [ ] **Firestore(실서비스 콘솔)에서**
  - `associations/{associationId}/teams` 문서 1개 이상 생성 확인
  
- [ ] **실서비스 URL에서**
  - 팀 리스트 노출 확인
  
- [ ] **member 계정으로**
  - 팀 추가 불가 확인

👉 **증거 1개만 보내도 PASS**
(예: 실서비스 콘솔 스크린샷 또는 "teams 문서 생성 확인")

---

## 🎯 실행 단계

### 1. 실서비스 접속
- URL: `https://yago-vibe-spt.web.app`
- 관리자 계정으로 로그인

### 2. 팀 관리 페이지 접속
- 경로: `/association/RAd4wAbqcsjcVBGLeFiw/admin/teams`

### 3. 팀 생성
- "팀 추가" 버튼 클릭
- 팀명, 감독명, 연락처 입력
- "팀 등록" 버튼 클릭
- 성공 토스트 확인

### 4. 검증
- Firebase Console → Firestore → Data
- 경로: `associations/RAd4wAbqcsjcVBGLeFiw/teams`
- 생성된 문서 확인

---

## ⛔ 지금 단계에서 하지 말 것

- ❌ 대진표 생성
- ❌ 경기 결과
- ❌ 카톡 공유

**팀 최소 4개 모이기 전까지 다음 단계 금지**

---

## 🔜 다음 예고 (PASS 즉시)

### STEP 2: 대진표 자동 생성

- 팀 수 기반 랜덤 매칭
- round 생성 (8강/4강/결승)
- matches 서브컬렉션

---

## 📊 완료 증거

**증거 1개만 보내도 PASS**:
- 실서비스 콘솔 스크린샷 (teams 문서 생성 확인)
- 또는 "teams 문서 생성 확인" 텍스트
