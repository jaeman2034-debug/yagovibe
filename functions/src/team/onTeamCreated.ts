/**
 * 🔥 팀 생성 시 자동 채팅방 생성
 * 
 * 역할:
 * - teams/{teamId} 생성 시
 * - chatRooms/team_{teamId} 자동 생성
 * - 중복 생성 방지 (roomId를 teamId로 고정)
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * 팀 생성 시 자동 채팅방 생성
 */
export const onTeamCreated = onDocumentCreated(
  "teams/{teamId}",
  async (event) => {
    const teamId = event.params.teamId;
    const teamData = event.data?.data();

    logger.info("🔥 [onTeamCreated] 팀 생성 감지:", {
      teamId,
      teamName: teamData.name,
      ownerUid: teamData.ownerUid,
    });

    try {
      // 🔥 roomId를 teamId로 고정 (중복 생성 방지)
      const roomId = `team_${teamId}`;
      const roomRef = db.doc(`chatRooms/${roomId}`);

      // 🔥 이미 채팅방이 있으면 생성 안 함
      const existingRoom = await roomRef.get();
      if (existingRoom.exists) {
        logger.info("ℹ️ [onTeamCreated] 채팅방이 이미 존재함:", { roomId });
        return;
      }

      // 🔥 초기 멤버: 팀 리더만
      const members: string[] = [];
      
      // ownerUid 추가
      if (teamData.ownerUid) {
        members.push(teamData.ownerUid);
      }
      
      // owners 배열 추가
      if (teamData.owners && Array.isArray(teamData.owners)) {
        teamData.owners.forEach((uid: string) => {
          if (!members.includes(uid)) {
            members.push(uid);
          }
        });
      }

      if (members.length === 0) {
        logger.warn("⚠️ [onTeamCreated] 초기 멤버가 없음:", { teamId });
        return;
      }

      // 🔥 채팅방 생성
      await roomRef.set({
        type: "team",
        teamId,
        name: teamData.name || "팀 채팅",
        members,
        createdBy: members[0], // 첫 번째 멤버를 생성자로
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastMessage: "",
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        unreadCount: members.reduce((acc, uid) => {
          acc[uid] = 0;
          return acc;
        }, {} as Record<string, number>),
      });

      logger.info("✅ [onTeamCreated] 팀 채팅방 생성 완료:", {
        roomId,
        teamId,
        teamName: teamData.name,
        memberCount: members.length,
      });
    } catch (error: any) {
      logger.error("❌ [onTeamCreated] 채팅방 생성 실패:", {
        teamId,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
