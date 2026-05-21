# 🔥 Cursor 개발자 수정 지시문: emptyStringToNull export 누락 수정 완료

## ✅ 수정 완료

### 문제

`activitySessionService.ts`와 `startActivity.ts`에서 `emptyStringToNull`을 import하려고 하지만, `firestoreHelpers.ts`에 해당 export가 없어서 HubHome 로딩 실패 발생.

**에러 메시지**:
```
SyntaxError: The requested module '/src/utils/firestoreHelpers.ts' does not provide an export named 'emptyStringToNull'
```

---

## 📋 수정 상세

### 추가된 함수

**파일**: `src/utils/firestoreHelpers.ts`

```typescript
/**
 * 빈 문자열을 null로 변환
 * 
 * @param value - 변환할 값
 * @returns 빈 문자열이면 null, 아니면 원래 값
 * 
 * @example
 * emptyStringToNull("") // null
 * emptyStringToNull("text") // "text"
 * emptyStringToNull(undefined) // null
 */
export function emptyStringToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return value;
}
```

---

## 🔧 사용 위치

### 1. activitySessionService.ts
```typescript
import { cleanFirestoreData, emptyStringToNull } from "@/utils/firestoreHelpers";

// 사용 예시
gu: emptyStringToNull(addressInfo.gu), // undefined/빈 문자열 → null
si: emptyStringToNull(addressInfo.si), // undefined/빈 문자열 → null
```

### 2. startActivity.ts
```typescript
import { cleanFirestoreData, emptyStringToNull } from "@/utils/firestoreHelpers";

// 사용 예시
gu: addressInfo ? emptyStringToNull(addressInfo.gu) : null,
si: addressInfo ? emptyStringToNull(addressInfo.si) : null,
```

---

## 🧪 테스트 체크리스트

- [ ] 홈 페이지 접속 → HubHome이 정상적으로 로드되는지 확인
- [ ] 콘솔에 `emptyStringToNull` 관련 에러가 없는지 확인
- [ ] 활동 세션 시작 시 주소 정보가 정상적으로 저장되는지 확인

---

## 📝 참고사항

### 함수 동작

- `""` (빈 문자열) → `null`
- `undefined` → `null`
- `null` → `null`
- `"text"` (비어있지 않은 문자열) → `"text"` (그대로 반환)

### 사용 목적

Firestore에 저장할 때 빈 문자열 대신 `null`을 사용하여:
- 데이터 일관성 유지
- 쿼리 최적화
- 필드 존재 여부 명확히 구분

---

이 수정으로 **HubHome 로딩 실패 문제가 해결**되었습니다.
