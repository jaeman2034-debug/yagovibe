import * as functions from "firebase-functions/v2";
import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import { ImageAnnotatorClient } from "@google-cloud/vision";

const app = express();
app.use(cors({ origin: true }));

const upload = multer({ storage: multer.memoryStorage() });
const visionClient = new ImageAnnotatorClient();

app.post("/", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "이미지가 업로드되지 않았습니다." });
      return;
    }

    const [result] = await visionClient.labelDetection(req.file.buffer);
    const labels = result.labelAnnotations?.map((label) => label.description) || [];

    res.status(200).json({ success: true, labels });
  } catch (error) {
    console.error("❌ Vision API Error:", error);
    res.status(500).json({ success: false, error: "Vision API 호출 실패" });
  }
});

export const visionAnalyze = functions.https.onRequest(
  { region: "asia-northeast3", timeoutSeconds: 120, memory: "512MiB" },
  app
);

