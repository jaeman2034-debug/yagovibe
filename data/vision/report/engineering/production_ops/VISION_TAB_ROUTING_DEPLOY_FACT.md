# Vision Match Detail Tab Routing — Production Deploy Fact

**Document ID:** `VISION-TAB-ROUTING-DEPLOY-FACT`  
**Status:** ✅ **DEPLOYED** (Hosting) · ⏳ Post-Deploy Smoke 후 PM Final Review  
**Feature commit:** **`918208c`**  
**Deployed HEAD:** **`a86d097`** (includes `918208c` + Pre-Deploy SHA stamp)  
**Day-03:** 🛑 DATE_GATE_PENDING 미변경  
**PAI-011 / PAI-012:** 🔒 COMPLETE/CLOSED 미변경  
**PROD-OBS-012:** ▶ OPEN 후보 미변경

---

## Deploy Fact

```text
배포 일시: 2026-07-12 10:03 KST (완료)
프로젝트: yago-vibe-spt
타깃: Firebase Hosting (Production) only
Hosting URL: https://yago-vibe-spt.web.app
결과: Deploy complete · release complete · 456 files in dist
명령: npm run deploy:hosting (= build + firebase deploy --only hosting)
```

### Commits

| Role | SHA | Note |
|---|---|---|
| Feature | `918208c` | fix(vision): repair match detail tab routing |
| Deployed HEAD | `a86d097` | docs stamp Pre-Deploy Review |
| Rollback parent | `30170a1` | PAI-012 Hosting HEAD |

> CF / Firestore Rules: **미배포**.

---

## Scope Fact

| Item | Value |
|---|---|
| Coach / Timeline / Parent tab routing fix | 포함 |
| Team Hub route | **미변경** |
| Play Lounge | **미변경** |
| PAI-011 / PAI-012 logic | **미변경** |
| 신규 CF / Rules / root SoT | **N** |

---

## Build

```text
npm run build (production) → PASS (~1m 21s)
```

**Recorded by:** Engineering Track A · 2026-07-12  
❌ COMPLETE / CLOSED 선언 금지 (PM Final Review 전)
