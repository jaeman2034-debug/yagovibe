# PR4 Sprint B — Kakao AlimTalk Template Final Design

```text
STATUS = TEMPLATE FINAL DESIGN
SoT    = src/lib/notifications/kakao/templates.ts
QUEUE / OPS / PROVIDER structure = unchanged
```

## Template IDs (10)

| ID | displayName |
|----|-------------|
| RESERVATION_REQUEST | 예약 신청 완료 |
| RESERVATION_APPROVED | 예약 승인 / 결제 요청 |
| PAYMENT_REQUEST | 결제 요청 |
| PAYMENT_CONFIRMED | 입금 확인 |
| RESERVATION_CANCELLED | 예약 취소 |
| RESERVATION_REMINDER | 예약 리마인더 |
| MATCH_REMINDER | 경기 리마인더 |
| AI_REPORT_READY | AI 분석 완료 |
| NOTICE | 공지 |
| WELCOME | 환영 |

`templateCode` = `PENDING` until Biz approval.

## Common variables

`team` `venue` `date` `time` `price` `deadline` `reservationNo` `reservationUrl` `paymentStatus` `coach` `player` `reportUrl` `noticeTitle` `noticeUrl`

Body uses Kakao syntax `#{var}`.

## Env (승인 후)

```text
KAKAO_CHANNEL_ID=
KAKAO_SENDER_KEY=
KAKAO_API_KEY=
KAKAO_TEMPLATE_RESERVATION_REQUEST=
KAKAO_TEMPLATE_RESERVATION_APPROVED=
KAKAO_TEMPLATE_PAYMENT=
KAKAO_TEMPLATE_PAYMENT_CONFIRMED=
KAKAO_TEMPLATE_CANCEL=
KAKAO_TEMPLATE_RESERVATION_REMINDER=
KAKAO_TEMPLATE_MATCH_REMINDER=
KAKAO_TEMPLATE_AI_REPORT=
KAKAO_TEMPLATE_NOTICE=
KAKAO_TEMPLATE_WELCOME=
```

## Ops Center

통계 탭 Kakao Status에 템플릿 10개 · Pending 표시.
