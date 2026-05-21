# 🤖 콘텐츠/카피 자동 검수 룰

## 📋 목적
사람이 안 봐도 걸러지는 마지막 장치

---

## 🎯 원칙

### 검수 목표

- 자동화된 검수
- 실수 방지
- 일관성 확보
- 철학 유지

---

### 톤 가이드

- 명확함
- 자동화
- 실용성
- 신뢰성

---

## 0️⃣ 적용 범위

- 자동 블로그 글
- 랜딩/FAQ/가이드 카피
- 공유 카드 문구
- 관리자 알림 문구

**발행 전·후 모두 적용 가능**

---

## 자동 검수의 핵심

**사람이 안 봐도 걸러지는 마지막 장치**

- ❌ 수동 검수 의존
- ⭕ 자동화된 검수
- ⭕ 정규식 기반
- ⭕ 체크 로직 포함

---

## 1️⃣ 검수 레벨 정의

```typescript
type ReviewLevel = "block" | "warn" | "pass";
```

- **block**: 즉시 차단 (발행 불가)
- **warn**: 발행 가능하나 로그 기록
- **pass**: 문제 없음

---

## 2️⃣ 금지어 차단 룰 (block)

### A. 홍보/마케팅 냄새

```javascript
/(홍보|마케팅|노출|유입|광고|캠페인|전환율)/i
```

### B. 성과·성공 과장

```javascript
/(성공|폭발|급증|확실|보장|최고|1위)/i
```

### C. 강요/압박 CTA

```javascript
/(지금\s?바로|놓치지|꼭\s?필요|필수|서두르)/i
```

**👉 매칭 시: block**

---

## 3️⃣ 주의어 경고 룰 (warn)

### A. 속도/즉시성

```javascript
/(즉시|바로|빠르게|곧바로)/i
```

### B. AI 과시

```javascript
/(AI|인공지능|머신러닝|딥러닝)/i
```

### C. 경쟁/비교

```javascript
/(다른\s?팀|보다\s?낫|상위|랭킹)/i
```

**👉 매칭 시: warn + 관리자 로그**

---

## 4️⃣ 문체 안정성 체크 (warn)

### 느낌표 과다

```javascript
/!{2,}/
```

### 감탄사 남용

```javascript
/(와우|대박|정말|너무)/i
```

---

## 5️⃣ 필수 안전 문구 체크 (pass 조건)

아래 중 1개 이상 포함 시 가산점 (없어도 차단 ❌)

```javascript
/(기록이\s?쌓이|자동으로\s?정리|무리하지\s?않고|있는\s?그대로)/i
```

**📌 목적**
**→ 톤 보정**

---

## 6️⃣ 길이·구조 검수 (warn)

```javascript
if (length < 300 || length > 1500) warn()
```

- 300자 미만 → warn (정보 부족)
- 1,500자 초과 → warn (장황)

---

## 7️⃣ 종합 판정 로직

```javascript
function reviewContent(text) {
  if (match(blockRegex)) return "block"
  if (match(warnRegex)) return "warn"
  return "pass"
}
```

### 후처리

- **block** → 자동 수정 시도 ❌ / 관리자 알림
- **warn** → 발행 + 로그
- **pass** → 자동 발행

---

## 8️⃣ 공유 카드 전용 추가 룰

### 금지

```javascript
/(참여|가입|신청|문의)/i
```

**👉 block**

### 필수

날짜 OR 기록성 단어 포함

```javascript
/(\d{1,2}월|\d{1,2}일|기록|모임|경기)/
```

---

## 9️⃣ 운영 로그 예시

```json
{
  "content_id": "post_2031",
  "result": "warn",
  "matched": ["즉시"],
  "action": "published_with_log"
}
```

**📌 수정하지 말고 기록만 남김**

---

## 3️⃣ 사용 예시

### 예시 1: 통과하는 텍스트

```javascript
const text1 = "활동을 자동으로 기록합니다. 기록이 쌓이고, 공개 페이지가 만들어집니다.";

const result1 = checkContent(text1);
// { isValid: true, violations: [], message: '✅ 검수 통과' }
```

---

### 예시 2: 실패하는 텍스트

```javascript
const text2 = "AI가 자동으로 홍보해줍니다. 성공 사례가 많고, 지금 시작하세요!";

const result2 = checkContent(text2);
// {
//   isValid: false,
//   violations: [
//     { category: 'marketing', matches: ['홍보'], count: 1 },
//     { category: 'success', matches: ['성공'], count: 1 },
//     { category: 'pressure', matches: ['지금 시작'], count: 1 }
//   ],
//   message: '❌ 3개 카테고리에서 금지 표현 발견'
// }
```

---

## 4️⃣ CI/CD 통합

### GitHub Actions 예시

```yaml
name: Content Review

on:
  pull_request:
    paths:
      - '**/*.md'
      - '**/*.tsx'
      - '**/*.ts'

jobs:
  content-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Content Review
        run: |
          npm run content-review
          if [ $? -ne 0 ]; then
            echo "❌ 콘텐츠 검수 실패"
            exit 1
          fi
```

---

## 5️⃣ npm 스크립트

### package.json

```json
{
  "scripts": {
    "content-review": "node scripts/content-review.js",
    "content-review:watch": "node scripts/content-review.js --watch"
  }
}
```

---

## 6️⃣ 검수 결과 리포트

### 리포트 형식

```javascript
{
  "file": "src/components/TeamBlogCard.tsx",
  "line": 15,
  "text": "AI가 자동으로 홍보해줍니다",
  "violations": [
    {
      "category": "marketing",
      "pattern": "홍보",
      "suggestion": "활동을 기록합니다"
    },
    {
      "category": "ai",
      "pattern": "AI가",
      "suggestion": "자동으로"
    }
  ]
}
```

---

## 7️⃣ 대체 표현 제안

### 자동 제안 로직

```javascript
const suggestions = {
  marketing: {
    '홍보': '기록',
    '마케팅': '공개',
    '노출': '공개',
    '유입': '방문'
  },
  success: {
    '성공': '기록이 쌓인',
    '효과': '변화',
    '검증': '유지된',
    '성장': '쌓인'
  },
  // ... 더 많은 대체 표현
};

function suggestReplacement(violation) {
  return suggestions[violation.category]?.[violation.pattern] || null;
}
```

---

## 8️⃣ 검수 체크리스트 자동화

### 체크리스트 생성

```javascript
function generateChecklist(result) {
  const checklist = {
    '홍보/마케팅 단어 없음': !result.violations.some(v => v.category === 'marketing'),
    '결과 약속 문장 없음': !result.violations.some(v => v.category === 'success'),
    'AI 과시 없음': !result.violations.some(v => v.category === 'ai'),
    '비교/경쟁 없음': !result.violations.some(v => v.category === 'compare'),
    '선택권 강조 있음': checkVoluntaryLanguage(result.text)
  };

  return checklist;
}
```

---

## 🔟 내부 기준 문장 (최종 방어선)

```
이 문장은
기록을 설명하는가,
아니면 사람을 움직이려 하는가?

후자면 자동으로 걸러진다.
```

**"사람이 안 봐도 걸러지는 마지막 장치"**

**"이 문장은 기록을 설명하는가, 아니면 설득하려 하는가?"**

**"설득이면 삭제."**

---

## ✅ 완료 체크리스트

- [x] 금지 단어 정규식 패턴
- [x] 통합 검수 함수
- [x] 사용 예시
- [x] CI/CD 통합
- [x] npm 스크립트
- [x] 검수 결과 리포트
- [x] 대체 표현 제안
- [x] 검수 체크리스트 자동화
- [x] 내부 기준 문장

---

## 🚀 다음 단계

1. 검수 스크립트 구현
2. CI/CD 통합
3. 팀원 교육
4. 정기적 검수 실행

---

## 🎯 핵심 메시지

**"사람이 안 봐도 걸러지는 마지막 장치"**

**"이 문장은 기록을 설명하는가, 아니면 설득하려 하는가?"**

**"설득이면 삭제."**

