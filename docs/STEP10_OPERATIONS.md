# 🛡️ STEP 10 — 운영/스케일 패키지

**프로덕션 하드닝 완료**

---

## ✅ 구현 완료 항목

### 1. 비용 상한 고정

- [x] `/v1/voice/step` 2.5초 타임아웃 + 디그레이드
- [x] Places API 재시도 최대 2회 (총 3회)
- [x] 비용 추정 시스템

**비용 구조**:
- **일반 SEARCH**: LLM 1회 + Places 0회 = ~$0.001
- **NAVIGATE**: LLM 1회 + Places 1~3회 = ~$0.018 ~ $0.052
- **평균** (SEARCH 70% + NAVIGATE 30%): ~$0.016/명령

---

### 2. Rate Limit / 장애 복구

- [x] 429/503 백오프 재시도 (최대 3회)
- [x] Exponential Backoff with Jitter
- [x] 재시도 실패 시 SEARCH fallback

**재시도 정책**:
- **429 (Rate Limit)**: 자동 재시도
- **503 (Service Unavailable)**: 자동 재시도
- **기타 에러**: 즉시 fallback

---

### 3. 키/보안 운영

- [x] API 키 검증 시스템
- [x] 환경별 키 분리 (dev/staging/prod)
- [x] Firebase Functions Secrets 사용

**보안 규칙**:
- **OPENAI_API_KEY**: 서버만 (Firebase Functions Secrets)
- **GMAPS_API_KEY**: 서버만 (IP/HTTP referrer 제한)
- **키 회전**: 주기적 교체 프로세스 필요

---

### 4. 데이터/프라이버시

- [x] 프로덕션 로그 최소화
- [x] 개발 환경에서만 풀 디버그
- [x] 원문 음성/오디오 저장 금지

**로그 정책**:
- **프로덕션**: 필수 정보만 (action, fallback, latency, success)
- **개발**: 풀 디버그 정보
- **개인정보**: 마스킹 처리 (필요 시)

---

### 5. 관측성 (Observability)

- [x] 최소 로그 스키마 구현
- [x] Session ID 추적
- [x] Latency 추적 (LLM, Places, Total)

**로그 스키마**:
```json
{
  "ts": 0,
  "sessionId": "...",
  "finalText": "...",
  "agentAction": "SEARCH|NAVIGATE|...",
  "fallback": "none|rate_limit|places_quota|timeout|...",
  "llmLatencyMs": 0,
  "placesLatencyMs": 0,
  "totalLatencyMs": 0,
  "success": true
}
```

---

### 6. 운영 디그레이드

- [x] 절대 NOOP 금지
- [x] NAVIGATE 실패 → SEARCH 전환
- [x] Places 쿼터/실패 → SEARCH 전환
- [x] LLM 실패 → SEARCH(raw) 전환

**디그레이드 우선순위**:
1. **NAVIGATE 성공** → 최고
2. **NAVIGATE 실패** → SEARCH로 전환
3. **Places 쿼터/실패** → SEARCH로 전환
4. **LLM 실패** → SEARCH(raw)로 전환
5. **완전 막힘** → Ultimate Fallback

---

## 🧠 핵심 설계 원칙

### 1. 비용 고정
- LLM 호출 1회로 고정
- Places 호출 최대 3회로 제한
- 타임아웃으로 무한 대기 방지

### 2. Rate Limit 대응
- Exponential Backoff with Jitter
- 429/503만 재시도
- 재시도 실패 시 fallback

### 3. 보안 강화
- 키 하드코딩 금지
- 환경별 키 분리
- 주기적 키 회전

### 4. 관측성
- 최소 로그 스키마
- Session ID 추적
- Latency 추적

### 5. 디그레이드
- 절대 NOOP 금지
- 모든 경로에서 실행 보장
- 사용자는 실패를 느끼지 못함

---

## 📊 모니터링 KPI

### 주간 확인
- **Action 분포**: SEARCH vs NAVIGATE
- **Fallback 비율**: < 5% 목표
- **P95 latency**: < 1200ms 목표
- **에러율**: < 1% 목표

### 월간 확인
- **비용 추정 vs 실제**: 비용 추적
- **API 키 회전**: 보안 강화
- **로그 보관 정책**: 프라이버시 준수

---

## 🚨 장애 대응

### Rate Limit 발생 시
1. 자동 재시도 (Exponential Backoff)
2. 실패 시 SEARCH fallback
3. 사용자 체감 0

### Places 쿼터 초과 시
1. SEARCH로 자동 디그레이드
2. 쿼터 알림 확인
3. 필요 시 쿼터 상향 조정

### 타임아웃 발생 시
1. SEARCH로 즉시 디그레이드
2. 로그 확인 (latency 분석)
3. 필요 시 타임아웃 상향 조정

---

## 📝 배포 체크리스트

### 환경 변수 설정
```bash
# Firebase Functions Secrets
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set GMAPS_API_KEY

# 환경 설정
NODE_ENV=production
```

### API 키 제한 설정
- **OpenAI**: 사용량 모니터링 설정
- **Google Places**: 쿼터 알림 설정 (80% 경고)

### 테스트
- [ ] Rate Limit 시뮬레이션
- [ ] 타임아웃 시뮬레이션
- [ ] Places 쿼터 초과 시뮬레이션

---

**이 체크리스트를 완료하면 프로덕션 수준입니다.**

**트래픽이 늘어도 비용/장애가 예측 가능합니다.**
