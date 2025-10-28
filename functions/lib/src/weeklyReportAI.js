"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWeeklyReportJob = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
const reportAutoGenerator_1 = require("./reportAutoGenerator");
if (!admin.apps.length) {
    admin.initializeApp();
}
// ✅ v2 방식: Promise<void>만 반환하도록 수정
exports.generateWeeklyReportJob = (0, scheduler_1.onSchedule)({
    schedule: "0 9 * * 1", // 매주 월요일 09:00
    timeZone: "Asia/Seoul",
}, async (event) => {
    logger.info("🧠 자동 주간 리포트 생성 시작", { structuredData: true });
    try {
        const result = await (0, reportAutoGenerator_1.generateWeeklyReport)();
        logger.info("✅ 자동 리포트 생성 완료:", result);
    }
    catch (err) {
        logger.error("❌ 리포트 생성 실패:", err);
    }
});
//# sourceMappingURL=weeklyReportAI.js.map