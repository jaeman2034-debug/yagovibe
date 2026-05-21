import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";

const REGION = "asia-northeast3";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const OCR_OPTS = { region: REGION, cors: true, timeoutSeconds: 60 } as const;

if (!getApps().length) {
  initializeApp();
}

type TeamExpenseCategory = "association_fee" | "event" | "meal" | "ceremony" | "etc";

type Req = {
  teamId?: string;
  imageBase64?: string;
  mimeType?: string;
};

type Res = {
  success: true;
  amount: number | null;
  date: string | null;
  category: TeamExpenseCategory | null;
  confidence: number;
  rawText: string;
};

function normalizeRawText(text: string): string {
  return text.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim().slice(0, 1000);
}

function parseAmount(raw: string): number | null {
  const labelRx = /(총액|합계|결제금액|승인금액)\s*[:：]?\s*([0-9][0-9,]{0,15})\s*원?/g;
  let m: RegExpExecArray | null = null;
  while ((m = labelRx.exec(raw))) {
    const n = Number(String(m[2]).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  const amountRx = /\b([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{4,})\s*원\b/g;
  while ((m = amountRx.exec(raw))) {
    const n = Number(String(m[1]).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return null;
}

function toYmd(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseDate(raw: string): string | null {
  let m = raw.match(/\b(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\b/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    return toYmd(y, mo, d);
  }
  m = raw.match(/\b(\d{1,2})[\/](\d{1,2})\b/);
  if (m) {
    const now = new Date();
    const y = now.getFullYear();
    const mo = Number(m[1]);
    const d = Number(m[2]);
    return toYmd(y, mo, d);
  }
  return null;
}

function parseCategory(raw: string): TeamExpenseCategory | null {
  const t = raw.toLowerCase();
  if (/협회|연맹|등록비|가맹/i.test(raw)) return "association_fee";
  if (/행사|대회|이벤트|입장권|대관|참가비/i.test(raw)) return "event";
  if (/식당|카페|편의점|음료|식사|치킨|버거|커피|마트/i.test(raw)) return "meal";
  if (/조의|부의|근조|경조|화환|장례|축의/i.test(raw)) return "ceremony";
  if (t.length > 0) return "etc";
  return null;
}

function estimateConfidence(amount: number | null, date: string | null, category: TeamExpenseCategory | null): number {
  let score = 0.2;
  if (amount != null) score += 0.45;
  if (date != null) score += 0.25;
  if (category != null) score += 0.1;
  return Math.min(1, Math.max(0, score));
}

async function assertTeamMember(teamId: string, uid: string): Promise<void> {
  const db = getFirestore();
  const snap = await db.doc(`teams/${teamId}/members/${uid}`).get();
  if (!snap.exists) {
    throw new HttpsError("permission-denied", "팀 멤버만 사용할 수 있습니다.");
  }
  const status = String((snap.data() as { status?: unknown } | undefined)?.status || "").toLowerCase();
  if (status && status !== "active" && status !== "member") {
    throw new HttpsError("permission-denied", "비활성 멤버는 사용할 수 없습니다.");
  }
}

export const processReceipt = onCall(OCR_OPTS, async (request): Promise<Res> => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

  const data = (request.data || {}) as Req;
  const teamId = String(data.teamId || "").trim();
  if (!teamId) throw new HttpsError("invalid-argument", "teamId가 필요합니다.");
  await assertTeamMember(teamId, uid);

  const imageBase64 = String(data.imageBase64 || "").trim();
  if (!imageBase64) throw new HttpsError("invalid-argument", "영수증 이미지가 없습니다.");
  let buf: Buffer;
  try {
    buf = Buffer.from(imageBase64, "base64");
  } catch {
    throw new HttpsError("invalid-argument", "이미지 데이터 형식이 올바르지 않습니다.");
  }
  if (!buf || buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
    throw new HttpsError("invalid-argument", "이미지는 5MB 이하만 분석할 수 있습니다.");
  }

  let res: { fullTextAnnotation?: { text?: string } };
  try {
    const vision = await import("@google-cloud/vision");
    const client = new vision.ImageAnnotatorClient();
    const [ocrRes] = await client.textDetection({
      image: { content: buf.toString("base64") },
      imageContext: { languageHints: ["ko", "en"] },
    });
    res = ocrRes;
  } catch (err) {
    const details = String((err as { details?: unknown } | null)?.details || "");
    if (details.includes("vision.googleapis.com")) {
      throw new HttpsError(
        "failed-precondition",
        "OCR 인프라 설정이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요."
      );
    }
    throw new HttpsError("internal", "영수증 분석 중 오류가 발생했습니다.");
  }
  const full = String(res.fullTextAnnotation?.text || "");
  const rawText = normalizeRawText(full);

  const amount = parseAmount(rawText);
  const date = parseDate(rawText);
  const category = parseCategory(rawText);
  const confidence = estimateConfidence(amount, date, category);

  return { success: true, amount, date, category, confidence, rawText };
});

