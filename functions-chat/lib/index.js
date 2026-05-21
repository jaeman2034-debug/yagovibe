"use strict";
/**
 * 채팅 FCM 전용 엔트리 — 의존성 최소화 (메인 functions/index 10초 로드 타임아웃 방지)
 *
 * 배포: firebase deploy --only functions:chat
 * 또는 전체: firebase deploy --only functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyOnChatMessage = exports.onMessageCreated = void 0;
var onMessageCreated_1 = require("./src/onMessageCreated");
Object.defineProperty(exports, "onMessageCreated", { enumerable: true, get: function () { return onMessageCreated_1.onMessageCreated; } });
var notifyOnChatMessage_1 = require("./src/notifyOnChatMessage");
Object.defineProperty(exports, "notifyOnChatMessage", { enumerable: true, get: function () { return notifyOnChatMessage_1.notifyOnChatMessage; } });
