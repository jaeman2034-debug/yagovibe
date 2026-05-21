# Sprint 4: Tournament 실전 엔진 구현 시작

## ✅ 완료된 작업

### 1. 상태 머신 타입 정의

#### Tournament 상태
```typescript
TournamentStatus = 'upcoming' | 'ongoing' | 'ended'
```

#### 참가(팀) 상태
```typescript
EntryStatus = 'none' | 'applied' | 'fee_pending' | 'confirmed' | 'rejected'
```

#### 대진표 상태
```typescript
BracketStatus = 'preparing' | 'confirmed'
```

### 2. 데이터 타입 확장

- `Tournament` - 기존 유지
- `TournamentEntry` - 참가 신청 정보
- `TournamentPlayer` - 선수 정보 (KFA 검증)
- `DisciplineLog` - 징계 로그

### 3. 컴포넌트 생성

#### 참가 신청
- `TournamentEntryButton` - 참가 신청 버튼 (회원 조건 체크)

#### 참가비
- `FeeStatusDisplay` - 참가비 상태 표시 (납부 완료 / 확인 중)

#### 선수 명단
- `PlayerListForm` - 선수 명단 제출 폼 (KFA 검증)

#### 대진표
- `BracketConfirmButton` - 대진표 확정 버튼 (Admin)

### 4. 유틸리티

- `logDisciplineAction` - 징계 로그 기록

## 📋 다음 단계

1. Tournament 상세 페이지에 참가 신청 기능 통합
2. Admin Tournament 관리 페이지에 참가비 확인/대진표 확정 기능 추가
3. KFA API 연동 (실제 검증)
4. 참가 신청 API 구현
5. 선수 명단 제출 API 구현

## 🎯 핵심 플로우

### 참가 신청 플로우
1. 회원 로그인 + 회비 납부 확인
2. 참가 신청 → `applied`
3. 참가비 있음? → `fee_pending` / `confirmed`
4. 참가비 확인 → `confirmed`

### 선수 명단 제출
1. KFA ID 입력 → 검증
2. 선수 추가
3. 명단 제출 → 수정 불가

### 대진표 확정
1. Admin: 대진표 업로드/생성
2. [대진표 확정] 버튼 클릭
3. `bracketStatus = 'confirmed'`
4. Public: "공식 대진표" 표시

---

**진행 중: Tournament 실전 엔진 구현**

