# PR4 Sprint B prep — Kakao AlimTalk (승인 대기)

```text
STATUS = PREP COMPLETE (stub only)
CHANNEL = YAGO SPORTS · yagovibe
QUEUE / OPS CENTER / SMS = unchanged
```

## 구현

| Item | Location |
|------|----------|
| Template Registry | `src/lib/notifications/alimtalkTemplates.ts` |
| `sendAlimTalk` Stub (`status=queued`) | `src/lib/notifications/kakaoAlimTalkProvider.ts` |
| Factory `NOTIFICATION_PROVIDER` | `src/lib/notifications/notificationProviderFactory.ts` |
| Config / Pending badge | `src/lib/notifications/kakaoAlimTalkConfig.ts` |
| Ops Center Kakao Status | 통계 탭 |
| Unit tests | `tests/kakaoAlimtalkPrep.test.ts` |
| CF mirror | `functions/src/lib/kakao/*` |

## Env placeholders (빈 값)

```text
NOTIFICATION_PROVIDER=auto
KAKAO_CHANNEL_ID=
KAKAO_SENDER_KEY=
KAKAO_API_KEY=
KAKAO_TEMPLATE_RESERVATION=
KAKAO_TEMPLATE_PAYMENT=
KAKAO_TEMPLATE_CANCEL=
KAKAO_TEMPLATE_AI_REPORT=
KAKAO_ALIMTALK_ENABLED=
```

## auto 규칙

Kakao 활성화 + SenderKey 존재 → Kakao, 아니면 SMS.

## 승인 후

Channel / SenderKey / Template codes / API key 입력 → HTTP 구현만 추가.
