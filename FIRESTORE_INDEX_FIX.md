# 🔥 Firestore 인덱스 불일치 문제 해결

## 🚨 문제 발견

### 현재 쿼리 (FunnelPanel.tsx)

#### eventLogs 쿼리:
```typescript
const eventQuery = query(
  collection(db, "eventLogs"),
  where("createdAt", ">=", todayTimestamp),  // 범위 쿼리
  where("eventName", "in", ["story_impression", "story_click"]),  // in 쿼리
  orderBy("createdAt", "desc")  // DESC 정렬
);
```

#### activityLogs 쿼리:
```typescript
const activityQuery = query(
  collection(db, "activityLogs"),
  where("createdAt", ">=", todayTimestamp),  // 범위 쿼리
  orderBy("createdAt", "desc")  // DESC 정렬
);
```

---

### 현재 인덱스 (firestore.indexes.json)

#### eventLogs:
- ❌ `createdAt` (ASC) + `eventName` (ASC) - **ASC인데 쿼리는 DESC!**
- ✅ `createdAt` (DESC) - 단독 인덱스 (하지만 eventName 필터와 함께 사용 불가)

#### activityLogs:
- ❌ `createdAt` (ASC) + `event` (ASC) - **ASC인데 쿼리는 DESC!**
- ✅ `createdAt` (DESC) - 단독 인덱스

---

## ✅ 해결 방법

### 필요한 정확한 인덱스

#### 1. eventLogs (복합 인덱스)
```
Collection: eventLogs
Fields:
  - createdAt (DESCENDING)  ← 쿼리와 일치
  - eventName (ASCENDING)   ← in 쿼리용
```

**Firestore 규칙:**
- 범위 쿼리(`>=`) 필드가 먼저 와야 함
- `orderBy`는 범위 쿼리 필드와 같은 방향이어야 함
- 등호/`in` 쿼리 필드는 그 다음에 와야 함

#### 2. activityLogs (단독 인덱스)
```
Collection: activityLogs
Fields:
  - createdAt (DESCENDING)  ← 쿼리와 일치
```

이미 존재하지만, 복합 인덱스와 혼동될 수 있음.

---

## 🔧 인덱스 생성 방법

### 방법 1: Firebase Console에서 직접 생성 (권장)

1. **브라우저 콘솔의 에러 메시지에서 링크 클릭**
   - "You can create it here: https://console.firebase.google.com/..."
   - 이 링크가 **정확한 인덱스 조합**을 제안함

2. **또는 수동 생성:**
   - Firebase Console → Firestore → Indexes
   - "인덱스 만들기" 클릭
   - **eventLogs 인덱스:**
     - 컬렉션 ID: `eventLogs`
     - 필드:
       - `createdAt` → **내림차순** (DESCENDING) ⚠️ 중요!
       - `eventName` → 오름차순 (ASCENDING)
     - 쿼리 범위: 컬렉션
   - "만들기" 클릭

---

### 방법 2: firestore.indexes.json 업데이트

이미 `firestore.indexes.json`에 추가했습니다:

```json
{
  "collectionGroup": "eventLogs",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"  // ← DESC로 수정!
    },
    {
      "fieldPath": "eventName",
      "order": "ASCENDING"
    }
  ]
}
```

배포:
```bash
firebase deploy --only firestore:indexes
```

---

## ⚠️ 중요 참고사항

### Firestore 인덱스 규칙

1. **범위 쿼리 필드가 먼저:**
   - `where("createdAt", ">=")` → `createdAt` 필드가 인덱스 첫 번째

2. **orderBy 방향 일치:**
   - `orderBy("createdAt", "desc")` → 인덱스도 `createdAt` (DESCENDING)

3. **등호/in 쿼리는 그 다음:**
   - `where("eventName", "in", [...])` → `eventName` 필드가 인덱스 두 번째

---

## 🧪 검증

인덱스 생성 후:

1. 브라우저 새로고침 (Ctrl+Shift+R)
2. Admin Dashboard 접속
3. 콘솔에서 에러 없음 확인:
   ```
   ✅ [FunnelPanel] 실시간 업데이트: {...}
   ```

---

## 📋 요약

**문제:**
- 쿼리: `orderBy("createdAt", "desc")` (DESC)
- 인덱스: `createdAt` (ASC) + `eventName` (ASC)
- **방향 불일치!**

**해결:**
- 인덱스: `createdAt` (DESC) + `eventName` (ASC)
- **방향 일치!**

---

## 💡 다음 단계

1. Firebase Console에서 에러 링크 클릭
2. 제안된 인덱스 그대로 생성
3. 인덱스 생성 완료 대기 (1~3분)
4. 브라우저 새로고침
5. 실시간 퍼널 동작 확인
