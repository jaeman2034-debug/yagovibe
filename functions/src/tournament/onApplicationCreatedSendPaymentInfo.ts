/**
 * 🔥 참가 신청 생성 시 납부 계좌 정보 자동 안내
 * applications 생성 시 SYSTEM 메시지 자동 추가
 */

import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

const db = admin.firestore();

/**
 * 참가 신청 생성 시 납부 계좌 정보 자동 안내 메시지 생성
 */
export const onApplicationCreatedSendPaymentInfo = onDocumentCreated(
  {
    document:
      "associations/{associationId}/tournaments/{tournamentId}/applications/{applicationId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const { associationId, tournamentId, applicationId } = event.params;
    const application = event.data?.data();

    if (!application) return;

    try {
      // 대회 정보 조회 (paymentInfo 확인)
      const tournamentRef = db.doc(
        `associations/${associationId}/tournaments/${tournamentId}`
      );
      const tournamentSnap = await tournamentRef.get();

      if (!tournamentSnap.exists) {
        console.warn(
          `[onApplicationCreatedSendPaymentInfo] Tournament not found: ${tournamentId}`
        );
        return;
      }

      const tournament = tournamentSnap.data()!;
      const paymentInfo = tournament.paymentInfo;

      if (!paymentInfo) {
        console.log(
          `[onApplicationCreatedSendPaymentInfo] No paymentInfo for tournament: ${tournamentId}`
        );
        return;
      }

      // 대화 스레드 확인 (공지 기반 대화가 있는지)
      // 참가 신청은 대회별로 관리되므로, 여기서는 간단히 로그만 남기거나
      // 별도 알림 채널을 사용할 수 있음
      // MVP: reminders 서브컬렉션에 안내 메시지 저장

      const remindersRef = db.collection(
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}/reminders`
      );

      const message = `납부 계좌 안내\n\n` +
        `은행: ${paymentInfo.bankName}\n` +
        `계좌: ${paymentInfo.accountNumber}\n` +
        `예금주: ${paymentInfo.accountHolder}\n` +
        (paymentInfo.memoFormat
          ? `입금자명: ${paymentInfo.memoFormat}\n`
          : "") +
        (paymentInfo.notes ? `\n${paymentInfo.notes}` : "");

      await remindersRef.add({
        type: "PAYMENT_INFO",
        message,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[onApplicationCreatedSendPaymentInfo] Payment info sent for application: ${applicationId}`
      );
    } catch (error) {
      console.error(`[onApplicationCreatedSendPaymentInfo] Error:`, error);
      // 에러가 발생해도 신청 생성은 성공했으므로 throw하지 않음
    }
  }
);

