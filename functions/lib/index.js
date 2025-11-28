"use strict";
/**
 * 🔥 Firebase Functions 최적화된 엔트리 포인트
 *
 * ✅ 얇은 라우터 구조로 모든 함수를 그룹별로 export
 * ✅ top-level import 최소화로 cold start 시간 대폭 단축
 * ✅ 10초 timeout 문제 해결
 * ✅ 그룹 단위로 주석 처리하여 배포 테스트 가능
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./src/exports/reporting"), exports);
__exportStar(require("./src/exports/voice"), exports);
__exportStar(require("./src/exports/market"), exports);
