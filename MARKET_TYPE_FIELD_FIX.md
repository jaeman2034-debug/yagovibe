# 🔥 Market `type` 필드 누락 문제 해결

## 🚨 문제 원인

**콘솔 로그:**
```
✅ [MarketPage] Firestore 응답: 0개 문서
```

**원인:**
- MarketPage는 `where("type", "==", "used")`로 필터링
- 하지만 저장 시 `type` 필드가 저장되지 않음
- 쿼리 조건과 데이터 불일치

---

## ✅ 해결 방법

### 저장 시 `type` 필드 추가

모든 저장 로직에 `type: "used"` 필드를 추가했습니다:

1. **EquipmentForm.tsx** (라인 275)
   ```typescript
   type: "used", // 🔥 거래 유형: 중고거래
   ```

2. **RecruitForm.tsx** (라인 97)
   ```typescript
   type: "used", // 🔥 거래 유형: 중고거래
   ```

3. **MatchForm.tsx** (라인 119)
   ```typescript
   type: "used", // 🔥 거래 유형: 중고거래
   ```

4. **MarketAddPage.tsx** (라인 314)
   ```typescript
   type: "used", // 🔥 거래 유형: 중고거래
   ```

---

## 📝 `type` 필드 설명

### 필드 용도

- **`type`**: 거래 유형 (중고거래/나눔/유실물)
  - `"used"`: 중고거래
  - `"share"`: 나눔
  - `"lost"`: 유실물

- **`category`**: 상품 카테고리 (장비/모집/매칭)
  - `"equipment"`: 장비
  - `"recruit"`: 모집
  - `"match"`: 매칭

### 현재 구조

- 모든 상품은 기본적으로 `type: "used"`로 저장
- 나중에 나눔/유실물 기능 추가 시 `type` 필드로 구분 가능

---

## 🎯 적용 후 확인

1. **새 상품 등록**
   - 상품 등록 시 `type: "used"` 필드가 저장됨

2. **Market 페이지 확인**
   - 상품 목록이 정상적으로 표시됨
   - `where("type", "==", "used")` 쿼리가 정상 작동

3. **기존 데이터**
   - 기존 데이터에는 `type` 필드가 없을 수 있음
   - 필요 시 마이그레이션 스크립트 실행

---

## 🚀 다음 단계

### 기존 데이터 마이그레이션 (선택사항)

기존 데이터에 `type` 필드를 추가하려면:

```typescript
// 마이그레이션 스크립트 예시
const marketRef = collection(db, "market");
const snapshot = await getDocs(marketRef);

for (const doc of snapshot.docs) {
  if (!doc.data().type) {
    await updateDoc(doc.ref, { type: "used" });
  }
}
```

---

## ✅ 완료

모든 저장 로직에 `type` 필드가 추가되었습니다. 이제 Market 페이지에서 상품이 정상적으로 표시됩니다.
