# 🔒 Pro / Free 기능 분기 (마지막 핵심)

## 🎯 목표

Pro 팀만 납부 완료 버튼 사용 가능  
Free 팀은 버튼 비활성화 + "Pro 필요" 표시

## 1️⃣ DB 구조

### teams 컬렉션

```typescript
teams/{teamId} {
  plan: "FREE" | "PRO",  // 핵심 필드
  owners: [uid1, uid2],
  // ... 기타 필드
}
```

**기본값**: `plan`이 없으면 `"FREE"`로 간주

## 2️⃣ Pro 여부 확인 로직

### 백엔드 함수

```typescript
isTeamProCallable({
  teamId: "team1"
})

// 반환
{
  isPro: true  // 또는 false
}
```

### 프론트엔드 사용

```typescript
const isTeamProCallable = httpsCallable(functions, "isTeamProCallable");
const result = await isTeamProCallable({ teamId });
const isPro = (result.data as any).isPro || false;
```

## 3️⃣ 버튼 활성화/비활성화

### Pro 팀

```tsx
<button
  onClick={handlePayment}
  className="bg-blue-600 text-white hover:bg-blue-700"
>
  납부 완료
</button>
```

**상태**: 활성화, 클릭 가능

### Free 팀

```tsx
<button
  disabled={true}
  className="bg-gray-300 text-gray-500 cursor-not-allowed"
  title="Pro 필요"
>
  🔒 Pro 필요
</button>
```

**상태**: 비활성화, 클릭 불가

## 4️⃣ UX 원칙

### 버튼은 항상 보이되

- ✅ Pro면 → 활성화 (클릭 가능)
- ❌ Free면 → 비활성화 (클릭 불가)

**이유**: "왜 안 되는지" 바로 이해됨

### Free 팀에게 보여줄 메시지

```
🔒 Pro 필요

회비 납부 처리는 Pro 플랜에서만 사용할 수 있습니다.
플랜을 업그레이드하시겠습니까?
```

## 5️⃣ 구현 위치

### 1. 페이지 로드 시 Pro 여부 확인

```typescript
useEffect(() => {
  const checkPro = async () => {
    const result = await isTeamProCallable({ teamId });
    setIsPro((result.data as any).isPro || false);
  };
  checkPro();
}, [teamId]);
```

### 2. 버튼 렌더링

```typescript
{isPaid ? (
  <span>✔ 완료</span>
) : (
  <button
    onClick={() => setConfirmDialog({ show: true, member })}
    disabled={!isPro}
    className={isPro ? "bg-blue-600" : "bg-gray-300"}
  >
    {isPro ? "납부 완료" : "🔒 Pro 필요"}
  </button>
)}
```

## 6️⃣ Pro 업그레이드 플로우 (선택)

Free 팀이 버튼을 클릭하면:

```
[Pro 필요] 버튼 클릭
  ↓
업그레이드 안내 모달
  ↓
결제 페이지로 이동
  ↓
결제 완료 → plan: "PRO" 업데이트
  ↓
버튼 자동 활성화
```

## 🔑 한 문장 요약

**Pro면 버튼 활성, Free면 비활성. 버튼은 항상 보이되 클릭은 Pro만 가능.**

