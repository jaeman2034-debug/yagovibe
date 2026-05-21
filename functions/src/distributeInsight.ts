import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fetch from "node-fetch";
import * as nodemailer from "nodemailer";
import { google } from "googleapis";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Step 24: AI 인사이트 자동 배포 (Notion + Google Drive + 이메일 첨부)
 * insights/weekly 문서의 pdfUrl이 업데이트되면 자동으로 외부 채널로 배포
 */
export const distributeInsight = onDocumentWritten(
  {
    document: "insights/weekly",
    region: "asia-northeast3",
    timeoutSeconds: 300, // 외부 API 호출 시간 고려
  },
  async (event) => {
    try {
      const after = event.data?.after?.data();
      const before = event.data?.before?.data();

      // pdfUrl이 새로 생성되었거나 변경되었을 때만 실행
      if (!after?.pdfUrl) {
        logger.info("ℹ️ pdfUrl이 없습니다. 배포를 건너뜁니다.");
        return;
      }

      // 이미 배포가 완료되었고 pdfUrl이 변경되지 않았으면 건너뛰기
      if (before?.pdfUrl === after.pdfUrl && after.distributed) {
        logger.info("ℹ️ 이미 배포가 완료되었습니다. 건너뜁니다.");
        return;
      }

      logger.info("🚀 AI 인사이트 PDF 배포 시작");

      const { content, pdfUrl, generatedAt, reportCount } = after;

      // PDF 파일 다운로드 (Google Drive와 이메일 첨부용)
      let pdfBuffer: Buffer | null = null;
      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`PDF 다운로드 실패: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        pdfBuffer = Buffer.from(arrayBuffer);
        logger.info("✅ PDF 다운로드 완료");
      } catch (error: any) {
        logger.error("❌ PDF 다운로드 오류:", error);
        // PDF 다운로드 실패해도 계속 진행
      }

      // JSON 파싱 시도
      let parsedContent: any = null;
      try {
        const jsonMatch = content?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        // JSON 파싱 실패 시 원본 텍스트 사용
      }

      const dateStr = generatedAt?.toDate
        ? generatedAt.toDate().toLocaleDateString("ko-KR")
        : new Date().toLocaleDateString("ko-KR");

      const title = `AI 주간 인사이트 리포트 (${dateStr})`;
      const summary = parsedContent?.trends
        ? parsedContent.trends.slice(0, 1000)
        : content?.slice(0, 1000) || "";

      // ✅ 1. Notion 페이지 생성
      const notionToken = process.env.NOTION_TOKEN;
      const notionDB = process.env.NOTION_DB_ID;

      if (notionToken && notionDB) {
        try {
          const notionBody: any = {
            parent: { database_id: notionDB },
            properties: {
              Name: {
                title: [
                  {
                    text: {
                      content: title,
                    },
                  },
                ],
              },
              Date: {
                date: {
                  start: generatedAt?.toDate
                    ? generatedAt.toDate().toISOString()
                    : new Date().toISOString(),
                },
              },
              Status: {
                select: {
                  name: "Generated",
                },
              },
            },
            children: [
              {
                object: "block",
                type: "heading_2",
                heading_2: {
                  rich_text: [
                    {
                      text: {
                        content: "📊 주요 트렌드",
                      },
                    },
                  ],
                },
              },
              {
                object: "block",
                type: "paragraph",
                paragraph: {
                  rich_text: [
                    {
                      text: {
                        content: summary,
                      },
                    },
                  ],
                },
              },
            ],
          };

          // 키워드 추가
          if (parsedContent?.keywords && Array.isArray(parsedContent.keywords)) {
            notionBody.children.push({
              object: "block",
              type: "heading_2",
              heading_2: {
                rich_text: [
                  {
                    text: {
                      content: "🔑 주요 키워드",
                    },
                  },
                ],
              },
            });

            parsedContent.keywords.forEach((keyword: string) => {
              notionBody.children.push({
                object: "block",
                type: "bulleted_list_item",
                bulleted_list_item: {
                  rich_text: [
                    {
                      text: {
                        content: keyword.replace(/^#+/, ""),
                      },
                    },
                  ],
                },
              });
            });
          }

          // PDF 링크 추가
          notionBody.children.push({
            object: "block",
            type: "heading_2",
            heading_2: {
              rich_text: [
                {
                  text: {
                    content: "📎 PDF 리포트",
                  },
                },
              ],
            },
          });

          notionBody.children.push({
            object: "block",
            type: "bookmark",
            bookmark: {
              url: pdfUrl,
              caption: [
                {
                  text: {
                    content: "PDF 리포트 보기",
                  },
                },
              ],
            },
          });

          const notionResponse = await fetch("https://api.notion.com/v1/pages", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${notionToken}`,
              "Notion-Version": "2022-06-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(notionBody),
          });

          if (!notionResponse.ok) {
            const errorText = await notionResponse.text();
            throw new Error(`Notion API 오류: ${notionResponse.status} ${errorText}`);
          }

          const notionResult = await notionResponse.json();
          logger.info("✅ Notion 페이지 생성 완료:", notionResult.id);
        } catch (notionError: any) {
          logger.error("❌ Notion 페이지 생성 오류:", notionError);
          // Notion 오류는 전체 프로세스를 실패시키지 않음
        }
      } else {
        logger.info("ℹ️ Notion 설정이 없어 Notion 생성을 건너뜁니다.");
      }

      // ✅ 2. Google Drive 업로드
      const gdriveFolderId = process.env.GDRIVE_FOLDER_ID;
      const googleServiceKey = process.env.GOOGLE_SERVICE_KEY;

      if (gdriveFolderId && googleServiceKey && pdfBuffer) {
        try {
          let credentials;
          try {
            credentials = JSON.parse(googleServiceKey);
          } catch (e) {
            throw new Error("GOOGLE_SERVICE_KEY가 유효한 JSON이 아닙니다.");
          }

          const auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ["https://www.googleapis.com/auth/drive.file"],
          });

          const drive = google.drive({ version: "v3", auth });

          const fileName = `AI_Report_${dateStr.replace(/\//g, "-")}.pdf`;

          const fileMetadata = {
            name: fileName,
            parents: [gdriveFolderId],
          };

          const media = {
            mimeType: "application/pdf",
            body: pdfBuffer,
          };

          const driveResponse = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: "id, name, webViewLink",
          });

          logger.info("✅ Google Drive 업로드 완료:", driveResponse.data.id);
          logger.info("📎 Google Drive 링크:", driveResponse.data.webViewLink);
        } catch (driveError: any) {
          logger.error("❌ Google Drive 업로드 오류:", driveError);
          // Google Drive 오류는 전체 프로세스를 실패시키지 않음
        }
      } else {
        logger.info("ℹ️ Google Drive 설정이 없어 업로드를 건너뜁니다.");
      }

      // ✅ 3. 이메일 발송 (PDF 첨부)
      const gmailUser = process.env.GMAIL_USER;
      const gmailPass = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
      const sendGridApiKey = process.env.SENDGRID_API_KEY;
      const managerEmail = process.env.MANAGER_EMAIL || gmailUser || "admin@yagovibe.com";

      if ((gmailUser && gmailPass) || sendGridApiKey) {
        try {
          const transporter = sendGridApiKey
            ? nodemailer.createTransport({
                service: "SendGrid",
                auth: {
                  user: "apikey",
                  pass: sendGridApiKey,
                },
              })
            : nodemailer.createTransport({
                service: "gmail",
                auth: {
                  user: gmailUser,
                  pass: gmailPass,
                },
              });

          const emailSubject = `📊 YAGO SPORTS AI 주간 인사이트 리포트 - ${dateStr}`;

          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { padding: 20px; background: #f9fafb; }
    .card { background: white; padding: 20px; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .button { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📄 YAGO SPORTS AI 주간 인사이트 리포트</h1>
    <p style="margin: 0; opacity: 0.9;">생성일: ${dateStr}</p>
  </div>
  
  <div class="content">
    <div class="card">
      <h2>📊 리포트 요약</h2>
      <p>${summary}</p>
      <p><strong>분석 리포트 수:</strong> ${reportCount || 0}개</p>
    </div>
    
    <div class="card">
      <h2>📎 다운로드</h2>
      <p>PDF 리포트가 첨부되어 있습니다. 아래 링크에서도 확인할 수 있습니다.</p>
      <a href="${pdfUrl}" class="button">📄 PDF 보기</a>
    </div>
  </div>
  
  <div class="footer">
    <p>© 2025 YAGO SPORTS · Powered by AI</p>
    <p>이 이메일은 자동으로 생성되었습니다.</p>
  </div>
</body>
</html>
          `.trim();

          const attachments: nodemailer.Attachment[] = [];

          // PDF 첨부
          if (pdfBuffer) {
            attachments.push({
              filename: `AI_Report_${dateStr.replace(/\//g, "-")}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            });
          }

          await transporter.sendMail({
            from: `"YAGO SPORTS AI" <${gmailUser || "noreply@yagovibe.com"}>`,
            to: managerEmail,
            subject: emailSubject,
            html: emailHtml,
            text: `YAGO SPORTS AI 주간 인사이트 PDF 리포트\n\n생성일: ${dateStr}\n분석 리포트 수: ${reportCount || 0}개\n\nPDF 다운로드: ${pdfUrl}`,
            attachments: attachments,
          });

          logger.info("✅ 이메일 발송 완료 (PDF 첨부)");
        } catch (emailError: any) {
          logger.error("❌ 이메일 발송 오류:", emailError);
          // 이메일 오류는 전체 프로세스를 실패시키지 않음
        }
      } else {
        logger.info("ℹ️ 이메일 설정이 없어 이메일 발송을 건너뜁니다.");
      }

      // 배포 완료 마킹
      await event.data?.after?.ref.update({
        distributed: true,
        distributedAt: FieldValue.serverTimestamp(),
      });

      logger.info("✅ AI 인사이트 배포 완료");
    } catch (error: any) {
      logger.error("❌ AI 인사이트 배포 오류:", error);
      try {
        // 에러 로그 기록
        await db.collection("insights-log").add({
          createdAt: FieldValue.serverTimestamp(),
          event: "distribution_error",
          error: error.message,
          status: "error",
        });
      } catch (logError) {
        logger.error("❌ 에러 로그 기록 실패:", logError);
      }
    }
  }
);

