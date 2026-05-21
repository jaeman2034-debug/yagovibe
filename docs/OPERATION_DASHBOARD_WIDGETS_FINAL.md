# 📊 운영 대시보드 v2 - 매일 봐야 할 6개 위젯 (확정판)

> **목표**: 운영자가 의사결정 고민할 필요 없이 바로 액션 실행

---

## 🎯 위젯 1: Story Health (스토리 존 생명 지표)

### 계산식
```
CTR = story_click / story_impression
FillRate = 실제 슬롯 / 5
FreshRate = 24h 이내 생성 비율
```

### 임계값
- **CTR**: ≥ **2.5%** (정상) / 2.0% ~ 2.5% (주의) / < 2.0% (위험)
- **FillRate**: = **100%** (정상) / 80% ~ 100% (주의) / < 80% (위험)
- **FreshRate**: ≥ **40%** (정상) / 30% ~ 40% (주의) / < 30% (위험)

### 대응 액션
- **CTR < 2%**: 타이틀 1개 교체
- **FillRate < 100%**: 운영 픽 즉시 투입
- **FreshRate < 30%**: 협회/팀 모집 자동 생성 점검

### API
```bash
GET /api/admin/widgets/all?region=seoul&date=2025-02-03
→ widgets.storyHealth 확인
```

---

## 🎯 위젯 2: Booking Funnel (예약 퍼널)

### 계산식
```
View→Slot = slot_view / ground_view
Reserve CR = reserve_create / slot_view
Pay CR = payment_success / reserve_create
```

### 임계값
- **View→Slot**: ≥ **35%** (정상) / 25% ~ 35% (주의) / < 25% (위험)
- **Reserve CR**: ≥ **22%** (정상) / 15% ~ 22% (주의) / < 15% (위험)
- **Pay CR**: ≥ **95%** (정상) / 90% ~ 95% (주의) / < 90% (위험)

### 대응 액션
- **Reserve CR 저조**: 가격/시간 가시성 개선
- **Pay CR 저조**: 웹훅·락 로그 점검

### API
```bash
GET /api/admin/widgets/all?region=seoul&date=2025-02-03
→ widgets.bookingFunnel 확인
```

---

## 🎯 위젯 3: Revenue Pulse (매출 맥박)

### 지표
- 오늘 매출
- 전일 대비 (%)
- 취소율
- 객단가

### 계산식
```
취소율 = reservation_cancel / (payment_success + reservation_cancel)
객단가 = revenue / payment_success
전일 대비 = (오늘 매출 - 전일 매출) / 전일 매출 * 100
```

### 임계값
- **취소율**: ≤ **8%** (정상) / 8% ~ 12% (주의) / > 12% (위험)
- **객단가 급락**: -15% 이내 (정상) / -15% ~ -25% (주의) / < -25% (위험)

### 대응 액션
- **취소율 급등**: 환불 정책 UI 강조
- **객단가 하락**: 할인 중단

### API
```bash
GET /api/admin/widgets/all?region=seoul&date=2025-02-03
→ widgets.revenuePulse 확인
```

---

## 🎯 위젯 4: AB Radar (실험 레이더)

### 지표
- 표본 (imp A + imp B)
- CTR A
- CTR B
- Uplift
- 남은 예상일

### 계산식
```
표본 = impA + impB
CTR A = clickA / impA
CTR B = clickB / impB
Uplift = (CTR B - CTR A) / CTR A
남은 예상일 = (3000 - 현재 표본) / (현재 표본 / 경과일)
```

### 임계값
- **표본**: ≥ **3,000** (정상) / 2,000 ~ 3,000 (주의) / < 2,000 (위험)
- **Uplift**: ≥ **10%** (정상) / 5% ~ 10% (주의) / < 5% (위험)

### 대응 액션
- **Uplift ≥ 10%**: 자동 WIN 확인
- **Uplift < -10%**: 실험 중단

### API
```bash
GET /api/admin/widgets/all?region=seoul&date=2025-02-03
→ widgets.abRadar 확인
```

---

## 🎯 위젯 5: Community Engine (커뮤니티)

### 지표
- 팀 수
- 일 가입
- 모집 스토리 CTR

### 계산식
```
팀 수 = Team.count(region)
일 가입 = TeamMember.count(createdAt = 오늘)
모집 스토리 CTR = 모집 스토리 클릭 / 모집 스토리 노출
```

### 임계값
- **팀 수**: ≥ **20** (정상) / 10 ~ 20 (주의) / < 10 (위험)
- **일 가입**: ≥ **5** (정상) / 2 ~ 5 (주의) / < 2 (위험)

### 대응 액션
- **팀 수 부족**: 운영팀 3개 시드 생성
- **일 가입 부족**: 모집 스토리 2개 추가

### API
```bash
GET /api/admin/widgets/all?region=seoul&date=2025-02-03
→ widgets.communityEngine 확인
```

---

## 🎯 위젯 6: System Guard (안전)

### 지표
- PayFail (일별 건수)
- OfflineRate (오프라인 사용률)
- ApiError (일별 건수)

### 계산식
```
PayFail = paymentFail (일별)
OfflineRate = offline 사용자 / 전체 사용자
ApiError = apiError (일별)
```

### 임계값
- **PayFail**: ≤ **5건** (정상) / 5 ~ 10건 (주의) / > 10건 (위험)
- **OfflineRate**: ≤ **12%** (정상) / 12% ~ 20% (주의) / > 20% (위험)
- **ApiError**: ≤ **50건** (정상) / 50 ~ 100건 (주의) / > 100건 (위험)

### 대응 액션
- **PayFail 초과**: PG 재시도/락 로그 점검
- **OfflineRate 초과**: 캐시 TTL 축소

### API
```bash
GET /api/admin/widgets/all?region=seoul&date=2025-02-03
→ widgets.systemGuard 확인
```

---

## 🧠 의사결정 트리 (자동)

### 자동 액션 규칙
```
CTR ↓ → 스토리 교체 1개
CR ↓ → 구장 슬롯 2개 보강
PayFail ↑ → 결제 점검
팀 가입 ↓ → 모집 스토리 2개
```

---

## 📋 운영 루틴 (10분 버전)

### 매일 아침 10분
1. **위젯 1 확인** → 스토리 1개 결정
2. **위젯 2 확인** → 슬롯 보강 여부
3. **위젯 6 확인** → 장애 유무
   끝.

### API 호출
```bash
GET /api/admin/widgets/all?region=seoul&date=오늘
```

### 응답 구조
```json
{
  "date": "2025-02-03",
  "region": "seoul",
  "widgets": {
    "storyHealth": {
      "name": "Story Health",
      "metrics": {
        "ctr": {
          "value": 0.025,
          "target": 0.025,
          "status": "정상",
          "action": "유지"
        },
        "fillRate": {
          "value": 1.0,
          "target": 1.0,
          "status": "정상",
          "action": "유지"
        },
        "freshRate": {
          "value": 0.4,
          "target": 0.4,
          "status": "정상",
          "action": "유지"
        }
      }
    },
    "bookingFunnel": { ... },
    "revenuePulse": { ... },
    "abRadar": { ... },
    "communityEngine": { ... },
    "systemGuard": { ... }
  }
}
```

---

## ✅ 성공 기준

### 위젯별 목표
- **Story Health**: CTR ≥ 2.5%, FillRate = 100%, FreshRate ≥ 40%
- **Booking Funnel**: View→Slot ≥ 35%, Reserve CR ≥ 22%, Pay CR ≥ 95%
- **Revenue Pulse**: 취소율 ≤ 8%, 객단가 안정
- **AB Radar**: 표본 ≥ 3,000, Uplift ≥ 10%
- **Community Engine**: 팀 ≥ 20, 일 가입 ≥ 5
- **System Guard**: PayFail ≤ 5건, OfflineRate ≤ 12%

---

## 🚨 위험 신호 즉시 대응

### 위험 신호 발견 시
1. 해당 위젯의 "action" 즉시 실행
2. 다른 작업 중단
3. 24시간 모니터링

### 자동 알림 (30분마다)
- 위험 신호 발견 시 즉시 알림
- Slack/Email 발송 (실제 운영 시)
