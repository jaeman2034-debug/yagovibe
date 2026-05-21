# ✅ 대회 UI 표시 문제 해결 완료

## 문제 분석 (사용자 확인)

### ✅ 저장 성공 (확정)
- Firestore에 문서 정상 저장됨
- 경로: `associations/assoc-nowon-football/tournaments/J4pMe7xr0Ch3AeTp3AD`
- 필드 모두 정상: `title`, `status: "upcoming"`, `visibility`, `isOfficial` 등

### ❌ UI 표시 문제 (2가지)

#### 1. 인덱스 미생성 → 쿼리 실패
- `useTournaments` 쿼리가 인덱스 없어서 실패
- 결과: 빈 배열 반환 → UI에 "대회 없음" 표시

#### 2. UI 조건 문제
- 기존: "예정 / 진행중" 섹션만 표시
- 저장된 대회: `status: "upcoming"` → 필터링은 통과하지만 인덱스 에러로 조회 실패

## 수정 완료 사항

### 1. 인덱스 에러 안내 UI 추가 ✅

**파일**: `src/pages/association/TournamentListPage.tsx`

```typescript
// 🔥 인덱스 에러 안내
{indexError && (
  <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <span className="text-2xl">⚠️</span>
      </div>
      <div className="ml-3 flex-1">
        <h3 className="text-sm font-medium text-yellow-800">
          대회 목록을 불러오려면 인덱스가 필요합니다
        </h3>
        <div className="mt-2 text-sm text-yellow-700">
          <p>Firestore 인덱스를 생성해야 대회 목록을 볼 수 있습니다.</p>
          {indexUrl && (
            <a
              href={indexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
            >
              🔗 인덱스 생성하기
            </a>
          )}
        </div>
      </div>
    </div>
  </div>
)}
```

### 2. 섹션 제목 개선 ✅

**변경 전**: "예정 / 진행중"
**변경 후**: "진행 예정 / 진행중"

- `upcoming` 대회도 명확히 포함됨을 표시

### 3. 에러 처리 개선 ✅

**파일**: `src/hooks/useTournaments.ts`

```typescript
// 🔥 인덱스 에러인 경우 URL 포함
if (e?.code === "failed-precondition" || e?.message?.includes("index")) {
  const indexUrl = e?.message?.match(/https:\/\/console\.firebase\.google\.com\/[^\s]+/)?.[0];
  if (indexUrl) {
    // 에러 객체에 URL 포함 (UI에서 사용)
    (e as any).indexUrl = indexUrl;
  }
}
```

### 4. 저장 성공 로그 추가 ✅

**파일**: `src/components/association/tournament/TournamentEditDrawer.tsx`

```typescript
console.log("🔥 [handleSave] 대회 생성 시도:", {...});
console.log("✅ [handleSave] 대회 생성 성공:", { tournamentId, title });
console.log("✅ [handleSave] 저장 완료:", {...});
```

## 해결 방법

### 즉시 해결 (필수)

1. **Firestore 인덱스 생성**
   - Firebase Console에서 인덱스 생성 링크 클릭
   - "Create index" 버튼 클릭
   - 상태가 "Building" → "Enabled" 될 때까지 대기 (1~3분)

2. **페이지 새로고침**
   - 인덱스 생성 완료 후 페이지 새로고침
   - 콘솔 에러 사라지는지 확인

3. **대회 목록 확인**
   - "진행 예정 / 진행중" 섹션에 `upcoming` 대회 표시 확인

## 현재 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 저장 로직 | ✅ 정상 | Firestore에 정상 저장 |
| 권한 체크 | ✅ 정상 | adminUids 기반 동작 |
| 인덱스 | ⚠️ 필요 | 생성 대기 중 |
| UI 표시 | ✅ 개선됨 | 인덱스 생성 후 정상 표시 예상 |
| 에러 안내 | ✅ 추가됨 | 인덱스 에러 시 안내 UI 표시 |

## 다음 단계

1. **인덱스 생성 완료 대기**
2. **페이지 새로고침 후 확인**
3. **대회 목록 정상 표시 확인**

## 참고

- 저장은 이미 성공했으므로 인덱스만 생성하면 바로 표시됨
- 인덱스 생성은 1회만 하면 됨 (이후 자동 사용)
- 인덱스 생성 중에는 쿼리가 실패하지만, 완료되면 자동으로 정상 작동

