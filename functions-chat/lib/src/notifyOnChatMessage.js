"use strict";
/**
 * 🔥 채팅 메시지 생성 시 FCM 푸시 알림 발송 (v2)
 * chats/{chatId}/messages — 거래 1:1
 *
 * (소스는 functions-chat 전용 — 메인 functions 번들과 분리)
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
exports.notifyOnChatMessage = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const firestore_2 = require("firebase-admin/firestore");
// 🔥 지연 초기화: 함수 내부에서만 사용
function getDb() {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    return admin.firestore();
}
function getMessaging() {
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    return admin.messaging();
}
/** devices + fcmTokens(문서 id) + users.fcmTokens 배열 — 클라이언트 저장 방식 통합 */
async function collectPushTokensForUser(db, uid) {
    const tokens = new Set();
    try {
        const devicesSnap = await db.collection(`users/${uid}/devices`).get();
        devicesSnap.forEach((doc) => {
            const data = doc.data();
            const t = data?.token;
            const enabled = data?.enabled !== false;
            if (enabled && t && typeof t === "string")
                tokens.add(t);
        });
    }
    catch (e) {
        firebase_functions_1.logger.warn("⚠️ [notifyOnChatMessage] devices 조회 실패", { uid, err: e?.message });
    }
    try {
        const legacyCol = await db.collection(`users/${uid}/fcmTokens`).get();
        legacyCol.forEach((d) => {
            if (d.id)
                tokens.add(d.id);
        });
    }
    catch (e) {
        firebase_functions_1.logger.warn("⚠️ [notifyOnChatMessage] fcmTokens 조회 실패", { uid, err: e?.message });
    }
    try {
        const userSnap = await db.doc(`users/${uid}`).get();
        const legacy = userSnap.data()?.fcmTokens;
        if (Array.isArray(legacy)) {
            legacy.forEach((t) => {
                if (t && typeof t === "string")
                    tokens.add(t);
            });
        }
    }
    catch (e) {
        firebase_functions_1.logger.warn("⚠️ [notifyOnChatMessage] users 문서 토큰 조회 실패", { uid, err: e?.message });
    }
    return [...tokens];
}
/** 무효 FCM 토큰: fcmTokens 문서 + users 배열 + devices(token 일치) 정리 */
async function cleanupInvalidPushToken(db, uid, token) {
    if (!token || typeof token !== "string")
        return;
    try {
        await db.doc(`users/${uid}/fcmTokens/${token}`).delete();
    }
    catch {
        /* 문서 없음 등 */
    }
    try {
        await db.doc(`users/${uid}`).update({
            fcmTokens: firestore_2.FieldValue.arrayRemove(token),
        });
    }
    catch {
        /* 필드 없음 등 */
    }
    try {
        const snap = await db
            .collection(`users/${uid}/devices`)
            .where("token", "==", token)
            .limit(25)
            .get();
        if (snap.empty)
            return;
        const batch = db.batch();
        snap.docs.forEach((doc) => {
            batch.update(doc.ref, {
                enabled: false,
                updatedAt: firestore_2.FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();
        firebase_functions_1.logger.info("🧹 [notifyOnChatMessage] devices 무효 토큰 비활성화", {
            uid,
            count: snap.size,
        });
    }
    catch (e) {
        firebase_functions_1.logger.warn("⚠️ [notifyOnChatMessage] devices 토큰 정리 실패", {
            uid,
            err: e?.message,
        });
    }
}
/**
 * 채팅 메시지 생성 시 푸시 알림 발송
 */
exports.notifyOnChatMessage = (0, firestore_1.onDocumentCreated)({
    document: "chats/{chatId}/messages/{messageId}",
    region: "asia-northeast3",
}, async (event) => {
    const { chatId, messageId } = event.params;
    try {
        const msg = event.data?.data();
        if (!msg) {
            firebase_functions_1.logger.warn("⚠️ [notifyOnChatMessage] 메시지 데이터 없음", { messageId, chatId });
            return;
        }
        if (msg._mergedFromChatId) {
            firebase_functions_1.logger.info("⏭️ [notifyOnChatMessage] 마이그레이션 복사본 → 알림 스킵", {
                chatId,
                messageId,
            });
            return;
        }
        const senderId = msg.senderId || msg.uid;
        const text = msg.text ?? "";
        if (!senderId) {
            firebase_functions_1.logger.warn("⚠️ [notifyOnChatMessage] senderId 없음 — 스킵", { chatId, messageId });
            return;
        }
        // 이미지 등 비텍스트 메시지는 text 없이 올 수 있음
        const hasRenderableBody = (typeof text === "string" && text.length > 0) ||
            msg.type === "image" ||
            msg.type === "offer";
        if (!hasRenderableBody) {
            firebase_functions_1.logger.info("⏭️ [notifyOnChatMessage] 표시할 내용 없음 — 스킵", {
                chatId,
                messageId,
                type: msg.type,
            });
            return;
        }
        // 시스템 메시지는 알림 발송 안 함
        if (msg.system === true ||
            msg.type === "system_init" ||
            msg.type === "system_auto_reply" ||
            msg.type === "system_action" ||
            msg.type === "system_status_change" ||
            msg.type === "system_status") {
            firebase_functions_1.logger.info("⏭️ [notifyOnChatMessage] 시스템 메시지 → 알림 스킵");
            return;
        }
        // 🔥 함수 내부에서만 Firestore/Messaging 사용
        const db = getDb();
        // 채팅 문서에서 상대 찾기
        const chatSnap = await db.doc(`chats/${chatId}`).get();
        if (!chatSnap.exists) {
            firebase_functions_1.logger.warn("⚠️ [notifyOnChatMessage] 채팅방 없음", { chatId, messageId });
            return;
        }
        const chat = chatSnap.data();
        const usersArr = chat.participants ||
            chat.users ||
            [];
        const receiverId = usersArr.find((u) => u && u !== senderId);
        if (!receiverId) {
            firebase_functions_1.logger.warn("⚠️ [notifyOnChatMessage] 수신자 없음", { chatId, messageId });
            return;
        }
        if (receiverId === senderId) {
            firebase_functions_1.logger.warn("⏭️ [notifyOnChatMessage] 수신자=발신자 — 스킵", { chatId, messageId });
            return;
        }
        // 🔥 미읽음이 증가하는 순간에만 알림 (중복 방지)
        const unread = chat.unreadCount?.[receiverId] ?? 0;
        if (unread <= 0) {
            firebase_functions_1.logger.info("⏭️ [notifyOnChatMessage] 미읽음 없음 → 알림 스킵", {
                chatId,
                messageId,
                receiverId,
            });
            return;
        }
        // 🔥 알림 설정 확인
        const settingsRef = db.doc(`users/${receiverId}/settings/notifications`);
        const settingsSnap = await settingsRef.get();
        const chatNotificationsEnabled = settingsSnap.exists
            ? settingsSnap.data()?.chatNotificationsEnabled !== false // 기본값: true
            : true;
        if (!chatNotificationsEnabled) {
            firebase_functions_1.logger.info(`⏭️ [notifyOnChatMessage] 사용자 ${receiverId} 알림 꺼짐`);
            return;
        }
        const tokens = await collectPushTokensForUser(db, receiverId);
        if (tokens.length === 0) {
            firebase_functions_1.logger.info(`⚠️ [notifyOnChatMessage] 사용자 ${receiverId}의 FCM 토큰 없음 (정상 — 미등록)`, {
                chatId,
                messageId,
            });
            return;
        }
        firebase_functions_1.logger.info(`📱 [notifyOnChatMessage] 푸시 발송 시도`, {
            chatId,
            messageId,
            receiverId,
            tokenCount: tokens.length,
        });
        // 메시지 미리보기 (이미지/텍스트 대응, 80자 제한)
        let messagePreview = msg.type === "image" ? "📷 사진을 보냈습니다" : String(text || "");
        if (messagePreview.length > 80) {
            messagePreview = messagePreview.slice(0, 80) + "…";
        }
        const payload = {
            tokens,
            notification: {
                title: "새 메시지",
                body: messagePreview,
            },
            data: {
                chatId: String(chatId),
                messageId: String(messageId),
                senderId: String(senderId),
                type: "chat_message",
                route: `/app/chat/${chatId}`,
            },
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    channelId: "default",
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                    },
                },
            },
        };
        // 🔥 푸시 발송 (실전용 에러 처리 포함)
        const messaging = getMessaging();
        let response;
        try {
            response = await messaging.sendEachForMulticast(payload);
        }
        catch (sendError) {
            // FCM 발송 자체가 실패한 경우 (네트워크, 인증 등)
            firebase_functions_1.logger.error(`❌ [notifyOnChatMessage] FCM 발송 실패`, {
                chatId,
                messageId,
                error: sendError?.message,
                code: sendError?.code,
                receiverId,
            });
            if (sendError?.code === "messaging/invalid-registration-token") {
                firebase_functions_1.logger.warn(`🧹 [notifyOnChatMessage] 무효 토큰 일괄 정리 (devices+fcmTokens)`, {
                    receiverId,
                    messageId,
                });
                for (const token of tokens) {
                    await cleanupInvalidPushToken(db, receiverId, token);
                }
            }
            return; // 알림 실패해도 메시지 저장은 성공했으므로 에러를 throw하지 않음
        }
        firebase_functions_1.logger.info(`✅ [notifyOnChatMessage] 알림 발송 완료`, {
            chatId,
            messageId,
            receiverId,
            successCount: response.successCount,
            failureCount: response.failureCount,
        });
        // 🔥 실패한 토큰 정리 (무효 토큰: devices + fcmTokens + users 배열)
        if (response.failureCount > 0) {
            const failedTokens = new Set();
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    if (errorCode === "messaging/invalid-registration-token" ||
                        errorCode === "messaging/registration-token-not-registered") {
                        const t = tokens[idx];
                        if (t)
                            failedTokens.add(t);
                        firebase_functions_1.logger.info(`🗑️ [notifyOnChatMessage] 무효 토큰 정리 대상`, {
                            chatId,
                            messageId,
                            tokenPrefix: t ? `${t.substring(0, 20)}…` : "",
                            errorCode,
                        });
                    }
                }
            });
            for (const token of failedTokens) {
                await cleanupInvalidPushToken(db, receiverId, token);
            }
            if (failedTokens.size > 0) {
                firebase_functions_1.logger.info(`🧹 [notifyOnChatMessage] 무효 토큰 정리 완료`, {
                    chatId,
                    messageId,
                    count: failedTokens.size,
                });
            }
        }
    }
    catch (error) {
        firebase_functions_1.logger.error("❌ [notifyOnChatMessage] 상위 처리 실패", {
            chatId,
            messageId,
            error: error?.message,
            stack: error?.stack,
        });
        // 알림 실패해도 메시지 저장은 성공했으므로 에러를 throw하지 않음
    }
});
