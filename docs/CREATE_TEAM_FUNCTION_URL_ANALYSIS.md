# 🔥 createTeam 함수 URL 분석 및 호출 문제 진단

**생성일**: 2025-01-27  
**목적**: createTeam 함수 URL 및 호출 문제 진단  
**상태**: ✅ 배포 완료, ❌ 호출 안 됨

---

## ✅ 배포 상태 확인

### Firebase Functions 로그 분석

1. **함수 배포**: ✅
   - 함수 이름: `createTeam`
   - Region: `asia-northeast3`
   - 상태: `ACTIVE`
   - 배포 시간: 2026-01-16 09:55:35

2. **함수 URL (2가지 형식)**:
   - **Cloud Run URL**: `https://createteam-2q3hdcfwca-du.a.run.app`
   - **Cloud Functions URL**: `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/createTeam`

3. **실행 로그**: ❌
   - `[createTeam] called` 로그 없음
   - 함수가 실제로 호출되지 않음

---

## 🔍 Firebase Functions v2 URL 구조

### v2 Functions의 URL 형식

Firebase Functions v2는 Cloud Run 위에서 실행되므로 두 가지 URL이 있습니다:

1. **Cloud Run URL** (직접 호출용):
   ```
   https://createteam-2q3hdcfwca-du.a.run.app
   ```

2. **Cloud Functions URL** (Firebase SDK용):
   ```
   https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/createTeam
   ```

### `httpsCallable`이 사용하는 URL

`httpsCallable`은 자동으로 올바른 URL을 생성합니다:
- Region이 `asia-northeast3`이면: `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/createTeam`
- 함수 이름이 `createTeam`이면: `/createTeam` 경로 사용

---

## 🔍 가능한 문제점

### 1. 프론트엔드에서 실제 호출이 안 됨

**증상**:
- 브라우저 콘솔에 `[TeamCreateForm]` 로그 없음
- 네트워크 탭에 HTTP 요청 없음

**확인 방법**:
- 브라우저 개발자 도구 → Network 탭
- `createTeam` 또는 `createteam` 검색
- 요청이 있는지 확인

---

### 2. CORS 문제

**증상**:
- 네트워크 요청은 있지만 CORS 에러

**확인 방법**:
- 브라우저 콘솔에서 CORS 에러 확인
- Network 탭에서 요청 상태 확인

---

### 3. 인증 문제

**증상**:
- 요청은 전송되지만 401/403 에러

**확인 방법**:
- 브라우저 콘솔에서 인증 에러 확인
- Network 탭에서 응답 상태 확인

---

### 4. 함수 이름 불일치

**증상**:
- 404 에러 또는 함수를 찾을 수 없음

**확인 방법**:
- Firebase Console에서 함수 이름 확인
- 프론트엔드 호출 이름과 일치하는지 확인

---

## ✅ 해결 방법

### 1. 브라우저 콘솔 확인

팀 생성 시도 시 브라우저 콘솔(F12)에서:
- `[TeamCreateForm]` 로그 확인
- 에러 메시지 확인
- Network 탭에서 HTTP 요청 확인

### 2. Functions 로그 실시간 확인

```bash
firebase functions:log --only createTeam -n 50
```

또는 Google Cloud Logging에서 실시간 확인

### 3. 직접 URL 테스트 (선택)

브라우저에서 직접 URL 접근:
```
https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/createTeam
```

(인증이 필요하므로 에러가 나는 것이 정상)

---

## 📋 체크리스트

- [x] 함수 배포 확인
- [x] 함수 URL 확인
- [x] index.ts export 확인
- [x] 프론트엔드 호출 코드 확인
- [x] region 일치 확인
- [x] 디버깅 로그 추가
- [ ] 실제 호출 테스트
- [ ] 브라우저 콘솔 확인
- [ ] Network 탭 확인
- [ ] Functions 로그 확인

---

**작성일**: 2025-01-27  
**상태**: ✅ 배포 완료, 🔍 호출 문제 진단 중  
**다음 단계**: 실제 호출 테스트 및 브라우저 콘솔 확인
