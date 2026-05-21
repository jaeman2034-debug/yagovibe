# 공지 게시 실패 → 임시 저장 전환 UX 가이드

## 🎯 목표

게시 실패 시 사용자에게 명확한 피드백을 제공하고, 자동으로 임시 저장으로 전환하여 데이터 손실을 방지합니다.

---

## ✅ 현재 구현 상태

### 1. 에러 상태 관리
```typescript
const [saveError, setSaveError] = useState<Error | null>(null);
```

### 2. 게시 실패 시 자동 롤백
```typescript
if (saveType === "publish") {
  console.log('⚠️ [handleSave] publish 실패 → draft로 롤백');
  setSaveType("draft");
}
```

### 3. 에러 UI 표시
```typescript
{saveError && (
  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
    <div className="text-sm font-medium text-red-800 mb-1">
      ❌ 저장 실패
    </div>
    <div className="text-xs text-red-600">
      {saveError.message || "저장 중 오류가 발생했습니다."}
    </div>
    {saveError.message?.includes("permission") && (
      <div className="text-xs text-red-500 mt-1">
        💡 관리자 권한을 확인하거나 임시 저장을 시도해주세요.
      </div>
    )}
    <button
      onClick={() => {
        setSaveError(null);
        setSaveType("draft");
      }}
      className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
    >
      임시 저장으로 전환
    </button>
  </div>
)}
```

---

## 🔧 개선 사항

### 1. 게시 실패 시 자동 임시 저장 제안

**현재:** 사용자가 수동으로 "임시 저장으로 전환" 버튼 클릭

**개선:** 게시 실패 시 자동으로 임시 저장 시도 제안

```typescript
catch (error) {
  setSaveError(error instanceof Error ? error : new Error(errorMessage));
  
  // ❗ publish 실패 시 상태 롤백
  if (saveType === "publish") {
    console.log('⚠️ [handleSave] publish 실패 → draft로 롤백');
    setSaveType("draft");
    
    // 🔥 자동 임시 저장 제안
    const shouldAutoSave = confirm(
      "게시 권한이 없습니다. 임시 저장으로 저장하시겠습니까?"
    );
    
    if (shouldAutoSave) {
      // 임시 저장 시도
      try {
        await saveNotice({
          ...data,
          status: "draft"
        });
        setSaveError(null);
        toast.success("임시 저장되었습니다.");
      } catch (draftError) {
        console.error("임시 저장도 실패:", draftError);
      }
    }
  }
}
```

---

### 2. 권한 에러 감지 및 안내 개선

```typescript
const isPermissionError = (error: Error): boolean => {
  return (
    error.message.includes("permission") ||
    error.message.includes("권한") ||
    error.message.includes("insufficient permissions")
  );
};

// catch 블록에서
if (isPermissionError(saveError)) {
  // 권한 에러 전용 UI
  return (
    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
      <div className="text-sm font-medium text-yellow-800 mb-1">
        ⚠️ 게시 권한이 없습니다
      </div>
      <div className="text-xs text-yellow-600 mb-2">
        관리자 권한이 필요합니다. 임시 저장 후 관리자에게 게시를 요청하세요.
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSaveAsDraft}
          className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          임시 저장
        </button>
        <button
          onClick={() => setSaveError(null)}
          className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
```

---

### 3. 게시 실패 시 데이터 보존

**현재:** 에러 발생 시 입력한 데이터는 유지됨

**개선:** 게시 실패 시에도 입력 데이터 보존 확인

```typescript
// handleSave 함수 시작 부분에
const formData = {
  title: title.trim(),
  content: content.trim(),
  isPinned,
  isOfficial,
  visibility,
  // ... 기타 필드
};

// catch 블록에서
catch (error) {
  // 🔥 입력 데이터 보존 (이미 state에 있으므로 자동 보존)
  console.log('입력 데이터 보존됨:', formData);
  
  // 에러 처리
  setSaveError(error);
  // ...
}
```

---

## 📋 최종 UX 플로우

### 시나리오 1: 게시 성공
1. 사용자가 "게시하기" 클릭
2. 저장 중... 표시
3. 성공 → Toast 메시지 + Drawer 닫기

### 시나리오 2: 게시 실패 (권한 에러)
1. 사용자가 "게시하기" 클릭
2. 저장 중... 표시
3. 권한 에러 발생
4. 에러 메시지 표시:
   - "❌ 저장 실패"
   - "Missing or insufficient permissions."
   - "💡 관리자 권한을 확인하거나 임시 저장을 시도해주세요."
5. 자동으로 `saveType`이 `"draft"`로 변경
6. "임시 저장으로 전환" 버튼 표시
7. 사용자가 "임시 저장으로 전환" 클릭
8. 임시 저장 시도 → 성공
9. Toast 메시지 + Drawer 닫기

### 시나리오 3: 게시 실패 (기타 에러)
1. 사용자가 "게시하기" 클릭
2. 저장 중... 표시
3. 에러 발생 (네트워크, 서버 등)
4. 에러 메시지 표시
5. 사용자가 재시도 또는 취소

---

## ✅ 구현 체크리스트

- [x] `saveError` state 추가
- [x] 게시 실패 시 `draft`로 롤백
- [x] 에러 UI 표시
- [x] "임시 저장으로 전환" 버튼
- [ ] 자동 임시 저장 제안 (선택적)
- [ ] 권한 에러 전용 UI (선택적)
- [ ] 입력 데이터 보존 확인 (이미 구현됨)

---

## 🎯 최종 권장 사항

**현재 구현은 이미 충분히 좋습니다.** 추가 개선은 선택 사항입니다:

1. **자동 임시 저장 제안:** 사용자 경험 향상, 하지만 `confirm()` 사용 시 UX가 깨질 수 있음
2. **권한 에러 전용 UI:** 더 명확한 안내, 하지만 현재 구현도 충분함
3. **입력 데이터 보존:** 이미 state로 관리되므로 자동 보존됨

**핵심은 Firestore Rules 문제를 해결하는 것입니다.** Rules가 정상 작동하면 게시 실패 자체가 발생하지 않습니다.

