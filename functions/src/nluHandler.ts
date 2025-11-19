import { onRequest } from "firebase-functions/v2/https";

export const nluHandler = onRequest(async (req, res) => {
  const { text } = (req.body || {}) as { text?: string };
  console.log("🎤 음성 명령 수신:", text);

  if (typeof text === "string" && text.includes("지도")) {
    res.json({ action: "navigate", target: "/voice-map" });
    return;
  }

  res.json({ action: "none" });
});
