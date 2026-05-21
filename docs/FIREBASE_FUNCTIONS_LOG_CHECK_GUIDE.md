# 🔥 Firebase Functions 로그 확인 가이드

**생성일**: 2025-01-27  
**목적**: `createTeam` 함수의 `internal` 에러 원인 찾기  
**상태**: 📋 가이드 작성

---

## ✅ 방법 1: Firebase Console (가장 쉬움, 강력 추천)

### 단계별 가이드

1. **Firebase Console 접속**
   - https://console.firebase.google.com/project/yago-vibe-spt/functions
   - 또는: Firebase Console → Functions → Logs

2. **로그 필터링**
   - 함수 이름: `createTeam` 입력
   - 시간 범위: 최근 1시간 또는 24시간
   - 로그 레벨: `Error` 또는 `All`

3. **에러 로그 찾기**
   - `❌ [createTeam] 팀 생성 실패` 로그 찾기
   - 또는 `❌ [createTeam] Internal error` 로그 찾기

4. **확인할 정보**
   - `errorMessage`: 실제 에러 메시지
   - `errorCode`: 에러 코드
   - `errorStack`: 스택 트레이스
   - `payload`: Payload 구조 (Rules 디버깅용)

---

## ✅ 방법 2: Firebase CLI (터미널)

### 올바른 명령어

```bash
# 모든 Functions 로그 확인
firebase functions:log

# 특정 함수만 확인 (createTeam)
firebase functions:log | grep createTeam

# 최근 50줄만 확인
firebase functions:log | tail -n 50

# 에러만 필터링
firebase functions:log | grep -i error
```

**참고**: Firebase CLI의 `functions:log`는 `--limit` 옵션을 지원하지 않습니다.

---

## ✅ 방법 3: gcloud CLI (고급)

Firebase Functions는 Google Cloud Functions를 사용하므로, `gcloud` 명령어로도 확인 가능합니다.

```bash
# gcloud 로그인 확인
gcloud auth login

# 프로젝트 설정
gcloud config set project yago-vibe-spt

# Functions 로그 확인
gcloud functions logs read createTeam --limit 50

# 또는 모든 Functions 로그
gcloud functions logs read --limit 50
```

---

## 🔍 로그에서 확인할 핵심 정보

### 1. 에러 메시지

**예시**:
```
❌ [createTeam] 팀 생성 실패
errorMessage: "Transaction failed: ..."
errorCode: "permission-denied"
```

**의미**:
- `permission-denied` → Rules 문제 가능성
- `Transaction failed` → 트랜잭션 내부 에러
- `invalid-argument` → Payload 구조 문제

---

### 2. 스택 트레이스

**예시**:
```
errorStack: "Error: Cannot read properties of undefined (reading 'uid')
    at createTeam (functions/src/createTeam.ts:142:15)
    ..."
```

**의미**:
- 정확한 에러 발생 위치 파악
- null/undefined 체크 필요 여부 확인

---

### 3. Payload 구조

**예시**:
```
payload: {
  name: "테스트팀",
  region: "서울시 노원구",
  sportType: "football",
  ownerUid: "user123",
  ...
}
```

**의미**:
- Rules 디버깅용
- 필드 타입 확인

---

## 📋 체크리스트

- [ ] Firebase Console 접속
- [ ] `createTeam` 함수 필터링
- [ ] 최근 에러 로그 확인
- [ ] `errorMessage` 확인
- [ ] `errorCode` 확인
- [ ] `errorStack` 확인
- [ ] `payload` 확인
- [ ] 에러 원인 파악

---

## 🎯 예상되는 에러 메시지와 해결책

### 1. `PERMISSION_DENIED`

**의미**: Firestore Rules에서 막힘

**해결**:
- Rules 단순화 (이미 완료)
- Admin SDK 권한 확인

---

### 2. `Transaction failed: ...`

**의미**: 트랜잭션 내부 에러

**해결**:
- 트랜잭션 구조 재검토
- 필드 타입 확인

---

### 3. `Cannot read properties of undefined`

**의미**: null/undefined 체크 필요

**해결**:
- 코드에 null 체크 추가

---

### 4. `invalid-argument`

**의미**: Payload 구조 문제

**해결**:
- Payload 필드 타입 확인
- 필수 필드 확인

---

## 🔚 다음 단계

1. **로그 확인**: Firebase Console에서 `createTeam` 에러 로그 확인
2. **에러 메시지 파악**: `errorMessage`, `errorCode` 확인
3. **해결책 적용**: 에러 메시지에 따라 해결책 적용
4. **재테스트**: 팀 생성 재시도

---

**작성일**: 2025-01-27  
**상태**: 📋 가이드 작성 완료  
**다음 단계**: Firebase Console에서 로그 확인
