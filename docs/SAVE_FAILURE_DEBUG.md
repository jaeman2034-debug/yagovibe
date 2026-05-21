# 🔍 저장 실패 디버깅 가이드

## 현재 상태 확인

### ✅ 추가된 로그
1. **저장 시도 로그**: `🔥 [handleSave] 대회 생성 시도`
2. **저장 성공 로그**: `✅ [handleSave] 대회 생성 성공`
3. **저장 완료 로그**: `✅ [handleSave] 저장 완료`

### ❌ 문제 확인 사항

## 1단계: 콘솔 에러 확인

브라우저 콘솔에서 다음을 확인:

### 저장 시도 시 나오는 로그:
```
🔥 [handleSave] 대회 생성 시도: {...}
```

### 성공 시:
```
✅ [handleSave] 대회 생성 성공: { tournamentId: "...", title: "..." }
✅ [handleSave] 저장 완료: {...}
```

### 실패 시:
```
❌ [handleSave] 대회 저장 오류: {...}
```

**중요**: `❌ [handleSave] 대회 저장 오류` 다음에 나오는 에러 객체를 확인하세요:
- `error.code` - 에러 코드 (예: "permission-denied", "unavailable")
- `error.message` - 에러 메시지
- `error.stack` - 스택 트레이스

## 2단계: 인덱스 확인

### useTournaments 쿼리 분석

**일반 모드** (`includeDraft: false`):
```typescript
where("adminStatus", "==", "published")
orderBy("isPinned", "desc")
orderBy("dateStart", "desc")
```

**관리자 모드** (`includeDraft: true`):
```typescript
orderBy("isPinned", "desc")
orderBy("dateStart", "desc")
```

### 현재 인덱스 상태

`firestore.indexes.json`에 다음 인덱스가 있습니다:
1. ✅ `adminStatus` + `isPinned` + `dateStart` (일반 모드용)
2. ✅ `isPinned` + `dateStart` (관리자 모드용)

### 인덱스 에러 확인

콘솔에 다음 에러가 있으면:
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

**해결 방법**:
1. 링크 클릭
2. "Create index" 버튼 클릭
3. 상태가 "Building" → "Enabled" 될 때까지 대기 (1~3분)

## 3단계: Firestore Console 확인

### 저장 성공 여부 확인

1. **Firebase Console 열기**: https://console.firebase.google.com/project/yago-vibe-spt/firestore
2. **경로 확인**: `associations` → `assoc-nowon-football` → `tournaments`
3. **새 문서 확인**: 방금 입력한 제목의 대회 문서가 있는지 확인

### 저장 실패 시 확인 사항

- 문서가 없음 → 저장 실패 확정
- 에러 코드 확인:
  - `permission-denied` → Rules 문제
  - `unavailable` → 네트워크 문제
  - `invalid-argument` → 데이터 검증 문제

## 4단계: Rules 확인

### 현재 Rules 상태

```javascript
allow create: if isSignedIn() && isAssociationAdmin(associationId);
```

### 확인 사항

1. **adminUids 배열 확인**:
   - Firebase Console → `associations/assoc-nowon-football`
   - `adminUids` 배열에 현재 사용자 UID 포함 확인

2. **Rules 배포 확인**:
   - Firebase Console → Firestore → Rules
   - 최근 배포 시간 확인

## 5단계: 저장 재시도

### 순서

1. **인덱스 생성** (필요 시)
2. **브라우저 새로고침** (Ctrl + Shift + R)
3. **임시 저장(DRAFT) 먼저 시도**
4. **성공하면 게시(PUBLISH) 시도**

### 로그 확인

저장 시도 시 콘솔에 다음이 나와야 합니다:
```
🔥 [handleSave] 대회 생성 시도: {...}
✅ [handleSave] 대회 생성 성공: {...}
✅ [handleSave] 저장 완료: {...}
```

만약 `❌ [handleSave] 대회 저장 오류`가 나오면:
- 에러 객체 전체를 복사해서 공유
- 특히 `error.code`와 `error.message` 확인

## 다음 액션

1. **콘솔 에러 확인**: `❌ [handleSave] 대회 저장 오류` 다음의 에러 객체 확인
2. **Firestore Console 확인**: 실제 문서 생성 여부 확인
3. **인덱스 생성**: 콘솔 링크 클릭하여 인덱스 생성
4. **저장 재시도**: 로그 확인하며 다시 시도

