# 🔥 Cursor 개발자 수정 지시문: Firestore undefined 값 처리

## 📋 문제

상품 등록 시 Firestore 에러 발생:
```
addDoc() called with invalid data
Unsupported field value: undefined
field: brand
```

**원인**: Firestore는 `undefined` 값을 저장할 수 없습니다.

---

## ✅ 수정 완료

### 1. Firestore Helper 유틸리티 생성
**파일**: `src/utils/firestoreHelpers.ts`

**기능**:
- `removeUndefined()`: undefined 값 제거
- `cleanFirestoreData()`: Firestore 저장 전 데이터 정리
- `validateRequiredFields()`: 필수 필드 검증
- `prepareFirestoreData()`: 완전한 데이터 정리 및 검증

### 2. EquipmentForm.tsx 수정
- `postData` 생성 후 `cleanFirestoreData()` 적용
- 필수 필드 검증 추가: `["title", "price", "sport", "images"]`
- `activityData` 생성 후 `cleanFirestoreData()` 적용

### 3. RecruitForm.tsx 수정
- `postData` 생성 후 `cleanFirestoreData()` 적용
- 필수 필드 검증 추가: `["title", "people", "sport", "images"]`

### 4. MatchForm.tsx 수정
- `postData` 생성 후 `cleanFirestoreData()` 적용
- 필수 필드 검증 추가: `["title", "people", "sport", "images", "matchDate"]`
- `activityData` 생성 후 `cleanFirestoreData()` 적용

---

## 📋 수정 코드 예시

### Before (문제 코드)
```typescript
const postData = {
  title: title.trim(),
  brand: brand.trim() || undefined,  // ❌ undefined 가능
  price: Number(price),
  // ...
};

await addDoc(collection(db, "market"), postData);  // ❌ 에러 발생
```

### After (수정 코드)
```typescript
const postDataRaw = {
  title: title.trim(),
  brand: brand.trim() || undefined,  // ✅ 일단 undefined 허용
  price: Number(price),
  // ...
};

// 🔥 undefined 값 제거
const { cleanFirestoreData, validateRequiredFields } = await import("@/utils/firestoreHelpers");
const validation = validateRequiredFields(postDataRaw, ["title", "price", "sport", "images"]);
if (!validation.valid) {
  throw new Error(validation.message || "필수 필드가 누락되었습니다.");
}
const postData = cleanFirestoreData(postDataRaw);  // ✅ undefined 제거

await addDoc(collection(db, "market"), postData);  // ✅ 정상 작동
```

---

## 🔧 Firestore Helper 함수 사용법

### 1. cleanFirestoreData (기본 사용)
```typescript
import { cleanFirestoreData } from "@/utils/firestoreHelpers";

const postData = {
  title: "상품명",
  brand: undefined,  // 제거됨
  price: 10000,
};

const cleanData = cleanFirestoreData(postData);
// { title: "상품명", price: 10000 }
```

### 2. validateRequiredFields (필수 필드 검증)
```typescript
import { validateRequiredFields } from "@/utils/firestoreHelpers";

const validation = validateRequiredFields(postData, ["title", "price", "sport"]);
if (!validation.valid) {
  throw new Error(validation.message);
  // "필수 필드가 누락되었습니다: brand, sport"
}
```

### 3. prepareFirestoreData (통합 함수)
```typescript
import { prepareFirestoreData } from "@/utils/firestoreHelpers";

const cleanPost = prepareFirestoreData(
  postData,
  ["title", "price", "sport", "images"]  // 필수 필드
);
// undefined 제거 + 필수 필드 검증
```

---

## 📋 필수 필드 목록

### EquipmentForm
- `title`: 제목
- `price`: 가격
- `sport`: 종목
- `images`: 이미지 배열

### RecruitForm
- `title`: 제목
- `people`: 모집 인원
- `sport`: 종목
- `images`: 이미지 배열

### MatchForm
- `title`: 제목
- `people`: 필요 인원
- `sport`: 종목
- `images`: 이미지 배열
- `matchDate`: 경기 날짜

---

## ✅ 수정 후 정상 흐름

```
1. 상품 등록 폼 작성
   ↓
2. 필수 필드 검증
   ↓
3. undefined 값 제거
   ↓
4. Firestore 저장 (market 컬렉션)
   ↓
5. marketPosts 동기화
   ↓
6. Activity 생성 (activities 컬렉션)
   ↓
7. 거래 페이지 이동
```

---

## 🧪 테스트 체크리스트

- [ ] EquipmentForm에서 brand가 undefined일 때 저장 성공 확인
- [ ] RecruitForm에서 선택적 필드가 undefined일 때 저장 성공 확인
- [ ] MatchForm에서 fee가 undefined일 때 저장 성공 확인
- [ ] 필수 필드 누락 시 에러 메시지 표시 확인
- [ ] Activity 생성 시 undefined 값 제거 확인

---

## 🔍 디버깅

### 콘솔 로그 확인
```typescript
// 정상 저장 시
✅ [EquipmentForm] market saved: abc123
✅ [EquipmentForm] marketPosts 동기화 완료: abc123
🔥 [EquipmentForm] activity created: xyz789

// 에러 발생 시
❌ 필수 필드가 누락되었습니다: title, price
```

### Firestore 콘솔 확인
- `market` 컬렉션에 `brand: undefined` 필드가 없는지 확인
- `activities` 컬렉션에 `summary: undefined` 필드가 없는지 확인

---

## 📝 참고사항

### undefined vs null vs 빈 문자열
- **undefined**: Firestore에 저장 불가 → 제거
- **null**: Firestore에 저장 가능 → 유지 (의도적인 빈 값)
- **빈 문자열**: Firestore에 저장 가능 → 유지 (의도적인 빈 값)

### 선택적 필드 처리
```typescript
// ❌ 잘못된 방법
brand: brand || undefined  // undefined가 저장될 수 있음

// ✅ 올바른 방법
brand: brand.trim() || undefined  // 일단 undefined 허용
// → cleanFirestoreData()로 제거
```

---

## 🚀 추가 개선 사항

### 향후 개선 가능
1. **타입 안전성**: TypeScript 타입으로 필수 필드 강제
2. **자동 검증**: 폼 제출 시 자동으로 undefined 제거
3. **에러 메시지**: 사용자 친화적인 에러 메시지 표시

---

이 수정으로 **Firestore undefined 에러가 완전히 해결**됩니다.
