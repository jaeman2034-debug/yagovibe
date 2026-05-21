# 🔥 Firestore 복합 인덱스 설정 가이드 (축구 마켓)

## ❌ 현재 에러

```
FirebaseError: The query requires an index
```

화면에 보이는 파란 링크를 클릭하면 자동으로 인덱스 생성 화면이 열립니다.

---

## ✅ 필요한 인덱스 (3개)

### 1️⃣ 기본 인덱스 (status + createdAt)

**사용 쿼리:**
```typescript
query(
  collection(db, "market"),
  where("status", "==", "open"),
  orderBy("createdAt", "desc")
)
```

**인덱스 설정:**
- Collection: `market`
- Fields:
  - `status` (Ascending)
  - `createdAt` (Descending)

---

### 2️⃣ Sport 필터 인덱스 (status + sport + createdAt)

**사용 쿼리:**
```typescript
query(
  collection(db, "market"),
  where("status", "==", "open"),
  where("sport", "==", "soccer"),
  orderBy("createdAt", "desc")
)
```

**인덱스 설정:**
- Collection: `market`
- Fields:
  - `status` (Ascending)
  - `sport` (Ascending)
  - `createdAt` (Descending)

---

### 3️⃣ Category 필터 인덱스 (status + category + createdAt)

**사용 쿼리:**
```typescript
query(
  collection(db, "market"),
  where("status", "==", "open"),
  where("category", "==", "equipment"),
  orderBy("createdAt", "desc")
)
```

**인덱스 설정:**
- Collection: `market`
- Fields:
  - `status` (Ascending)
  - `category` (Ascending)
  - `createdAt` (Descending)

---

### 4️⃣ Sport + Category 복합 인덱스 (status + sport + category + createdAt)

**사용 쿼리:**
```typescript
query(
  collection(db, "market"),
  where("status", "==", "open"),
  where("sport", "==", "soccer"),
  where("category", "==", "equipment"),
  orderBy("createdAt", "desc")
)
```

**인덱스 설정:**
- Collection: `market`
- Fields:
  - `status` (Ascending)
  - `sport` (Ascending)
  - `category` (Ascending)
  - `createdAt` (Descending)

---

## 🚀 인덱스 생성 방법

### 방법 1: 에러 메시지 링크 클릭 (가장 빠름) ⭐

1. 브라우저에서 `/soccer/market` 접속
2. 화면에 보이는 **"오류가 발생했어요"** 메시지 확인
3. 에러 영역의 **파란 링크** 클릭:
   ```
   https://console.firebase.google.com/.../indexes?create=...
   ```
4. Firebase Console 인덱스 생성 화면 자동 열림
5. **Create Index** 버튼 클릭
6. 2~3분 대기 (Status: Building → Enabled)

---

### 방법 2: Firebase Console에서 수동 생성

1. Firebase Console 접속
   - https://console.firebase.google.com/
   - 프로젝트 선택

2. **Firestore Database** → **인덱스** 탭

3. **인덱스 만들기** 클릭

4. 위의 4개 인덱스를 각각 생성:
   - Collection ID: `market`
   - 필드 추가 (순서 중요!)
   - 쿼리 범위: 컬렉션

5. **만들기** 클릭

---

### 방법 3: firestore.indexes.json 업데이트

`firestore.indexes.json` 파일에 다음 인덱스 추가:

```json
{
  "indexes": [
    {
      "collectionGroup": "market",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "market",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "sport",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "market",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "category",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "market",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "sport",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "category",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

배포:
```bash
firebase deploy --only firestore:indexes
```

---

## ✅ 인덱스 생성 확인

1. Firebase Console → Firestore Database → 인덱스 탭
2. 상태 확인:
   - 🟡 **Building**: 인덱스 생성 중 (2~3분 소요)
   - 🟢 **Enabled**: 인덱스 준비 완료 ✅

---

## 🧪 테스트

인덱스 생성 완료 후:

1. 페이지 새로고침: `http://localhost:5173/soccer/market`
2. 확인 사항:
   - ✅ 에러 메시지 사라짐
   - ✅ 게시글 목록 표시
   - ✅ 토글 동작 (축구만 보기 / 전체보기)
   - ✅ 카테고리 탭 동작

---

## 📝 참고

- 인덱스는 **무료**입니다 (Firestore 무료 플랜 포함)
- 인덱스 생성 중에도 앱은 정상 작동 (다른 쿼리는 영향 없음)
- 인덱스는 **자동으로 유지**됩니다 (데이터 변경 시 자동 업데이트)
- 필드 순서가 중요합니다! (`status` → `sport` → `category` → `createdAt`)

---

## 🔥 다음 단계

인덱스 생성 완료 후:
- ✅ 전체보기 토글 검증
- ✅ 카테고리 탭 연결
- ✅ 상세 페이지
- ✅ 글쓰기
