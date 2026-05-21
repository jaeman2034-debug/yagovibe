/**
 * @deprecated 단일 앱/Auth는 `src/lib/firebase.ts`에서만 초기화한다.
 * 예전 `initializeApp`+placeholder 는 [DEFAULT] 앱 이중 생성·순서 역전(잘못된 앱에 Auth 붙기)의 원인이 됨.
 * Storage 등은 `import { storage, auth, db, ... } from "@/lib/firebase"` 를 사용.
 */
export { app, storage, auth, db, functions, getGoogleProvider, googleProvider } from "@/lib/firebase";
