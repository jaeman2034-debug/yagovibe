/**
 * 🔥 Firebase Functions 최적화된 엔트리 포인트
 * 
 * ✅ 얇은 라우터 구조로 모든 함수를 그룹별로 export
 * ✅ top-level import 최소화로 cold start 시간 대폭 단축
 * ✅ 10초 timeout 문제 해결
 * ✅ 그룹 단위로 주석 처리하여 배포 테스트 가능
 */

export * from "./src/exports/reporting";
export * from "./src/exports/voice";
export * from "./src/exports/market";
