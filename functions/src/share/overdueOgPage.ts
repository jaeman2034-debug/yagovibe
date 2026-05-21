import { getFirestore } from "firebase-admin/firestore";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function overdueOgPageHandler(req: any, res: any) {
  try {
    const fedId = String(req.query.fedId || "").trim();
    if (!fedId) {
      res.status(400).send("Missing required query: fedId");
      return;
    }

    const db = getFirestore();
    const now = new Date();
    const threshold = new Date(now.getTime() - 7 * 86400000).toISOString();
    const appBaseUrl = String(req.query.appBaseUrl || "https://yago-vibe-spt.web.app").trim().replace(/\/+$/, "");
    const targetUrl = `${appBaseUrl}/federations/${fedId}/admin?tab=finance&subtab=accounting&status=expected&sort=remaining`;

    const fedSnap = await db.doc(`federations/${fedId}`).get();
    const federationName = String((fedSnap.data() as any)?.name || fedId);

    let dueRows: any[] = [];
    try {
      const strict = await db
        .collection("federations")
        .doc(fedId)
        .collection("transactions")
        .where("type", "==", "income")
        .where("category", "==", "competition_fee")
        .where("remainingAmount", ">", 0)
        .where("expectedAt", "<=", threshold)
        .where("incomeStatus", "in", ["expected", "partial"])
        .limit(200)
        .get();
      dueRows = strict.docs.map((d) => d.data());
    } catch {
      // 인덱스 미구성 등 실패 시 약한 쿼리 + 코드 필터 fallback
      const loose = await db
        .collection("federations")
        .doc(fedId)
        .collection("transactions")
        .where("type", "==", "income")
        .where("category", "==", "competition_fee")
        .where("expectedAt", "<=", threshold)
        .limit(500)
        .get();
      dueRows = loose.docs
        .map((d) => d.data())
        .filter((x: any) => {
          const st = String(x?.incomeStatus || "");
          const remain = typeof x?.remainingAmount === "number" ? x.remainingAmount : 0;
          return (st === "expected" || st === "partial") && remain > 0;
        });
    }

    const count = dueRows.length;
    const totalRemaining = dueRows.reduce((acc: number, x: any) => acc + Math.max(0, Math.floor(Number(x?.remainingAmount || 0))), 0);
    const title = count > 0 ? `⚠️ ${federationName} 미수금 ${count}건 있습니다` : `✅ ${federationName} 미수금이 없습니다`;
    const description =
      count > 0
        ? `총 ${totalRemaining.toLocaleString("ko-KR")}원 미납 · 지금 확인하세요`
        : "현재 처리할 미수금이 없습니다.";
    const imageUrl = String(
      req.query.image ||
        `${appBaseUrl}/share/overdue/image?fedId=${encodeURIComponent(fedId)}&count=${count}&total=${totalRemaining}&t=${Date.now()}`
    ).trim();

    const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${esc(title)}</title>
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${esc(imageUrl)}" />
    <meta property="og:url" content="${esc(targetUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(imageUrl)}" />
    <meta http-equiv="refresh" content="0; url=${esc(targetUrl)}" />
  </head>
  <body>
    <p>Redirecting...</p>
    <a href="${esc(targetUrl)}">열기</a>
  </body>
</html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=120, s-maxage=120, stale-while-revalidate=300");
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send("Failed to render OG page");
  }
}

