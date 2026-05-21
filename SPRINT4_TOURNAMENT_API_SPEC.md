# Sprint 4: Tournament API 스펙

## API 엔드포인트 요약

### 1. 참가 신청
```
POST /api/tournaments/:tournamentId/entries
Body: {
  teamId: string
}
Response: {
  entryId: string
  status: EntryStatus
}
```

### 2. 참가비 확인
```
POST /api/entries/:entryId/confirm-fee
Response: {
  entryId: string
  status: 'confirmed'
}
```

### 3. 선수 명단 제출
```
POST /api/entries/:entryId/roster
Body: {
  players: TournamentPlayer[]
}
Response: {
  entryId: string
  playerListSubmitted: true
}
```

### 4. 대진표 확정
```
POST /api/tournaments/:tournamentId/confirm-bracket
Response: {
  tournamentId: string
  bracketStatus: 'confirmed'
}
```

### 5. 대진표 조회
```
GET /api/tournaments/:tournamentId/bracket
Response: {
  status: BracketStatus
  bracketUrl?: string
}
```

### 6. 징계 로그 조회
```
GET /api/tournaments/:tournamentId/discipline-logs
Response: DisciplineLog[]
```

## 상태 전이 로직

### Entry 상태 전이
```
none → applied → fee_pending → confirmed

조건:
- 참가비 0원: applied → confirmed (자동)
- 참가비 있음: applied → fee_pending → confirmed (입금 확인 필요)
- 반려: applied/rejected (Admin)
```

### Bracket 상태 전이
```
preparing → confirmed (Admin 버튼)
- confirmed만 '공식'
- 되돌리기 ❌
```

## 검증 규칙

### 참가 신청
- 회원 로그인 필수
- 회비 납부 필수
- registrationOpen === true
- 중복 신청 불가

### 선수 명단
- KFA ID 검증 필수
- 제출 후 수정 불가 (Admin만 가능)
- 참가 확정 후 제출 가능

### 대진표
- Admin만 확정 가능
- 확정 후 되돌리기 불가

