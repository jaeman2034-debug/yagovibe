# 🔥 Firebase 인덱스 배포 가이드

## ❌ 현재 문제

**FunnelPanel 쿼리:**
```typescript
query(
  collection(db, "eventLogs"),
  where("createdAt", ">=", todayTimestamp),
  where("eventName", "in", ["story_impression", "story_click"]),
  orderBy("createdAt", "desc")  // ← DESC 필요!
)
```

**Firebase Console 상태:**
- `createdAt` (ASC), `eventName` (ASC) ✅ 있음
- `eventName` (ASC), `createdAt` (ASC) ✅ 있음
- **`createdAt` (DESC), `eventName` (ASC) ❌ 없음**

**`firestore.indexes.json` 상태:**
- `createdAt` (DESC), `eventName` (ASC) ✅ 정의됨 (106-117줄)
- 하지만 Firebase에 배포되지 않음

---

## ✅ 해결 방법

### 방법 1: Firebase CLI로 배포 (권장)

```bash
# Firebase CLI 설치 확인
firebase --version

# Firebase 로그인
firebase login

# 프로젝트 선택
firebase use yago-vibe-spt

# 인덱스 배포
firebase deploy --only firestore:indexes
```

**예상 결과:**
```
✔  Deploy complete!

Firestore indexes have been deployed successfully.
```

---

### 방법 2: Firebase Console에서 직접 생성

1. **Firebase Console → Firestore → Indexes 탭**
2. **"색인 추가" (Add Index) 클릭**
3. **다음 정보 입력:**
   - 컬렉션 ID: `eventLogs`
   - 필드 추가:
     - `createdAt` → 정렬: **내림차순 (DESCENDING)**
     - `eventName` → 정렬: **오름차순 (ASCENDING)**
   - 쿼리 범위: **컬렉션**
4. **"만들기" 클릭**
5. **인덱스 생성 완료 대기 (1~3분)**

---

### 방법 3: 에러 링크로 자동 생성 (가장 정확)

1. **브라우저 콘솔에서 에러 확인:**
   ```
   FirebaseError: The query requires an index.
   ```

2. **에러 메시지의 "create it here" 링크 클릭**
   - Firebase Console이 자동으로 필요한 인덱스 제안
   - "만들기" 클릭

3. **인덱스 생성 완료 대기**

---

## 🎯 확인 방법

### 인덱스 배포 후

1. **Firebase Console → Firestore → Indexes 탭**
2. **`eventLogs` 컬렉션 필터**
3. **다음 인덱스 확인:**
   - `createdAt` (↓ 내림차순), `eventName` (↑ 오름차순)
   - 상태: **"사용 설정됨"**

### 브라우저 테스트

1. **브라우저 새로고침 (Ctrl+Shift+R)**
2. **콘솔 확인:**
   ```
   ✅ [FunnelPanel] EventLog 재연결 성공
   ✅ [FunnelPanel] 실시간 업데이트: {...}
   ```
3. **에러 없음 확인:**
   - "The query requires an index" 에러 사라짐

---

## 📝 참고

- 인덱스 생성 시간: 1~3분 (소규모), 10~30분 (대규모)
- 인덱스는 한 번 생성되면 자동으로 유지됨
- `firestore.indexes.json`은 로컬 정의 파일이며, Firebase에 배포해야 실제 인덱스가 생성됨
