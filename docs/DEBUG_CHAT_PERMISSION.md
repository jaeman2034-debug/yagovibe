# 🔍 채팅 권한 문제 디버깅 가이드

## 현재 상태

- ✅ Rules 파일 수정 완료
- ✅ Rules 배포 완료
- ❌ 여전히 permission-denied 발생

## 원인 후보 (확률 순)

### 🔴 원인 A (70% 확률) - buyerId/sellerId undefined

**증상:**
- Rules는 맞는데 create가 막힘
- 콘솔에 permission-denied만 찍힘

**확인 방법:**
채팅 생성 직전 콘솔 로그 확인:

```javascript
🔥 [채팅방 생성] create payload (Rules 체크용): {
  buyerId: "...",
  sellerId: "...",
  buyerIdUndefined: false,  // ❌ true면 문제
  sellerIdUndefined: false, // ❌ true면 문제
  buyerIdNull: false,       // ❌ true면 문제
  sellerIdNull: false,      // ❌ true면 문제
  buyerIdEmpty: false,      // ❌ true면 문제
  sellerIdEmpty: false,     // ❌ true면 문제
  rulesShouldPass: true     // ❌ false면 문제
}
```

**해결:**
- `buyerId` 또는 `sellerId`가 undefined/null/빈 문자열이면 → 코드 수정 필요

### 🔴 원인 B (20% 확률) - 프로젝트 불일치

**증상:**
- Rules는 A 프로젝트에 배포
- 웹앱은 B 프로젝트 보고 있음

**확인 방법:**
콘솔 로그 확인:

```javascript
🔍 [채팅방 생성] Firebase 프로젝트 확인: {
  projectId: "yago-vibe-spt",  // ✅ 이게 맞는지 확인
  authDomain: "...",
  useEmulator: false
}
```

**체크리스트:**
- [ ] `firebase.json` / `.firebaserc`의 projectId
- [ ] `firebase.ts`의 `projectId: "yago-vibe-spt"`
- [ ] Firebase Console 상단 프로젝트 선택
- [ ] 모두 동일한지 확인

### 🔴 원인 C (10% 확률) - 에뮬레이터 혼선

**증상:**
- Firestore Emulator 사용 중
- 웹은 프로덕션 Firestore 보고 있음 (또는 반대)

**확인 방법:**
콘솔 로그 확인:

```javascript
🔍 [채팅방 생성] Firebase 프로젝트 확인: {
  useEmulator: true  // ❌ 이게 true면 에뮬레이터 사용 중
}
```

**체크리스트:**
- [ ] `.env.local`에 `VITE_USE_EMULATOR=true` 있는지 확인
- [ ] 에뮬레이터 실행 중인지 확인 (`firebase emulators:start`)
- [ ] 프로덕션 테스트 시 `VITE_USE_EMULATOR=false` 또는 제거

## 30초 확정 테스트

Rules가 문제인지 확정하려면:

1. Firebase Console → Firestore → Rules
2. 아래 Rules로 임시 교체:

```javascript
match /chats/{chatId} {
  allow create: if request.auth != null;
  allow read, write: if request.auth != null;
}
```

3. **Publish** 클릭
4. 브라우저 새로고침
5. 채팅 생성 버튼 클릭

**결과:**
- ✅ 생성된다 → Rules 로직 문제 아님 → A/B/C 중 하나 확정
- ❌ 그래도 안 된다 → 컬렉션 이름/프로젝트 완전 불일치

⚠️ 테스트 후 반드시 원래 Rules로 되돌리기!

## 다음 단계

콘솔 로그를 확인한 후:
1. `buyerId/sellerId` undefined/null/빈 문자열 → 코드 수정
2. 프로젝트 불일치 → 프로젝트 통일
3. 에뮬레이터 혼선 → 에뮬레이터 설정 확인

로그 결과를 알려주면 정확히 "여기다"라고 찍어줄 수 있습니다.

