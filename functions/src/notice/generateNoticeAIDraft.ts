/**
 * 🔥 공지 기반 AI 답변 초안 생성
 * Step 1: AI 자동 답변 (초안)
 */

import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";

// OpenAI는 선택적 import (환경변수 있을 때만)
let openai: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OpenAI = require("openai");
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (e) {
  console.warn("[generateNoticeAIDraft] OpenAI 패키지 없음, 스텁 모드로 동작");
}

/**
 * 공지 기반 AI 답변 초안 생성
 * POST /generateNoticeAIDraft
 */
export const generateNoticeAIDraft = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
      // 인증 확인
      const authHeader = req.headers.authorization || "";
      const idToken = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
      if (!idToken) {
        return res.status(401).json({ error: "NO_AUTH" });
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      // TODO: ADMIN 권한 확인 (associations/{aid}/adminUids 체크)
      void decoded;

      const {
        noticeTitle,
        noticeContent,
        userQuestion,
        faqs,
        feePolicy,
      } = req.body ?? {};

      if (!noticeTitle || !noticeContent || !userQuestion) {
        return res.status(400).json({ error: "MISSING_PARAMS" });
      }

      // FAQ 배열 (선택적)
      const faqList: Array<{ question: string; answer: string }> =
        Array.isArray(faqs) ? faqs : [];

      // 참가비 정책 (선택적)
      const fee =
        feePolicy &&
        typeof feePolicy === "object" &&
        "baseFee" in feePolicy &&
        "baseTeamCount" in feePolicy &&
        "extraFeePerTeam" in feePolicy
          ? (feePolicy as {
              baseFee: number;
              baseTeamCount: number;
              extraFeePerTeam: number;
            })
          : null;

      // 🔥 참가비 질문 감지 및 자동 계산 (시스템 계산, AI 문장 생성)
      const isFeeQuestion = /참가비|얼마|비용|금액/.test(userQuestion);
      
      /**
       * 팀 수 추출 함수
       * "3팀", "3 팀", "세 팀" 등 패턴 감지
       */
      function extractTeamCount(text: string): number | null {
        // 숫자 + "팀" 패턴
        const match1 = text.match(/(\d+)\s*팀/);
        if (match1) return Number(match1[1]);
        
        // 한글 숫자 (간단 버전)
        const hanjaMap: Record<string, number> = {
          일: 1, 이: 2, 삼: 3, 사: 4, 오: 5,
          육: 6, 칠: 7, 팔: 8, 구: 9, 십: 10,
        };
        for (const [hanja, num] of Object.entries(hanjaMap)) {
          if (text.includes(`${hanja}팀`)) return num;
        }
        
        return null;
      }

      /**
       * 참가비 계산 함수 (서버에서 실행)
       */
      function calcEntryFee(
        teamCount: number,
        feePolicy: {
          baseFee: number;
          baseTeamCount: number;
          extraFeePerTeam: number;
        }
      ) {
        const validTeamCount = Math.max(1, teamCount);
        const extraTeams = Math.max(0, validTeamCount - feePolicy.baseTeamCount);
        const extraFee = extraTeams * feePolicy.extraFeePerTeam;
        const total = feePolicy.baseFee + extraFee;
        return { extraTeams, extraFee, total };
      }

      // 🔥 참가비 질문 + 팀 수 추출 성공 → 시스템 계산 답변
      if (isFeeQuestion && fee) {
        const teamCount = extractTeamCount(userQuestion);
        
        if (teamCount && teamCount > 0) {
          // 시스템 계산 실행
          const { extraTeams, total } = calcEntryFee(teamCount, fee);
          
          // 계산 결과 기반 답변 생성 (AI 없이 직접 생성)
          let draft = `문의주신 참가비 안내드립니다.\n\n`;
          draft += `${teamCount}팀 참가 기준 참가비는 아래와 같습니다.\n\n`;
          draft += `- 기본 참가비: ${fee.baseFee.toLocaleString()}원 (1~${fee.baseTeamCount}팀 기준)\n`;
          
          if (extraTeams > 0) {
            draft += `- 추가 참가비: ${extraTeams}팀 × ${fee.extraFeePerTeam.toLocaleString()}원\n`;
          }
          
          draft += `\n▶ 총 참가비: ${total.toLocaleString()}원\n\n`;
          draft += `본 금액은 현재 게시된 공식 공지 기준으로 산정된 금액입니다.`;
          
          return res.json({ draft });
        } else {
          // 참가비 질문이지만 팀 수 없음 → 일반 안내
          let draft = `참가비 안내드립니다.\n\n`;
          draft += `- 기본 참가비: ${fee.baseFee.toLocaleString()}원 (1~${fee.baseTeamCount}팀 기준)\n`;
          draft += `- 추가 참가비: 1팀당 ${fee.extraFeePerTeam.toLocaleString()}원\n\n`;
          draft += `참가 팀 수를 알려주시면 정확한 금액을 안내드리겠습니다.`;
          
          return res.json({ draft });
        }
      }

      // OpenAI가 없으면 스텁 응답
      if (!openai) {
        return res.json({
          draft: `[AI 초안 - 스텁 모드]\n\n공지 제목: ${noticeTitle}\n\n사용자 질문: ${userQuestion}\n\n공지 내용을 기준으로 답변을 작성해주세요.`,
        });
      }

      // FAQ 우선 참고 프롬프트 구성
      let faqSection = "";
      if (faqList.length > 0) {
        faqSection = `\n\n[고정 FAQ (우선 참고)]
${faqList
  .map((faq, idx) => `Q${idx + 1}. ${faq.question}\nA${idx + 1}. ${faq.answer}`)
  .join("\n\n")}

⚠️ 중요: 사용자 질문이 위 FAQ 중 하나와 동일하거나 유사하면, 해당 FAQ의 답변을 그대로 사용하라.
FAQ에 없을 경우에만 아래 공지 내용을 참고하라.`;
      }

      // 참가비 계산 헬퍼 함수 (AI 프롬프트에 포함 - 참가비 질문이 아닐 때만)
      let feeCalcSection = "";
      if (fee && !isFeeQuestion) {
        feeCalcSection = `\n\n[참가비 계산 규칙]
- 기본 참가비: ${fee.baseFee.toLocaleString()}원 (1~${fee.baseTeamCount}팀 기준)
- 추가 참가비: 1팀당 ${fee.extraFeePerTeam.toLocaleString()}원
- 계산 공식: 총 참가비 = 기본 참가비 + (추가 팀 수 × 추가 참가비)
- 예시: 3팀 참가 시 = ${fee.baseFee.toLocaleString()}원 + (1 × ${fee.extraFeePerTeam.toLocaleString()}원) = ${(fee.baseFee + fee.extraFeePerTeam).toLocaleString()}원

⚠️ 참가비 관련 질문이면 위 규칙을 사용하여 정확히 계산하라.`;
      }

      const prompt = `너는 축구협회 운영 보조 AI다.
아래 '공지 내용'만을 근거로 사용자 질문에 답변하라.${feeCalcSection}${faqSection}

[공지 제목]
${noticeTitle}

[공지 내용]
${noticeContent}

[사용자 질문]
${userQuestion}

규칙:
${fee ? "- 참가비 관련 질문이면 위 계산 규칙을 사용하여 정확히 계산하라.\n" : ""}${faqList.length > 0 ? "- FAQ에 동일/유사 질문이 있으면 그 답변을 그대로 사용하라.\n" : ""}- FAQ에 없을 경우에만 공지 내용을 참고하라.
- 공지에 없는 내용은 "추후 공지 예정입니다"라고 답변
- 단정적 표현 금지
- 공지 기준임을 명확히 언급
- 공문 톤 유지
- 추측하거나 공지 외 정보를 제공하지 말 것`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "너는 공지 기반 문의 답변 AI다. 공지 내용만을 기준으로 답변한다.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 500,
      });

      const draft =
        completion.choices[0]?.message?.content ??
        "답변을 생성하지 못했습니다.";

      return res.json({ draft });
    } catch (e: any) {
      console.error("[generateNoticeAIDraft] 오류:", e);
      return res.status(500).json({
        error: "INTERNAL",
        message: e.message || "AI 초안 생성 실패",
      });
    }
  }
);

