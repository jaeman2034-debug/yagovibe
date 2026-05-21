# team_members 권한 문서 설정 가이드

## 목적

Firestore Rules에서 `exists()` 체크를 위해 경로 기반 권한 문서가 필요합니다.

---

## 1️⃣ 권한 문서 구조

### 문서 경로

```
team_members/{teamId}_{uid}
```

### 문서 필드

```typescript
{
  teamId: string;      // 예: "7EVUSUeWiYBxybFsHXE"
  uid: string;         // 예: "6ie7FcdHPvaYc2DxXMeZEz1Vwx1"
  role: "admin" | "member";  // 권한 레벨
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## 2️⃣ 수동 생성 방법 (즉시 테스트용)

### Firebase Console에서

1. Firestore Database 열기
2. `team_members` 컬렉션 선택
3. 문서 추가
4. 문서 ID: `{teamId}_{uid}` (예: `7EVUSUeWiYBxybFsHXE_6ie7FcdHPvaYc2DxXMeZEz1Vwx1`)
5. 필드 추가:
   - `teamId`: `string` → `"7EVUSUeWiYBxybFsHXE"`
   - `uid`: `string` → `"6ie7FcdHPvaYc2DxXMeZEz1Vwx1"`
   - `role`: `string` → `"admin"`

---

## 3️⃣ 자동 생성 코드 (추천)

### Functions에서 자동 생성

팀 생성 시 또는 멤버 추가 시 자동으로 생성:

```typescript
// functions/src/utils/createTeamMember.ts
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export async function createTeamMemberDoc(
  teamId: string,
  uid: string,
  role: "admin" | "member"
) {
  const memberId = `${teamId}_${uid}`;
  const memberRef = db.doc(`team_members/${memberId}`);
  
  await memberRef.set({
    teamId,
    uid,
    role,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  
  logger.info(`✅ team_members 문서 생성: ${memberId}`);
}
```

---

## 4️⃣ 기존 team_members 마이그레이션

### 현재 구조 확인

현재 `team_members` 컬렉션이 `where` 쿼리로 사용 중이라면:

```typescript
// 기존 쿼리
const q = query(
  collection(db, "team_members"),
  where("teamId", "==", teamId),
  where("uid", "==", uid)
);
```

### 마이그레이션 스크립트

```typescript
// functions/src/migrateTeamMembers.ts
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

export async function migrateTeamMembers() {
  const membersSnap = await db.collection("team_members").get();
  
  const batch = db.batch();
  let count = 0;
  
  for (const doc of membersSnap.docs) {
    const data = doc.data();
    const { teamId, uid } = data;
    
    if (!teamId || !uid) continue;
    
    // 새 문서 ID 생성
    const newDocId = `${teamId}_${uid}`;
    const newRef = db.doc(`team_members/${newDocId}`);
    
    // 기존 문서와 새 문서 ID가 다르면 마이그레이션
    if (doc.id !== newDocId) {
      batch.set(newRef, {
        ...data,
        teamId,
        uid,
        createdAt: data.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      // 기존 문서 삭제 (선택)
      // batch.delete(doc.ref);
      
      count++;
    }
    
    // 배치 제한 (500개)
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  logger.info(`✅ team_members 마이그레이션 완료: ${count}개`);
}
```

---

## 5️⃣ Rules 체크 확인

### Rules 함수

```javascript
function isTeamAdmin(teamId) {
  return isSignedIn()
    && exists(/databases/$(database)/documents/team_members/$(teamId + "_" + request.auth.uid))
    && get(/databases/$(database)/documents/team_members/$(teamId + "_" + request.auth.uid)).data.role == "admin";
}
```

### 테스트

1. `team_members/{teamId}_{uid}` 문서 생성
2. `role: "admin"` 설정
3. 블로그 생성 버튼 클릭
4. 성공 확인

---

## 6️⃣ 주의사항

### 문서 ID 형식

- ✅ 올바른 형식: `7EVUSUeWiYBxybFsHXE_6ie7FcdHPvaYc2DxXMeZEz1Vwx1`
- ❌ 잘못된 형식: `7EVUSUeWiYBxybFsHXE-6ie7FcdHPvaYc2DxXMeZEz1Vwx1` (하이픈 사용)

### role 값

- ✅ 허용: `"admin"`, `"member"`
- ❌ 불허: `"ADMIN"`, `"Admin"` (대소문자 구분)

---

## 7️⃣ 즉시 테스트 체크리스트

- [ ] `team_members/{teamId}_{uid}` 문서 생성
- [ ] `role: "admin"` 설정
- [ ] Rules 배포
- [ ] 블로그 생성 버튼 클릭
- [ ] 성공 확인

---

**마지막 업데이트**: 2025-01-XX

