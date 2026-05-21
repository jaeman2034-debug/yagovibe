# 🔥 Firestore 인덱스 설정 가이드 (마켓 검색)

## 문제 상황

음성 검색 시 Firestore에서 다음 에러 발생:
```
FirebaseError: The query requires an index
```

## 필요한 인덱스

### 1️⃣ 키워드 검색 인덱스 (가장 중요)

**쿼리:**
```typescript
query(
  collection(db, "marketProducts"),
  where("keywordTokens", "array-contains", token),
  orderBy("createdAt", "desc")
)
```

**필요한 인덱스:**
- Collection: `marketProducts`
- Fields:
  - `keywordTokens` (Array)
  - `createdAt` (Descending)

### 2️⃣ 최신순 정렬 인덱스

**쿼리:**
```typescript
query(
  collection(db, "marketProducts"),
  orderBy("createdAt", "desc"),
  limit(200)
)
```

**필요한 인덱스:**
- Collection: `marketProducts`
- Fields:
  - `createdAt` (Descending)

## 인덱스 생성 방법

### 방법 1: Firebase Console에서 직접 생성 (추천)

1. Firebase Console 접속
   - https://console.firebase.google.com/
   - 프로젝트 선택: `yago-vibe-spt`

2. Firestore Database → 인덱스 탭

3. "인덱스 만들기" 클릭

4. 첫 번째 인덱스 (키워드 검색):
   - 컬렉션 ID: `marketProducts`
   - 필드 추가:
     - `keywordTokens` → 배열
     - `createdAt` → 내림차순
   - 쿼리 범위: 컬렉션

5. 두 번째 인덱스 (최신순):
   - 컬렉션 ID: `marketProducts`
   - 필드 추가:
     - `createdAt` → 내림차순
   - 쿼리 범위: 컬렉션

6. "만들기" 클릭

### 방법 2: firestore.indexes.json 업데이트

`firestore.indexes.json` 파일에 다음 인덱스 추가:

```json
{
  "indexes": [
    {
      "collectionGroup": "marketProducts",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "keywordTokens",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "marketProducts",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

그 다음 배포:
```bash
firebase deploy --only firestore:indexes
```

## 인덱스 생성 확인

인덱스 생성은 **몇 분에서 몇 시간** 걸릴 수 있습니다.

Firebase Console에서 상태 확인:
- 🟡 **빌드 중**: 인덱스 생성 중
- 🟢 **사용 가능**: 인덱스 준비 완료

## 테스트

인덱스 생성 완료 후:

1. 음성 검색 실행: "러닝화 270"
2. 콘솔 확인: Firestore 에러 없음
3. 검색 결과 표시 확인

## 참고

- 인덱스는 **무료**입니다 (Firestore 무료 플랜 포함)
- 인덱스 생성 중에도 앱은 정상 작동 (다른 쿼리는 영향 없음)
- 인덱스는 **자동으로 유지**됩니다 (데이터 변경 시 자동 업데이트)

