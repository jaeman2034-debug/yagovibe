# 🔥 A-1 단계: 협회 팀원 데이터 시드 가이드

## 📌 목표
`associations/assoc-nowon-football/members` 컬렉션에 최소 2명의 팀원 생성:
- Admin 1명
- Member 1명

---

## ✅ 방법 1: 자동 스크립트 실행 (권장)

### 1단계: Auth Emulator에서 UID 확인

1. **Firebase Emulator UI 접속**
   - 브라우저: http://localhost:4001
   - 또는 http://localhost:4000

2. **Authentication 탭 클릭**
   - 좌측 메뉴에서 "Authentication" 선택

3. **사용자 UID 복사**
   - Users 목록에서 각 사용자의 **User UID** 복사
   - 최소 2명 필요 (Admin 1명, Member 1명)

### 2단계: 스크립트 실행

**Windows PowerShell:**
```powershell
# 방법 A: 환경 변수로 UID 지정
$env:ADMIN_UID="복사한_Admin_UID"
$env:MEMBER_UID="복사한_Member_UID"
node scripts/seed-association-members-simple.js

# 방법 B: 기본 UID 사용 (나중에 수동 변경 가능)
node scripts/seed-association-members-simple.js
```

**Linux/Mac:**
```bash
ADMIN_UID="복사한_Admin_UID" MEMBER_UID="복사한_Member_UID" node scripts/seed-association-members-simple.js
```

### 3단계: 결과 확인

✅ 성공 시 콘솔 출력:
```
✅ 생성 완료: 관리자 홍길동 (test-admin-uid-12345)
✅ 생성 완료: 일반 멤버 김철수 (test-member-uid-67890)

📊 최종 결과:
  - 총 팀원: 2명
  - 관리자: 1명
  - 일반 멤버: 1명
```

---

## ✅ 방법 2: Emulator UI에서 수동 생성

### 1단계: Firestore Emulator UI 접속
- 브라우저: http://localhost:4001
- 좌측 메뉴에서 "Firestore" 선택

### 2단계: Collection 경로 생성

**경로:** `associations` → `assoc-nowon-football` → `members`

1. **`associations` 컬렉션 생성 (없는 경우)**
   - "Start collection" 클릭
   - Collection ID: `associations`
   - Document ID: `assoc-nowon-football` (자동 ID 체크 해제)

2. **`assoc-nowon-football` 문서 선택**
   - 방금 생성한 문서 클릭

3. **Subcollection 생성**
   - "+ Subcollection" 버튼 클릭
   - Subcollection ID: `members`
   - "Start" 클릭

### 3단계: Admin 멤버 문서 생성

1. **문서 추가**
   - "Add document" 클릭
   - Document ID: `{Auth_Emulator에서_복사한_Admin_UID}` (자동 ID 체크 해제 ⚠️)

2. **필드 추가**
   | Field ID | Type | Value |
   |----------|------|-------|
   | `email` | string | `admin@nowon-football.com` |
   | `displayName` | string | `관리자 홍길동` |
   | `role` | string | `admin` |
   | `status` | string | `active` |
   | `joinedAt` | timestamp | (현재 시간) |

3. **저장**
   - "Save" 클릭

### 4단계: Member 멤버 문서 생성

1. **문서 추가**
   - "Add document" 클릭
   - Document ID: `{Auth_Emulator에서_복사한_Member_UID}` (자동 ID 체크 해제 ⚠️)

2. **필드 추가**
   | Field ID | Type | Value |
   |----------|------|-------|
   | `email` | string | `member@nowon-football.com` |
   | `displayName` | string | `일반 멤버 김철수` |
   | `role` | string | `member` |
   | `status` | string | `active` |
   | `joinedAt` | timestamp | (현재 시간) |

3. **저장**
   - "Save" 클릭

---

## 📸 완료 증거 (A-1 체크리스트)

다음 3가지를 모두 확인해야 A-1 통과:

### ✅ 1. Firestore Emulator UI 스크린샷
- 경로: `associations` → `assoc-nowon-football` → `members`
- 최소 2개 문서 존재
- 각 문서에 `role` 필드가 `admin` / `member`로 설정됨

### ✅ 2. 문서 상세 확인
- Admin 문서 클릭 → `role: "admin"` 확인
- Member 문서 클릭 → `role: "member"` 확인

### ✅ 3. 콘솔 로그 확인 (스크립트 사용 시)
- "✅ 생성 완료" 메시지 2개
- "📊 최종 결과" 요약

---

## ⚠️ 주의사항

1. **Document ID = UID**
   - `members/{uid}` 구조
   - Document ID는 반드시 Auth Emulator의 User UID와 일치해야 함

2. **Emulator 실행 확인**
   - 스크립트 실행 전 Firebase Emulator가 실행 중이어야 함
   - 포트 확인: Firestore (8086), Auth (9099)

3. **필드 타입 정확히**
   - `role`: string (`"admin"` 또는 `"member"`)
   - `status`: string (`"active"`)
   - `joinedAt`: timestamp

---

## 🔍 문제 해결

### ❌ "Collection not found" 에러
- `associations/assoc-nowon-football` 문서가 먼저 생성되어 있어야 함
- 방법 2의 2단계를 먼저 수행

### ❌ "Permission denied" 에러
- Emulator에서는 Rules가 무시되므로 이 에러는 발생하지 않아야 함
- 스크립트에서 Emulator 포트(8086) 확인

### ❌ UID를 모르겠어요
- Auth Emulator UI → Authentication → Users 탭에서 확인
- 또는 콘솔에서 `auth.currentUser?.uid` 확인

---

## 📍 다음 단계

A-1 완료 후 → **A-2: 팀원 목록 UI (리스트) 구현**

A-1 완료 증거(스크린샷)를 보내주시면 A-2 지시문을 제공하겠습니다.
