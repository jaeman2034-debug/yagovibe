/**
 * 🔥 출석 체크 시스템
 * 
 * 역할:
 * - 운영진이 출석 체크 시작 시 채팅방에 출석 메시지 발행
 * - 출석 체크 시 점수 자동 적립 (+3점)
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

/**
 * 출석 체크 시작 (운영진이 호출)
 */
export const startAttendanceCheck = functions.https.onCall(async (request) => {
    const { teamId, roomId } = request.data;
    const uid = request.auth?.uid;

    if (!uid || !teamId || !roomId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 없습니다."
      );
    }

    logger.info("📍 [startAttendanceCheck] 출석 체크 시작:", {
      teamId,
      roomId,
      uid,
    });

    try {
      // 1️⃣ 운영진 권한 확인
      const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
      const memberSnap = await memberRef.get();

      if (!memberSnap.exists) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "팀 멤버가 아닙니다."
        );
      }

      const memberData = memberSnap.data();
      const role = memberData?.role || memberData?.accessLevel || "";

      // 운영진 권한 확인 (admin, owner, manager)
      if (!["admin", "owner", "manager"].includes(role)) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "출석 체크는 운영진만 시작할 수 있습니다."
        );
      }

      // 2️⃣ 오늘 날짜
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      // 3️⃣ 출석 문서 생성/초기화
      const attendanceRef = db.doc(`teams/${teamId}/attendance/${dateString}`);
      await attendanceRef.set({
        date: dateString,
        checkedInUsers: [],
        startedBy: uid,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4️⃣ 채팅방에 출석 체크 메시지 발행
      await db.collection(`chatRooms/${roomId}/messages`).add({
        type: "attendance",
        attendanceId: attendanceRef.id,
        date: dateString,
        teamId,
        startedBy: uid,
        checkedInUsers: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        senderId: "system",
        readBy: [],
        text: "📍 오늘 출석 체크 시작!",
      });

      // 5️⃣ 채팅방 lastMessage 업데이트
      await db.doc(`chatRooms/${roomId}`).update({
        lastMessage: "📍 오늘 출석 체크 시작!",
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("✅ [startAttendanceCheck] 출석 체크 시작 완료:", {
        teamId,
        roomId,
        dateString,
      });

      return {
        success: true,
        attendanceId: attendanceRef.id,
        date: dateString,
      };
    } catch (error: any) {
      logger.error("❌ [startAttendanceCheck] 출석 체크 시작 실패:", {
        teamId,
        roomId,
        error: error.message,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "출석 체크 시작에 실패했습니다."
      );
    }
  }
);

/**
 * 출석 체크 (멤버가 호출)
 */
export const checkInAttendance = functions.https.onCall(async (request) => {
    const { teamId, attendanceId } = request.data;
    const uid = request.auth?.uid;

    if (!uid || !teamId || !attendanceId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "필수 파라미터가 없습니다."
      );
    }

    logger.info("✅ [checkInAttendance] 출석 체크:", {
      teamId,
      attendanceId,
      uid,
    });

    try {
      // 1️⃣ 출석 문서 조회
      const attendanceRef = db.doc(`teams/${teamId}/attendance/${attendanceId}`);
      const attendanceSnap = await attendanceRef.get();

      if (!attendanceSnap.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "출석 체크를 찾을 수 없습니다."
        );
      }

      const attendanceData = attendanceSnap.data();
      const checkedInUsers = attendanceData?.checkedInUsers || [];

      // 2️⃣ 이미 출석했는지 확인
      if (checkedInUsers.includes(uid)) {
        throw new functions.https.HttpsError(
          "already-exists",
          "이미 출석 체크를 완료했습니다."
        );
      }

      // 3️⃣ 출석 추가
      await attendanceRef.update({
        checkedInUsers: admin.firestore.FieldValue.arrayUnion(uid),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 4️⃣ 멤버 점수 적립 (+3점)
      const memberRef = db.doc(`teams/${teamId}/members/${uid}`);
      const memberSnap = await memberRef.get();

      if (memberSnap.exists) {
        const memberData = memberSnap.data();
        const currentScore = memberData?.score || 0;
        const newScore = currentScore + 3; // 출석 +3점
        const newLevel = Math.floor(newScore / 50) + 1;

        await memberRef.update({
          score: admin.firestore.FieldValue.increment(3),
          attendanceCount: admin.firestore.FieldValue.increment(1),
          level: newLevel,
          lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info("✅ [checkInAttendance] 출석 점수 적립:", {
          teamId,
          uid,
          newScore,
          newLevel,
        });
      }

      logger.info("✅ [checkInAttendance] 출석 체크 완료:", {
        teamId,
        attendanceId,
        uid,
      });

      return {
        success: true,
        checkedInUsers: [...checkedInUsers, uid],
      };
    } catch (error: any) {
      logger.error("❌ [checkInAttendance] 출석 체크 실패:", {
        teamId,
        attendanceId,
        error: error.message,
      });

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "출석 체크에 실패했습니다."
      );
    }
  }
);
