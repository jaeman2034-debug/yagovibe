# 🔥 Firestore IN 쿼리 + 범위 쿼리 인덱스 가이드

## 🚨 핵심 문제

### 현재 쿼리 구조

```typescript
const eventQuery = query(
  collection(db, "eventLogs"),
  where("createdAt", ">=", todayTimestamp),  // 범위 쿼리 (range)
  where("eventName", "in", ["story_impression", "story_click"]),  // IN 쿼리
  orderBy("createdAt", "desc")  // 정렬
);
```

### 문제점

이 쿼리는 **3가지 조건을 동시에 사용**합니다:
1. 범위 쿼리 (`>=`)
2. IN 쿼리 (`in`)
3. orderBy (DESC)

→ Firestore는 이런 복합 쿼리를 위해 **특별한 인덱스 구조**를 요구합니다.

---

## ✅ 필요한 정확한 인덱스

### eventLogs 인덱스

```
Collection: eventLogs
Fields:
  1. createdAt (DESCENDING)  ← 범위 쿼리 + orderBy 필드
  2. eventName (ASCENDING)    ← IN 쿼리 필드
Query Scope: Collection
```

**중요 규칙:**
- 범위 쿼리(`>=`) 필드가 **반드시 첫 번째**
- `orderBy`는 범위 쿼리 필드와 **같은 방향** (DESC)
- IN 쿼리 필드는 **두 번째**

---

## 🔧 인덱스 생성 방법

### 방법 1: Firebase Console 에러 링크 사용 (가장 확실)

1. **브라우저 콘솔의 에러 메시지 확인:**
   ```
   FirebaseError: The query requires an index.
   You can create it here:
   https://console.firebase.google.com/...
   ```

2. **링크 클릭**
   - Firebase Console이 자동으로 열림
   - 정확한 인덱스 조합이 자동으로 입력됨

3. **"인덱스 만들기" 또는 "Create Index" 클릭**
   - Firebase가 제안한 조합 그대로 생성
   - 수동 수정 금지!

4. **인덱스 생성 완료 대기**
   - 소규모: 1~3분
   - 대규모: 10~30분

---

### 방법 2: 수동 생성 (에러 링크가 없는 경우)

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - 프로젝트: `yago-vibe-spt`

2. **Firestore Database → Indexes 탭**

3. **"인덱스 만들기" 클릭**

4. **설정:**
   - 컬렉션 ID: `eventLogs`
   - 필드 추가:
     - `createdAt` → **내림차순** (DESCENDING) ⚠️ 중요!
     - `eventName` → 오름차순 (ASCENDING)
   - 쿼리 범위: 컬렉션

5. **"만들기" 클릭**

---

## 📋 인덱스 생성 확인

### Firebase Console에서 확인

1. Firestore → Indexes 탭
2. 생성된 인덱스 목록 확인
3. 상태 확인:
   - 🟡 **빌드 중**: 인덱스 생성 중
   - 🟢 **사용 설정됨**: 인덱스 준비 완료

### 정확한 인덱스 구조 확인

생성된 인덱스가 다음과 같아야 함:

```
Collection: eventLogs
Fields:
  - createdAt (DESCENDING)  ← DESC!
  - eventName (ASCENDING)
Query Scope: Collection
```

---

## 🧪 검증

인덱스 생성 완료 후:

1. **브라우저 강력 새로고침**
   ```
   Ctrl + Shift + R
   ```

2. **Admin Dashboard 접속**
   ```
   http://localhost:5173/admin/dashboard
   ```

3. **콘솔 확인 (F12)**
   - 에러 없음 확인
   - 다음 로그 확인:
     ```
     ✅ [FunnelPanel] EventLog 재연결 성공
     ✅ [FunnelPanel] 실시간 업데이트: {...}
     ```

---

## ⚠️ 자주 하는 실수

### 실수 1: ASC/DESC 방향 혼동

❌ 잘못된 인덱스:
```
createdAt (ASCENDING) + eventName (ASCENDING)
```

✅ 올바른 인덱스:
```
createdAt (DESCENDING) + eventName (ASCENDING)
```

### 실수 2: 필드 순서 잘못

❌ 잘못된 순서:
```
eventName (ASC) + createdAt (DESC)
```

✅ 올바른 순서:
```
createdAt (DESC) + eventName (ASC)
```

**이유:** 범위 쿼리 필드가 반드시 첫 번째여야 함

---

## 📝 요약

**현재 상태:**
- ❌ IN 쿼리 + 범위 쿼리 + orderBy 전용 인덱스 없음
- ✅ 기본 인덱스는 있지만 쿼리와 불일치

**해결:**
- Firebase Console 에러 링크 클릭
- 제안된 인덱스 그대로 생성
- `createdAt` (DESC) + `eventName` (ASC)

**다음 단계:**
- 인덱스 생성 완료 대기
- 브라우저 새로고침
- 실시간 퍼널 동작 확인
