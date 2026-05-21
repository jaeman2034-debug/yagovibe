# 🧪 QA 자동화 & 시뮬레이터

**자동 품질 보증 시스템**

---

## 🚨 중요: 엔드포인트 설정

### 프로덕션 엔드포인트 (배포 후)
```bash
STEP_ENDPOINT=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/voiceStep npm run test
```

### 로컬 엔드포인트 (Firebase Emulator)
```bash
# 1. Firebase Emulator 시작
cd ../functions
npm run serve

# 2. 다른 터미널에서 테스트 실행
cd ../tests
STEP_ENDPOINT=http://localhost:5001/yago-vibe-spt/asia-northeast3/voiceStep npm run test
```

### 커스텀 엔드포인트
```bash
STEP_ENDPOINT=https://your-custom-endpoint.com/v1/voice/step npm run test
```

---

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
cd tests
npm install
```

### 2. 테스트 실행

#### 로컬 (Firebase Emulator)
```bash
# 터미널 1: Emulator 시작
cd ../functions
npm run serve

# 터미널 2: 테스트 실행
cd ../tests
STEP_ENDPOINT=http://localhost:5001/yago-vibe-spt/asia-northeast3/voiceStep npm run test
```

#### 프로덕션 (배포 후)
```bash
cd tests
npm run test
```

### 3. 결과 확인

```bash
# results.json 확인
cat results.json

# 리포트 출력 (자동)
npm run test
```

---

## 📊 테스트 케이스 포맷

### `cases.json`

```json
[
  {
    "id": "nav_basic",
    "input": "강남역 카페 안내해줘",
    "expect": { "kind": "OPEN_NAVIGATE" }
  },
  {
    "id": "ref_repeat",
    "memory": "0. 강남역 카페 -> A카페 서울시 강남구...",
    "input": "아까 그 데 다시",
    "expect": { "kind": "OPEN_NAVIGATE" }
  }
]
```

**필드**:
- `id`: 고유 식별자
- `input`: 입력 텍스트
- `memory`: 메모리 요약 (선택)
- `expect.kind`: 예상 결과 (`OPEN_SEARCH` | `OPEN_NAVIGATE` | `NOOP`)

---

## 🚨 레드라인 규칙

**이 중 하나라도 걸리면 배포 금지**

### 1. Fail Rate
- **임계값**: 1%
- **의미**: 100개 중 1개 이상 실패 시 차단

### 2. P95 Latency
- **임계값**: 1200ms
- **의미**: 95% 요청이 1.2초 이내 완료되어야 함

### 3. Fallback Rate
- **임계값**: 10%
- **의미**: Fallback 사용률이 10% 초과 시 차단

---

## 📈 결과 해석 가이드

### Fail Rate 증가
- **원인**: Agent 프롬프트/enum 문제
- **해결**: Agent 프롬프트 조정 또는 enum 추가

### Latency 증가
- **원인**: LLM/Places timeout
- **해결**: 타임아웃 상향 조정 또는 최적화

### Fallback Rate 증가
- **원인**: 조건 완화 순서 문제
- **해결**: 쿼리 완화 순서 재조정

---

## 🔧 테스트 케이스 확장

### 확장 케이스 생성

```bash
# 140개 케이스 자동 생성
npx tsx generate-cases.ts

# 생성된 케이스로 테스트
CASES_PATH=./cases-extended.json npm run test
```

### 카테고리별 권장 개수

1. **기본 검색/안내** (30개)
2. **조건 조합** (30개)
3. **지시어** (30개)
4. **애매한 말** (30개)
5. **오류 유도** (20개)
6. **엣지 케이스** (30개)

**총 170개 이상 권장**

---

## 🔄 CI 연동

### GitHub Actions

`.github/workflows/qa.yml`이 자동으로 실행됩니다.

**실패 시 PR 머지 불가**

---

## 📝 실행 옵션

### 환경 변수

- `CASES_PATH`: 테스트 케이스 파일 경로 (기본: `tests/cases.json`)
- `STEP_ENDPOINT`: 서버 엔드포인트 URL (필수)
- `OUTPUT_PATH`: 결과 파일 경로 (기본: `tests/results.json`)

### 예시

```bash
# 커스텀 케이스 파일
CASES_PATH=tests/cases-extended.json STEP_ENDPOINT=http://localhost:5001/yago-vibe-spt/asia-northeast3/voiceStep npm run test

# 커스텀 출력 경로
OUTPUT_PATH=tests/results-prod.json STEP_ENDPOINT=https://your-endpoint.com npm run test
```

---

## 🎯 QA 체크리스트

### 배포 전 확인
- [ ] Firebase Functions 배포 완료
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

## 🐛 문제 해결

### HTTP 404 에러
**원인**: 엔드포인트가 배포되지 않았거나 URL이 잘못됨

**해결**:
1. Firebase Functions 배포 확인
   ```bash
   cd ../functions
   firebase deploy --only functions:voiceStep
   ```

2. 로컬 Emulator 사용
   ```bash
   cd ../functions
   npm run serve
   
   # 다른 터미널
   cd ../tests
   STEP_ENDPOINT=http://localhost:5001/yago-vibe-spt/asia-northeast3/voiceStep npm run test
   ```

### 타임아웃 에러
**원인**: 응답 시간이 너무 김

**해결**: 타임아웃 상향 조정 또는 최적화

### 모든 케이스 실패
**원인**: 엔드포인트 URL 오류 또는 서버 오류

**해결**: 엔드포인트 URL 확인 및 서버 로그 확인

---

## 📊 결과 리포트 예시

```
=== QA 리포트 ===
총 테스트: 200
✅ 통과: 198
❌ 실패: 2
실패율: 1.00%

⚡ Latency:
  평균: 850.50ms
  P95: 1180.00ms
  P99: 1250.00ms

🛡️ Fallback 비율: 5.50%

=== 레드라인 체크 ===
✅ Fail Rate: 1.00 (임계값: 1.0)
✅ P95 Latency: 1180.00 (임계값: 1200)
✅ Fallback Rate: 5.50 (임계값: 10.0)

=== 최종 결과 ===
✅ QA PASSED
```

---

**이 시스템으로 배포 전 자동 검증 완료**

**"느낌상 괜찮음" 제거**
