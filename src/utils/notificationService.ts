// src/utils/notificationService.ts
// 🔥 알림 엔진: 큐 기반 안전 발송 (분쟁/과금/스팸 방지)

import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type TeamMember, type TeamFeePolicy } from "./teamRules";
// 🔥 Notifier 모듈 통합 import (명시적 경로 사용 - Vite ESM 호환성)
import type { Notifier, Contact, Message } from "./notifiers/Notifier";
import { KakaoAlimtalkNotifier, KAKAO_TEMPLATE_CODES } from "./notifiers/KakaoAlimtalkNotifier";
import { SmsNotifier } from "./notifiers/SmsNotifier";

// 🔥 1. 알림 정책 인터페이스
export interface NotifyPolicy {
  channel: "kakao" | "sms" | "push" | "none";
  unpaidWarningAtMonths: number[]; // [1, 2, 3]
  sendDayOfMonth: number; // 25
  quietHours: { from: string; to: string }; // "21:00", "09:00"
  adminRecipients: string[]; // ["회장", "총무"]
  testMode?: boolean; // 🔥 테스트 모드 (실제 발송 없이 미리보기만)
}

// 🔥 2. 발송 큐 인터페이스
export interface NotificationQueueJob {
  id?: string;
  teamId: string;
  type: "UNPAID_WARNING" | "PAUSED_NOTICE" | "MONTHLY_SUMMARY" | "MEMBER_ATTENTION_NEEDED";
  toMemberId?: string; // MONTHLY_SUMMARY는 null
  toPhoneLast4?: string;
  payload: {
    yyyymm: string;
    unpaidMonths?: number;
    dueAmount?: number;
    paidAmount?: number;
    memberName?: string;
    collected?: number;
    unpaidCount?: number;
    pausedCount?: number;
    [key: string]: any;
  };
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  idempotencyKey: string; // 중복 방지 키
  scheduledAt: Date | Timestamp;
  createdAt: Date | Timestamp;
  error?: string;
  retryCount?: number;
}

// 🔥 3. 발송 로그 인터페이스
export interface NotificationLog {
  id?: string;
  jobId: string;
  teamId: string;
  type: NotificationQueueJob["type"];
  toMemberId?: string;
  channel: "kakao" | "sms" | "push";
  providerMessageId?: string;
  sentAt: Date | Timestamp;
  result: "sent" | "failed" | "skipped";
  snapshotPayload: NotificationQueueJob["payload"];
  error?: string;
}

// 🔥 4. idempotencyKey 생성
export function generateIdempotencyKey(
  type: NotificationQueueJob["type"],
  yyyymm: string,
  memberId?: string,
  unpaidMonths?: number
): string {
  if (type === "MONTHLY_SUMMARY") {
    return `MONTHLY_SUMMARY:${yyyymm}:admins`;
  }
  if (type === "PAUSED_NOTICE") {
    return `PAUSED_NOTICE:${yyyymm}:${memberId}`;
  }
  return `UNPAID_WARNING:${yyyymm}:${memberId}:${unpaidMonths}`;
}

// 🔥 5. 조용 시간 체크
export function isQuietHours(quietHours: { from: string; to: string }): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  const [fromHour, fromMin] = quietHours.from.split(":").map(Number);
  const [toHour, toMin] = quietHours.to.split(":").map(Number);
  const fromTime = fromHour * 60 + fromMin;
  const toTime = toHour * 60 + toMin;

  // 예: 21:00 ~ 09:00
  if (fromTime > toTime) {
    // 자정을 넘어가는 경우
    return currentTime >= fromTime || currentTime < toTime;
  } else {
    return currentTime >= fromTime && currentTime < toTime;
  }
}

// 🔥 6. 큐에 job 추가 (중복 체크 포함)
export async function enqueueNotification(
  teamId: string,
  job: Omit<NotificationQueueJob, "id" | "status" | "createdAt" | "scheduledAt">
): Promise<string | null> {
  // 중복 체크
  const existingQuery = query(
    collection(db, "teams", teamId, "notificationQueue"),
    where("idempotencyKey", "==", job.idempotencyKey),
    where("status", "in", ["queued", "sending", "sent"])
  );
  const existingSnapshot = await getDocs(existingQuery);
  
  if (!existingSnapshot.empty) {
    console.log(`[Notification] 중복 방지: ${job.idempotencyKey} 이미 큐에 있음`);
    return null; // 중복이면 null 반환
  }

  // 정책 조회
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  const notifyPolicy: NotifyPolicy = teamSnap.data()?.notifyPolicy || {
    channel: "kakao",
    unpaidWarningAtMonths: [1, 2],
    sendDayOfMonth: 25,
    quietHours: { from: "21:00", to: "09:00" },
    adminRecipients: ["회장", "총무"],
  };

  // 조용 시간 체크
  const now = new Date();
  let scheduledAt = now;
  
  if (isQuietHours(notifyPolicy.quietHours)) {
    // 조용 시간이면 다음 날 09:00로 예약
    scheduledAt = new Date(now);
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(9, 0, 0, 0);
  }

  // 큐에 추가
  const jobRef = await addDoc(collection(db, "teams", teamId, "notificationQueue"), {
    ...job,
    status: "queued",
    scheduledAt: Timestamp.fromDate(scheduledAt),
    createdAt: serverTimestamp(),
    retryCount: 0,
  });

  return jobRef.id;
}

// 🔥 7. 정산 완료 후 알림 큐 생성
export async function createNotificationQueueAfterReconcile(
  teamId: string,
  yyyymm: string,
  updatedMembers: TeamMember[],
  feePolicy: TeamFeePolicy
): Promise<number> {
  let queueCount = 0;

  // 정책 조회
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  const notifyPolicy: NotifyPolicy = teamSnap.data()?.notifyPolicy || {
    channel: "kakao",
    unpaidWarningAtMonths: [1, 2],
    sendDayOfMonth: 25,
    quietHours: { from: "21:00", to: "09:00" },
    adminRecipients: ["회장", "총무"],
  };

  if (notifyPolicy.channel === "none") {
    return 0; // 알림 비활성화
  }

  // (1) 미납 경고 (unpaidMonths 1~2)
  for (const member of updatedMembers) {
    const unpaidMonths = member.unpaidMonths || 0;
    
    if (unpaidMonths >= 1 && unpaidMonths <= 2 && notifyPolicy.unpaidWarningAtMonths.includes(unpaidMonths)) {
      const idempotencyKey = generateIdempotencyKey("UNPAID_WARNING", yyyymm, member.id, unpaidMonths);
      
      const jobId = await enqueueNotification(teamId, {
        teamId,
        type: "UNPAID_WARNING",
        toMemberId: member.id,
        toPhoneLast4: member.phoneLast4,
        payload: {
          yyyymm,
          unpaidMonths,
          dueAmount: feePolicy.monthly,
          paidAmount: 0,
          memberName: member.name,
        },
        idempotencyKey,
      });
      
      if (jobId) queueCount++;
    }
  }

  // (2) 휴원 처리 통지 (status가 paused로 변경된 경우)
  for (const member of updatedMembers) {
    if (member.status === "paused" && (member.unpaidMonths || 0) >= 3) {
      const idempotencyKey = generateIdempotencyKey("PAUSED_NOTICE", yyyymm, member.id);
      
      const jobId = await enqueueNotification(teamId, {
        teamId,
        type: "PAUSED_NOTICE",
        toMemberId: member.id,
        toPhoneLast4: member.phoneLast4,
        payload: {
          yyyymm,
          unpaidMonths: member.unpaidMonths || 0,
          memberName: member.name,
        },
        idempotencyKey,
      });
      
      if (jobId) queueCount++;
    }
  }

    // (3) 임원 요약 (회장/총무) - PDF 링크 포함
    const adminMembers = updatedMembers.filter(m => 
      notifyPolicy.adminRecipients.includes(m.role)
    );
    
    if (adminMembers.length > 0) {
      // 수납액/미납자 수 계산
      let collected = 0;
      let unpaidCount = 0;
      let pausedCount = 0;
      
      for (const member of updatedMembers) {
        if (member.feePlan !== "exempt") {
          // TODO: 실제 ledger에서 paidAmount 합산
          if ((member.unpaidMonths || 0) === 0) {
            collected += feePolicy.monthly;
          } else {
            unpaidCount++;
          }
        }
        if (member.status === "paused") {
          pausedCount++;
        }
      }

      const idempotencyKey = generateIdempotencyKey("MONTHLY_SUMMARY", yyyymm);
      
      // 각 임원에게 개별 발송 (PDF 링크 포함)
      for (const admin of adminMembers) {
        const jobId = await enqueueNotification(teamId, {
          teamId,
          type: "MONTHLY_SUMMARY",
          toMemberId: admin.id,
          toPhoneLast4: admin.phoneLast4,
          payload: {
            yyyymm,
            collected,
            unpaidCount,
            pausedCount,
            pdfLink: pdfLink || "", // 🔥 PDF 링크 포함
          },
          idempotencyKey: `${idempotencyKey}:${admin.id}`, // 임원별로 고유 키
        });
        
        if (jobId) queueCount++;
      }
    }

  return queueCount;
}

// 🔥 8. 메시지 템플릿 생성 (템플릿 코드 기반)
export function buildNotificationMessage(
  type: NotificationQueueJob["type"],
  payload: NotificationQueueJob["payload"],
  pdfLink?: string // 🔥 월간 요약 PDF 링크
): Message {
  const { yyyymm, unpaidMonths, dueAmount, memberName, collected, unpaidCount, pausedCount } = payload;
  const month = yyyymm ? `${yyyymm.slice(0, 4)}년 ${parseInt(yyyymm.slice(5))}월` : "";

  switch (type) {
    case "UNPAID_WARNING":
      if (unpaidMonths === 1) {
        return {
          templateCode: KAKAO_TEMPLATE_CODES.UNPAID_1M,
          variables: {
            memberName: memberName || "회원",
            month,
            dueAmount: dueAmount?.toLocaleString() || "20,000",
          },
          fallbackText: `${memberName}님, ${month} 회비 ${dueAmount?.toLocaleString()}원이 미납입니다. 납부 확인 부탁드립니다. (미납 1개월)`,
        };
      } else {
        return {
          templateCode: KAKAO_TEMPLATE_CODES.UNPAID_2M,
          variables: {
            memberName: memberName || "회원",
            unpaidMonths: String(unpaidMonths || 2),
          },
          fallbackText: `${memberName}님, 회비가 ${unpaidMonths}개월 미납입니다. 정관 기준 3개월 이상 시 휴원/징계 처리될 수 있습니다.`,
        };
      }
    
    case "PAUSED_NOTICE":
      return {
        templateCode: KAKAO_TEMPLATE_CODES.PAUSED_NOTICE,
        variables: {
          memberName: memberName || "회원",
          unpaidMonths: String(unpaidMonths || 3),
        },
        fallbackText: `${memberName}님, 회비 ${unpaidMonths}개월 미납으로 상태가 '휴원'으로 변경되었습니다. 납부 후 총무에게 말씀해 주세요.`,
      };
    
    case "MONTHLY_SUMMARY":
      return {
        templateCode: KAKAO_TEMPLATE_CODES.MONTHLY_SUMMARY_ADMIN,
        variables: {
          month,
          collected: collected?.toLocaleString() || "0",
          unpaidCount: String(unpaidCount || 0),
          pausedCount: String(pausedCount || 0),
          pdfLink: pdfLink || "", // 🔥 PDF 링크 포함
        },
        fallbackText: `${month} 정산 완료: 수납 ${collected?.toLocaleString()}원 / 미납 ${unpaidCount}명 / 휴원 ${pausedCount}명${pdfLink ? `\n상세 리포트: ${pdfLink}` : ""}`,
      };
    
    default:
      return {
        templateCode: KAKAO_TEMPLATE_CODES.UNPAID_1M,
        variables: {},
        fallbackText: "알림이 있습니다.",
      };
  }
}

// 🔥 9. 연락처 조회 (개인정보 안전 설계)
export async function getContactInfo(
  teamId: string,
  memberId: string
): Promise<Contact | null> {
  try {
    // 🔥 contacts 컬렉션에서 암호화된 전화번호 조회
    const contactRef = doc(db, "teams", teamId, "contacts", memberId);
    const contactSnap = await getDoc(contactRef);
    
    if (contactSnap.exists()) {
      const data = contactSnap.data();
      return {
        memberId,
        phoneE164: data.phoneEncrypted || data.phoneE164, // 암호화된 값 또는 평문 (개발 단계)
        phoneLast4: data.phoneLast4,
        name: data.name,
      };
    }
    
    // 🔥 폴백: members에서 phoneLast4만 조회 (실제 번호는 없음)
    const memberRef = doc(db, "teams", teamId, "members", memberId);
    const memberSnap = await getDoc(memberRef);
    
    if (memberSnap.exists()) {
      const data = memberSnap.data();
      return {
        memberId,
        phoneLast4: data.phoneLast4,
        name: data.name,
      };
    }
    
    return null;
  } catch (error) {
    console.error("연락처 조회 실패:", error);
    return null;
  }
}

// 🔥 10. 큐 워커 (실제 발송 처리) - 카카오 우선 + SMS 폴백
export async function processNotificationQueue(
  teamId: string,
  limit: number = 10,
  pdfLink?: string // 🔥 월간 요약 PDF 링크
): Promise<{ processed: number; succeeded: number; failed: number }> {
  // queued 상태인 job 조회
  const queueQuery = query(
    collection(db, "teams", teamId, "notificationQueue"),
    where("status", "==", "queued"),
    where("scheduledAt", "<=", Timestamp.now())
  );
  
  const queueSnapshot = await getDocs(queueQuery);
  const jobs = queueSnapshot.docs.slice(0, limit);
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // 정책 조회
  const teamRef = doc(db, "teams", teamId);
  const teamSnap = await getDoc(teamRef);
  const notifyPolicy: NotifyPolicy = teamSnap.data()?.notifyPolicy || {
    channel: "kakao",
    unpaidWarningAtMonths: [1, 2],
    sendDayOfMonth: 25,
    quietHours: { from: "21:00", to: "09:00" },
    adminRecipients: ["회장", "총무"],
  };

  // 🔥 Notifier 인스턴스 생성
  const kakaoNotifier = new KakaoAlimtalkNotifier();
  const smsNotifier = new SmsNotifier();

  for (const jobDoc of jobs) {
    const job = jobDoc.data() as NotificationQueueJob;
    processed++;

    try {
      // 상태를 sending으로 변경
      await updateDoc(jobDoc.ref, {
        status: "sending",
      });

      // 🔥 연락처 조회
      const contact = job.toMemberId 
        ? await getContactInfo(teamId, job.toMemberId)
        : null;

      if (!contact || !contact.phoneE164) {
        // 전화번호가 없으면 스킵
        await updateDoc(jobDoc.ref, {
          status: "skipped",
          error: "전화번호 없음",
        });
        continue;
      }

      // 🔥 메시지 생성 (템플릿 코드 기반)
      const message = buildNotificationMessage(
        job.type,
        job.payload,
        job.type === "MONTHLY_SUMMARY" ? pdfLink : undefined // 🔥 월간 요약에만 PDF 링크
      );

      // 🔥 테스트 모드: 실제 발송 없이 preview만 기록
      let result: SendResult;
      let usedProvider = "kakao";

      if (isTestMode) {
        console.log(`[Notification] 🔒 테스트 모드: 실제 발송 없이 미리보기만 기록`);
        result = {
          success: true,
          messageId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          provider: notifyPolicy.channel,
        };
        usedProvider = notifyPolicy.channel;
      } else {
        // 🔥 실제 발송: 카카오 우선
        result = await kakaoNotifier.send(contact, message);
        usedProvider = "kakao";

        // 🔥 카카오 실패 시 SMS 폴백
        if (!result.success && notifyPolicy.channel !== "none") {
          console.log(`[Notification] 카카오 실패, SMS 폴백 시도: ${job.id}`);
          result = await smsNotifier.send(contact, message);
          usedProvider = "sms";
        }
      }

      // 🔥 발송 로그 기록 (테스트 모드 표시)
      await addDoc(collection(db, "teams", teamId, "notificationLogs"), {
        jobId: jobDoc.id,
        teamId,
        type: job.type,
        toMemberId: job.toMemberId,
        channel: usedProvider,
        providerMessageId: result.messageId,
        sentAt: serverTimestamp(),
        result: isTestMode ? "preview" : (result.success ? "sent" : "failed"), // 🔥 테스트 모드는 "preview"
        snapshotPayload: job.payload,
        error: result.error,
        testMode: isTestMode, // 🔥 테스트 모드 플래그
        previewMessage: isTestMode ? message.fallbackText || JSON.stringify(message.variables) : undefined, // 🔥 미리보기 메시지
      });

      // 🔥 큐 상태 업데이트
      if (result.success) {
        await updateDoc(jobDoc.ref, {
          status: "sent",
        });
        succeeded++;
      } else {
        const retryCount = (job.retryCount || 0) + 1;
        if (retryCount >= 3) {
          // 영구 실패
          await updateDoc(jobDoc.ref, {
            status: "failed",
            error: result.error || "발송 실패",
            retryCount,
          });
          failed++;
        } else {
          // 재시도 예약
          await updateDoc(jobDoc.ref, {
            status: "queued",
            retryCount,
            scheduledAt: Timestamp.fromDate(new Date(Date.now() + 60000 * retryCount)), // 1분, 2분, 3분 후
          });
        }
      }
    } catch (error: any) {
      console.error(`[Notification Queue] Job ${jobDoc.id} 처리 실패:`, error);
      await updateDoc(jobDoc.ref, {
        status: "failed",
        error: error.message || "처리 중 오류",
      });
      failed++;
    }
  }

  return { processed, succeeded, failed };
}
