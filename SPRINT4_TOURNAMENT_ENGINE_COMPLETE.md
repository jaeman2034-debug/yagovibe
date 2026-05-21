# Sprint 4: Tournament 실전 엔진 구현 완료

## ✅ 완료된 작업

### 1. 컴포넌트 트리 구조

#### Public (TournamentDetailPage)
- `EntrySection` - 참가 신청 섹션
- `RosterSection` - 선수 명단 섹션
- `BracketSection` - 대진표 섹션

#### Admin (AdminTournamentDetailPage)
- 참가 접수 토글
- 대진표 확정 버튼
- 징계 로그 뷰어

### 2. 상태 전이 로직

#### Entry 상태 전이
```
none → applied → fee_pending → confirmed
- 참가비 0원: applied → confirmed (자동)
- 참가비 있음: applied → fee_pending → confirmed (입금 확인 필요)
- 반려: rejected (Admin)
```

#### Bracket 상태 전이
```
preparing → confirmed (Admin 버튼)
- confirmed만 '공식'
- 되돌리기 ❌
```

### 3. 컴포넌트 구현

#### EntrySection
- 참가 신청 버튼 (조건 체크)
- 참가비 상태 표시
- 참가 확정 안내

#### RosterSection
- 선수 명단 제출 폼
- KFA 검증
- 제출 후 수정 불가 (Admin만)

#### BracketSection
- preparing: "대진표는 아직 확정되지 않았습니다."
- confirmed: "✔ 공식 대진표"

### 4. Admin 페이지

#### AdminTournamentDetailPage
- 참가 접수 토글
- 대진표 확정 버튼
- 징계 로그 뷰어

### 5. API 스펙 문서화

- POST /api/tournaments/:id/entries
- POST /api/entries/:id/confirm-fee
- POST /api/entries/:id/roster
- POST /api/tournaments/:id/confirm-bracket
- GET /api/tournaments/:id/bracket
- GET /api/tournaments/:id/discipline-logs

## 🎯 핵심 플로우 (확정)

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

## ✅ 완료 체크

- ✅ 회비 미납 자동 차단
- ✅ 참가비 상태 명확
- ✅ 선수 자격 자동 검증 (구조 완성)
- ✅ 대진표 '공식' 고정
- ✅ 징계 로그 자동 기록 (구조 완성)

---

**다음 단계: Sprint 5 - 회비/정산 시스템**

Phase 4-3 실질 완료.

