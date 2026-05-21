import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import * as fs from "fs";
import * as QRCode from "qrcode";
import { jsPDF } from "jspdf";

if (!admin.apps.length) {
    admin.initializeApp();
}

const tts = new TextToSpeechClient();
const REGION = "asia-northeast3";
const BUCKET = admin.storage().bucket();

/**
 * TTS 음성 생성 + PDF 생성 (오디오 링크 + QR 코드 포함)
 * reports/weekly 문서 업데이트 시 자동 실행
 */
export const generateTTSAndPDF = onDocumentUpdated(
    {
        document: "reports/weekly",
        region: REGION,
        timeoutSeconds: 540,
    },
    async (event) => {
        const before = event.data?.before?.data() || {};
        const after = event.data?.after?.data() || {};

        // reports/weekly/data/summary에서 요약 가져오기
        let summary = "";
        try {
            const summaryDoc = await admin.firestore()
                .collection("reports").doc("weekly")
                .collection("data").doc("summary").get();
            
            if (summaryDoc.exists) {
                const summaryData = summaryDoc.data();
                summary = `${summaryData?.highlight || ""}\n${summaryData?.recommendation || ""}`.trim();
            } else if (after?.summary) {
                // reports/weekly에 직접 summary가 있는 경우
                summary = String(after.summary);
            }
        } catch (err) {
            logger.warn("⚠️ 요약 데이터를 불러올 수 없습니다:", err);
        }

        // 요약이 없으면 작업 불가
        if (!summary) {
            logger.warn("⚠️ 요약이 없어 TTS/PDF 생성을 건너뜁니다.");
            return;
        }

        // 이미 만들어진 경우는 건너뛰되, 'voice'가 바뀌면 재생성
        const voiceChanged = before?.voice !== after?.voice;
        const needTTS = voiceChanged || !after?.audioURL;
        const needPDF = voiceChanged || !after?.pdfURL;

        let audioURL = after.audioURL as string | undefined;

        try {
            // 1️⃣ TTS 생성
            if (needTTS) {
                logger.info("🎤 TTS 생성 시작...");
                const voice = (after.voice as string) || "ko-KR-Standard-A"; // 기본 한국어 여성
                const text = String(summary).slice(0, 4800); // TTS 길이 제한 안전 구간

                const [resp] = await tts.synthesizeSpeech({
                    input: { text },
                    voice: {
                        languageCode: voice.startsWith("en") ? "en-US" : "ko-KR",
                        name: voice, // 예: "ko-KR-Standard-A", "ko-KR-Standard-B", "en-US-Standard-E" 등
                    },
                    audioConfig: { audioEncoding: "MP3" },
                });

                const tmpMp3 = `/tmp/weekly_tts_${Date.now()}.mp3`;
                fs.writeFileSync(tmpMp3, resp.audioContent as Buffer);

                const destMp3 = `reports/weekly/tts_${Date.now()}.mp3`;
                await BUCKET.upload(tmpMp3, {
                    destination: destMp3,
                    metadata: { contentType: "audio/mpeg", cacheControl: "public,max-age=3600" },
                });

                fs.unlinkSync(tmpMp3);
                audioURL = `https://storage.googleapis.com/${BUCKET.name}/${destMp3}`;
                logger.info("✅ TTS 업로드 완료:", audioURL);
            }

            // 2️⃣ PDF 생성 (요약 + 오디오 링크 + QR 코드)
            if (needPDF) {
                logger.info("📄 PDF 생성 시작...");
                const pdf = new jsPDF({ unit: "mm", format: "a4" });

                // 헤더
                pdf.setFontSize(18);
                pdf.text("YAGO SPORTS — AI Weekly Report", 14, 18);

                // 날짜/음성
                pdf.setFontSize(11);
                pdf.text(`Generated: ${new Date().toLocaleString("ko-KR")}`, 14, 26);
                pdf.text(`Voice: ${after.voice || "ko-KR-Standard-A"}`, 14, 32);

                // 요약 본문 (자동 줄바꿈)
                pdf.setFontSize(12);
                const body = pdf.splitTextToSize(summary, 182); // 좌우 14mm 여백
                pdf.text("Summary:", 14, 42);
                pdf.setFontSize(11);
                pdf.text(body, 14, 50);

                // 오디오 버튼/링크
                if (audioURL) {
                    pdf.setTextColor(0, 0, 200);
                    pdf.setFontSize(12);
                    pdf.textWithLink("🔊 음성 듣기 (클릭)", 14, 88, { url: audioURL });
                    pdf.setTextColor(0, 0, 0);

                    // QR 코드(오디오 링크)
                    const qrDataUrl = await QRCode.toDataURL(audioURL, { margin: 1, scale: 4 });
                    // 우측 상단에 QR 삽입 (가로 30mm)
                    pdf.addImage(qrDataUrl, "PNG", 170, 14, 26, 26);
                }

                // 업로드
                const tmpPdf = `/tmp/weekly_report_${Date.now()}.pdf`;
                pdf.save(tmpPdf);

                const destPdf = `reports/weekly/pdf_${Date.now()}.pdf`;
                await BUCKET.upload(tmpPdf, {
                    destination: destPdf,
                    metadata: { contentType: "application/pdf", cacheControl: "public,max-age=3600" },
                });

                fs.unlinkSync(tmpPdf);
                const pdfURL = `https://storage.googleapis.com/${BUCKET.name}/${destPdf}`;
                logger.info("✅ PDF 업로드 완료:", pdfURL);

                // 3️⃣ Firestore 문서 업데이트 (zip 생성 등 후속 트리거를 위해 한번에 기록)
                await event.data?.after?.ref.update({
                    audioURL: audioURL || after.audioURL || null,
                    pdfURL,
                    voice: after.voice || "ko-KR-Standard-A",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else if (needTTS) {
                // TTS만 갱신된 경우 Firestore에 audioURL만 업데이트
                await event.data?.after?.ref.update({
                    audioURL,
                    voice: after.voice || "ko-KR-Standard-A",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            logger.info("✅ Step 17 완료 (TTS+PDF 생성 완료)");

        } catch (err: any) {
            logger.error("❌ TTS/PDF 생성 중 오류 발생:", err.message, err.stack);
            throw err;
        }
    }
);

