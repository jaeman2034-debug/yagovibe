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
exports.sendReportEmail = void 0;
const functions = __importStar(require("firebase-functions"));
const nodemailer = __importStar(require("nodemailer"));
/**
 * 📧 리포트 이메일 자동 발송 함수
 * PDF 리포트를 관리자에게 이메일로 전송
 */
exports.sendReportEmail = functions.https.onCall(async (data, context) => {
    var _a, _b;
    console.log("📧 이메일 발송 요청 수신:", data);
    try {
        const { pdfUrl, reportDate, summary } = data;
        // Gmail SMTP 설정 가져오기
        const gmailUser = (_a = functions.config().gmail) === null || _a === void 0 ? void 0 : _a.user;
        const gmailPass = (_b = functions.config().gmail) === null || _b === void 0 ? void 0 : _b.pass;
        if (!gmailUser || !gmailPass) {
            console.error("❌ Gmail 설정이 없습니다. Firebase Functions 설정을 확인하세요.");
            throw new Error("Gmail 설정이 누락되었습니다.");
        }
        // Nodemailer 설정
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });
        // 이메일 옵션
        const mailOptions = {
            from: `"YAGO VIBE AI 리포트" <${gmailUser}>`,
            to: "admin@yagovibe.com", // 관리자 이메일 (실제 이메일로 변경 필요)
            subject: `📊 YAGO VIBE AI 주간 리포트 (${reportDate})`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #3b82f6;">📊 YAGO VIBE AI 주간 리포트</h2>
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #1f2937; margin-top: 0;">🧠 AI 요약</h3>
                        <p style="color: #4b5563; line-height: 1.6;">${summary || "리포트 요약이 준비되었습니다."}</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${pdfUrl}" 
                           style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            📄 전체 리포트 PDF 다운로드
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        생성일: ${new Date().toLocaleString("ko-KR")}
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">
                        이 메일은 YAGO VIBE AI 시스템에서 자동으로 생성되었습니다.
                    </p>
                </div>
            `,
            attachments: pdfUrl ? [
                {
                    filename: `YAGO_VIBE_주간리포트_${reportDate}.pdf`,
                    path: pdfUrl,
                },
            ] : [],
        };
        // 이메일 발송
        const info = await transporter.sendMail(mailOptions);
        console.log("✅ 이메일 발송 성공:", info.messageId);
        return {
            success: true,
            messageId: info.messageId,
            message: "리포트가 이메일로 성공적으로 발송되었습니다."
        };
    }
    catch (error) {
        console.error("❌ 이메일 발송 오류:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "알 수 없는 오류",
            message: "이메일 발송에 실패했습니다."
        };
    }
});
//# sourceMappingURL=sendReportEmail.js.map