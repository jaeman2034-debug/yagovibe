# 🔥 createTeam 함수 테스트 가이드

**생성일**: 2025-01-27  
**목적**: createTeam 함수가 정상 작동하는지 확인하는 단계별 가이드  
**상태**: ✅ 배포 완료, 테스트 대기 중

---

## ✅ 현재 상태 확인

### 배포 완료 사항
- ✅ 함수 배포: `createTeam` (revision: `createteam-00002-faq`)
- ✅ Region: `asia-northeast3`
- ✅ CORS: `cors: true` 설정됨
- ✅ 상세 로깅: 모든 단계에 로그 추가됨

### 확인된 GET 요청 에러
- GET 요청 에러는 **브라우저에서 직접 URL을 열었을 가능성**이 높습니다
- 실제 POST 요청이 들어오면 정상 작동할 것입니다

---

## 📋 테스트 단계

### 1️⃣ 프론트엔드에서 팀 생성 시도

1. **브라우저에서 앱 열기**
   - 로그인 상태 확인
   - `/me` 페이지로 이동

2. **팀 생성 페이지로 이동**
   - "팀 만들기" 버튼 클릭
   - 또는 직접 URL: `/sports/football/team/create?mode=non-member`

3. **팀 정보 입력**
   - 팀 이름: 테스트용 이름 입력 (예: "테스트팀")
   - 활동 지역: "서울시 노원구" (고정값)

4. **"팀 생성하기" 버튼 클릭**

---

### 2️⃣ 브라우저 콘솔 확인 (F12)

다음 로그가 표시되어야 합니다:

```javascript
🔥🔥🔥 [TeamCreateForm] ========== 팀 생성 시작 ==========
[TeamCreateForm] functions 객체: ...
[TeamCreateForm] functions.region: asia-northeast3
[TeamCreateForm] functions.app: [DEFAULT]
[TeamCreateForm] 호출할 함수 이름: createTeam
[TeamCreateForm] 호출할 payload: { name: "...", region: "...", sportType: "football" }
[TeamCreateForm] httpsCallable 생성 시작...
[TeamCreateForm] httpsCallable 생성 완료: ...
[TeamCreateForm] 함수 호출 시작...
```

**에러가 발생하면:**
- 에러 메시지 전체 복사
- Network 탭에서 `createTeam` 요청 확인

---

### 3️⃣ Network 탭 확인

1. **브라우저 개발자 도구 → Network 탭**
2. **필터**: `createTeam` 검색
3. **확인 사항**:
   - POST 요청이 전송되는지 확인
   - 요청 URL: `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/createTeam`
   - 요청 상태: 200 (성공) 또는 에러 코드
   - 요청 페이로드 확인

---

### 4️⃣ Functions 로그 확인

팀 생성 시도 후 터미널에서:

```bash
firebase functions:log --only createTeam -n 20
```

**예상 로그:**
```
🔥🔥🔥 [createTeam] ========== 함수 호출 시작 ==========
[createTeam] called
[createTeam] 입력 데이터 파싱 완료
[createTeam] before write
[createTeam] after write
```

---

## 🎯 예상 결과

### ✅ 성공 시나리오

1. **브라우저 콘솔**:
   ```
   ✅ [TeamCreateForm] 팀 생성 성공: {teamId}
   ```

2. **Network 탭**:
   - POST 요청: 200 OK
   - 응답: `{ teamId: "...", success: true, message: "..." }`

3. **Functions 로그**:
   ```
   [createTeam] called
   [createTeam] before write
   [createTeam] after write
   ```

4. **페이지 이동**:
   - `/sports/football/team/create?step=2&teamId={teamId}`로 이동

---

## ❌ 문제 해결

### 문제 1: 브라우저 콘솔에 로그가 없음

**원인**: 
- `handleSubmit` 함수가 실행되지 않음
- 폼 제출이 차단됨

**해결**:
- 브라우저 콘솔에서 에러 확인
- 폼 validation 통과 여부 확인

---

### 문제 2: Network 탭에 POST 요청이 없음

**원인**:
- `httpsCallable` 호출 실패
- Functions 객체 초기화 실패

**해결**:
- 브라우저 콘솔에서 `functions` 객체 확인:
  ```javascript
  // 브라우저 콘솔에서 실행
  console.log(window.debugFirebase?.functions);
  ```
- `firebase.ts`에서 Functions 초기화 확인

---

### 문제 3: POST 요청은 있지만 Functions 로그에 없음

**원인**:
- Region 불일치
- 함수 이름 불일치
- 함수가 다른 region에 배포됨

**해결**:
1. Firebase Console → Functions 탭 확인
2. 함수 이름과 region 확인
3. 프론트엔드 `getFunctions(app, "asia-northeast3")` 확인

---

### 문제 4: Functions 로그에 "called"는 있지만 "after write"가 없음

**원인**:
- Firestore Rules 문제
- 트랜잭션 실패
- 권한 문제

**해결**:
- Functions 로그에서 에러 메시지 확인
- Firestore Rules 확인
- `firestore.rules` 파일 검토

---

## 🔍 디버깅 명령어

### 브라우저 콘솔에서 실행

```javascript
// Functions 객체 확인
console.log(functions);
console.log(functions.region);
console.log(functions.app.name);

// createTeam 함수 직접 호출 테스트
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

const createTeamCallable = httpsCallable(functions, "createTeam");
createTeamCallable({ name: "테스트팀", region: "서울시 노원구", sportType: "football" })
  .then(result => console.log("✅ 성공:", result))
  .catch(error => console.error("❌ 실패:", error));
```

---

## 📝 체크리스트

테스트 전 확인:
- [ ] 로그인 상태 확인
- [ ] 브라우저 콘솔 열기 (F12)
- [ ] Network 탭 열기
- [ ] Functions 로그 확인 준비 (`firebase functions:log`)

테스트 중 확인:
- [ ] 브라우저 콘솔에 `[TeamCreateForm]` 로그 표시
- [ ] Network 탭에 POST 요청 표시
- [ ] Functions 로그에 `[createTeam] called` 표시

테스트 후 확인:
- [ ] 팀 생성 성공 메시지 표시
- [ ] `/sports/football/team/create?step=2&teamId=...`로 이동
- [ ] Firestore에 `teams/{teamId}` 문서 생성 확인

---

**작성일**: 2025-01-27  
**상태**: ✅ 배포 완료  
**다음 단계**: 실제 팀 생성 테스트 실행
