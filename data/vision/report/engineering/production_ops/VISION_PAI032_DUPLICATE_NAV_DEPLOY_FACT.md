# PAI-032 Duplicate Nav — Production Deploy Fact

**Document ID:** `VISION-PAI032-DUPLICATE-NAV-DEPLOY-FACT`  
**Status:** ✅ **DEPLOYED** (Hosting) · ⏳ Post-Deploy Smoke 후 PM Final Review  
**Feature commit:** **`7562ccbec6c012181356c7456ee3e7731316c303`**  
**Deployed HEAD:** **`437fc8a`** (includes `7562ccb` + Pre-Deploy SHA stamp)  
**Day-03:** 🛑 DATE_GATE_PENDING 미변경  
**PAI-011 / 012 / 013 / 014:** 🔒 미변경  
**PROD-OBS-012:** ▶ OPEN 미변경

---

## Deploy Fact

```text
배포 일시: 2026-07-12 11:17 KST (완료)
프로젝트: yago-vibe-spt
타깃: Firebase Hosting (Production) only
Hosting URL: https://yago-vibe-spt.web.app
결과: Deploy complete · release complete · 456 files
명령: npm run deploy:hosting
```

### Commits

| Role | SHA | Note |
|---|---|---|
| Feature | `7562ccb` | fix(vision): remove duplicate parent intelligence nav |
| Deployed HEAD | `437fc8a` | Pre-Deploy SHA stamp |
| Rollback parent | `0520cf4` | Player Tab ID Guard Hosting HEAD |

> CF / Firestore Rules: **미배포**.

❌ COMPLETE / CLOSED 금지 (PM Final Review 전)

**Recorded by:** Engineering Track A · 2026-07-12
