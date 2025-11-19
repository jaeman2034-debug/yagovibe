import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { setSecurityHeaders } from "./step69.securityHeaders";

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// Validate minimal manifest fields
function validateManifest(manifest: any): { ok: boolean; error?: string } {
  const required = ["id", "name", "version", "actions", "webhook"];
  for (const k of required) {
    if (!manifest || manifest[k] === undefined) {
      return { ok: false, error: `missing_field:${k}` };
    }
  }
  if (!Array.isArray(manifest.actions) || manifest.actions.length === 0) {
    return { ok: false, error: "invalid_actions" };
  }
  return { ok: true };
}

// GET /api/dev/listPlugins
export const devListPlugins = onRequest(
  { region: "asia-northeast3", cors: true },
  async (_req, res) => {
    try {
      const qs = await db.collection("plugins").orderBy("updatedAt", "desc").limit(100).get();
      const items = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSecurityHeaders(res);
      res.json({ items });
    } catch (error: any) {
      logger.error("❌ listPlugins 오류", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/dev/registerPlugin
export const devRegisterPlugin = onRequest(
  { region: "asia-northeast3", cors: true },
  async (req, res) => {
    try {
      const manifest = req.body || {};
      const v = validateManifest(manifest);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }

      const now = Timestamp.now();
      await db.collection("plugins").doc(manifest.id).set(
        {
          name: manifest.name,
          ownerId: manifest.ownerId || "unknown",
          description: manifest.description || "",
          category: manifest.category || "general",
          endpoint: manifest.webhook,
          auth: manifest.auth || { type: "oauth2" },
          manifestVersion: manifest.manifestVersion || 1,
          status: manifest.status || "draft",
          version: manifest.version,
          createdAt: now,
          updatedAt: now,
          ratingAvg: 0,
          installs: 0,
          audit: { verifiedBy: null, lastCheck: now },
          actions: manifest.actions,
          permissions: manifest.permissions || [],
        },
        { merge: true }
      );

      logger.info("✅ 플러그인 등록", { id: manifest.id });
      setSecurityHeaders(res);
      res.json({ ok: true, id: manifest.id });
    } catch (error: any) {
      logger.error("❌ registerPlugin 오류", error);
      res.status(500).json({ error: error.message });
    }
  }
);
