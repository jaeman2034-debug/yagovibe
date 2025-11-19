import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Slack 요청 서명 검증
 */
function verifySlackRequest(
  body: string,
  signature: string,
  timestamp: string,
  signingSecret: string
): boolean {
  const hmac = crypto.createHmac("sha256", signingSecret);
  const [version, hash] = signature.split("=");
  hmac.update(`${version}:${timestamp}:${body}`);
  const calculatedHash = hmac.digest("hex");
  return calculatedHash === hash;
}

/**
 * Step 31: Slack 봇 - Slash Commands 및 Interactivity 처리
 * 지원하는 명령어:
 * - /report: 최신 리포트 정보 조회
 * - /tts: 최신 TTS 음성 리포트 링크
 * - /pdf: 최신 PDF 리포트 링크
 * - /feedback: 피드백 수집
 */
export const slackBot = onRequest(
  {
    region: "asia-northeast3",
    cors: true,
    maxInstances: 10,
  },
  async (req, res) => {
    try {
      // URL Verification (Slack Events API)
      if (req.body?.type === "url_verification") {
        res.status(200).json({ challenge: req.body.challenge });
        return;
      }

      // 서명 검증 (Slack Events API 또는 Slash Commands)
      const signingSecret = process.env.SLACK_SIGNING_SECRET;
      if (signingSecret) {
        const signature = req.headers["x-slack-signature"] as string;
        const timestamp = req.headers["x-slack-request-timestamp"] as string;

        if (signature && timestamp) {
          // Slash Commands는 application/x-www-form-urlencoded 형식
          // Events API는 JSON 형식
          const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
          const isValid = verifySlackRequest(rawBody, signature, timestamp, signingSecret);

          if (!isValid) {
            logger.warn("⚠️ Slack 요청 서명 검증 실패");
            res.status(401).send("Unauthorized");
            return;
          }
        }
      }

      // Slash Command 처리
      if (req.body?.command) {
        const { command, text, user_id, user_name, response_url } = req.body;

        logger.info(`📱 Slack 명령어 수신: ${command} from ${user_name}`);

        let response: any = {};

        switch (command) {
          case "/report":
            // 최신 리포트 정보 조회
            const reportsSnap = await db
              .collection("reports")
              .orderBy("date", "desc")
              .limit(1)
              .get();

            if (reportsSnap.empty) {
              response = {
                text: "📊 최신 리포트가 없습니다.",
              };
            } else {
              const report = reportsSnap.docs[0].data();
              const dateStr = report.date?.toDate
                ? report.date.toDate().toLocaleDateString("ko-KR")
                : "날짜 미상";

              response = {
                text: `📊 *최신 리포트*\n\n📅 생성일: ${dateStr}\n📝 제목: ${report.title || "제목 없음"}\n📈 총 판매(추정): ${(report.totalSales || 0).toLocaleString()}개`,
                attachments: [
                  ...(report.pdfUrl
                    ? [
                        {
                          color: "#007bff",
                          actions: [
                            {
                              type: "button",
                              text: "📄 PDF 보기",
                              url: report.pdfUrl,
                            },
                          ],
                        },
                      ]
                    : []),
                  ...(report.audioUrl || report.ttsUrl
                    ? [
                        {
                          color: "#10b981",
                          actions: [
                            {
                              type: "button",
                              text: "🔊 음성 듣기",
                              url: report.audioUrl || report.ttsUrl,
                            },
                          ],
                        },
                      ]
                    : []),
                ],
              };
            }
            break;

          case "/tts":
            // 최신 TTS 음성 리포트
            const insightsSnap = await db.doc("insights/weekly").get();
            const insight = insightsSnap.exists() ? insightsSnap.data() : null;

            if (!insight?.ttsUrl) {
              response = {
                text: "🔊 TTS 음성 리포트가 아직 생성되지 않았습니다.",
              };
            } else {
              response = {
                text: `🔊 *최신 TTS 음성 리포트*\n\n🎧 아래 버튼을 클릭하여 음성을 들어보세요!`,
                attachments: [
                  {
                    color: "#10b981",
                    actions: [
                      {
                        type: "button",
                        text: "🔊 음성 듣기",
                        url: insight.ttsUrl,
                        style: "primary",
                      },
                    ],
                  },
                ],
              };
            }
            break;

          case "/pdf":
            // 최신 PDF 리포트
            const combinedSnap = await db.doc("reports/combined").get();
            const combined = combinedSnap.exists() ? combinedSnap.data() : null;

            if (!combined?.pdfUrl && !combined?.url) {
              response = {
                text: "📄 PDF 리포트가 아직 생성되지 않았습니다.",
              };
            } else {
              const pdfUrl = combined.pdfUrl || combined.url;
              response = {
                text: `📄 *최신 PDF 리포트*\n\n📎 아래 버튼을 클릭하여 PDF를 확인하세요!`,
                attachments: [
                  {
                    color: "#007bff",
                    actions: [
                      {
                        type: "button",
                        text: "📄 PDF 보기",
                        url: pdfUrl,
                        style: "primary",
                      },
                    ],
                  },
                ],
              };
            }
            break;

          case "/feedback":
            // 피드백 수집
            const feedbackText = text || "";
            const parts = feedbackText.split("|");

            if (parts.length < 2) {
              response = {
                text: "💡 피드백 형식: `/feedback [rating] | [what/issue/idea]`\n\n예시:\n`/feedback 5 | 좋은 기능이에요!`\n`/feedback 3 | 버그가 발생했어요`\n`/feedback 4 | 이런 기능 추가하면 좋을 것 같아요`",
              };
            } else {
              const rating = parseInt(parts[0].trim()) || null;
              const content = parts.slice(1).join("|").trim();

              await db.collection("betaFeedback").add({
                email: `${user_name}@slack`,
                user: user_name,
                rating,
                what: content,
                issue: null,
                idea: null,
                createdAt: FieldValue.serverTimestamp(),
                timestamp: Date.now(),
                source: "slack",
              });

              response = {
                text: `✅ 피드백이 전송되었습니다!\n\n평점: ${rating ? "★".repeat(rating) : "없음"}\n내용: ${content}`,
              };
            }
            break;

          default:
            response = {
              text: `❓ 알 수 없는 명령어입니다.\n\n지원하는 명령어:\n• /report - 최신 리포트 조회\n• /tts - 최신 TTS 음성 리포트\n• /pdf - 최신 PDF 리포트\n• /feedback [rating] | [내용] - 피드백 전송`,
            };
        }

        // Slack에 즉시 응답
        res.status(200).json(response);
        return;
      }

      // Interactivity 처리 (버튼 클릭 등)
      if (req.body?.payload) {
        const payload = JSON.parse(req.body.payload);
        logger.info("📱 Slack Interactivity 수신:", payload.type);

        // 여기에 추가적인 인터랙티브 처리 로직 추가 가능
        res.status(200).json({ ok: true });
        return;
      }

      // 기본 응답
      res.status(200).json({ ok: true });
    } catch (error: any) {
      logger.error("❌ Slack 봇 처리 오류:", error);
      res.status(500).json({
        ok: false,
        error: error.message || "알 수 없는 오류",
      });
    }
  }
);

