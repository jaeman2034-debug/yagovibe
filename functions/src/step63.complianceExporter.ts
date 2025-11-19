import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import * as crypto from "crypto";
import archiver from "archiver";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

if (!getApps().length) {
    initializeApp();
}

const db = getFirestore();
const storage = new Storage();

/**
 * Step 63: Compliance Exporter - 감사 번들 ZIP/PDF 자동 생성
 * GET /complianceExporter?uid=USER_UID&from=DATE&to=DATE
 */
export const complianceExporter = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        try {
            const { uid, from, to } = req.query as any;

            if (!uid) {
                res.status(400).json({ error: "uid required" });
                return;
            }

            logger.info("📦 Compliance Export 시작:", { uid, from, to });

            // 기간 설정 (기본 90일)
            const start = from ? new Date(from) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const end = to ? new Date(to) : new Date();

            // 데이터 수집
            const audits = await db
                .collection("auditLogs")
                .where("actor.uid", "==", uid)
                .where("ts", ">=", Timestamp.fromDate(start))
                .where("ts", "<=", Timestamp.fromDate(end))
                .get();

            const reports = await db
                .collection("insightReports")
                .where("reviewer.uid", "==", uid)
                .where("createdAt", ">=", Timestamp.fromDate(start))
                .where("createdAt", "<=", Timestamp.fromDate(end))
                .get();

            logger.info("📊 데이터 수집 완료:", {
                audits: audits.size,
                reports: reports.size,
            });

            // ZIP 생성
            const archive = archiver("zip", { zlib: { level: 9 } });

            // JSON 데이터 추가
            const auditData = audits.docs.map((d) => {
                const data = d.data();
                // Timestamp 변환
                if (data.ts?.toDate) {
                    data.ts = data.ts.toDate().toISOString();
                }
                return { id: d.id, ...data };
            });

            const reportData = reports.docs.map((d) => {
                const data = d.data();
                // Timestamp 변환
                if (data.createdAt?.toDate) {
                    data.createdAt = data.createdAt.toDate().toISOString();
                }
                return { id: d.id, ...data };
            });

            archive.append(JSON.stringify(auditData, null, 2), { name: "auditLogs.json" });
            archive.append(JSON.stringify(reportData, null, 2), { name: "insightReports.json" });

            // Manifest 생성
            const hash = crypto
                .createHash("sha256")
                .update(uid + start.toISOString() + end.toISOString())
                .digest("hex");

            const manifest = {
                uid,
                start: start.toISOString(),
                end: end.toISOString(),
                exportedAt: new Date().toISOString(),
                counts: {
                    audits: audits.size,
                    reports: reports.size,
                },
                hash,
                format: "ZIP",
                compliance: {
                    gdpr: true,
                    pipa: true,
                    iso27001: true,
                },
            };

            archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });

            // GCS 업로드
            const bucketName = process.env.GCS_EXPORT_BUCKET || "yago-vibe-exports";
            const bucket = storage.bucket(bucketName);

            const fileName = `compliance/${uid}/${hash}.zip`;
            const file = bucket.file(fileName);

            const stream = file.createWriteStream({
                resumable: false,
                contentType: "application/zip",
                metadata: {
                    metadata: {
                        uid,
                        exportedAt: new Date().toISOString(),
                    },
                },
            });

            archive.pipe(stream);

            await new Promise<void>((resolve, reject) => {
                stream.on("finish", resolve);
                stream.on("error", reject);
                archive.on("error", reject);
                archive.finalize();
            });

            const gcsUri = `gs://${bucketName}/${fileName}`;
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;

            // Firestore에 기록
            await db.collection("complianceExports").add({
                uid,
                manifest,
                gcsUri,
                publicUrl,
                status: "completed",
                createdAt: Timestamp.now(),
            });

            logger.info("✅ Compliance Export 완료:", { uid, hash, gcsUri });

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.json({
                ok: true,
                manifest,
                gcsUri,
                publicUrl,
                downloadUrl: publicUrl,
            });
        } catch (error: any) {
            logger.error("❌ Compliance Export 오류:", error);
            res.status(500).json({ error: error.message });
        }
    }
);

