# 🧪 STEP 11 — QA 자동화 & 시뮬레이터

**자동 품질 보증 시스템 완성**

---

## ✅ 구현 완료 항목

### 1. 테스트 케이스 포맷
- [x] JSON 포맷 정의
- [x] 기본 케이스 25개
- [x] 카테고리별 확장 가능

### 2. 시뮬레이터 스크립트
- [x] `run-sim.ts` 구현
- [x] 대량 테스트 실행
- [x] 결과 수집 및 분석

### 3. 레드라인 규칙
- [x] Fail Rate < 1%
- [x] P95 Latency < 1200ms
- [x] Fallback Rate < 10%

### 4. CI 연동
- [x] GitHub Actions 워크플로우
- [x] 자동 실행 및 리포트
- [x] 실패 시 PR 머지 차단

### 5. 테스트 케이스 생성기
- [x] `generate-cases.ts` 구현
- [x] 카테고리별 자동 생성
- [x] 140개 케이스 자동 생성

---

## 🚀 사용 방법

### 1. 테스트 실행

```bash
cd tests
npm install
npm run test
```

### 2. 커스텀 엔드포인트

```bash
STEP_ENDPOINT=https://your-endpoint.com/v1/voice/step npm run test
```

### 3. 확장 케이스 사용

```bash
# 케이스 생성
npx tsx generate-cases.ts

# 확장 케이스로 테스트
CASES_PATH=./cases-extended.json npm run test
```

---

## 📊 레드라인 규칙

### 1. Fail Rate
- **임계값**: 1%
- **의미**: 100개 중 1개 이상 실패 시 차단
- **체크**: `fail / total * 100 <= 1.0`

### 2. P95 Latency
- **임계값**: 1200ms
- **의미**: 95% 요청이 1.2초 이내 완료
- **체크**: `p95Latency <= 1200`

### 3. Fallback Rate
- **임계값**: 10%
- **의미**: Fallback 사용률이 10% 초과 시 차단
- **체크**: `fallbackCount / total * 100 <= 10.0`

---

## 📈 결과 해석 가이드

### Fail Rate 증가 → Agent 문제
- **증상**: Fail Rate > 1%
- **원인**: Agent 프롬프트/enum 문제
- **해결**:
  - Agent 프롬프트 조정
  - enum 추가 또는 수정
  - 테스트 케이스 재검증

### Latency 증가 → 성능 문제
- **증상**: P95 Latency > 1200ms
- **원인**: LLM/Places timeout
- **해결**:
  - 타임아웃 상향 조정 (최후의 수단)
  - Places 재시도 최적화
  - 쿼리 완화 순서 조정

### Fallback Rate 증가 → 복구 문제
- **증상**: Fallback Rate > 10%
- **원인**: 조건 완화 순서 문제
- **해결**:
  - 쿼리 완화 순서 재조정
  - Places 검색 최적화
  - Agent 필터 추출 정확도 향상

---

## 🔧 테스트 케이스 확장

### 카테고리별 권장 개수

1. **기본 검색/안내** (30개)
   - 일반적인 검색/안내 명령

2. **조건 조합** (30개)
   - 주차 + 영업중 + 가까운 조합

3. **지시어** (30개)
   - 아까/말고/다시 등 지시어 해석

4. **애매한 말** (30개)
   - "배고픈데", "조용한 데" 등 감정/상태 표현

5. **오류 유도** (20개)
   - 의미 없는 말, 빈 문자열 등

6. **엣지 케이스** (30개)
   - 매우 긴 텍스트, 특수문자 등

**총 170개 이상 권장**

---

## 🔄 CI/CD 통합

### GitHub Actions

```yaml
name: Voice Agent QA

on: [push, pull_request]

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:qa
        env:
          STEP_ENDPOINT: ${{ secrets.VOICE_STEP_ENDPOINT }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: qa-results
          path: tests/results.json
```

**실패 시 PR 머지 불가**

---

## 📝 배포 체크리스트

### 배포 전 확인
- [ ] 테스트 케이스 200개 이상
- [ ] Fail Rate < 1%
- [ ] P95 Latency < 1200ms
- [ ] Fallback Rate < 10%
- [ ] CI 통과

### 새 기능 추가 시
- [ ] 해당 기능 테스트 케이스 추가
- [ ] 레드라인 재확인
- [ ] CI 통과 확인

---

## 🎯 QA 성공 기준

### 정량 지표
- **Fail Rate**: 0~1%
- **P95 Latency**: 500~1200ms
- **Fallback Rate**: 0~10%

### 정성 지표
- **실패 케이스**: 명확한 원인 분석 가능
- **Latency 분포**: 일관성 있음
- **Fallback 분포**: 예측 가능한 패턴

---

## 🧠 천재 모드 핵심 교훈

1. **"느낌상 괜찮음" 제거**
   - 숫자로 판단
   - 레드라인으로 차단

2. **"망가질 법한 말" 많이 넣기**
   - 잘 되는 말보다 실패 케이스가 중요
   - 엣지 케이스 발견

3. **자동화 = 품질 보증**
   - 사람 QA 한계 극복
   - 일관성 있는 검증

---

**이 시스템으로 배포 전 자동 검증 완료**

**"느낌상 괜찮음" 제거**

**배포 품질 자동 보증**
