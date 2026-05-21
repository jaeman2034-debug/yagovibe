import type { Request, Response } from "express";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { getFirestore } from "firebase-admin/firestore";

let cachedFontData: ArrayBuffer | null = null;

async function loadKoreanFont(): Promise<ArrayBuffer | null> {
  if (cachedFontData) return cachedFontData;
  try {
    // NotoSansKR Regular OTF (GitHub raw) — 네트워크 실패 시 null 반환
    const fontUrl =
      "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansKR-Regular.otf";
    const res = await fetch(fontUrl);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    cachedFontData = buf;
    return buf;
  } catch {
    return null;
  }
}

export async function ogTournamentPngHandler(req: Request, res: Response) {
  try {
    const db = getFirestore();
    const tournamentId = (req.query.tournamentId as string) || "";
    const divisionId = (req.query.divisionId as string) || "";
    const federationSlug = (req.query.federationSlug as string) || "";

    if (!federationSlug || !tournamentId) {
      res.status(400).send("Missing required params: federationSlug, tournamentId");
      return;
    }

    // 기본 정보
    let tournamentName = "Tournament";
    let divisionName = divisionId ? "Division" : "";

    // 데이터 로드
    try {
      const fedRef = db.collection("federations").doc(federationSlug);
      const tourRef = fedRef.collection("leagues").doc(tournamentId);
      const tourSnap = await tourRef.get();
      if (tourSnap.exists) {
        const data = tourSnap.data() as any;
        tournamentName = data?.name || tournamentName;
        if (!divisionId && data?.defaultDivisionName) {
          divisionName = data.defaultDivisionName;
        }
      }
      if (divisionId) {
        const divSnap = await fedRef.collection("divisions").doc(divisionId).get();
        if (divSnap.exists) {
          const d = divSnap.data() as any;
          divisionName = d?.name || divisionName;
        }
      }
    } catch {
      // ignore
    }

    // 최근 경기 4개 텍스트
    let matchTexts: string[] = [];
    try {
      const fedRef = db.collection("federations").doc(federationSlug);
      const matchesRef = fedRef.collection("matches");
      let q: any = matchesRef.where("leagueId", "==", tournamentId);
      if (divisionId) q = q.where("divisionId", "==", divisionId);
      const snap = await q.limit(4).get();
      matchTexts = snap.docs.map((doc: any) => {
        const m = doc.data() as any;
        const a = m?.homeTeam || "TBD";
        const b = m?.awayTeam || "TBD";
        const s =
          m?.homeScore != null && m?.awayScore != null ? ` ${m.homeScore}:${m.awayScore}` : "";
        return `${a} vs ${b}${s}`;
      });
    } catch {
      // ignore
    }

    const width = 1200;
    const height = 630;

    const fontData = await loadKoreanFont();
    const fonts =
      fontData != null
        ? [{ name: "NotoSansKR", data: fontData }]
        : [];

    const bg = "#0f172a";
    const fg = "#ffffff";
    const accent = "#60a5fa";

    const title = tournamentName;
    const subtitle = divisionName ? `${divisionName} 대진표` : "대진표";
    const lines = matchTexts.length
      ? matchTexts
      : ["브래킷 미리보기", "경기 정보가 곧 업데이트됩니다"];

    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            width: `${width}px`,
            height: `${height}px`,
            display: "flex",
            flexDirection: "column",
            background: bg,
            color: fg,
            padding: "80px",
            fontFamily: fonts.length ? "NotoSansKR" : "system-ui",
          },
          children: [
            {
              type: "div",
              props: {
                style: { color: accent, fontSize: 40, fontWeight: 600 },
                children: "YAGO SPORTS",
              },
            },
            {
              type: "div",
              props: { style: { fontSize: 60, fontWeight: 800, marginTop: 10 }, children: title },
            },
            {
              type: "div",
              props: {
                style: { fontSize: 34, fontWeight: 600, opacity: 0.85, marginTop: 6 },
                children: subtitle,
              },
            },
            {
              type: "div",
              props: {
                style: { marginTop: 30, display: "flex", flexDirection: "column", gap: 12 },
                children: lines.map((t, i) => ({
                  type: "div",
                  props: { style: { fontSize: 28, opacity: 0.9 }, children: t },
                })),
              },
            },
            {
              type: "div",
              props: {
                style: {
                  marginTop: "auto",
                  width: 360,
                  height: 56,
                  background: accent,
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 24,
                },
                children: {
                  type: "div",
                  props: {
                    style: { fontSize: 24, fontWeight: 700, color: "#0b1220" },
                    children: "대진표 바로 보기",
                  },
                },
              },
            },
          ],
        },
      } as any,
      {
        width,
        height,
        fonts,
      }
    );

    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: width },
    })
      .render()
      .asPng();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(Buffer.from(png));
  } catch (e) {
    console.error("[ogTournamentPng] error", e);
    res.status(500).send("OG PNG generation failed");
  }
}

