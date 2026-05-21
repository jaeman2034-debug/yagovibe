# Functions: `Timeout after 10000` / `User code failed to load`

Firebase CLI가 `lib/index.js`를 분석할 때 **10초 안에** 모듈 로드가 끝나야 합니다.  
export가 많으면 Windows·디스크 환경에서 한도를 넘길 수 있습니다.

## 1. 항상 먼저: 컴파일 후 실행

```bash
cd functions
npm run build
cd ..
firebase emulators:start --only functions
```

`firebase deploy`는 루트 `firebase.json`의 `predeploy`로 빌드가 돌아갑니다.

## 2. 무거운 묶음 끄기 (로컬 전용)

`src/index.ts` **맨 아래**의 다음 한 줄을 **주석 처리**합니다.

```ts
// export * from "./index.heavy";
```

그다음:

```bash
cd functions && npm run build
```

이렇게 하면 아래 기능은 **로컬 에뮬에 안 올라옵니다** (배포 전 주석 반드시 해제).

- Analytics 플랫폼/스케줄 일부
- `onMediaUploaded`, `sendEmail`, 좋아요 트리거
- `migrateActivityLogsToActivities`
- **`onMarketPostCreated` / `onMarketPostUpdated`** (마켓 통합 처리)

## 3. CLI / Node

- `npm i -g firebase-tools@latest`
- `functions/package.json`의 `engines.node`와 로컬 Node 버전 맞추기 (20 권장)

## 4. 배포 시 `firebase deploy` 직접 실행 금지

기본 discovery 타임아웃은 **10초**입니다. Windows에서는 `lib/index.js` 로드만으로도 한도를 넘길 수 있습니다.

```powershell
# PowerShell
$env:FUNCTIONS_DISCOVERY_TIMEOUT='120'
firebase deploy --only functions
```

또는 (권장):

```bash
npm run deploy:functions
# 매치메이킹만:
node scripts/deploy-functions.mjs deploy --only functions:joinQueue,functions:leaveQueue,functions:leaveMatch,functions:readyCheck
```

## 5. Gen2 `.env` 금지 키

`FIREBASE_*` 로 시작하는 키는 배포 시 거부됩니다. RTDB URL은 코드 기본값 또는 `RTDB_DATABASE_URL` 사용.

## 6. 그래도 느리면

- 백신 실시간 검사에서 `node_modules`·프로젝트 폴더 예외 검토
- WSL2에서 동일 명령 실행해 비교
