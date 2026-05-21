import { logger } from "firebase-functions";
import { HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import pdfParse from "pdf-parse";

type RequestData = {
  federationSlug: string;
  text?: string;
  pdfBase64?: string; // data:application/pdf;base64,...
  imageUrls?: string[];
  /** true면 Firestore에 저장하지 않고 결과만 반환 (Draft 미리보기용) */
  dryRun?: boolean;
};

type AiResult = {
  intro: string;
  history: string;
  vision: string;
  activities: string[];
  organization: Array<{ name: string; role: string }>;
};

export async function handleGenerateFederationFromSources(req: { data: RequestData; auth?: { uid?: string } }) {
  const { federationSlug, text, pdfBase64, imageUrls, dryRun } = req.data || {};
  if (!federationSlug) {
    throw new Error("federationSlug is required");
  }

  // 1) PDF 텍스트 추출 (선택)
  let pdfText = "";
  if (pdfBase64 && pdfBase64.includes(";base64,")) {
    try {
      const isPdfDataUrl = pdfBase64.startsWith("data:application/pdf");
      if (!isPdfDataUrl) {
        logger.warn("[generateFederationFromSources] non-pdf data url ignored");
      } else {
      const base64 = pdfBase64.split(",")[1] || pdfBase64;
      const buf = Buffer.from(base64, "base64");
      const parsed = await pdfParse(buf);
      pdfText = parsed.text || "";
      }
    } catch (e) {
      logger.warn("[generateFederationFromSources] PDF parse failed - continue with text only", String(e));
    }
  }

  // 2) OpenAI 클라이언트 준비
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // 3) 텍스트 병합 (text + pdf)
  const mergedText = `
${text || ""}
${pdfText || ""}
`
    .replace(/\n+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  logger.info("[generateFederationFromSources] input summary", {
    federationSlug,
    imageCount: Array.isArray(imageUrls) ? imageUrls.length : 0,
    mergedPreview: mergedText.slice(0, 200),
  });

  if (!mergedText) {
    throw new HttpsError("invalid-argument", "입력된 텍스트가 없습니다.");
  }

  // 4) OpenAI 호출 (JSON 모드)
  let result: AiResult = {
    intro: "",
    history: "",
    vision: "",
    activities: [],
    organization: [],
  };

  try {
    const system = "당신은 협회 홈페이지 문안을 구조화해서 생성하는 보조자입니다. 한국어로만 답변하세요.";
    const userPrompt = `
다음 원본을 기반으로 협회 홈페이지 소개 섹션 5개를 '반드시' JSON으로만 생성하세요.
규칙:
- intro/history/vision/activities/organization 모두 포함(누락 금지)
- 빈 문자열/빈 배열 금지(부족하면 상식적 기본 문장으로 채워라)
- activities는 최소 3개 항목
- organization은 최소 3명: 회장/부회장/사무국장 (role은 '회장','부회장','사무국장' 등 직책명)
입력 원본:
${mergedText || "(원문 없음)"} 
`;

    let content = "{}";
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content:
              userPrompt +
              `
필수 JSON 스키마(정확히 이 키만 사용):
{
  "intro": "",
  "history": "",
  "vision": "",
  "activities": [],
  "organization": []
}
`,
          },
        ],
      });
      content = response.choices[0]?.message?.content || "{}";
    } catch (e) {
      logger.error("[generateFederationFromSources] OpenAI call failed", String(e));
      throw new HttpsError("internal", "AI 생성 호출 실패");
    }

    let json: any = {};
    try {
      json = JSON.parse(content || "{}");
    } catch (e) {
      logger.error("[generateFederationFromSources] JSON parse failed", {
        error: String(e),
        contentPreview: String(content).slice(0, 300),
      });
      throw new HttpsError("internal", "AI 응답 파싱 실패");
    }

    result.intro = String(json.intro || "").trim();
    result.history = String(json.history || "").trim();
    result.vision = String(json.vision || "").trim();
    result.activities = Array.isArray(json.activities) ? json.activities.map((s: any) => String(s)).filter(Boolean) : [];
    result.organization = Array.isArray(json.organization)
      ? json.organization.map((row: any) => ({
          name: String(row?.name || "").trim(),
          role: String(row?.role || "").trim(),
        }))
      : [];
  } catch (e) {
    if (e instanceof HttpsError) {
      throw e;
    }
    logger.error("[generateFederationFromSources] OpenAI error", String(e));
    throw new HttpsError("internal", "AI 생성 중 오류가 발생했습니다.");
  }

  // 품질 보정: 비어 있으면 기본값 채우기
  const fallbackName = federationSlug || "협회";
  if (!result.intro) {
    result.intro = `${fallbackName} 공식 홈페이지를 방문해 주셔서 감사합니다. 지역 스포츠 발전과 건전한 스포츠 문화 확산을 위해 노력하겠습니다.`;
  }
  if (!result.history) {
    result.history = `${fallbackName}는 지역 스포츠 저변 확대와 회원 교류를 위해 설립되었으며, 리그 운영과 교육 프로그램 등을 통해 지역 사회와 함께 성장해 왔습니다.`;
  }
  if (!result.vision) {
    result.vision = `공정하고 즐거운 스포츠 환경 조성, 참여 기회 확대, 지역 공동체 기여를 비전으로 삼고 지속 가능한 운영 체계를 구축합니다.`;
  }
  if (!Array.isArray(result.activities) || result.activities.length < 3) {
    result.activities = [
      "지역 리그 및 교류전 운영",
      "지도자·심판 교육 및 자격 과정 지원",
      "유소년/생활 체육 활성화 프로그램",
    ];
  }
  if (!Array.isArray(result.organization) || result.organization.length < 3) {
    // 중복 역할 제거 후 필수 직책 보강
    const normalized = (result.organization || []).filter((r) => r && (r.name || r.role));
    const exists = new Set(normalized.map((r) => r.role));
    const ensure = (role: string, name = "미정") => {
      if (!exists.has(role)) {
        normalized.push({ name, role });
        exists.add(role);
      }
    };
    ensure("회장");
    ensure("부회장");
    ensure("사무국장");
    result.organization = normalized;
  }

  // 5) Firestore 저장 (프론트 스키마에 맞춤) — dryRun이면 저장하지 않음
  const db = getFirestore();
  const docRef = db.doc(`federations/${federationSlug}`);

  // 기존 협회장 이름이 있으면 유지 (없으면 기본값)
  let existingPresidentName = "협회장";
  try {
    const snap = await docRef.get();
    const d = snap.exists ? (snap.data() as any) : null;
    existingPresidentName =
      String(d?.president?.name || d?.presidentName || "").trim() || existingPresidentName;
  } catch {
    /* ignore */
  }

  const introMessage = result.intro || "";
  const orgSummary =
    `${federationSlug}는 사무국을 중심으로 협회 운영·행사 기획·대외 협력 업무를 수행하며, 각 분과(운영/기술/기획)가 협력하여 지역 스포츠 활성화를 추진합니다.`;

  // executives 서브컬렉션에 저장할 임원 목록 (organization 배열을 그대로 사용)
  const executives = (result.organization || [])
    .map((r) => ({ name: String(r?.name || "").trim(), role: String(r?.role || "").trim() }))
    .filter((r) => r.name || r.role)
    .slice(0, 30);

  const payload = {
    // ⚠️ FederationAboutTab이 읽는 필드명들
    introMessage,
    president: { name: existingPresidentName, message: introMessage },
    presidentName: existingPresidentName,
    history: result.history || "",
    vision: result.vision || "",
    activities: result.activities || [],
    organization: { summary: orgSummary },
    // 하위 호환/디버깅용: 원본 결과도 유지
    intro: result.intro || "",
    organizationRaw: result.organization || [],
    images: Array.isArray(imageUrls) ? imageUrls : [],
    generationSource: {
      text: text || "",
      pdfText: pdfText || "",
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
    },
    updatedAt: Timestamp.now(),
  };

  if (!dryRun) {
    await docRef.set(payload, { merge: true });

    // executives 서브컬렉션을 교체(삭제 후 재생성) — 조직 구성 카드에서 즉시 표시됨
    try {
      const exCol = docRef.collection("executives");
      const existing = await exCol.get();
      const batch = db.batch();
      existing.docs.forEach((d) => batch.delete(d.ref));
      executives.forEach((e) => {
        batch.set(exCol.doc(), {
          name: e.name || "미정",
          role: e.role || "임원",
          createdAt: Timestamp.now(),
        });
      });
      await batch.commit();
    } catch (e) {
      logger.warn("[generateFederationFromSources] executives write failed (ignored)", String(e));
    }
  }

  return {
    ok: true,
    updated: true,
    dryRun: !!dryRun,
    introMessage,
    history: result.history,
    vision: result.vision,
    activities: result.activities,
    organization: { summary: orgSummary },
    executives,
  };
}

