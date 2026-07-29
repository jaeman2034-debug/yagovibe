# PR4 Sprint C — Kakao AlimTalk Operational Ready

```text
STATUS = SPRINT C READY
Queue / Ops / Provider structure = unchanged (extended)
Live send = when KAKAO_ALIMTALK_ENABLED + SenderKey + API credentials
```

## What ships

1. **Kakao Provider Final** — Stub vs Live (Solapi BizMessage `kakaoOptions`)
2. **SenderKey** — `KAKAO_SENDER_KEY` (alias `SOLAPI_PFID`) applied to all templates
3. **Template codes** — Sprint C env keys + Sprint B aliases
4. **Delivery fields** — `providerMessageId`, `requestId`, `sentAt`, `completedAt`, `success`, `errorCode`, `errorMessage`, `retryCount`, `deliveryStatus`
5. **Ops Center filters** — Queued / Sending / Delivered / Failed / Retry
6. **Retry** — `retryFailedNotifications` (Single + Bulk)
7. **Auto send** — `onQueuedOutboundNotification` when Live Kakao (or live SENS)
8. **Hooks** — reservation assign → `RESERVATION_APPROVED`; payment confirm → `PAYMENT_CONFIRMED`; growth delivery → `AI_REPORT_READY`

## Functions env (secrets — never commit)

```text
KAKAO_ALIMTALK_ENABLED=true
KAKAO_SENDER_KEY=
KAKAO_API_KEY=          # or SOLAPI_API_KEY
KAKAO_API_SECRET=       # or SOLAPI_API_SECRET
KAKAO_SENDER_NUMBER=    # or SOLAPI_SENDER
KAKAO_TEMPLATE_RESERVATION_REQUEST=
KAKAO_TEMPLATE_RESERVATION_APPROVED=
KAKAO_TEMPLATE_PAYMENT_REQUEST=
KAKAO_TEMPLATE_PAYMENT_CONFIRMED=
KAKAO_TEMPLATE_RESERVATION_CANCELLED=
KAKAO_TEMPLATE_RESERVATION_REMINDER=
KAKAO_TEMPLATE_MATCH_REMINDER=
KAKAO_TEMPLATE_AI_REPORT_READY=
KAKAO_TEMPLATE_NOTICE=
KAKAO_TEMPLATE_WELCOME=
NOTIFICATION_PROVIDER=auto
```

Legacy aliases still work: `KAKAO_TEMPLATE_PAYMENT`, `KAKAO_TEMPLATE_CANCEL`, `KAKAO_TEMPLATE_AI_REPORT`.

## Flow

```text
Reservation APPROVED / Payment CONFIRMED / AI Report Ready
  → notifications status=queued_sms_pending
  → onQueuedOutboundNotification (Live only)
  → Kakao Provider
  → deliveryStatus=delivered | failed
  → opsProviderLogs append-only
```

Stub / credentials missing → queue stays Queued; Ops Center can dry-run consume.
