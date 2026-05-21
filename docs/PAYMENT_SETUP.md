# 💳 결제 연동 v1 설정 가이드

## 🔥 토스페이먼츠 설정

### 1. 환경 변수 설정

#### 클라이언트 (`.env`)
```env
VITE_TOSS_CLIENT_KEY=test_ck_xxxxx
```

#### 서버 (Firebase Functions Secrets)
```bash
firebase functions:secrets:set TOSS_SECRET_KEY
```

### 2. 패키지 설치

#### 클라이언트
```bash
npm install @tosspayments/payment-sdk
```

#### 서버 (functions)
토스페이먼츠 API는 REST API이므로 추가 패키지 불필요 (fetch 사용)

### 3. 라우트 설정

결제 성공/실패 페이지는 이미 `App.tsx`에 추가됨:
- `/pay/success` - 결제 성공 페이지
- `/pay/fail` - 결제 실패 페이지

### 4. 사용 예시

```tsx
import { PaymentButton } from "@/components/payment/PaymentButton";

<PaymentButton
  amount={50000}
  orderName="YAGO 모임 예약"
  itemId="meeting_123"
  onSuccess={() => {
    console.log("결제 성공!");
  }}
  onError={(error) => {
    console.error("결제 실패:", error);
  }}
/>
```

### 5. 결제 플로우

1. **클라이언트**: `PaymentButton` 클릭
2. **클라이언트**: `createPayment` Cloud Function 호출
3. **서버**: 권한 검증 + 주문 ID 생성
4. **클라이언트**: 토스페이먼츠 SDK로 결제 요청
5. **토스**: 결제 처리 후 콜백
6. **클라이언트**: `/pay/success` 또는 `/pay/fail`로 리다이렉트
7. **클라이언트**: `verifyPayment` Cloud Function 호출
8. **서버**: 토스 API로 결제 검증 + DB 저장

### 6. 보안 체크리스트

- ✅ 클라이언트에서 금액/권한 절대 믿지 않음
- ✅ 서버에서 신뢰도 등급 재확인
- ✅ 서버에서 토스 API로 결제 검증
- ✅ 결제 정보 Firestore 저장
- ✅ 신뢰도 스코어 자동 업데이트

### 7. 운영 모니터링

- `payments` 컬렉션: 모든 결제 기록
- `paymentAttempts` 컬렉션: 결제 시도 기록
- `eventLogs` 컬렉션: 결제 이벤트 로그
