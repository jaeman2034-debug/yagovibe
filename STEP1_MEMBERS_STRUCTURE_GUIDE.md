# 🔥 STEP 1: 팀원 관리(members) 구조 생성 가이드

## 📌 목표
`associations/{associationId}/members/{ownerUid}` 구조 생성 및 검증

## 🎯 고정값
- **Association ID**: `RAd4wAbqcsjcVBGLeFiw` (변경 금지)
- **Owner UID**: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` (현재 로그인한 UID)

---

## ✅ 방법 1: 자동 스크립트 실행 (권장)

### 실행
```bash
npm run seed:step1
```

### 예상 출력
```
✅ Association 문서 확인됨
✅ Admin 멤버 문서 생성 완료: members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin

📊 최종 결과:
   경로: associations/RAd4wAbqcsjcVBGLeFiw/members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin
   role: admin
   status: active
   joinedAt: 설정됨
```

---

## ✅ 방법 2: Emulator UI에서 수동 생성

### 1단계: Firestore Emulator UI 접속
- 브라우저: http://localhost:4001
- 좌측 메뉴에서 "Firestore" 선택

### 2단계: Association 문서 선택
1. `associations` 컬렉션 클릭
2. `RAd4wAbqcsjcVBGLeFiw` 문서 클릭

### 3단계: Members 서브컬렉션 생성
1. 문서가 선택된 상태에서 **"+ Subcollection"** 버튼 클릭
2. Subcollection ID: `members`
3. **"Start"** 클릭

### 4단계: Admin 멤버 문서 생성
1. `members` 서브컬렉션이 선택된 상태에서 **"Add document"** 클릭
2. **Document ID**: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` ⚠️ (자동 ID 체크 해제)
3. 다음 필드 추가:

| Field ID | Type | Value |
|----------|------|-------|
| `role` | string | `admin` |
| `status` | string | `active` |
| `joinedAt` | timestamp | (현재 시간) |

4. **"Save"** 클릭

---

## ✅ 검증 게이트 (3가지 모두 통과해야 PASS)

### ✅ Gate 1 — Firestore 구조
```
associations
 └─ RAd4wAbqcsjcVBGLeFiw
     └─ members
         └─ qGq5XmuXRBsRZ0qJFE0yqtZY5Hin
             ├─ role: "admin"
             ├─ status: "active"
             └─ joinedAt: <timestamp>
```

### ✅ Gate 2 — Emulator 화면 증거
- [ ] `members` 서브컬렉션이 보임
- [ ] `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 문서가 존재
- [ ] 문서 필드 확인: `role: "admin"`, `status: "active"`, `joinedAt`

### ✅ Gate 3 — 논리 검증
**질문**: "이 association의 관리자는 누구냐?"
**답변**: `members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`.role === "admin" ✓

---

## ⚠️ 중요 사항

1. **Document ID = UID**
   - `members/{uid}` 구조
   - Document ID는 반드시 `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` (ownerUid)와 일치

2. **Association 문서 필수**
   - `associations/RAd4wAbqcsjcVBGLeFiw` 문서가 먼저 존재해야 함
   - 없으면 스크립트가 실패함

3. **Emulator 실행 확인**
   - Firebase Emulator가 실행 중이어야 함
   - Firestore 포트: 8086

---

## 🔍 문제 해결

### ❌ "Association 문서가 존재하지 않습니다"
- `associations/RAd4wAbqcsjcVBGLeFiw` 문서를 먼저 생성
- Emulator UI에서 수동 생성 가능

### ❌ "Port not open" 에러
- Emulator가 실행 중인지 확인
- 포트 8086 확인

### ❌ "Permission denied" 에러
- Emulator에서는 Rules가 무시되므로 발생하지 않아야 함
- 스크립트에서 Emulator 포트(8086) 확인

---

## 📍 다음 단계

STEP 1 완료 후 → **STEP 2: 관리자 권한 Rule 설계**

**STEP 1 완료 증거(스크린샷)를 보내주시면 STEP 2 지시문을 제공하겠습니다.**
