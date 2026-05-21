# 🔥 Market 페이지 무한 루프 문제 해결

## 🚨 문제 상황

Market 페이지에서 무한 루프가 발생하여 콘솔에 반복적인 로그가 출력됨.

## 🎯 원인 분석

### 1. 권한 오류 시 재시도 루프

**문제:**
- Firestore 권한 오류 발생
- `setError` 호출
- `useEffect`가 다시 실행되어 재시도
- 권한 오류 재발생
- 무한 반복

**해결:**
- 권한 오류 발생 시 재시도하지 않도록 가드 추가
- `error` 상태를 체크하여 권한 오류가 있으면 `useEffect` 실행 중단

### 2. outletContext 값 불안정

**문제:**
- `outletContext`가 매 렌더링마다 새로운 객체를 반환할 수 있음
- `serviceType`과 `sortType`이 계속 변경됨
- `useEffect` 의존성 배열에 포함되어 있어 계속 트리거됨

**해결:**
- `useMemo`로 `serviceType`과 `sortType` 안정화
- 의존성 배열에 실제 값만 포함

---

## ✅ 적용된 수정사항

### 1. 권한 오류 재시도 방지

```typescript
// 🔥 권한 오류가 이미 발생했으면 재시도하지 않음 (무한 루프 방지)
if (error && (error.includes("권한") || error.includes("permission"))) {
  console.warn("⚠️ [MarketPage] 권한 오류로 인해 로드 스킵 (무한 루프 방지)");
  return;
}
```

### 2. outletContext 값 안정화

```typescript
// 🔥 Layout에서 전달받은 context (useMemo로 안정화하여 무한 루프 방지)
const outletContext = useOutletContext<{ serviceType?: string; sortMode?: MarketSortMode; sortType?: string; userLoc?: LatLng }>();
const serviceType = useMemo(() => outletContext?.serviceType || "market", [outletContext?.serviceType]);
const sortType = useMemo(() => outletContext?.sortType || "default", [outletContext?.sortType]);
```

### 3. 권한 오류 시 AI 검색 중단

```typescript
} else if (err.code === "permission-denied") {
  errorMessage = "Firestore 권한 오류: 로그인이 필요하거나 규칙이 제한되어 있습니다.";
  // 🔥 권한 오류 시 재시도 방지 (무한 루프 방지)
  console.warn("⚠️ [MarketPage] 권한 오류로 인해 재시도하지 않습니다. Firestore 규칙을 확인해주세요.");
  setUseAISearch(false); // AI 검색도 중단
}
```

---

## 🎯 완료 기준

- 무한 루프 해결됨
- 콘솔 로그 정상화
- 권한 오류 시 재시도하지 않음
- `outletContext` 값 안정화

---

## 📝 추가 확인 사항

### Firestore 규칙 배포 필요

무한 루프가 해결되면 Firestore 규칙을 배포해야 합니다:

```bash
firebase deploy --only firestore:rules
```

또는 Firebase Console에서 직접 배포.

---

## ⚠️ 주의사항

### 권한 오류 해결 후

권한 오류가 해결되면 (Firestore 규칙 배포 후) 페이지를 새로고침해야 합니다.

현재는 권한 오류로 인해 로드가 스킵되므로, 규칙 배포 후에는 정상적으로 데이터가 로드됩니다.
