import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yagovibe.app",
  appName: "YAGO VIBE",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    // 프로덕션: 도메인 기반 모드 (항상 최신 웹 버전 사용)
    url: "https://yagovibe.com",
    cleartext: false, // HTTPS만 허용
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;

