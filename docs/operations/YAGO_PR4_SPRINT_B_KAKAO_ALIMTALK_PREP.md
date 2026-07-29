# PR4 Sprint B prep — Kakao AlimTalk (승인 대기)

```text
STATUS = PREP (no live send)
CHANNEL = YAGO SPORTS · search id yagovibe
WAITING = Kakao Business 심사 (3~5영업일)
QUEUE   = unchanged (queued_sms_pending / consumeQueuedSms / Ops Center)
```

## 사전 구현 (이 레포)

| Module | Path |
|--------|------|
| Template registry | `src/lib/notifications/alimtalkTemplates.ts` |
| `sendAlimTalk` + stub | `src/lib/notifications/kakaoAlimTalkProvider.ts` |
| Factory SMS\|Kakao\|auto | `src/lib/notifications/notificationProviderFactory.ts` |
| CF mirror | `functions/src/lib/kakao/*` |

## 템플릿 (콘솔 등록용 문구)

1. `RESERVATION_COMPLETE` — 예약 완료  
2. `PAYMENT_REQUEST` — 결제 요청  
3. `RESERVATION_CANCELLED` — 예약 취소  
4. `AI_ANALYSIS_COMPLETE` — AI 분석 완료  

문구 SoT는 registry `bodyPreview`와 동일해야 심사·발송이 통과한다.

## 승인 후 입력 (채팅에 키 붙이지 말 것)

```text
KAKAO_CHANNEL_ID=
KAKAO_SENDER_KEY=
KAKAO_API_KEY=
KAKAO_ALIMTALK_ENABLED=true
KAKAO_TEMPLATE_CODE_RESERVATION_COMPLETE=
KAKAO_TEMPLATE_CODE_PAYMENT_REQUEST=
KAKAO_TEMPLATE_CODE_RESERVATION_CANCELLED=
KAKAO_TEMPLATE_CODE_AI_ANALYSIS_COMPLETE=
NOTIFY_OUTBOUND=auto   # or kakao | sms | stub
```

Client (optional badges only):

```text
VITE_KAKAO_ALIMTALK_ENABLED=true
VITE_NOTIFY_OUTBOUND=auto
```

## 승인 후 개발 3스텝

1. Secrets / env 입력  
2. `KakaoAlimTalkOpsProvider` HTTP 구현 (현재 `KAKAO_API_NOT_IMPLEMENTED`)  
3. (선택) Queue 소비 시 Kakao 채널 분기 — **기존 SMS 파이프라인 유지**

## 비범위

- 실발송 / 심사 대행  
- Ops Center·Notification Queue 구조 변경  
- SENS 실연동 (별도 Sprint B SMS 트랙)
