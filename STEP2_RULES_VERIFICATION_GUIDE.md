# 🔥 STEP 2: 관리자 권한 Rules 검증 가이드

## 📌 목표
admin만 write / 모두 read가 **"실제로 Firestore에서 강제되는 상태"** 만들기

## ✅ 완료된 작업

### 1. Firestore Rules 업데이트
- `isSignedIn()` 함수 추가
- `isAdmin(associationId)` 함수: `members/{uid}.role === "admin"` 체크
- 공지사항: read (모두), write (admin만)
- 멤버: read (로그인 필요), write (admin만)

---

## 🔍 Emulator에서 검증 방법

### 방법 1: Rules Simulator 사용 (권장)

1. **Firebase Emulator UI 접속**
   - 브라우저: http://localhost:4001
   - 좌측 메뉴에서 **"Rules"** 탭 선택

2. **Rules Simulator 실행**
   - "Test rules" 섹션에서 테스트 실행
   - Location: `associations/RAd4wAbqcsjcVBGLeFiw/notices/test-notice`
   - Operation: `create` / `update` / `delete` / `get`
   - Authentication: UID 설정

---

## ✅ 검증 A — Admin 계정 (성공해야 함)

### 테스트 시나리오
- **UID**: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` (admin)
- **Location**: `associations/RAd4wAbqcsjcVBGLeFiw/notices/test-notice`
- **Operation**: `create`
- **Data**: `{ title: "Test", content: "Test content" }`

### 예상 결과
✅ **성공** (Permission granted)

---

## ✅ 검증 B — Member 계정 (실패해야 함)

### 테스트 시나리오
- **UID**: `member-uid-123` (role: "member"인 다른 UID)
- **Location**: `associations/RAd4wAbqcsjcVBGLeFiw/notices/test-notice`
- **Operation**: `create`
- **Data**: `{ title: "Test", content: "Test content" }`

### 예상 결과
❌ **실패** (Permission denied)
- 에러 코드: `permission-denied`
- 에러 메시지: "Missing or insufficient permissions"

---

## ✅ 검증 C — Read (모두 가능)

### 테스트 시나리오
- **UID**: `null` (로그인 안 함) 또는 아무 UID
- **Location**: `associations/RAd4wAbqcsjcVBGLeFiw/notices/test-notice`
- **Operation**: `get`

### 예상 결과
✅ **성공** (Permission granted)

---

## 📊 검증 PASS 기준

아래 3가지를 모두 확인해야 STEP 2 통과:

- [ ] ✅ **검증 A**: Admin write 성공
- [ ] ❌ **검증 B**: Member write 실패 (permission-denied)
- [ ] ✅ **검증 C**: Read 정상 (모두 가능)

---

## 🔍 Rules Simulator 사용법 (상세)

### 1. Rules 탭 접속
- Firebase Emulator UI: http://localhost:4001
- 좌측 메뉴: **"Rules"** 클릭

### 2. Location 입력
```
associations/RAd4wAbqcsjcVBGLeFiw/notices/test-notice
```

### 3. Authentication 설정
- **UID**: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` (admin 테스트)
- 또는 다른 UID (member 테스트)

### 4. Operation 선택
- `create` - 문서 생성
- `update` - 문서 수정
- `delete` - 문서 삭제
- `get` - 문서 읽기

### 5. Data 입력 (create/update 시)
```json
{
  "title": "Test Notice",
  "content": "Test content",
  "status": "published"
}
```

### 6. 결과 확인
- ✅ **Allow**: 권한 허용
- ❌ **Deny**: 권한 거부

---

## ⚠️ 주의사항

1. **Emulator 데이터 확인**
   - `associations/RAd4wAbqcsjcVBGLeFiw/members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 문서 존재 확인
   - `role: "admin"` 필드 확인

2. **Rules 파일 저장 확인**
   - `firestore.rules` 파일이 저장되었는지 확인
   - Emulator가 자동으로 새 Rules를 읽음

3. **에러 발생 시**
   - Rules 문법 오류: Emulator 콘솔에 표시
   - Permission denied: 정상 동작 (member 계정)
   - 문서 없음: `members/{uid}` 문서 생성 필요

---

## 📝 검증 결과 보고

검증 완료 후 아래 중 하나로 알려주세요:

1. **"admin write OK / member write denied"** (간단)
2. **Rules Simulator 스크린샷 3장** (상세)
3. **검증 결과 상세 리포트** (텍스트)

---

## 🔄 다음 단계

STEP 2 통과 후:
- **STEP 3**: 팀원 관리 UI (추가/역할 변경)
- 또는 **STEP 4**: 실서비스 배포 체크리스트
