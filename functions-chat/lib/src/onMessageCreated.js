"use strict";
/**
 * 🔥 채팅 메시지 생성 시 푸시 알림 전송
 *
 * 역할:
 * - chatRooms/{roomId}/messages/{messageId} 생성 시
 * - 발신자를 제외한 모든 멤버에게 푸시 알림 전송
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
exports.onMessageCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firebase_functions_1 = require("firebase-functions");
const admin = __importStar(require("firebase-admin"));
const firestore_2 = require("firebase-admin/firestore");
// 배포/분석 단계에서 getFirestore()가 먼저 실행되면 app/no-app — 반드시 초기화 후 DB 참조
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = (0, firestore_2.getFirestore)();
/**
 * 메시지 생성 시 푸시 알림 전송
 */
exports.onMessageCreated = (0, firestore_1.onDocumentCreated)("chatRooms/{roomId}/messages/{messageId}", async (event) => {
    const { roomId, messageId } = event.params;
    const messageData = event.data?.data();
    if (!messageData) {
        firebase_functions_1.logger.warn("⚠️ [onMessageCreated] 메시지 스냅샷 없음 — 푸시 스킵", {
            roomId,
            messageId,
        });
        return;
    }
    const senderId = messageData.senderId ||
        messageData.uid;
    if (!senderId) {
        firebase_functions_1.logger.warn("⚠️ [onMessageCreated] senderId/uid 없음 — 푸시 스킵", {
            roomId,
            messageId,
        });
        return;
    }
    // 시스템 메시지는 푸시하지 않음 (멤버 전원에게 가면 스팸/혼선)
    if (messageData.type === "system") {
        firebase_functions_1.logger.info("⏭️ [onMessageCreated] 시스템 메시지 — 푸시 스킵", { roomId, messageId });
        return;
    }
    const textPreview = typeof messageData.text === "string"
        ? messageData.text.substring(0, 50)
        : "";
    firebase_functions_1.logger.info("🔔 [onMessageCreated] 메시지 생성 감지:", {
        roomId,
        messageId,
        senderId,
        text: textPreview,
    });
    try {
        // 1️⃣ 채팅방 정보 조회
        const roomRef = db.doc(`chatRooms/${roomId}`);
        const roomSnap = await roomRef.get();
        if (!roomSnap.exists) {
            firebase_functions_1.logger.warn("⚠️ [onMessageCreated] 채팅방이 존재하지 않음:", { roomId });
            return;
        }
        const roomData = roomSnap.data();
        const members = roomData?.members || roomData?.participants || [];
        // 2️⃣ 발신자를 제외한 멤버 목록 (자기 자신에게는 절대 보내지 않음)
        const targetMembers = members.filter((uid) => uid && uid !== senderId);
        if (targetMembers.length === 0) {
            firebase_functions_1.logger.info("ℹ️ [onMessageCreated] 알림 대상 없음:", { roomId });
            return;
        }
        // 3️⃣ 메시지 미리보기 생성
        let messagePreview = "";
        if (messageData.type === "image") {
            messagePreview = "사진을 보냈습니다";
        }
        else if (messageData.type === "video") {
            messagePreview = "동영상을 보냈습니다";
        }
        else if (messageData.type === "location") {
            messagePreview = "위치를 공유했습니다";
        }
        else {
            messagePreview = messageData.text || "";
            if (messagePreview.length > 50) {
                messagePreview = messagePreview.substring(0, 50) + "...";
            }
        }
        // 4️⃣ 채팅방 이름 결정
        let chatRoomName = "채팅";
        if (roomData?.type === "team" && roomData?.name) {
            chatRoomName = roomData.name;
        }
        else if (roomData?.type === "trade" && roomData?.productSnapshot?.title) {
            chatRoomName = roomData.productSnapshot.title;
        }
        else if (roomData?.name) {
            chatRoomName = roomData.name;
        }
        // 5️⃣ 각 멤버에게 푸시 알림 전송 (users/{uid}/devices 기반)
        const messaging = admin.messaging();
        const notificationPromises = targetMembers.map(async (uid) => {
            try {
                if (uid === senderId) {
                    firebase_functions_1.logger.warn("⏭️ [onMessageCreated] 수신자=발신자 스킵 (방어)", {
                        uid,
                        roomId,
                        messageId,
                    });
                    return;
                }
                firebase_functions_1.logger.info("📤 [onMessageCreated] 푸시 대상 처리 시작", {
                    messageId,
                    recipientUid: uid,
                    roomId,
                    senderId,
                });
                // 🔥 users/{uid}/devices 서브컬렉션에서 토큰 조회 (fcmTokens 배열 대신)
                const devicesRef = db.collection(`users/${uid}/devices`);
                const devicesSnap = await devicesRef.get();
                const validTokens = [];
                const tokenToDocId = new Map();
                devicesSnap.forEach((doc) => {
                    const data = doc.data();
                    const token = data?.token;
                    const enabled = data?.enabled !== false;
                    if (token && typeof token === "string" && enabled) {
                        validTokens.push(token);
                        tokenToDocId.set(token, doc.id);
                    }
                });
                // fcmTokens 하위 호환 (devices가 비어 있으면 users/{uid}.fcmTokens 사용)
                if (validTokens.length === 0) {
                    const userRef = db.doc(`users/${uid}`);
                    const userSnap = await userRef.get();
                    const userData = userSnap.exists ? userSnap.data() : null;
                    const legacyTokens = userData?.fcmTokens || [];
                    const tokens = Array.isArray(legacyTokens) ? legacyTokens : [legacyTokens];
                    tokens.forEach((t) => {
                        if (t && typeof t === "string")
                            validTokens.push(t);
                    });
                }
                if (validTokens.length === 0) {
                    firebase_functions_1.logger.info("ℹ️ [onMessageCreated] FCM 토큰 없음:", { uid, roomId, messageId });
                    return;
                }
                // 🔥 multicast로 여러 디바이스에 한 번에 전송
                const multicastMessage = {
                    notification: {
                        title: chatRoomName,
                        body: messagePreview,
                    },
                    data: {
                        type: "chat",
                        roomId,
                        messageId,
                        senderId: senderId || "",
                        route: `/chat/${roomId}`,
                    },
                    android: {
                        priority: "high",
                    },
                    apns: {
                        headers: {
                            "apns-priority": "10",
                        },
                    },
                    tokens: validTokens,
                };
                const response = await messaging.sendEachForMulticast(multicastMessage);
                // 🔥 실패한 토큰 정리 (devices 문서 비활성화 또는 삭제)
                if (response.failureCount > 0) {
                    const invalidTokens = [];
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success && resp.error) {
                            const code = resp.error.code;
                            if (code === "messaging/invalid-registration-token" ||
                                code === "messaging/registration-token-not-registered") {
                                invalidTokens.push(validTokens[idx]);
                            }
                        }
                    });
                    for (const token of invalidTokens) {
                        const docId = tokenToDocId.get(token);
                        if (docId) {
                            const deviceRef = db.doc(`users/${uid}/devices/${docId}`);
                            await deviceRef.update({
                                enabled: false,
                                updatedAt: firestore_2.FieldValue.serverTimestamp(),
                            });
                            firebase_functions_1.logger.info("🧹 [onMessageCreated] 무효 토큰 비활성화:", { uid, deviceId: docId });
                        }
                        else {
                            // 레거시 fcmTokens 배열에서 제거
                            const userRef = db.doc(`users/${uid}`);
                            await userRef.update({
                                fcmTokens: firestore_2.FieldValue.arrayRemove(token),
                            });
                            firebase_functions_1.logger.info("🧹 [onMessageCreated] 레거시 fcmTokens에서 제거:", { uid });
                        }
                    }
                }
                firebase_functions_1.logger.info("✅ [onMessageCreated] 푸시 알림 전송 성공:", {
                    messageId,
                    uid,
                    roomId,
                    successCount: response.successCount,
                    failureCount: response.failureCount,
                });
            }
            catch (error) {
                firebase_functions_1.logger.error("❌ [onMessageCreated] 푸시 알림 전송 실패:", {
                    messageId,
                    recipientUid: uid,
                    roomId,
                    senderId,
                    error: error?.message,
                    code: error?.code,
                });
            }
        });
        await Promise.allSettled(notificationPromises);
        firebase_functions_1.logger.info("✅ [onMessageCreated] 모든 알림 처리 완료:", {
            roomId,
            messageId,
            targetCount: targetMembers.length,
        });
    }
    catch (error) {
        firebase_functions_1.logger.error("❌ [onMessageCreated] 알림 처리 실패:", {
            roomId,
            messageId,
            error: error.message,
            stack: error.stack,
        });
    }
});
