# Firebase Functions 배포 에러 해결 — Cursor 붙여넣기용 지시문

## 현재 에러 (증상)

- `User code failed to load`
- `Cannot determine backend specification`
- `Timeout after 10000`

## 원인 (요약)

배포 시 CLI가 `functions` 엔트리(`lib/index.js` 등)를 **한 번에 로드**하면서, **모듈 최상위에서** 무거운 초기화·외부 연결·예외가 나면 10초 안에 스펙 분석이 끝나지 못해 위 오류가 난다.

## 반드시 지켜야 할 규칙

### 1. 엔트리 최상단에서 허용하는 것

- `import` / `export` 문
- `export const xxx = onCall(...)` / `onRequest` / `onSchedule` 등 **함수 정의만** (핸들러 본문 안에서 무거운 작업)

### 2. 최상위에서 금지 (로드 시점 실행 금지)

- `createClient` (Supabase 등) 전역 싱글톤
- `fetch` / `axios` 호출
- top-level `await`
- DB/Storage **즉시** 연결 (`getStorage().bucket()` 처럼 인자 없이 기본 버킷을 모듈 로드 시점에 고정)
- 외부 API 호출
- 환경 변수만 읽어 **동기적으로 무거운 객체**를 만드는 코드
- **`express().listen()` / `app.listen()` / `http.createServer(...).listen()`**  
  → Functions는 Firebase가 `onRequest(app)` 으로 띄운다. `listen()`은 배포·코드 분석 단계에서 **무한 대기에 가깝게** 막히므로 금지. 로컬 전용이면 `process.env` 플래그로 가드하거나 별도 스크립트로 분리.

### 3. 올바른 패턴

```ts
export const myFunction = onRequest(async (req, res) => {
  // 여기서만 클라이언트 생성·fetch·DB 접근
});
```

### 4. 런타임 정렬 (이 레포)

- **`functions/package.json`** 의 `"engines": { "node": "22" }` 와
- **`firebase.json`** 의 `"functions": { "runtime": "nodejs22" }` 를 **반드시 동일 계열**로 맞출 것.

(Node 18은 Firebase에서 폐기됨 → **20 또는 22** 사용. `engines`만 바꾸고 `firebase.json`의 `runtime`을 안 맞추면 배포/에뮬 이슈가 날 수 있음.)

### 5. 수정 후 실행 순서

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

(또는 전체: `firebase deploy`)

## 이 레포(`yago-vibe-spt`)에서 이미 반영된 점

- **Storage 기본 버킷**: `getStorage().bucket()` 을 여러 모듈 **최상위**에서 호출하던 부분은 `getDefaultStorageBucket()` 로 **첫 사용 시**만 연결하도록 정리됨 (`functions/src/lib/defaultStorageBucket.ts`).
- **엔트리**: `functions/index.ts` 는 `export * from "./src/exports/…"` 대신 **`export { … } from "./src/…"` 직접 나열** (배럴 생략). 도메인별로 주석 처리해 단계 배포하기 쉽다.
- **무거운 Express**: `src/apiRouter.ts`(`api`)는 엔트리에 넣지 않음 — 포함 시 로컬 `require`만 수십 초까지 늘어 **배포 10초 타임아웃** 위험이 큼. `api`가 필요하면 `firebase.json`의 **functions 소스 분리**(별도 codebase) 권장.

## Cursor에게 시킬 때 한 줄 프롬프트 예시

> `functions` 폴더에서 엔트리 로드 시 실행되는 코드(전역 클라이언트·fetch·top-level await·getStorage().bucket() 최상위 호출 등)를 찾아 핸들러 안으로 옮기고, `functions/package.json` engines와 `firebase.json` functions runtime을 **같은 Node 버전(예: 22)**으로 맞춘 뒤 `npm run build`로 검증해 줘.

## 참고

- **Node 18은 Firebase Functions에서 폐기** → `engines` + `runtime`을 **nodejs20 또는 nodejs22**로 함께 올릴 것.
- Hosting만 배포할 때는: `firebase deploy --only hosting` 으로 Functions를 건너뛸 수 있음.
