# Vision Match Detail Tab Routing — Production Deploy Fact

**Document ID:** `VISION-TAB-ROUTING-DEPLOY-FACT`  
**Status:** ✅ **DEPLOYED** · 🔒 **Production Verified** · Issue **COMPLETE / CLOSED**  
**Feature commit:** **`918208c82d4435610614d898e4b1dad1d9983228`**  
**Deployed HEAD:** **`a86d097`**  
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
Post-Deploy Smoke: PASS (4-tab) · PM Final PASS → COMPLETE/CLOSED
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
| Coach / Timeline / Parent tab routing fix | 포함 · **Verified** |
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
**Verified by:** PM Final Review · 2026-07-12
