# ✅ 팀 생성 에러 처리 구조 개선 (완료)

**생성일**: 2025-01-27  
**문제**: 팀 생성 성공과 후속 동기화 실패를 구분하지 못해 /me로 리다이렉트  
**상태**: ✅ 수정 완료

---

## 🔴 문제의 본질

### ❌ 기존 구조 (문제)

```ts
try {
  await createTeamAndSync(); // 팀 생성 + 후속 동기화를 하나로 묶음
  navigate('/success');
} catch (e) {
  navigate('/me'); // ❌ 후속 동기화 실패도 팀 생성 실패로 취급
}
```

**문제점:**
- 팀 생성은 성공했는데 후속 동기화가 실패하면 catch로 이동
- catch에서 무조건 `/me`로 리다이렉트
- 사용자는 팀 생성 성공 화면을 못 봄

---

## ✅ 수정된 구조 (정답)

### 핵심 원칙

> **팀 생성 성공과 후속 동기화 실패를 분리 처리한다**

### 수정된 코드 구조

```ts
let createdTeamId: string | null = null;

try {
  // 🔥 1단계: 팀 생성만 수행
  const result = await createTeamCallable({ ... });
  const { teamId, success } = result.data;
  
  if (!success || !teamId) {
    throw new Error("팀 생성 실패");
  }
  
  // ✅ 팀 생성 성공 확정
  createdTeamId = teamId;
  
  // 🔥 2단계: 팀 생성 성공 시 즉시 성공 화면으로 이동
  if (createdTeamId) {
    navigate(`/sports/${sportType}/team/create?step=2&teamId=${createdTeamId}`);
    setLoading(false);
    
    // 🔥 3단계: 후속 동기화는 비동기로 실행 (실패해도 무시)
    refreshTeam(sportType).catch((err) => {
      console.warn("후속 동기화 실패 (무시)");
    });
    
    return; // ✅ 성공 시 즉시 return
  }
  
} catch (error) {
  // 🔥 functions/internal 에러 처리
  if (error?.code === "functions/internal") {
    // teamId가 있으면 팀 생성 성공으로 간주
    const errorTeamId = extractTeamIdFromError(error);
    if (errorTeamId) {
      navigate(`/sports/${sportType}/team/create?step=2&teamId=${errorTeamId}`);
      return;
    }
  }
  
  // 정말 팀 생성 실패
  toast.error("팀 생성에 실패했습니다.");
  // ❌ /me로 이동하지 않음 (페이지 유지)
}
```

---

## 🎯 개선 사항

### 1. 팀 생성 성공 여부를 명확히 확인

**수정 전:**
```ts
const result = await createTeamCallable({ ... });
navigate('/success'); // 성공 여부 확인 없이 이동
```

**수정 후:**
```ts
const { teamId, success } = result.data;
if (!success || !teamId) {
  throw new Error("팀 생성 실패");
}
createdTeamId = teamId; // ✅ 성공 확정
if (createdTeamId) {
  navigate('/success'); // 성공 확정 후 이동
}
```

---

### 2. 후속 동기화를 별도로 처리

**수정 전:**
```ts
await createTeam();
await syncUserTeam(); // 실패하면 catch로 이동
navigate('/success');
```

**수정 후:**
```ts
const teamId = await createTeam(); // ✅ 성공 확정
navigate('/success'); // 즉시 이동

// 후속 동기화는 별도로 처리 (실패해도 무시)
syncUserTeam(teamId).catch((err) => {
  console.warn("후속 동기화 실패 (무시)");
});
```

---

### 3. functions/internal 에러 처리 개선

**수정 전:**
```ts
catch (error) {
  if (error?.code === "functions/internal") {
    navigate('/me'); // ❌ 무조건 /me로 이동
  }
}
```

**수정 후:**
```ts
catch (error) {
  if (error?.code === "functions/internal") {
    // teamId가 있으면 팀 생성 성공으로 간주
    const errorTeamId = extractTeamIdFromError(error);
    if (errorTeamId) {
      navigate('/success'); // ✅ 성공 화면으로 이동
    } else {
      toast.error("팀 생성 중 오류가 발생했습니다.");
      // ❌ /me로 이동하지 않음
    }
  }
}
```

---

### 4. 에러 발생 시 페이지 유지

**수정 전:**
```ts
catch (error) {
  navigate('/me'); // ❌ 페이지를 벗어남
}
```

**수정 후:**
```ts
catch (error) {
  toast.error("팀 생성에 실패했습니다.");
  // ❌ /me로 이동하지 않음 (사용자가 다시 시도할 수 있도록)
}
```

---

## 📋 체크리스트

- [x] 팀 생성 성공 여부를 명확히 확인
- [x] 후속 동기화를 별도로 처리
- [x] functions/internal 에러 처리 개선
- [x] 에러 발생 시 페이지 유지
- [x] teamId 추출 헬퍼 함수 추가

---

## 🔚 최종 결과

**수정 전:**
- 팀 생성 성공 → 후속 동기화 실패 → `/me`로 리다이렉트 ❌
- 사용자가 성공 화면을 못 봄 ❌

**수정 후:**
- 팀 생성 성공 → 즉시 성공 화면으로 이동 ✅
- 후속 동기화 실패 → 무시 (UX에 영향 없음) ✅
- 사용자가 성공 화면을 정상적으로 볼 수 있음 ✅

---

**완료일**: 2025-01-27  
**상태**: ✅ 수정 완료  
**판정**: 정상 작동
