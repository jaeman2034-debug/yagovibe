# 🏗️ 축구 허브 2.0 규격서

## 📋 확정 운영 정책

### Q1. 사용자 글 → 바로 노출?
**✅ 3. 점수 기반 자동**
- score >= 50: 자동 승인
- 검증된 작성자: +20 보너스
- 초기 상태: pending (관리자 승인 또는 자동 승인)

### Q2. 스토리 개수
**✅ 2. 5개**
- 혼합 D 엔진 maxSlots: 5
- 기본: 운영 2 + 협회 1 + 사용자 1 (+ 빈칸 채우기)

### Q3. 관리자 도구
**✅ 1. 웹**
- 초기: 웹 인터페이스
- 확장: 엑셀 업로드 가능

---

## 🏛️ 데이터 생애주기

```
작성 → 검증 → 편성 → 노출 → 성과 → 재편성
```

### 상태 모델
- `DRAFT`: 초안
- `PUBLISHED`: 발행됨
- `EXPIRED`: 만료됨
- `REJECTED`: 거부됨

---

## 🔄 편성 파이프라인

1. **유효성 검증**: isUsableStory, 만료 확인, 상태 확인
2. **출처 가중치**: 우선순위 설정 (운영 80-100, 협회 70-95, 사용자 0-50)
3. **품질 필터**: 사용자 스토리 자동 승인 가능 여부
4. **슬롯 배정**: 우선순위 정렬 후 최대 5개 선택

---

## 📊 KPI 로그

### 이벤트 타입
- `impression`: 노출
- `click`: 클릭
- `route`: 라우팅 완료

### 로그 스키마
```typescript
{
  storyId: string;
  event: StoryEvent;
  timestamp: number;
  metadata?: {
    category?: string;
    source?: string;
    route?: string;
    userId?: string;
  };
}
```

---

## 🎯 역할 분리

- **운영(C)**: 기본 뼈대 (priority 80-100)
- **협회(B)**: 공식성 (priority 70-95)
- **사용자(A)**: 확장 (score 기반, 자동 승인 가능)

---

## 🛡️ 장애 대비

- **seed 폴백**: 데이터 없을 때 기본 스토리 3개
- **guard**: 품질 가드 (제목/서브타이틀 길이 제한)
- **자동 편성**: 파이프라인으로 자동 편성

---

## 📁 아키텍처 구조

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
    story.status.model.ts       ✅ 상태 모델
    story.pipeline.ts           ✅ 편성 파이프라인
    story.kpi.log.ts            ✅ KPI 로그
  data/
    story.seed.ts               ✅ 초기 데이터
  components/
    StoryZone.tsx               (기존)
    ActionGrid.tsx              ✅ 구조 탄탄
```

---

## 🚀 다음 단계

1. StoryZone → 파이프라인 연결
2. KPI 로그 수집 시작
3. Admin 웹 인터페이스
