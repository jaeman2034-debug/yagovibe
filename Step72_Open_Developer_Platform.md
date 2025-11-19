# Step 72: Open Developer Platform & Plugin SDK

YAGO VIBE의 AI Assistant를 외부 개발자와 파트너가 확장할 수 있도록 Developer Portal, Plugin SDK, API Gateway를 구축합니다.

## 📋 목표
- Developer Portal: 플러그인 등록·테스트·배포 관리 UI
- Plugin SDK: TypeScript SDK + CLI
- API Gateway: 인증, 요청 검증, 플러그인 라우팅, 로깅, 버전 관리
- Marketplace: 인증된 플러그인 카탈로그

## 🧱 전체 구조
```
[Developer Portal] --REST/OAuth2--> [API Gateway]
   ├─ Auth / Billing / Quota / Logs
   ├─ Plugin Registry (Firestore)
   ├─ Runtime Router → Plugin Webhook (Partner)
   └─ Audit Trail (Step 62)

[SDK & CLI]
   ├─ plugin init
   ├─ plugin test
   ├─ plugin publish
   └─ plugin logs
```

## 🔧 구현

### 1) Plugin Registry (Firestore)
- 컬렉션: `plugins/{pluginId}`
- 필드: `name, ownerId, description, category, endpoint, auth, manifestVersion, status, version, ratingAvg, installs, audit, actions, permissions, createdAt, updatedAt`
- 보안 규칙: 소유자 또는 관리자만 쓰기 가능

### 2) Developer Portal
- 파일: `src/pages/dev/DeveloperPortal.tsx`
- API: `GET /devListPlugins`, `POST /devRegisterPlugin`
- 경로: `/app/dev/portal`

### 3) API Gateway
- 파일: `functions/src/step72.gateway.ts`
- 엔드포인트: `POST /assistantGateway`
- 기능: 인증 검사, 플러그인 조회 및 라우팅, 호출 로깅, 사용량 기록

### 4) Developer APIs
- 파일: `functions/src/step72.devPortal.ts`
- `GET /devListPlugins`: 플러그인 목록 반환
- `POST /devRegisterPlugin`: yago-plugin.json 검증 및 등록

### 5) Plugin Manifest (yago-plugin.json)
```json
{
  "id": "com.yago.facility.reserve",
  "name": "Facility Reservation",
  "version": "1.0.0",
  "description": "Reserve sports facilities via AI Assistant",
  "actions": [ { "intent": "facility.reserve", "endpoint": "/reserve" } ],
  "auth": { "type": "oauth2" },
  "permissions": ["location.read", "user.basic"],
  "webhook": "https://partner.example.com/api/facility"
}
```

### 6) SDK 예시 (TypeScript)
```ts
import express from 'express';
const app = express(); app.use(express.json());
export function createPlugin(config:{ id:string, actions:any[] }){
  for (const act of config.actions){
    app.post(act.endpoint, async (req,res)=> res.json({ ok:true, result: await act.handler(req.body) }));
  }
  return app;
}
```

## 🔒 보안·검증
- 서명 검증: yago-plugin.json 서명 (GPG/Sigstore; TODO)
- 권한 요청 심사: permissions 필드 승인 필요
- 샌드박스 실행: 격리 실행 환경 (Functions/Container)
- 데이터 경계: 사용자 토큰·PII 직접 접근 금지 (Audit Trail + PII 마스킹)

## 💳 Billing & Usage (Step 65 연동)
- 호출당 Token·RPM 과금 → `usage/{pluginId}` 기록
- BillingGuard 재사용 (요금제 한도 적용)

## 🛒 Marketplace
- 경로: `/plugins`
- 검색 필터: 카테고리, 평점, 인증 여부
- 설치 흐름: OAuth2 승인 → `userPlugins/{uid}/{pluginId}` 저장 → Assistant가 intent 발생 시 자동 호출

## 🚀 배포
```bash
firebase deploy --only functions:devListPlugins,functions:devRegisterPlugin,functions:assistantGateway
```

## ✅ 체크리스트
- [x] Registry 스키마/Rules
- [x] Developer Portal UI
- [x] Developer API (list/register)
- [x] API Gateway (routing/logging)
- [ ] SDK/CLI 배포 (패키지 등록)
