# 🔥 공지사항 시드 빠른 가이드

## 문제
- ✅ UI 정상 작동
- ❌ "현재 등록된 공지가 없습니다" 표시
- 원인: Firestore Emulator에 공지 데이터 없음

## 해결 방법

### STEP 1: Association ID 확인

**방법 1: Firestore Emulator UI**
1. http://localhost:4001 접속
2. `associations` 컬렉션 확인
3. 문서 ID 복사 (예: `assoc-nowon-football`)

**방법 2: 브라우저 콘솔**
```javascript
// F12 → Console 탭
window.location.pathname.match(/\/association\/([^\/]+)/)?.[1]
```

### STEP 2: 시드 스크립트 실행

```powershell
npm run seed:notices <associationId>
```

**예시:**
```powershell
npm run seed:notices assoc-nowon-football
```

### STEP 3: 결과 확인

**콘솔 출력:**
```
✅ 1. 2025년 봄 시즌 대회 안내 (고정)
✅ 2. 경기장 이용 안내 (일반)
✅ 3. 회원 등록 절차 안내 (일반)
✅ 4. 2025년 상반기 일정표 (일반)
✅ 공지 더미 데이터 생성 완료!
```

**화면 확인:**
1. 브라우저 새로고침 (F5)
2. 공지사항 섹션에 4개 공지 표시 확인
3. 첫 번째 공지가 상단 고정되어 있는지 확인

---

## 생성되는 공지

1. **2025년 봄 시즌 대회 안내** (고정, 중요)
2. **경기장 이용 안내** (일반)
3. **회원 등록 절차 안내** (일반)
4. **2025년 상반기 일정표** (일반)

모든 공지는 `status: "published"`, `isOfficial: true`로 생성되어 즉시 표시됩니다.

---

## 문제 해결

### ❌ "Association ID가 필요합니다"
→ Association ID를 인자로 제공했는지 확인

### ❌ "Connection refused"
→ Firestore Emulator가 실행 중인지 확인 (`firebase emulators:start`)

### ❌ 공지가 여전히 안 보임
→ 브라우저 새로고침 (F5)
→ Firestore Emulator UI에서 `associations/{id}/notices` 컬렉션 확인
→ `status: "published"`, `isOfficial: true` 확인
