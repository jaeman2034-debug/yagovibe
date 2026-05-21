/**
 * 🔥 팀 멤버 변경 시 채팅방 멤버 동기화
 * 
 * 역할:
 * - teams/{teamId}/members/{uid} 변경 시
 * - 해당 팀의 채팅방 members 배열 자동 업데이트
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

/**
 * 팀 멤버 변경 시 채팅방 멤버 동기화
 */
export const syncTeamChatMembers = functions.firestore
  .document("teams/{teamId}/members/{uid}")
  .onWrite(async (change, context) => {
    const { teamId } = context.params;
    const afterData = change.after.exists ? change.after.data() : null;
    const beforeData = change.before.exists ? change.before.data() : null;

    logger.info("🔄 [syncTeamChatMembers] 팀 멤버 변경 감지:", {
      teamId,
      uid: context.params.uid,
      beforeStatus: beforeData?.status,
      afterStatus: afterData?.status,
    });

    try {
      // 1️⃣ 팀 채팅방 찾기
      const chatRoomsQuery = await db
        .collection("chatRooms")
        .where("teamId", "==", teamId)
        .where("type", "==", "team")
        .get();

      if (chatRoomsQuery.empty) {
        logger.info("ℹ️ [syncTeamChatMembers] 팀 채팅방이 없습니다:", { teamId });
        return;
      }

      const roomDoc = chatRoomsQuery.docs[0];
      const roomId = roomDoc.id;

      // 2️⃣ 현재 팀 멤버 목록 조회
      const membersSnap = await db
        .collection(`teams/${teamId}/members`)
        .get();

      const memberIds: string[] = [];

      // 팀 정보에서 ownerUid 확인
      const teamDoc = await db.doc(`teams/${teamId}`).get();
      if (teamDoc.exists) {
        const teamData = teamDoc.data();
        
        // ownerUid 추가
        if (teamData?.ownerUid && !memberIds.includes(teamData.ownerUid)) {
          memberIds.push(teamData.ownerUid);
        }
        
        // owners 배열 추가
        if (teamData?.owners && Array.isArray(teamData.owners)) {
          teamData.owners.forEach((uid: string) => {
            if (!memberIds.includes(uid)) {
              memberIds.push(uid);
            }
          });
        }
      }

      // members 서브컬렉션에서 활성 멤버만 추가
      membersSnap.docs.forEach((memberDoc) => {
        const memberData = memberDoc.data();
        const memberUid = memberDoc.id;
        
        // 활성 멤버만 추가
        if (memberData.status === "active" && !memberIds.includes(memberUid)) {
          memberIds.push(memberUid);
        }
      });

      logger.info("👥 [syncTeamChatMembers] 동기화할 멤버 목록:", {
        roomId,
        memberCount: memberIds.length,
        members: memberIds,
      });

      // 3️⃣ 채팅방 members 배열 업데이트
      await db.doc(`chatRooms/${roomId}`).update({
        members: memberIds,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("✅ [syncTeamChatMembers] 채팅방 멤버 동기화 완료:", {
        roomId,
        teamId,
        memberCount: memberIds.length,
      });
    } catch (error: any) {
      logger.error("❌ [syncTeamChatMembers] 동기화 실패:", {
        teamId,
        error: error.message,
        stack: error.stack,
      });
    }
  });
