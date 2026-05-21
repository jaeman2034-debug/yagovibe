# 공지 시스템 패턴 레퍼런스 (공식 템플릿)

공지 시스템을 기준으로 한 엔티티 CRUD 패턴의 공식 가이드입니다.
대회/시설 등 다른 엔티티에도 동일 패턴을 적용할 수 있습니다.

## 📐 아키텍처 원칙

### 1. 컬렉션 구조

```
Firestore
└─ associations/{associationId}
   └─ {entity}s
      └─ {id}
         ├─ title          (필수)
         ├─ content        (필수)
         ├─ status         (draft | published | archived)
         ├─ isPinned       (boolean)
         ├─ visibility     (public | member | admin)
         ├─ isOfficial     (boolean, 기본값: true)
         ├─ createdAt      (Timestamp, serverTimestamp)
         ├─ updatedAt      (Timestamp, serverTimestamp)
         ├─ createdBy      (string, uid)
         └─ updatedBy      (string, uid)
```

**원칙:**
- 서브컬렉션 사용: `associations/{associationId}/{entity}s/{id}`
- `associationId`는 경로에 포함되므로 문서 필드에서 제외 가능
- 모든 타임스탬프는 `serverTimestamp()` 사용

### 2. 타입 정의

**파일 위치:** `src/types/{entity}.ts`

```typescript
import { Timestamp } from "firebase/firestore";

export type {Entity}Status = "draft" | "published" | "archived";
export type {Entity}Visibility = "public" | "member" | "admin";

export interface {Entity} {
  id: string;
  associationId: string;
  title: string;
  content: string;
  status: {Entity}Status;
  visibility?: {Entity}Visibility;
  isPinned?: boolean;
  isOfficial?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;
  updatedBy?: string;
}
```

**원칙:**
- `status`: 행정 상태 (draft/published/archived)
- `visibility`: 노출 범위 (기본값: public)
- 모든 필드는 명시적으로 타입 정의

### 3. Hook 패턴

**파일 위치:** `src/hooks/use{Entity}s.ts`

```typescript
/**
 * {Entity} 목록 조회 훅
 * 
 * 원칙:
 * - 서브컬렉션 사용
 * - 관리자 모드: draft 포함 조회
 * - 일반 모드: published만 조회
 * - pinned 우선 정렬
 */

interface Use{Entity}sOptions {
  includeDraft?: boolean; // 관리자 모드: draft 포함
}

export function use{Entity}s(
  associationId?: string,
  opts?: Use{Entity}sOptions
) {
  const includeDraft = opts?.includeDraft ?? false;
  const [items, setItems] = useState<{Entity}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetch = useCallback(async () => {
    if (!associationId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const baseConstraints = [
        orderBy("isPinned", "desc"),
        orderBy("createdAt", "desc"),
        limit(200),
      ];

      const constraints = includeDraft
        ? baseConstraints
        : [where("status", "==", "published"), ...baseConstraints];

      const q = query(
        collection(db, `associations/${associationId}/{entity}s`),
        ...constraints
      );
      const snap = await getDocs(q);

      const allItems = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as {Entity}[];

      setItems(allItems);
    } catch (e) {
      setError(e);
      console.error(`[use{Entity}s] fetch error`, e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [associationId, includeDraft]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { items, loading, error, refetch: fetch, setItems };
}
```

**원칙:**
- 항상 `refetch` 함수 제공
- 에러 발생 시 빈 배열 반환
- 로딩 상태 명확히 관리

### 4. Validation 패턴

**파일 위치:** `src/utils/{entity}Validation.ts`

```typescript
/**
 * {Entity} 저장 Validation 유틸리티
 * 
 * 원칙:
 * - 공지 validation 재사용
 * - 엔티티 전용 필드만 추가
 */

import { NOTICE_VALIDATION, validateNotice } from "./noticeValidation";

export const {ENTITY}_VALIDATION = {
  TITLE: NOTICE_VALIDATION.TITLE, // 공지와 동일
  CONTENT: NOTICE_VALIDATION.CONTENT, // 공지와 동일
  // 엔티티 전용 필드 추가
};

export function validate{Entity}(
  title: string,
  content: string,
  // 엔티티 전용 필드
): ValidationResult {
  // 제목 + 본문 검증 (공지와 동일)
  const noticeResult = validateNotice(title, content);
  if (!noticeResult.isValid) {
    return noticeResult;
  }

  // 엔티티 전용 필드 검증
  // ...

  return { isValid: true };
}
```

**원칙:**
- 공지 validation 기본 사용
- 엔티티 전용 필드만 추가 검증
- 상수는 공지와 동일하게 재사용

### 5. EditDrawer 패턴

**파일 위치:** `src/components/association/{entity}/{Entity}EditDrawer.tsx`

**핵심 구조:**

```typescript
interface {Entity}EditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  associationId: string;
  {entity}Id?: string; // 수정 모드일 때
}

export function {Entity}EditDrawer({ ... }: {Entity}EditDrawerProps) {
  // 1. State 관리
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"{Entity}Status">("draft");
  const [originalData, setOriginalData] = useState<...>(null);

  // 2. 변경사항 감지
  const hasUnsavedChanges = () => { ... };

  // 3. Drawer 닫기 확인
  const handleClose = () => {
    if (hasUnsavedChanges() && !saving) {
      if (confirm("저장하지 않은 변경사항이 있습니다...")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // 4. 데이터 로드 (수정 모드)
  useEffect(() => {
    if (!isOpen) {
      // 상태 초기화
      return;
    }
    if (!{entity}Id) {
      // 신규 모드
      return;
    }
    // 수정 모드: 데이터 로드
  }, [isOpen, {entity}Id]);

  // 5. 저장 로직
  const handleSave = async () => {
    // Validation
    // 저장 중 상태 관리
    // Firestore 저장
    // 성공/실패 처리
  };

  // 6. UI 렌더링
  return createPortal(
    <div className="...">
      {/* Header */}
      {/* Body (스크롤) */}
      {/* Footer (버튼) */}
    </div>,
    document.body
  );
}
```

**원칙:**
- `createPortal` 사용 (레이아웃 밖 렌더링)
- 변경사항 확인 필수
- 로딩 스피너 표시
- Toast 메시지 사용

### 6. ListPage 패턴

**파일 위치:** `src/pages/association/{Entity}ListPage.tsx`

**핵심 구조:**

```typescript
export default function {Entity}ListPage() {
  const { associationId } = useParams();
  const { isAdmin } = useIsAssociationAdmin(associationId);
  const [isAdminMode, setIsAdminMode] = useState(true);

  // Hook 사용
  const { items, loading, refetch } = use{Entity}s(associationId, {
    includeDraft: isAdmin && isAdminMode,
  });

  // Drawer 관리
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing{Entity}Id, setEditing{Entity}Id] = useState<string | undefined>();

  // 공개/관리자 모드 분기
  return (
    <SectionLayout>
      {/* 관리자 모드 토글 */}
      {isAdmin && (
        <AdminModeToggle
          isAdminMode={isAdminMode}
          onToggle={setIsAdminMode}
        />
      )}

      {/* 관리자 모드: 관리자 UI */}
      {isAdmin && isAdminMode && (
        <>
          <{Entity}AdminHeader />
          <{Entity}AdminActionBar onAdd={() => handleOpenDrawer()} />
          <{Entity}AdminTable
            items={items}
            onEdit={handleOpenDrawer}
            onDelete={handleDelete}
          />
        </>
      )}

      {/* 공개 모드: 카드 리스트 */}
      {(!isAdmin || !isAdminMode) && (
        <>
          {items.length === 0 ? (
            <{Entity}EmptyState />
          ) : (
            items.map((item) => (
              <{Entity}Card key={item.id} {entity}={item} />
            ))
          )}
        </>
      )}

      {/* EditDrawer */}
      <{Entity}EditDrawer
        isOpen={drawerOpen}
        associationId={associationId!}
        {entity}Id={editing{Entity}Id}
        onClose={handleCloseDrawer}
        onSuccess={refetch}
      />
    </SectionLayout>
  );
}
```

**원칙:**
- 관리자/공개 모드 분기
- `use{Entity}s` 훅 사용
- EditDrawer와 통합
- Toast 메시지 처리

### 7. DetailPage 패턴

**파일 위치:** `src/pages/association/{Entity}DetailPage.tsx`

**핵심 구조:**

```typescript
export default function {Entity}DetailPage() {
  const { associationId, {entity}Id } = useParams();
  const [item, setItem] = useState<{Entity} | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!associationId || !{entity}Id) return;

    const fetch{Entity} = async () => {
      try {
        const ref = doc(
          db,
          `associations/${associationId}/{entity}s/${entity}Id`
        );
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setNotFound(true);
          return;
        }

        const data = { id: snap.id, ...snap.data() } as {Entity};

        // published 상태만 노출 (일반 사용자 페이지)
        if (data.status !== "published") {
          setNotFound(true);
          return;
        }

        setItem(data);
      } catch (error) {
        console.error("오류:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetch{Entity}();
  }, [associationId, {entity}Id]);

  if (loading) return <Loading />;
  if (notFound) return <NotFound />;

  return (
    <SectionLayout>
      <article>
        <h1>{item.title}</h1>
        <div>{item.content}</div>
      </article>
    </SectionLayout>
  );
}
```

**원칙:**
- 단건 조회는 Hook 대신 직접 `getDoc` 사용
- published 상태만 노출 (일반 사용자)
- 404 처리 명확히

## 🔄 역할 분리 (레이어별 책임)

| 레이어 | 책임 | 파일 |
|--------|------|------|
| **타입** | 데이터 구조 정의 | `src/types/{entity}.ts` |
| **Hook** | 리스트 조회 로직 | `src/hooks/use{entity}s.ts` |
| **Validation** | 입력값 검증 | `src/utils/{entity}Validation.ts` |
| **EditDrawer** | 등록/수정 UI | `src/components/association/{entity}/{Entity}EditDrawer.tsx` |
| **ListPage** | 목록 페이지 | `src/pages/association/{Entity}ListPage.tsx` |
| **DetailPage** | 상세 페이지 | `src/pages/association/{Entity}DetailPage.tsx` |
| **Card** | 카드 컴포넌트 | `src/components/association/{entity}/{Entity}Card.tsx` |

## ✅ 체크리스트 (새 엔티티 적용 시)

### 1. 파일 생성
- [ ] `src/types/{entity}.ts` - 타입 정의
- [ ] `src/hooks/use{entity}s.ts` - 목록 조회 훅
- [ ] `src/utils/{entity}Validation.ts` - Validation 유틸리티
- [ ] `src/components/association/{entity}/{Entity}EditDrawer.tsx` - EditDrawer
- [ ] `src/pages/association/{Entity}ListPage.tsx` - 목록 페이지
- [ ] `src/pages/association/{Entity}DetailPage.tsx` - 상세 페이지
- [ ] `src/components/association/{entity}/{Entity}Card.tsx` - 카드 컴포넌트

### 2. 패턴 적용
- [ ] 서브컬렉션 경로 사용
- [ ] `serverTimestamp()` 사용
- [ ] 관리자 모드 지원
- [ ] Validation 적용
- [ ] 변경사항 확인 구현
- [ ] Toast 메시지 구현
- [ ] 로딩 스피너 구현

### 3. 테스트
- [ ] 등록 테스트
- [ ] 수정 테스트
- [ ] 삭제 테스트
- [ ] 관리자/일반 모드 전환 테스트
- [ ] Validation 테스트

## 🚫 금지 사항

### ❌ 하지 말아야 할 것

1. **루트 컬렉션과 서브컬렉션 혼용**
   - 모든 엔티티는 서브컬렉션 사용

2. **타임스탬프 수동 생성**
   - 항상 `serverTimestamp()` 사용

3. **Hook 조건부 실행**
   - React Hook 규칙 준수

4. **플레이스홀더 저장**
   - Validation으로 차단

5. **경로 불일치**
   - 저장/조회 경로 동일하게 유지

## 📚 참고 파일 (공지 기준)

- 타입: `src/types/notice.ts`
- Hook: `src/hooks/useNotices.ts`
- Validation: `src/utils/noticeValidation.ts`
- EditDrawer: `src/components/association/notice/NoticeEditDrawer.tsx`
- ListPage: `src/pages/association/NoticeListPage.tsx`
- DetailPage: `src/pages/association/NoticeDetailPage.tsx`

## 🎯 적용 예시 (대회)

```typescript
// 타입: src/types/tournament.ts
export interface Tournament extends BaseEntity {
  dateStart: Timestamp; // 대회 전용 필드
  dateEnd: Timestamp;   // 대회 전용 필드
  venue: string;        // 대회 전용 필드
}

// Hook: src/hooks/useTournaments.ts
export function useTournaments(...) {
  // useNotices 패턴 그대로 복사
  // notices → tournaments 변경
}

// Validation: src/utils/tournamentValidation.ts
export function validateTournament(
  title: string,
  content: string,
  venue: string  // 대회 전용 필드
) {
  // validateNotice 재사용 + venue 검증 추가
}
```

---

**이 구조로 만들면 다시는 길 잃지 않는다.**
**공지 = 공식 패턴 = 개발 헌법 1장**

