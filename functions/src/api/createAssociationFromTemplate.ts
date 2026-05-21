/**
 * 협회 생성 (템플릿 기반)
 * 
 * 노원구 템플릿을 기반으로 새 협회를 생성
 * - 기본 정보
 * - Policy 설정
 * - 리포트 설정
 * - 시설 (템플릿 기반, 나중에 추가 가능)
 */

import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

const db = admin.firestore();

interface CreateAssociationRequest {
  name: string;
  region: string;
  templateId: string;
  adminEmails: string[];
}

/**
 * 노원구 템플릿 설정
 */
const NOWON_TEMPLATE = {
  policy: {
    teamTypes: ["MEMBER", "NON_MEMBER", "ACADEMY"],
    facilityAccessPolicy: {
      ASSOCIATION_PRIORITY: ["MEMBER"],
      ASSOCIATION_MANAGED: ["MEMBER", "ACADEMY"],
      PUBLIC_OPEN: ["MEMBER", "NON_MEMBER", "ACADEMY"],
    },
  },
  reportSettings: {
    enabled: true,
    recipients: [],
  },
};

/**
 * 협회 ID 생성 (지역 기반)
 */
function generateAssociationId(name: string, region: string): string {
  // 협회명에서 한글 제거하고 영문/숫자만 추출
  // 예: "강남구축구협회" → "gangnam-football"
  const normalizedName = name
    .replace(/[^가-힣a-zA-Z0-9]/g, "")
    .toLowerCase()
    .replace(/축구협회/g, "football")
    .replace(/농구협회/g, "basketball")
    .replace(/야구협회/g, "baseball")
    .replace(/구/g, "-gu")
    .replace(/군/g, "-gun")
    .replace(/시/g, "-si")
    .replace(/도/g, "-do")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `assoc-${normalizedName}`;
}

/**
 * 협회 생성 (템플릿 기반)
 */
export const createAssociationFromTemplate = onCall(
  {
    region: "asia-northeast3",
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (request) => {
    const { name, region, templateId, adminEmails } = request.data as CreateAssociationRequest;

    // 입력 검증
    if (!name || !region || !templateId) {
      throw new Error("필수 항목이 누락되었습니다: name, region, templateId");
    }

    // 협회 ID 생성
    const associationId = generateAssociationId(name, region);

    // 중복 체크
    const existingDoc = await db.doc(`associations/${associationId}`).get();
    if (existingDoc.exists) {
      throw new Error(`이미 존재하는 협회 ID입니다: ${associationId}`);
    }

    try {
      // 템플릿 선택 (현재는 노원구만)
      let template = NOWON_TEMPLATE;
      if (templateId !== "nowon-football-template") {
        logger.warn(`알 수 없는 템플릿 ID: ${templateId}, 노원구 템플릿 사용`);
        template = NOWON_TEMPLATE;
      }

      // 리포트 수신자 설정 (관리자 이메일 + 기본 설정)
      const reportSettings = {
        ...template.reportSettings,
        recipients: adminEmails.filter((email) => email && email.includes("@")),
        enabled: true,
      };

      // 협회 문서 생성
      const associationData = {
        id: associationId,
        name,
        region,
        templateId,
        policy: template.policy,
        report_settings: reportSettings,
        adminEmails: adminEmails.filter((email) => email && email.includes("@")),
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await db.doc(`associations/${associationId}`).set(associationData);

      logger.info(`✅ 협회 생성 완료: ${associationId}`, {
        name,
        region,
        templateId,
      });

      return {
        success: true,
        associationId,
        message: "협회가 성공적으로 생성되었습니다.",
      };
    } catch (error: any) {
      logger.error(`❌ 협회 생성 실패: ${error}`, {
        name,
        region,
        templateId,
        error: error.message,
      });
      throw new Error(`협회 생성 실패: ${error.message}`);
    }
  }
);

