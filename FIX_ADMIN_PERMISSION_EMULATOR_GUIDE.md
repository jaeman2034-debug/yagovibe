# 🔧 관리자 권한 데이터 에뮬레이터에 직접 추가하기 (단계별 가이드)

## 📌 현재 상황

- **Association ID**: `assoc-nowon-football`
- **현재 로그인한 사용자 UID**: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`
- **문제**: Association 문서에 권한 구조(ownerUid, members)가 없음

---

## ✅ 방법 1: Firestore Emulator UI에서 직접 추가 (가장 빠름)

### STEP 1: Firestore Emulator UI 열기

1. **터미널에서 Emulator 실행 확인**
   ```bash
   firebase emulators:start
   ```
   - Emulator UI가 `http://localhost:4001`에서 실행 중이어야 함

2. **브라우저에서 Emulator UI 열기**
   - 주소: `http://localhost:4001`
   - Firestore 탭 클릭

---

### STEP 2: Association 문서 찾기

1. **컬렉션 탐색**
   - 왼쪽 사이드바에서 `associations` 컬렉션 클릭
   - `assoc-nowon-football` 문서 클릭

2. **문서 확인**
   - 문서가 존재하는지 확인
   - 현재 필드 확인

---

### STEP 3: ownerUid 필드 추가

1. **필드 추가**
   - 문서 화면에서 "필드 추가" 또는 "+" 버튼 클릭
   - 필드명 입력: `ownerUid`
   - 타입 선택: `string`
   - 값 입력: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`
   - 저장

---

### STEP 4: members 서브컬렉션 생성 (권장)

#### 4-1. 서브컬렉션 시작

1. **`assoc-nowon-football` 문서 화면에서**
   - "Start collection" 버튼 클릭
   - 컬렉션 ID 입력: `members`
   - "Next" 클릭

#### 4-2. members 문서 생성

1. **문서 ID 입력**
   - Document ID: `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` (현재 사용자 UID)
   - "Auto-ID" 체크 해제
   - "Next" 클릭

2. **필드 추가**
   - 필드 1:
     - 필드명: `role`
     - 타입: `string`
     - 값: `admin`
   - 필드 2:
     - 필드명: `status`
     - 타입: `string`
     - 값: `active`
   - 필드 3:
     - 필드명: `joinedAt`
     - 타입: `timestamp`
     - 값: `now` (또는 현재 시간)

3. **저장**
   - "Save" 버튼 클릭

---

### STEP 5: 확인

1. **브라우저 콘솔 확인**
   - 대회 등록 페이지 새로고침 (F5)
   - F12 → Console 탭
   - 다음 로그 확인:
     ```
     [useIsAssociationOwner] ownerUid 기준 확인: {
       associationId: "assoc-nowon-football",
       userUid: "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin",
       ownerUid: "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin",
       isOwner: true
     }
     ```

2. **UI 확인**
   - "게시" 라디오 버튼이 활성화되었는지 확인
   - "⚠️ 관리자 권한이 필요합니다." 메시지가 사라졌는지 확인

---

## ✅ 방법 2: 스크립트로 자동 추가 (더 빠름)

### STEP 1: 스크립트 파일 생성

프로젝트 루트에 `scripts/seed-admin-permission.js` 파일 생성:

```javascript
const admin = require("firebase-admin");

// Firebase Admin SDK 초기화 (Emulator 사용)
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "demo-project", // Emulator는 프로젝트 ID 무관
  });
}

const db = admin.firestore();
db.settings({
  host: "localhost:8086", // Firestore Emulator 포트
  ssl: false,
});

const ASSOCIATION_ID = "assoc-nowon-football";
const ADMIN_UID = "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin";

async function seedAdminPermission() {
  try {
    console.log("🔥 관리자 권한 데이터 추가 시작...");

    // 1. Association 문서에 ownerUid 추가
    const associationRef = db.doc(`associations/${ASSOCIATION_ID}`);
    await associationRef.set(
      {
        ownerUid: ADMIN_UID,
      },
      { merge: true }
    );
    console.log("✅ ownerUid 필드 추가 완료");

    // 2. members 서브컬렉션에 admin 문서 생성
    const memberRef = db.doc(
      `associations/${ASSOCIATION_ID}/members/${ADMIN_UID}`
    );
    await memberRef.set({
      role: "admin",
      status: "active",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ members/{uid} 문서 생성 완료");

    console.log("🎉 관리자 권한 데이터 추가 완료!");
    console.log("\n다음 단계:");
    console.log("1. 브라우저에서 대회 등록 페이지 새로고침");
    console.log("2. '게시' 토글이 활성화되었는지 확인");
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  }
}

seedAdminPermission().then(() => {
  console.log("✅ 스크립트 실행 완료");
  process.exit(0);
});
```

### STEP 2: 스크립트 실행

1. **Firestore Emulator 실행 중 확인**
   ```bash
   firebase emulators:start
   ```

2. **새 터미널에서 스크립트 실행**
   ```bash
   node scripts/seed-admin-permission.js
   ```

3. **결과 확인**
   - 콘솔에 "✅ 관리자 권한 데이터 추가 완료!" 메시지 확인
   - 브라우저에서 대회 등록 페이지 새로고침

---

## ✅ 방법 3: 브라우저 콘솔에서 직접 실행 (개발자용)

### STEP 1: 브라우저 개발자 도구 열기

1. **대회 등록 페이지 열기**
2. **F12 눌러서 개발자 도구 열기**
3. **Console 탭 클릭**

### STEP 2: Firestore SDK 사용해서 데이터 추가

다음 코드를 콘솔에 붙여넣고 실행:

```javascript
// Firebase SDK 가져오기 (페이지에 이미 로드되어 있어야 함)
const { db } = await import('/src/lib/firebase.ts');
const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');

const ASSOCIATION_ID = "assoc-nowon-football";
const ADMIN_UID = "qGq5XmuXRBsRZ0qJFE0yqtZY5Hin";

// 1. Association 문서에 ownerUid 추가
const associationRef = doc(db, `associations/${ASSOCIATION_ID}`);
await setDoc(associationRef, { ownerUid: ADMIN_UID }, { merge: true });
console.log("✅ ownerUid 필드 추가 완료");

// 2. members 서브컬렉션에 admin 문서 생성
const memberRef = doc(db, `associations/${ASSOCIATION_ID}/members/${ADMIN_UID}`);
await setDoc(memberRef, {
  role: "admin",
  status: "active",
  joinedAt: serverTimestamp(),
});
console.log("✅ members/{uid} 문서 생성 완료");

console.log("🎉 관리자 권한 데이터 추가 완료! 페이지를 새로고침하세요.");
```

**⚠️ 주의**: 이 방법은 페이지에 Firebase SDK가 로드되어 있어야 합니다.

---

## 📝 최종 확인 체크리스트

다음 3가지를 모두 확인하세요:

1. **Firestore 구조 확인**
   - [ ] `associations/assoc-nowon-football` 문서에 `ownerUid` 필드 존재
   - [ ] `ownerUid` 값이 `qGq5XmuXRBsRZ0qJFE0yqtZY5Hin`와 일치
   - [ ] `associations/assoc-nowon-football/members/qGq5XmuXRBsRZ0qJFE0yqtZY5Hin` 문서 존재
   - [ ] `members` 문서에 `role: "admin"` 필드 존재

2. **브라우저 콘솔 확인**
   - [ ] `[useIsAssociationOwner] ownerUid 기준 확인` 로그에서 `isOwner: true` 확인
   - [ ] `[TournamentEditDrawer] 권한 확인 상태` 로그에서 `canPublishTournament: true` 확인

3. **UI 확인**
   - [ ] "게시" 라디오 버튼 활성화됨
   - [ ] "⚠️ 관리자 권한이 필요합니다." 메시지 사라짐
   - [ ] 대회를 `published` 상태로 저장 가능

---

## 🎯 완료 후 다음 단계

권한 데이터 추가가 완료되면:

1. **대회 생성 및 게시 테스트**
   - 대회 등록 화면에서 모든 필드 입력
   - "게시" 라디오 버튼 선택
   - 저장 성공 확인

2. **팀 생성 → 대진표 생성 → 결승 완료** 플로우 진행

---

## 💬 한 줄 요약

**"Firestore Emulator UI에서 `associations/assoc-nowon-football` 문서에 `ownerUid` 필드 추가 + `members/{uid}` 서브컬렉션에 `role: admin` 문서 생성하면 즉시 해결됨."**
