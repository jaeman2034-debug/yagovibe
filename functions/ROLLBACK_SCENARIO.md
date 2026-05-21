# 🔄 updateTournamentPhaseCallable 비상 롤백 시나리오 & 체크리스트

## 🎯 목적

- 배포 후 문제 발생 시 원인 분석 전에 서비스 안정화
- 운영/개발 누구라도 5분 안에 동일한 대응 가능
- "되돌릴 수 없는 상태 전이"로 인한 확산 방지

---

## 1️⃣ 즉시 판단 규칙 (30초)

아래 중 하나라도 해당되면 롤백 절차 진입:

- [ ] **Phase가 예상과 다르게 2단계 이상 점프**
- [ ] **승인 팀 0인데 ROSTER_LOCKED 이상**
- [ ] **phaseEvents가 짧은 시간에 2건 이상**
- [ ] **관리자가 "버튼 눌렀는데 상태가 이상함" 보고**

👉 **원인 분석 금지. 바로 안정화부터.**

---

## 2️⃣ 즉시 안정화 (1분)

### A. Phase 변경 차단

**방법 1: Callable 임시 비활성화**
```typescript
// updateTournamentPhaseCallable.ts 최상단에 추가
if (process.env.DISABLE_PHASE_UPDATE === "true") {
  throw new HttpsError("unavailable", "시스템 점검 중입니다.");
}
```

**방법 2: Feature Flag (Firestore)**
```typescript
const featureFlag = await db.doc("config/featureFlags").get();
if (featureFlag.data()?.disablePhaseUpdate === true) {
  throw new HttpsError("unavailable", "시스템 점검 중입니다.");
}
```

**목적**: 더 이상 상태가 바뀌지 않게 고정

### B. 운영자 안내

**관리자 화면 공지**:
```
"시스템 점검 중입니다. 단계 변경이 일시 중단되었습니다."
```

❌ **"잠시만 기다려주세요" 같은 모호한 문구 금지**

---

## 3️⃣ 상태 스냅샷 확보 (1분)

아래 4가지만 즉시 기록:

1. **tournamentPhase**: 현재 Phase
2. **phaseVersion**: 현재 버전
3. **approvedCount**: 승인 팀 수
4. **최근 phaseEvents 3건**: from/to/actor/time

**이 정보만 있으면 사후 분석 100% 가능**

---

## 4️⃣ 롤백 전략 선택 (상황별)

### 🟢 케이스 A: Phase는 정상, 오류만 발생

**조치**:
- Callable 이전 안정 버전으로 코드 롤백
- DB 수정 ❌

**위험도**: 낮음

---

### 🟡 케이스 B: Phase 1단계 잘못 전이

**예**: 승인 팀 0인데 ROSTER_LOCKED

**조치**:
- DB 직접 수정은 원칙적으로 금지
- 임시 대응:
  - Phase 변경 기능 차단
  - 해당 토너먼트 운영 중지 공지
- 사후:
  - 내부 스크립트로 단 1회 복구

---

### 🔴 케이스 C: 다수 토너먼트 영향

**조치**:
- Callable 전면 차단
- 배포 즉시 롤백
- 운영 공지 발송
- 이후:
  - Stats / FSM / phaseEvents 무결성 점검 스크립트 실행

---

## 5️⃣ 절대 금지 사항 ❌

1. **운영 중 DB 콘솔에서 phase 수동 변경**
2. **phaseEvents 삭제**
3. **Stats 값 "눈대중 수정"**

**이 3가지는 문제를 영구 미제 사건으로 만든다.**

---

## 📋 롤백 전 체크리스트 (1분)

### 1. 현재 상태 확인 (30초)
```bash
# 현재 배포 버전 확인
firebase functions:list | grep updateTournamentPhase

# Git 태그 확인
git tag --list | grep updateTournamentPhase

# 영향받은 대회 수 확인 (GCP Logs)
# resource.labels.function_name="updateTournamentPhaseCallable"
# severity>=ERROR
```

### 2. 이전 버전 확인 (30초)
```bash
# 이전 커밋 확인
git log --oneline -5 functions/src/tournament/updateTournamentPhase.ts

# 이전 태그 확인
git tag --list | tail -5
```

---

## 🔄 롤백 절차 (3분)

### Step 1: 이전 버전으로 체크아웃 (30초)
```bash
# 이전 커밋 해시 확인
PREVIOUS_COMMIT=$(git log --oneline -2 functions/src/tournament/updateTournamentPhase.ts | tail -1 | cut -d' ' -f1)

# 이전 버전으로 체크아웃
git checkout $PREVIOUS_COMMIT functions/src/tournament/updateTournamentPhase.ts
```

### Step 2: 빌드 및 배포 (2분)
```bash
cd functions
npm run build
firebase deploy --only functions:updateTournamentPhaseCallable
```

### Step 3: 배포 확인 (30초)
```bash
# Functions 상태 확인
firebase functions:list | grep updateTournamentPhase

# 첫 번째 호출 테스트 (브라우저 콘솔)
# await test1_ConcurrentClick();
```

### Step 4: 원래 브랜치로 복귀 (선택)
```bash
git checkout main  # 또는 현재 브랜치
```

---

## 🔧 데이터 복구 (필요 시, 1분)

### Stats 문서 복구 (30초)
```typescript
// Cloud Functions 콘솔에서 실행
import { syncStatsFromTeams } from "./utils/tournamentStats";

await syncStatsFromTeams(associationId, tournamentId);
```

### Phase 수동 복구 (최후의 수단, 30초)
```
Firestore Console:
associations/{associationId}/tournaments/{tournamentId}
→ tournamentPhase: "ROSTER_LOCKED" (예시)
→ phaseVersion: 수동 증가
```

**⚠️ 주의**: Phase 수동 복구는 최후의 수단입니다.

---

## 6️⃣ 사후 점검 체크리스트 (안정화 후)

- [ ] **phaseEvents와 실제 phase 일치 여부**
- [ ] **approvedCount와 실제 APPROVED 팀 수 일치**
- [ ] **phaseVersion 단조 증가 확인**
- [ ] **동일 requestId replay 정상 여부**
- [ ] **알람 재발 여부 (24시간)**

---

## 📊 롤백 후 검증 (1분)

### 필수 확인 항목 (30초)
- [ ] Functions 상태: 정상
- [ ] 첫 번째 호출: 성공
- [ ] 에러 로그: 없음
- [ ] Critical 알람: 해소

### 검증 테스트 (30초)
```javascript
// 브라우저 콘솔에서 빠른 테스트
await test1_ConcurrentClick();  // 동시성 테스트
```

**전체 테스트는 나중에 실행 가능**

---

## 🎯 롤백 시나리오별 대응

### 시나리오 1: Phase Version 무결성 깨짐

**증상**:
- `phaseVersion`이 +2 이상 증가
- 중복 Phase Events 생성

**롤백 후 조치**:
1. 영향받은 대회의 `phaseVersion` 수동 조정
2. 중복 `phaseEvents` 삭제 (필요 시)
3. Stats 동기화

---

### 시나리오 2: Stats 데이터 손상

**증상**:
- `approvedCount < 0`
- `approvedCount`와 실제 팀 수 불일치

**롤백 후 조치**:
1. `syncStatsFromTeams` 함수로 즉시 동기화
2. 모든 대회에 대해 Stats 재계산
3. 이후 승인/거절 시 Stats 정상 업데이트 확인

---

### 시나리오 3: Phase Events 누락

**증상**:
- Phase 변경되었지만 `phaseEvents`에 로그 없음

**롤백 후 조치**:
1. 최근 Phase 변경 이력 확인
2. 누락된 이벤트 수동 생성 (필요 시)
3. 이벤트 로그 기록 로직 점검

---

### 시나리오 4: 서비스 중단

**증상**:
- Functions 호출 실패
- 타임아웃 발생

**롤백 후 조치**:
1. 즉시 롤백 배포
2. 서비스 복구 확인
3. 근본 원인 분석

---

## 📝 롤백 체크리스트 (5분 컷)

### 1분: 상태 확인
- [ ] 현재 배포 버전 확인
- [ ] 이전 버전 확인
- [ ] 영향 범위 파악

### 3분: 롤백 실행
- [ ] 이전 버전으로 체크아웃
- [ ] 빌드 및 배포
- [ ] 배포 상태 확인

### 1분: 검증
- [ ] 첫 번째 호출 테스트
- [ ] 에러 로그 확인
- [ ] 알람 해소 확인

**총 소요 시간: 5분**

---

## 🔍 롤백 원인 분석 (롤백 후)

### 필수 수집 정보
1. **에러 로그** (GCP Logs)
   - 에러 메시지
   - 스택 트레이스

2. **데이터 상태**
   - Phase Version 값
   - Stats 값
   - Phase Events 로그

3. **사용자 영향**
   - 영향받은 대회 수

---

## 🚀 롤백 후 재배포 (나중에)

### 재배포 전 필수 조건
- [ ] 근본 원인 해결
- [ ] 테스트 통과
- [ ] 코드 리뷰 완료

### 재배포 절차
1. 수정된 코드 배포
2. 모니터링 강화
3. 단계적 롤아웃 (선택)

---

## 📚 참고 문서

- `MONITORING_ALERTS.md`: 알람 기준
- `OPERATIONS_ADMIN_GUIDE.md`: 운영 가이드
- `PHASE_FSM_DIAGRAM.md`: FSM 다이어그램

---

## ✅ 최종 체크리스트 (롤백 완료 후)

- [ ] 서비스 정상 동작
- [ ] 데이터 무결성 확인
- [ ] 알람 해소
- [ ] 사용자 영향 최소화

**근본 원인 분석과 재발 방지 대책은 나중에 진행**

---

## 7️⃣ 운영팀에 전달할 최종 한 줄

**"문제 생기면 단계를 더 바꾸지 말고, 먼저 멈추고, 기록하고, 그 다음 고친다."**

---

## 🎯 핵심 요약

**"5분 컷: 1분 확인 → 3분 롤백 → 1분 검증"**

**패닉 없이, 체계적으로, 빠르게**
