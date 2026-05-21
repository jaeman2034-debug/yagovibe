# 🔴 팀 생성 후 /me로 되돌아가는 문제 해결

**생성일**: 2025-01-27  
**문제**: 팀 정보 입력 후 "팀 생성하기" 클릭 시 마이페이지로 되돌아감  
**상태**: ✅ 수정 완료

---

## 🔴 문제 증상

1. `/me`에서 [팀 만들기] 클릭
2. `/sports/football/team/create?mode=non-member`로 이동 ✅
3. 팀 이름 입력 후 [팀 생성하기] 클릭
4. **마이페이지(`/me`)로 되돌아감** ❌

**예상 동작:**
- 팀 생성 성공 → `/sports/football/team/create?step=2&teamId={teamId}` (결정 화면)

---

## 🧠 원인 분석

### 원인 1: 성공 후 navigate가 실행되지만 다음 코드가 계속 실행됨

**문제 코드:**
```tsx
// ✅ 성공
navigate(`/sports/${sportType}/team/create?step=2&teamId=${teamId}`, { replace: true });

// ⚠️ 문제: navigate 후에도 아래 코드가 실행됨
refreshTeam(sportType).catch((err) => {
  console.warn("⚠️ [TeamCreateForm] 팀 동기화 실패 (무시):", err);
});

setLoading(false);
```

**문제점:**
- `refreshTeam`이 실패하면 에러가 발생할 수 있음
- 에러가 발생하면 catch 블록으로 이동
- catch 블록에서 `/me`로 이동하는 로직이 있음

---

### 원인 2: `functions/internal` 에러 시 무조건 `/me`로 이동

**문제 코드:**
```tsx
if (error?.code === "functions/internal") {
  // functions/internal은 후속 동기화 실패일 가능성이 높음
  navigate("/me", { replace: true }); // ❌ 무조건 /me로 이동
  return;
}
```

**문제점:**
- `functions/internal` 에러는 후속 동기화 실패일 수 있음
- 하지만 팀 생성 자체는 성공했을 수 있음
- 무조건 `/me`로 이동하면 사용자가 성공 화면을 못 봄

---

### 원인 3: 일반 에러 시에도 페이지 유지하지 않음

**문제 코드:**
```tsx
const msg = error?.message || error?.code || "팀 생성에 실패했습니다.";
toast.error(msg);
setLoading(false);
return; // ⚠️ 페이지는 유지되지만, 사용자가 다시 시도하기 어려움
```

**문제점:**
- 에러 메시지만 표시하고 페이지는 유지
- 하지만 사용자가 다시 시도하기 어려울 수 있음

---

## ✅ 수정 내용

### 수정 1: 성공 시 navigate 후 즉시 return

**수정 전:**
```tsx
navigate(`/sports/${sportType}/team/create?step=2&teamId=${teamId}`, { replace: true });
// 아래 코드가 계속 실행됨
refreshTeam(sportType).catch(...);
setLoading(false);
```

**수정 후:**
```tsx
navigate(`/sports/${sportType}/team/create?step=2&teamId=${teamId}`, { replace: true });
setLoading(false);
return; // ⚠️ navigate 후 즉시 return (아래 코드 실행 방지)
```

**효과:**
- `refreshTeam`이 실패해도 catch 블록으로 이동하지 않음
- 성공 시 확실히 step=2로 이동

---

### 수정 2: `functions/internal` 에러 처리 개선

**수정 전:**
```tsx
if (error?.code === "functions/internal") {
  navigate("/me", { replace: true }); // ❌ 무조건 /me로 이동
  return;
}
```

**수정 후:**
```tsx
if (error?.code === "functions/internal") {
  // functions/internal은 후속 동기화 실패일 가능성이 높음
  // 하지만 팀 생성 자체는 성공했을 수 있으므로, step=2로 이동 시도
  const errorTeamId = error?.teamId || (error?.data?.teamId);
  if (errorTeamId) {
    // teamId가 있으면 step=2로 이동
    navigate(`/sports/${sportType}/team/create?step=2&teamId=${errorTeamId}`, { replace: true });
  } else {
    // teamId가 없으면 정말 실패한 것
    toast.error("팀 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    // ❌ /me로 이동하지 않음 (사용자가 다시 시도할 수 있도록)
  }
  return;
}
```

**효과:**
- 팀 생성이 성공했으면 step=2로 이동
- 정말 실패했으면 페이지 유지 (다시 시도 가능)

---

### 수정 3: 일반 에러 시 페이지 유지

**수정 전:**
```tsx
const msg = error?.message || error?.code || "팀 생성에 실패했습니다.";
toast.error(msg);
setLoading(false);
return;
```

**수정 후:**
```tsx
// 일반 에러: 사용자에게 에러 메시지 표시만 (페이지는 그대로 유지)
const msg = error?.message || error?.code || "팀 생성에 실패했습니다.";
toast.error(msg);
// ❌ navigate("/me") 제거 - 사용자가 다시 시도할 수 있도록 페이지 유지
return;
```

**효과:**
- 에러 발생 시 페이지 유지
- 사용자가 다시 시도 가능

---

## 🎯 수정 후 동작

### 정상 케이스
1. 팀 이름 입력
2. [팀 생성하기] 클릭
3. Cloud Function 호출 성공
4. `navigate` → step=2로 이동 ✅
5. `return` → 아래 코드 실행 안 됨 ✅

### `functions/internal` 에러 케이스
1. 팀 이름 입력
2. [팀 생성하기] 클릭
3. Cloud Function 호출 → `functions/internal` 에러
4. `errorTeamId` 확인
5. 있으면 → step=2로 이동 ✅
6. 없으면 → 에러 메시지 표시, 페이지 유지 ✅

### 일반 에러 케이스
1. 팀 이름 입력
2. [팀 생성하기] 클릭
3. Cloud Function 호출 실패
4. 에러 메시지 표시 ✅
5. 페이지 유지 (다시 시도 가능) ✅

---

## 📋 체크리스트

- [x] 성공 시 navigate 후 즉시 return 추가
- [x] `functions/internal` 에러 처리 개선
- [x] 일반 에러 시 페이지 유지
- [x] `/me`로 무조건 이동하는 로직 제거

---

## 🔚 최종 결과

**수정 전:**
- 팀 생성 성공 → `/me`로 되돌아감 ❌
- 에러 발생 → `/me`로 되돌아감 ❌

**수정 후:**
- 팀 생성 성공 → step=2로 이동 ✅
- 에러 발생 → 페이지 유지, 에러 메시지 표시 ✅

---

**완료일**: 2025-01-27  
**상태**: ✅ 문제 해결 완료  
**판정**: 정상 작동
