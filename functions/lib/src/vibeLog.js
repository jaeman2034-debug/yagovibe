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
exports.vibeLog = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Firebase Admin 초기화 (중복 초기화 방지)
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.vibeLog = functions.https.onRequest(async (req, res) => {
    // CORS 헤더 설정
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    // OPTIONS 요청 처리
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    // POST 요청만 처리
    if (req.method !== "POST") {
        res.status(405).json({ success: false, error: "Method not allowed" });
        return;
    }
    try {
        const body = req.body;
        // 로그 데이터 구조화
        const logData = {
            type: body.type || "unknown",
            command: body.command || "",
            timestamp: body.timestamp || Date.now(),
            result: body.result || false,
            message: body.message || "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Firestore 'logs' 컬렉션에 저장
        await admin.firestore().collection("logs").add(logData);
        console.log("✅ 로그 저장 완료:", logData);
        res.status(200).json({
            success: true,
            message: "Log saved successfully"
        });
    }
    catch (error) {
        console.error("❌ vibeLog 에러:", error);
        res.status(500).json({
            success: false,
            error: String(error)
        });
    }
});
//# sourceMappingURL=vibeLog.js.map