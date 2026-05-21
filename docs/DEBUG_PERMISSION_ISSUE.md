# 🔍 권한 문제 디버깅 가이드

## 발견된 문제

스크린샷 기준으로 여전히 "저장 실패"가 발생하고 있습니다.

## 확인해야 할 사항

### 1. Rules 배포 확인 ✅
- `isLocked` 함수의 `let` 문제 수정 완료
- Rules 재배포 완료

### 2. 실제 데이터 확인 필요

#### A. associations 문서 확인
Firebase Console에서 확인:
```
associations/{associationId}
  - adminUids: [ "USER_UID_1", "USER_UID_2", ... ]
```

#### B. 현재 사용자 UID 확인
브라우저 콘솔에서 실행:
```javascript
import { getAuth } from "firebase/auth";
const auth = getAuth();
console.log("현재 사용자 UID:", auth.currentUser?.uid);
```

#### C. adminUids 배열 확인
브라우저 콘솔에서 실행:
```javascript
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const associationId = "assoc-nowon-football"; // 실제 협회 ID
const associationRef = doc(db, `associations/${associationId}`);
const associationDoc = await getDoc(associationRef);

if (associationDoc.exists()) {
  const data = associationDoc.data();
  console.log("adminUids 배열:", data.adminUids);
  console.log("adminUids 타입:", typeof data.adminUids);
  console.log("배열인가?", Array.isArray(data.adminUids));
  
  const currentUid = getAuth().currentUser?.uid;
  console.log("현재 사용자 UID:", currentUid);
  console.log("포함되어 있나?", data.adminUids?.includes(currentUid));
} else {
  console.error("협회 문서가 존재하지 않습니다!");
}
```

### 3. Rules 평가 확인

Firebase Console → Firestore → Rules → Simulator에서 테스트:
```
Collection: associations/{associationId}/tournaments/{tournamentId}
Operation: write
User: 현재 사용자 UID
Data: { title: "테스트", ... }
```

## 가능한 원인

### 원인 1: adminUids 배열이 없음
- `associations/{id}` 문서에 `adminUids` 필드가 없거나 빈 배열
- 해결: Firebase Console에서 수동으로 추가

### 원인 2: UID 불일치
- 클라이언트에서 확인한 UID와 실제 `adminUids` 배열의 UID가 다름
- 해결: 정확한 UID 확인 후 배열에 추가

### 원인 3: Rules 평가 실패
- `isAssociationAdmin` 함수가 제대로 평가되지 않음
- 해결: Rules Simulator로 테스트

## 즉시 해결 방법

### 방법 1: Firebase Console에서 직접 추가
1. Firebase Console → Firestore Database
2. `associations/{associationId}` 문서 열기
3. `adminUids` 필드 확인/추가:
   ```json
   {
     "adminUids": ["YOUR_USER_UID_HERE"]
   }
   ```

### 방법 2: 임시 Rules 완화 (테스트용)
```javascript
// firestore.rules (임시)
match /associations/{associationId}/tournaments/{tournamentId} {
  allow write: if request.auth != null; // 임시 완화
}
```

## 다음 단계

1. **데이터 확인**: 위의 디버깅 코드로 실제 데이터 확인
2. **UID 확인**: 현재 사용자 UID와 adminUids 배열 비교
3. **Rules 테스트**: Rules Simulator로 평가 확인
4. **수정**: 문제 발견 시 즉시 수정

