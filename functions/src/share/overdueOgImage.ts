import type { Request, Response } from "express";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getFirestore } from "firebase-admin/firestore";

let cachedFontData: ArrayBuffer | null = null;

async function loadKoreanFont(): Promise<ArrayBuffer | null> {
  if (cachedFontData) return cachedFontData;
  try {
    const fontUrl =
      "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansKR-Regular.otf";
    const r = await fetch(fontUrl);
    if (!r.ok) return null;
    const b = await r.arrayBuffer();
    cachedFontData = b;
    return b;
  } catch {
    return null;
  }
}

export async function overdueOgImageHandler(req: Request, res: Response) {
  try {
    const fedId = String(req.query.fedId || "").trim();
    const qCount = Number(req.query.count || 0);
    const qTotal = Number(req.query.total || 0);
    let count = Number.isFinite(qCount) && qCount >= 0 ? Math.floor(qCount) : 0;
    let total = Number.isFinite(qTotal) && qTotal >= 0 ? Math.floor(qTotal) : 0;
    let federationName = "협회";

    if (fedId) {
      const db = getFirestore();
      const fedSnap = await db.doc(`federations/${fedId}`).get();
      federationName = String((fedSnap.data() as any)?.name || fedId);
      if (!req.query.count || !req.query.total) {
        const threshold = new Date(Date.now() - 7 * 86400000).toISOString();
        const snap = await db
          .collection("federations")
          .doc(fedId)
          .collection("transactions")
          .where("type", "==", "income")
          .where("category", "==", "competition_fee")
          .where("expectedAt", "<=", threshold)
          .limit(500)
          .get();
        const rows = snap.docs
          .map((d) => d.data() as any)
          .filter((x) => (x?.incomeStatus === "expected" || x?.incomeStatus === "partial") && Number(x?.remainingAmount || 0) > 0);
        count = rows.length;
        total = rows.reduce((acc, x) => acc + Math.max(0, Math.floor(Number(x?.remainingAmount || 0))), 0);
      }
    }

    const width = 1200;
    const height = 630;
    const fontData = await loadKoreanFont();
    const fonts = fontData ? [{ name: "NotoSansKR", data: fontData }] : [];

    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            width: `${width}px`,
            height: `${height}px`,
            background: "#0B1A2B",
            display: "flex",
            flexDirection: "column",
            padding: "72px",
            color: "#fff",
            fontFamily: fonts.length ? "NotoSansKR" : "system-ui",
          },
          children: [
            {
              type: "div",
              props: {
                style: { fontSize: 34, color: "#93C5FD", fontWeight: 600 },
                children: federationName,
              },
            },
            {
              type: "div",
              props: {
                style: { marginTop: 36, fontSize: 72, fontWeight: 800, color: "#FF4D4F" },
                children: `⚠️ 미수금 ${count}건`,
              },
            },
            {
              type: "div",
              props: {
                style: { marginTop: 20, fontSize: 88, fontWeight: 800, color: "#FFFFFF" },
                children: `₩${total.toLocaleString("ko-KR")}`,
              },
            },
            {
              type: "div",
              props: {
                style: { marginTop: 12, fontSize: 42, color: "#A0AEC0", fontWeight: 600 },
                children: count > 0 ? "지금 확인하세요" : "현재 미수금이 없습니다",
              },
            },
          ],
        },
      } as any,
      { width, height, fonts }
    );

    const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=120, stale-while-revalidate=300");
    res.status(200).send(Buffer.from(png));
  } catch (e) {
    console.error("[overdueOgImage] error", e);
    res.status(500).send("Failed to render overdue OG image");
  }
}

