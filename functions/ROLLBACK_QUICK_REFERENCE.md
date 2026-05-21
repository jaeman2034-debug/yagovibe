# ⚡ 비상 롤백 빠른 참조 (5분 컷)

## 🎯 핵심 요약

**"5분 컷: 1분 확인 → 3분 롤백 → 1분 검증"**

---

## 🚨 롤백 트리거 (30초 판단)

### 즉시 롤백
- [ ] Critical 알람 지속
- [ ] `phaseVersion` +2 이상
- [ ] `approvedCount < 0`
- [ ] Functions 호출 실패

---

## 📋 롤백 절차 (3분)

### 1분: 상태 확인
```bash
# 현재 버전 확인
firebase functions:list | grep updateTournamentPhase

# 이전 커밋 확인
git log --oneline -2 functions/src/tournament/updateTournamentPhase.ts
```

### 3분: 롤백 실행
```bash
# 이전 버전으로 체크아웃
PREVIOUS_COMMIT=$(git log --oneline -2 functions/src/tournament/updateTournamentPhase.ts | tail -1 | cut -d' ' -f1)
git checkout $PREVIOUS_COMMIT functions/src/tournament/updateTournamentPhase.ts

# 빌드 및 배포
cd functions
npm run build
firebase deploy --only functions:updateTournamentPhaseCallable
```

### 1분: 검증
```bash
# Functions 상태 확인
firebase functions:list | grep updateTournamentPhase

# 첫 번째 호출 테스트 (브라우저 콘솔)
# await test1_ConcurrentClick();
```

---

## 🔧 데이터 복구 (필요 시, 1분)

### Stats 복구
```typescript
import { syncStatsFromTeams } from "./utils/tournamentStats";
await syncStatsFromTeams(associationId, tournamentId);
```

### Phase 수동 복구 (최후의 수단)
```
Firestore Console:
associations/{associationId}/tournaments/{tournamentId}
→ tournamentPhase: "ROSTER_LOCKED"
→ phaseVersion: 수동 증가
```

---

## ✅ 최종 체크리스트

- [ ] 서비스 정상 동작
- [ ] 데이터 무결성 확인
- [ ] 알람 해소

**근본 원인 분석은 나중에**

---

## 📚 상세 문서

- `ROLLBACK_SCENARIO.md`: 상세 롤백 시나리오
