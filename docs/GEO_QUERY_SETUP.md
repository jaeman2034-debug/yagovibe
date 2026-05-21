# 🔥 Firebase Geo 쿼리 설정 가이드

## ✅ 완료된 작업

1. ✅ `geofire-common` 라이브러리 설치
2. ✅ Geo 쿼리 유틸리티 함수 생성 (`src/utils/geoQuery.ts`)
3. ✅ 상품 저장 시 geohash 자동 추가
4. ✅ MarketPage에서 Geo 쿼리 사용

## 🚀 Firestore 인덱스 생성 (필수)

Geo 쿼리를 사용하려면 Firestore에 **복합 인덱스**가 필요합니다.

### 1️⃣ Firebase Console에서 생성

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택
3. **Firestore Database** → **Indexes** 탭
4. **Create Index** 클릭

### 2️⃣ 인덱스 설정

**컬렉션**: `market`
**필드 추가**:
- `geohash` (Ascending)
- `createdAt` (Descending) - 선택 사항 (정렬용)

**Query scope**: Collection

### 3️⃣ 또는 firestore.indexes.json에 추가

```json
{
  "indexes": [
    {
      "collectionGroup": "market",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "geohash",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### 4️⃣ 인덱스 배포

```bash
firebase deploy --only firestore:indexes
```

## 📊 기존 데이터에 geohash 추가 (마이그레이션)

기존 상품에 geohash가 없으면 Geo 쿼리가 작동하지 않습니다.

### Cloud Function으로 마이그레이션

```typescript
// functions/src/migrateGeohash.ts
import { getFirestore } from "firebase-admin/firestore";
import { geohashForLocation } from "geofire-common";

export const migrateGeohash = functions.https.onRequest(async (req, res) => {
  const db = getFirestore();
  const snapshot = await db.collection("market").get();
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    const lat = data.latitude ?? data.lat;
    const lng = data.longitude ?? data.lng;
    
    if (lat != null && lng != null && !data.geohash) {
      const geohash = geohashForLocation([lat, lng]);
      batch.update(doc.ref, { geohash });
      count++;
    }
  });
  
  await batch.commit();
  res.json({ success: true, updated: count });
});
```

## 🎯 성능 최적화 팁

1. **반경 크기 조절**: 너무 큰 반경(>10km)은 쿼리 성능 저하
2. **캐싱**: 자주 조회되는 지역은 클라이언트 캐싱
3. **페이지네이션**: 결과가 많으면 limit 추가

## ⚠️ 주의사항

- GeoHash는 **근사치**이므로 마지막에 실제 거리 필터링 필수
- `geohash` 필드가 없으면 Geo 쿼리 사용 불가
- 인덱스 생성 완료까지 몇 분 소요될 수 있음
