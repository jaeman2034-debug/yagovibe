import { HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

type Section = "intro" | "history" | "vision" | "activities" | "organization";

type RequestData = {
  federationSlug: string;
  section: Section;
  /** 사용자가 현재 보고 있는 텍스트(또는 OCR 텍스트)를 전달하면 품질이 좋아짐 */
  sourceText?: string;
  /** true면 Firestore에 저장하지 않고 결과만 반환 (Draft 병합용) */
  dryRun?: boolean;
};

function ensureSection(v: any): Section {
  if (v === "intro" || v === "history" || v === "vision" || v === "activities" || v === "organization") return v;
  throw new HttpsError("invalid-argument", "section 값이 올바르지 않습니다.");
}

export async function handleGenerateFederationSection(req: { data: RequestData; auth?: { uid?: string } }) {
  const federationSlug = String(req.data?.federationSlug || "").trim();
  if (!federationSlug) throw new HttpsError("invalid-argument", "federationSlug is required");
  const section = ensureSection(req.data?.section);
  const sourceText = String(req.data?.sourceText || "").trim();
  const dryRun = !!req.data?.dryRun;

  const db = getFirestore();
  const docRef = db.doc(`federations/${federationSlug}`);

  // 기존 협회/회장 이름 유지
  let existingPresidentName = "협회장";
  try {
    const snap = await docRef.get();
    const d = snap.exists ? (snap.data() as any) : null;
    existingPresidentName = String(d?.president?.name || d?.presidentName || "").trim() || existingPresidentName;
  } catch {
    /* ignore */
  }

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = "당신은 협회 홈페이지 문안을 다듬는 편집자입니다. 한국어로만 답변하세요.";

  const makePrompt = () => {
    const base = `대상 협회: ${federationSlug}\n\n입력 원문:\n${sourceText || "(원문 없음)"}\n`;
    switch (section) {
      case "intro":
        return (
          base +
          `\n협회장 인사말(introMessage)을 공식적인 톤으로 2~4문단으로 작성해줘.\n` +
          `JSON으로만 응답: {"introMessage":""}\n`
        );
      case "history":
        return (
          base +
          `\n협회 연혁(history)을 자연스러운 문단 형태로 정리해줘.\n` +
          `JSON으로만 응답: {"history":""}\n`
        );
      case "vision":
        return (
          base +
          `\n협회 비전(vision)을 3~6문장으로 명확히 작성해줘.\n` +
          `JSON으로만 응답: {"vision":""}\n`
        );
      case "activities":
        return (
          base +
          `\n협회 주요 활동(activities)을 최소 3개, 최대 8개로 불릿 문구로 작성해줘.\n` +
          `JSON으로만 응답: {"activities":[]}\n`
        );
      case "organization":
        return (
          base +
          `\n협회 조직 운영 개요(organization.summary)를 1~2문단으로 작성하고,\n` +
          `임원(executives)은 최소 3명(회장/부회장/사무국장)을 포함해줘.\n` +
          `JSON으로만 응답: {"organization":{"summary":""},"executives":[{"name":"","role":""}]}\n`
        );
    }
  };

  logger.info("[generateFederationSection] request", {
    federationSlug,
    section,
    dryRun,
    sourcePreview: sourceText.slice(0, 200),
  });

  let content = "{}";
  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: makePrompt() },
      ],
    });
    content = res.choices[0]?.message?.content || "{}";
  } catch (e) {
    logger.error("[generateFederationSection] OpenAI call failed", String(e));
    throw new HttpsError("internal", "AI 생성 호출 실패");
  }

  let json: any = {};
  try {
    json = JSON.parse(content || "{}");
  } catch (e) {
    logger.error("[generateFederationSection] JSON parse failed", {
      error: String(e),
      contentPreview: String(content).slice(0, 300),
    });
    throw new HttpsError("internal", "AI 응답 파싱 실패");
  }

  const patch: Record<string, any> = { updatedAt: Timestamp.now() };
  const resultToReturn: Record<string, any> = {};

  if (section === "intro") {
    const introMessage = String(json.introMessage || "").trim();
    if (!introMessage) throw new HttpsError("internal", "introMessage 생성 결과가 비었습니다.");
    patch.introMessage = introMessage;
    patch.president = { name: existingPresidentName, message: introMessage };
    patch.presidentName = existingPresidentName;
    resultToReturn.introMessage = introMessage;
  }

  if (section === "history") {
    const history = String(json.history || "").trim();
    if (!history) throw new HttpsError("internal", "history 생성 결과가 비었습니다.");
    patch.history = history;
    resultToReturn.history = history;
  }

  if (section === "vision") {
    const vision = String(json.vision || "").trim();
    if (!vision) throw new HttpsError("internal", "vision 생성 결과가 비었습니다.");
    patch.vision = vision;
    resultToReturn.vision = vision;
  }

  if (section === "activities") {
    const activities = Array.isArray(json.activities)
      ? json.activities.map((x: any) => String(x || "").trim()).filter(Boolean).slice(0, 12)
      : [];
    if (activities.length < 3) throw new HttpsError("internal", "activities 생성 결과가 비었습니다.");
    patch.activities = activities;
    resultToReturn.activities = activities;
  }

  if (section === "organization") {
    const summary = String(json.organization?.summary || "").trim();
    const executives = Array.isArray(json.executives)
      ? json.executives
          .map((e: any) => ({ name: String(e?.name || "").trim(), role: String(e?.role || "").trim() }))
          .filter((e: any) => e.name || e.role)
          .slice(0, 30)
      : [];
    if (!summary) throw new HttpsError("internal", "organization.summary 생성 결과가 비었습니다.");
    patch.organization = { summary };
    resultToReturn.organization = { summary };
    resultToReturn.executives = executives;

    // executives 서브컬렉션 교체
    try {
      const exCol = docRef.collection("executives");
      const existing = await exCol.get();
      const batch = db.batch();
      existing.docs.forEach((d) => batch.delete(d.ref));
      const ensured = executives.length >= 3 ? executives : [
        { name: "미정", role: "회장" },
        { name: "미정", role: "부회장" },
        { name: "미정", role: "사무국장" },
      ];
      ensured.forEach((e) => {
        batch.set(exCol.doc(), {
          name: e.name || "미정",
          role: e.role || "임원",
          createdAt: Timestamp.now(),
        });
      });
      await batch.commit();
    } catch (e) {
      logger.warn("[generateFederationSection] executives write failed (ignored)", String(e));
    }
  }

  if (!dryRun) {
    await docRef.set(patch, { merge: true });
  }

  return { ok: true, section, dryRun, ...resultToReturn };
}

