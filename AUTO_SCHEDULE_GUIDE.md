# 🤖 자동 주간·월간 생성 스케줄 안정화 가이드

## ✅ 구현 완료 사항

### 1️⃣ 주간 자동 생성 (`autoWeeklyTeamPost`)
- **스케줄**: 매주 월요일 03:00 KST
- **대상**: Pro 플랜 + 활성 상태 팀만
- **스킵 조건**:
  - 휴면 팀 (`status === "inactive"`)
  - 삭제된 팀 (`isDeleted === true`)
  - 무료 플랜
  - 블로그 미활성화
  - 이번 주 이미 생성됨
  - 활동 데이터 없음

### 2️⃣ 월간 자동 생성 (`autoMonthlyTeamPost`) - 신규 추가
- **스케줄**: 매월 1일 09:00 KST
- **대상**: Pro 플랜 + 활성 상태 팀만
- **생성 타입**: `growth_report` (성장 리포트)
- **스킵 조건**: 주간과 동일

### 3️⃣ 비용 상한선 체크
- **저장 위치**: `system/blog_generation_limits`
- **기본 한도**: 월 100건
- **자동 리셋**: 매월 1일
- **초과 시**: 조기 종료 (로그만 기록)

### 4️⃣ 실패 재시도 전략
- **일시적 오류**: 자동 재시도 트리거
  - `rate-limit` 에러
  - `temporary` 에러
  - `timeout` 에러
- **영구적 오류**: 조용히 스킵 (다른 팀에 영향 없음)

### 5️⃣ 휴면 팀 자동 스킵
- `team.status === "inactive"` 체크
- `team.isDeleted === true` 체크
- 쿼리 레벨에서 필터링 (성능 최적화)

---

## 📊 운영 안정 체크리스트

### ✅ 완료된 항목
- [x] 무료 플랜 팀 자동 스킵
- [x] 휴면 팀 자동 스킵
- [x] 팀당 1회 생성 보장 (idempotency)
- [x] 비용 상한선 체크
- [x] 실패 재시도 전략
- [x] 월간 스케줄러 추가

### 🔍 모니터링 필요 항목
- [ ] 429/403 로그 모니터링
- [ ] 월간 비용 상한선 확인
- [ ] 생성 성공률 추적
- [ ] 팀별 생성 빈도 추적

---

## 🚀 배포 후 확인사항

### 1. 스케줄러 상태 확인
```bash
# Firebase Console에서 확인:
# Functions > autoWeeklyTeamPost
# Functions > autoMonthlyTeamPost
# 상태: "Active" ✅
```

### 2. 비용 한도 초기화 (필요시)
```javascript
// Firestore Console에서 수동 설정:
// 경로: system/blog_generation_limits
{
  monthlyLimit: 100,  // 월간 한도
  currentMonth: 0,    // 현재 월 생성 수
  resetDate: Timestamp, // 리셋 날짜
  lastUpdated: Timestamp
}
```

### 3. 로그 모니터링
```bash
# 주간 스케줄러 로그
firebase functions:log --only autoWeeklyTeamPost

# 월간 스케줄러 로그
firebase functions:log --only autoMonthlyTeamPost
```

---

## 📈 예상 동작 시나리오

### 주간 스케줄러 (매주 월요일 03:00)
1. Pro 플랜 + 활성 팀 조회
2. 휴면/삭제 팀 스킵
3. 이번 주 이미 생성된 팀 스킵
4. 활동 데이터 확인 (출석/일정)
5. 조회수 기반 자동 주제 결정
6. AI 생성 실행
7. 성공 시 비용 카운터 증가

### 월간 스케줄러 (매월 1일 09:00)
1. Pro 플랜 + 활성 팀 조회
2. 휴면/삭제 팀 스킵
3. 이번 달 이미 생성된 팀 스킵
4. 지난 달 활동 데이터 확인
5. `growth_report` 타입으로 생성
6. 성공 시 비용 카운터 증가

---

## 🔧 비용 한도 조정

### 한도 증가
```javascript
// Firestore Console에서 수정:
// system/blog_generation_limits
{
  monthlyLimit: 200  // 100 → 200으로 증가
}
```

### 한도 초기화 (긴급)
```javascript
// Firestore Console에서 수정:
// system/blog_generation_limits
{
  currentMonth: 0  // 현재 월 생성 수 리셋
}
```

---

## 🚨 문제 발생 시 대응

### 1. 비용 한도 초과
- **증상**: 로그에 "월간 생성 한도 초과" 메시지
- **대응**: `monthlyLimit` 증가 또는 `currentMonth` 리셋

### 2. 특정 팀만 실패
- **증상**: 로그에 특정 팀 ID 실패 메시지
- **대응**: 해당 팀의 블로그 설정/활동 데이터 확인

### 3. 전체 실패
- **증상**: 로그에 "전체 작업 실패" 메시지
- **대응**: Functions 로그 확인, OpenAI API 키 확인

---

## 📝 다음 개선 가능 항목

1. **자동 생성 리포트 대시보드**
   - 성공률/비용 추적
   - 팀별 생성 빈도

2. **팀별 비용 캡 (cap)**
   - 팀당 월간 생성 한도 설정

3. **콘텐츠 품질 점수 기반 재생성**
   - 조회수/반응 기반 자동 재생성

4. **A/B 프롬프트 실험 자동화**
   - 프롬프트 버전별 성과 비교

---

**작성일**: 2024년
**상태**: ✅ 구현 완료

