# 🔥 Custom Claims 완전 가이드 (완결판)

## 현재 상태

### ✅ 완료된 사항
1. **Rules 하이브리드 구조** - adminUids 우선, Custom Claims 보조
2. **Custom Claims 함수 단순화** - Firestore 접근 제거
3. **안전장치 추가** - Admin SDK 초기화 확인

### ⚠️ 해결 중인 문제
1. **Custom Claims 설정 실패** - Functions 내부 에러 (internal)
2. **저장 권한 오류** - Rules가 Custom Claims에 의존

## 해결 순서

### STEP 1: Custom Claims 함수 재배포 ✅

```bash
cd functions
npm run build
firebase deploy --only functions:setAssociationAdminCallable
```

### STEP 2: 관리자 권한 부여

#### 방법 A: UI 버튼 사용 (권장)
1. 대회 생성 페이지에서 "🔑 관리자 권한 부여" 버튼 클릭
2. 성공 메시지 확인
3. **로그아웃 → 다시 로그인** (토큰 재발급 필수)

#### 방법 B: Firebase Console에서 직접 실행
1. Firebase Console → Functions → `setAssociationAdminCallable`
2. 테스트 탭에서 실행:
```json
{
  "uid": "YOUR_USER_UID",
  "associationId": "assoc-nowon-football"
}
```

### STEP 3: Claims 확인

브라우저 콘솔에서 실행:

```javascript
import { getAuth } from "firebase/auth";

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  const tokenResult = await user.getIdTokenResult(true); // true = 강제 새로고침
  console.log("Custom Claims:", tokenResult.claims);
  
  // 예상 결과:
  // {
  //   role: "ADMIN",
  //   associationId: "assoc-nowon-football",
  //   ...기타 claims
  // }
}
```

### STEP 4: 저장 테스트

1. 대회 생성 페이지에서 "게시하기" 클릭
2. 저장 성공 확인

## 현재 Rules 구조

```javascript
function isAssociationAdmin(associationId) {
  return request.auth != null && (
    // ✅ 방법 1: adminUids 배열 체크 (우선)
    (exists(...) && 
     get(...).data.adminUids is list &&
     request.auth.uid in get(...).data.adminUids) ||
    // ✅ 방법 2: Custom Claims 체크 (보조)
    (request.auth.token.role != null && 
     request.auth.token.role == "ADMIN" && 
     request.auth.token.associationId == associationId)
  );
}
```

## 문제 해결 체크리스트

### Custom Claims 설정 실패 시

1. **Functions 로그 확인**
   - Firebase Console → Functions → Logs
   - `setAssociationAdminCallable` 실행 시 에러 확인
   - 에러 메시지 원문 확인

2. **Admin SDK 초기화 확인**
   - 함수 코드에 `admin.apps.length` 확인 로그 추가
   - 초기화가 안 되어 있으면 자동 초기화

3. **서비스 계정 권한 확인**
   - Firebase Console → Project Settings → Service Accounts
   - "Firebase Admin SDK" 권한 확인

4. **Region 확인**
   - 함수 region: `asia-northeast3`
   - 클라이언트에서 같은 region 사용 확인

### 저장 권한 오류 시

1. **adminUids 배열 확인**
   - Firestore Console → `associations/{id}`
   - `adminUids` 배열에 사용자 UID 포함 확인

2. **Custom Claims 확인**
   - 브라우저 콘솔에서 `getIdTokenResult()` 실행
   - `role: "ADMIN"` 확인

3. **Rules 배포 확인**
   - `firebase deploy --only firestore:rules` 실행
   - 배포 성공 확인

## 최종 정리

### 현재 동작 방식

1. **adminUids 우선**
   - `associations/{id}.adminUids` 배열에 UID가 있으면 통과
   - Custom Claims 없어도 저장 가능

2. **Custom Claims 보조**
   - Custom Claims가 설정되면 추가 보안
   - 두 가지 모두 지원

### 권장 워크플로우

1. **오늘 작업**: adminUids 기반으로 저장 (이미 가능)
2. **Custom Claims 설정**: Functions 로그 확인 후 수정
3. **Rules 강화**: Custom Claims 안정화 후 선택적 적용

## 다음 액션

1. **함수 재배포** - 안전장치 추가된 버전
2. **Functions 로그 확인** - 실제 에러 원인 파악
3. **저장 테스트** - adminUids 기반으로 먼저 확인

