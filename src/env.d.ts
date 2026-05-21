/**
 * Vite 환경 변수 타입 정의
 * 
 * import.meta.env에서 접근 가능한 환경 변수들의 타입을 정의합니다.
 * VITE_ 접두사가 있는 변수만 클라이언트 코드에서 접근 가능합니다.
 */

interface ImportMetaEnv {
  // 스포츠 API 관련
  readonly VITE_SPORTS_API_BASE_URL?: string;
  readonly VITE_SPORTS_API_KEY?: string;

  // Firebase 관련
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_FIREBASE_VAPID_KEY?: string;
  /** `1` / `true` / `yes` 이면 `registerWebFcmIfEligible` 웹 FCM 등록 전체 스킵(개발 시 fcmregistrations 403 노이즈 차단) */
  readonly VITE_DISABLE_WEB_FCM?: string;

  // AI 어시스턴트 관련
  readonly VITE_ASSISTANT_API_URL?: string;
  readonly VITE_ASSISTANT_VOICE_MODEL?: string;

  // 기타 API
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_KAKAO_MAPS_API_KEY?: string;
  readonly VITE_KAKAO_JS_KEY?: string;
  readonly VITE_KAKAO_REST_API_KEY?: string; // 🔥 REST API 키 추가

  // 환경 설정
  readonly VITE_ENV?: string;
  readonly VITE_ENABLE_MOCK?: string;
  readonly VITE_DEBUG_MODE?: string;
  
  // 공개 URL 설정 (QR 코드, 공유 링크 등 외부 접근용)
  readonly VITE_PUBLIC_BASE_URL?: string; // ngrok 등 외부 접근 가능한 URL (개발/스테이징/프로덕션)

  /** Stripe Checkout price id (Dashboard `price_…`) — 팀/조직 결제 공용 */
  readonly VITE_STRIPE_PRICE_BASIC?: string;
  readonly VITE_STRIPE_PRICE_PRO?: string;

  // Vite 기본 환경 변수
  readonly MODE: string;
  readonly BASE_URL: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

