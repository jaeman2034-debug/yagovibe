# 📊 팀 블로그 랜딩 페이지 - 이벤트 트래킹 스키마

## 📋 목적
GA/Amplitude 기준으로 방문 → CTA → 가입 → Pro 전환 퍼널을 추적하는 이벤트 스키마

---

## 1️⃣ 퍼널 구조

```
방문 (Page View)
  ↓
CTA 노출 (Impression)
  ↓
CTA 클릭 (Click)
  ↓
가입 요청 (Join Request)
  ↓
가입 승인 (Approval)
  ↓
Pro 전환 트리거 (Pro Trigger)
  ↓
Pro 결제 (Pro Purchase)
```

---

## 2️⃣ 이벤트 정의

### Page View 이벤트

**이벤트명:** `team_blog_view`

**트리거:**
- 공개 블로그 페이지 진입 시

**파라미터:**
```typescript
{
  teamId: string;
  teamSlug: string;
  teamName: string;
  userRole: 'guest' | 'member' | 'pending' | 'admin';
  source: 'direct' | 'search' | 'share' | 'referral';
  plan: 'free' | 'pro';
}
```

**예시:**
```javascript
track('team_blog_view', {
  teamId: 'abc123',
  teamSlug: 'soheul-60-fc',
  teamName: '소흘 60대 FC',
  userRole: 'guest',
  source: 'direct',
  plan: 'free'
});
```

---

### CTA Impression 이벤트

**이벤트명:** `team_blog_cta_impression`

**트리거:**
- CTA 버튼이 뷰포트에 진입 시 (Intersection Observer)

**파라미터:**
```typescript
{
  teamId: string;
  teamSlug: string;
  ctaLocation: 'hero' | 'conversion1' | 'conversion2' | 'sticky';
  ctaText: string;
  userRole: 'guest' | 'member' | 'pending' | 'admin';
  scrollPercent: number; // 스크롤 진행률
}
```

**예시:**
```javascript
track('team_blog_cta_impression', {
  teamId: 'abc123',
  teamSlug: 'soheul-60-fc',
  ctaLocation: 'hero',
  ctaText: '함께 운동하기',
  userRole: 'guest',
  scrollPercent: 0
});
```

---

### CTA Click 이벤트

**이벤트명:** `team_blog_cta_click`

**트리거:**
- CTA 버튼 클릭 시

**파라미터:**
```typescript
{
  teamId: string;
  teamSlug: string;
  ctaLocation: 'hero' | 'conversion1' | 'conversion2' | 'sticky';
  ctaText: string;
  userRole: 'guest' | 'member' | 'pending' | 'admin';
  scrollPercent: number;
  timeOnPage: number; // 페이지 체류 시간 (초)
}
```

**예시:**
```javascript
track('team_blog_cta_click', {
  teamId: 'abc123',
  teamSlug: 'soheul-60-fc',
  ctaLocation: 'hero',
  ctaText: '함께 운동하기',
  userRole: 'guest',
  scrollPercent: 5,
  timeOnPage: 12
});
```

---

### Join Request 이벤트

**이벤트명:** `team_blog_join_request`

**트리거:**
- 가입 요청 생성 성공 시

**파라미터:**
```typescript
{
  teamId: string;
  teamSlug: string;
  requestId: string;
  hasMessage: boolean;
  messageLength?: number;
  ctaLocation: 'hero' | 'conversion1' | 'conversion2' | 'sticky';
  timeOnPage: number;
  scrollPercent: number;
}
```

**예시:**
```javascript
track('team_blog_join_request', {
  teamId: 'abc123',
  teamSlug: 'soheul-60-fc',
  requestId: 'req_xyz789',
  hasMessage: true,
  messageLength: 45,
  ctaLocation: 'conversion1',
  timeOnPage: 45,
  scrollPercent: 30
});
```

---

### Join Request Duplicate 이벤트

**이벤트명:** `team_blog_join_request_duplicate`

**트리거:**
- 중복 가입 요청 시도 시

**파라미터:**
```typescript
{
  teamId: string;
  teamSlug: string;
  requestId: string;
  ctaLocation: string;
}
```

---

### Join Approval 이벤트

**이벤트명:** `team_blog_join_approval`

**트리거:**
- 관리자가 가입 요청 승인 시 (관리자 대시보드)

**파라미터:**
```typescript
{
  teamId: string;
  teamSlug: string;
  requestId: string;
  approvedBy: string; // 관리자 uid
  requestCreatedAt: number; // 요청 생성 시각 (타임스탬프)
  approvalDelay: number; // 승인까지 걸린 시간 (초)
}
```

---

### Pro Trigger Impression 이벤트

**이벤트명:** `team_blog_pro_trigger_impression`

**트리거:**
- Pro 전환 트리거 노출 시 (관리자만)

**파라미터:**
```typescript
{
  teamId: string;
  teamSlug: string;
  triggerType: 'first_post' | 'views_increase' | 'second_post_attempt' | 'join_requests_increase' | 'dashboard_entry';
  views?: number;
  clicks?: number;
  joinRequests?: number;
  plan: 'free' | 'pro';
}
```

**예시:**
```javascript
track('team_blog_pro_trigger_impression', {
  teamId: 'abc123',
  teamSlug: 'soheul-60-fc',
  triggerType: 'views_increase',
  views: 42,
  clicks: 11,
  plan: 'free'
});
```

---

### Pro Upgrade Click 이벤트

**이벤트명:** `team_blog_pro_upgrade_click`

**트리거:**
- "Pro 계속 사용하기" 버튼 클릭 시

**파라미터:**
```typescript
{
  teamId: string;
  teamSlug: string;
  triggerType: string;
  views?: number;
  clicks?: number;
  joinRequests?: number;
  plan: 'free';
}
```

---

### Pro Purchase 이벤트

**이벤트명:** `team_blog_pro_purchase`

**트리거:**
- Pro 결제 완료 시 (Stripe webhook)

**파라미터:**
```typescript
{
  teamId: string;
  teamSlug: string;
  plan: 'pro';
  price: number; // 19000
  currency: 'KRW';
  triggerType: string;
  daysSinceFirstPost?: number;
  totalViews?: number;
  totalClicks?: number;
}
```

---

## 3️⃣ 퍼널 분석 지표

### 전환율 계산

**CTA 클릭률 (CTR):**
```
CTR = team_blog_cta_click / team_blog_cta_impression
```

**가입 요청 전환율:**
```
Join Conversion Rate = team_blog_join_request / team_blog_cta_click
```

**가입 승인율:**
```
Approval Rate = team_blog_join_approval / team_blog_join_request
```

**Pro 전환율:**
```
Pro Conversion Rate = team_blog_pro_purchase / team_blog_pro_trigger_impression
```

---

## 4️⃣ 세그먼트 분석

### 사용자 세그먼트

**Guest 세그먼트:**
- `userRole === 'guest'`
- 첫 방문자
- 전환 목표: 가입 요청

**Member 세그먼트:**
- `userRole === 'member'`
- 기존 멤버
- 전환 목표: 재방문, 참여 유지

**Admin 세그먼트:**
- `userRole === 'admin'`
- 관리자
- 전환 목표: Pro 업그레이드

---

### 팀 세그먼트

**활발한 팀:**
- `status === 'active'`
- 최근 14일 이내 활동 있음

**모집 중 팀:**
- `status === 'recruiting'`
- 활동 없음 또는 멤버 수 < 최대 인원

---

## 5️⃣ 이벤트 우선순위

### P0 (필수)

1. `team_blog_view` - 페이지 방문
2. `team_blog_cta_click` - CTA 클릭
3. `team_blog_join_request` - 가입 요청
4. `team_blog_pro_purchase` - Pro 결제

### P1 (중요)

5. `team_blog_cta_impression` - CTA 노출
6. `team_blog_pro_trigger_impression` - Pro 트리거 노출
7. `team_blog_pro_upgrade_click` - Pro 업그레이드 클릭

### P2 (선택)

8. `team_blog_join_approval` - 가입 승인
9. `team_blog_join_request_duplicate` - 중복 요청

---

## 6️⃣ Amplitude 이벤트 구조

### 이벤트 그룹

**Navigation:**
- `team_blog_view`

**Engagement:**
- `team_blog_cta_impression`
- `team_blog_cta_click`
- `team_blog_join_request`

**Conversion:**
- `team_blog_join_approval`
- `team_blog_pro_trigger_impression`
- `team_blog_pro_upgrade_click`
- `team_blog_pro_purchase`

---

## 7️⃣ GA4 이벤트 구조

### 이벤트 카테고리

**page_view:**
- `team_blog_view`

**engagement:**
- `team_blog_cta_impression`
- `team_blog_cta_click`

**conversion:**
- `team_blog_join_request`
- `team_blog_join_approval`
- `team_blog_pro_purchase`

---

## 8️⃣ 대시보드 KPI

### 핵심 지표

1. **일일 방문자 수**
   - `team_blog_view` 이벤트 수

2. **CTA 클릭률**
   - `team_blog_cta_click / team_blog_cta_impression`

3. **가입 요청 전환율**
   - `team_blog_join_request / team_blog_cta_click`

4. **가입 승인율**
   - `team_blog_join_approval / team_blog_join_request`

5. **Pro 전환율**
   - `team_blog_pro_purchase / team_blog_pro_trigger_impression`

---

## 9️⃣ 구현 체크리스트

### 프론트엔드

- [x] `team_blog_view` 이벤트
- [ ] `team_blog_cta_impression` (Intersection Observer)
- [x] `team_blog_cta_click` 이벤트
- [x] `team_blog_join_request` 이벤트
- [ ] `team_blog_pro_trigger_impression` 이벤트
- [ ] `team_blog_pro_upgrade_click` 이벤트

### 백엔드

- [ ] `team_blog_join_approval` 이벤트 (관리자 대시보드)
- [ ] `team_blog_pro_purchase` 이벤트 (Stripe webhook)

---

## 🔟 예시 쿼리 (Amplitude)

### CTA 클릭률 계산

```sql
SELECT 
  COUNT(DISTINCT CASE WHEN event_type = 'team_blog_cta_click' THEN user_id END) / 
  COUNT(DISTINCT CASE WHEN event_type = 'team_blog_cta_impression' THEN user_id END) * 100
  AS ctr_percentage
FROM events
WHERE event_type IN ('team_blog_cta_click', 'team_blog_cta_impression')
  AND event_time >= NOW() - INTERVAL '7 days'
```

### 가입 요청 전환율

```sql
SELECT 
  COUNT(DISTINCT CASE WHEN event_type = 'team_blog_join_request' THEN user_id END) / 
  COUNT(DISTINCT CASE WHEN event_type = 'team_blog_cta_click' THEN user_id END) * 100
  AS join_conversion_rate
FROM events
WHERE event_type IN ('team_blog_cta_click', 'team_blog_join_request')
  AND event_time >= NOW() - INTERVAL '7 days'
```

---

## ✅ 완료 체크리스트

- [x] 이벤트 정의 (9개)
- [x] 퍼널 구조
- [x] 전환율 계산 공식
- [x] 세그먼트 분석
- [x] 우선순위 분류
- [x] Amplitude/GA4 구조
- [x] 대시보드 KPI
- [x] 예시 쿼리

---

## 🚀 다음 단계

1. 실제 컴포넌트에 이벤트 트래킹 코드 추가
2. Amplitude/GA4 대시보드 설정
3. A/B 테스트 이벤트 추가

