/**
 * 🔥 Firebase Admin SDK 초기화 (프로덕션 배포 패키지)
 */

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const fcm = admin.messaging();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
