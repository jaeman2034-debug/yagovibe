# 🏗️ 축구 허브 2.0 설계서 (구조 탄탄 모드)

## 📋 설계 원칙

### 원칙 A – 모든 기능은 모듈 단위
- Story 관련 로직은 `domain/` 밖으로 안 새어 나감
- UI는 엔진을 모름
- 데이터는 엔진만 앎

### 원칙 B – 관리자 없어도 안 터짐
- seed = 생명줄
- guard = 안전망
- mixEngine = 자동 편성

### 원칙 C – "축구 허브"는 플랫폼
- 팀/마켓/구장은 독립
- 스토리 존은 게이트

---

## 🎯 확정 운영 정책

### 1. 스토리 입력 주체
- ✅ **협회 계정 + 관리자** (사용자도 작성 가능, 검수 필수)
- 관리자: 즉시 발행
- 협회: 즉시 발행 (신뢰도 높음)
- 사용자: pending → 관리자 승인 또는 자동 승인 (score >= 50)

### 2. 사용자 콘텐츠 검증
- ✅ **둘 다** (좋아요 기반 + 관리자 승인)
- 자동 승인: score >= 50 (검증된 작성자는 +20 보너스)
- 관리자 승인: 모든 사용자 콘텐츠는 초기 pending

### 3. 대회 데이터
- ✅ **직접 입력** (초기)
- 이후 협회 연동 확장 가능

---

## 🏛️ 아키텍처 구조

```
/features/sportHub/
  domain/
    story.types.ts              ✅ 모델
    story.cta.ts                ✅ CTA 규칙
    story.guard.ts              ✅ 품질 가드
    story.engine.ts             ✅ 혼합 D 엔진
    story.router.ts             ✅ 라우팅
    story.admin.types.ts        ✅ Admin 스키마
    story.api.contract.ts       ✅ API 계약
    story.season.detector.ts    ✅ 시즌 판정
    story.operation.rules.ts    ✅ 운영 규칙
  data/
    story.seed.ts               ✅ 초기 데이터
  components/
    StoryZone.tsx               (기존)
    ActionGrid.tsx              ✅ 구조 탄탄
```

---

## 🔐 권한 매트릭스

| 역할 | 생성 | 즉시 발행 | 검수 필요 |
|------|------|----------|----------|
| 관리자 | ✅ | ✅ | ❌ |
| 협회 | ✅ | ✅ | ❌ |
| 사용자 | ✅ | ❌ | ✅ |

---

## 📊 우선순위 규칙

- 운영: 80~100
- 협회: 70~95
- 사용자: 0~50 (score 기반)

---

## 🎲 혼합 D 엔진 규칙

### 기본 모드
- 운영 2개
- 협회 1개
- 사용자 1개 (score >= 50 또는 검증된 작성자)

### 시즌 모드
- 협회 2개
- 운영 1개
- 사용자 1개

---

## 🚀 다음 단계

1. StoryZone → 새 도메인 레이어 연결
2. API 클라이언트 구현
3. Admin UI 최소판
