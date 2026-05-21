# Sprint 2: Tournament UI/UX 구현 완료

## ✅ 완료된 작업

### 1. 데이터 스키마 정의
- `src/types/tournament.ts` 생성
- `TournamentStatus`: "upcoming" | "ongoing" | "ended"
- `BracketStatus`: "preparing" | "confirmed"
- `Tournament` 인터페이스 정의

### 2. 컴포넌트 생성

#### 상태 관련
- `TournamentStatusBadge` - 상태 배지 (참가 접수중/접수 마감/진행중/종료)
- `BracketStatus` - 대진표 상태 (준비중/확정)

#### 카드 및 리스트
- `TournamentCard` - Tournament 카드 (Public)
- `TournamentEmptyState` - Empty State

### 3. 페이지 생성

#### Public
- `TournamentListPage` - 대회 리스트 페이지
  - 최신/예정 대회 상단
  - 종료 대회 하단
  - 필터 ❌ (MVP에서는 과함)
  
- `TournamentDetailPage` - 대회 상세 페이지
  - 공식 기준 배지 필수
  - 대진표 상태 명확히 표시
  - 댓글/문의 버튼/전화번호 ❌

### 4. 라우팅 추가
- `/association/:associationId/tournaments` - 리스트
- `/association/:associationId/tournaments/:tournamentId` - 상세

## 📐 데이터 스키마 (MVP 확정)

```typescript
Tournament {
  id: string
  associationId: string
  title: string
  dateStart: Timestamp
  dateEnd: Timestamp
  venue: string
  status: 'upcoming' | 'ongoing' | 'ended'
  registrationOpen: boolean
  feeAmount?: number
  bracketStatus: 'preparing' | 'confirmed'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## 🎯 상태 배지 로직

- `status === 'upcoming' && registrationOpen` → '참가 접수중'
- `status === 'upcoming' && !registrationOpen` → '접수 마감'
- `status === 'ongoing'` → '진행중'
- `status === 'ended'` → '종료'

## 🎯 대진표 상태 표시

- `bracketStatus === 'confirmed'` → "대진표 확정 (공식)"
- 그 외 → "대진표 준비중" + 안내 문구

## ✅ UX 핵심 규칙 적용

### Public
- 공식 기준 배지 필수
- 대진표 상태 명확히 표시
- Empty State 필수
- 공식 기준 하단 문구 필수

### 절대 구현하지 않음
- 댓글
- 문의 버튼
- 전화번호
- 필터 (MVP에서는 과함)

## 🎯 결과

- ✅ "대회 언제예요?" → 페이지 링크
- ✅ "대진표 나왔어요?" → 상태 배지
- ✅ "이게 공식이에요?" → 기준 문구
- ✅ 문의 감소 체감 시작

---

**다음 단계: Sprint 3 - 대관(Facility) 토글 UI**

