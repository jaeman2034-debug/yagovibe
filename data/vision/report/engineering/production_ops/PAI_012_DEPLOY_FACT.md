# PAI-012 — Production Deploy Fact

**Document ID:** `PAI-012-DEPLOY-FACT`  
**Status:** ✅ **DEPLOYED** (Hosting) · 🔒 **PAI-012 COMPLETE / CLOSED** (Post-Deploy Smoke PASS)  
**Day-03:** 🛑 DATE_GATE_PENDING 미변경  
**PAI-011 / VOC-011 원장 15:** 🔒 유지

---

## Deploy Fact

```text
배포 일시: 2026-07-12 09:18 KST (완료 시각)
배포 시작: 2026-07-12 09:17 KST
프로젝트: yago-vibe-spt
타깃: Firebase Hosting (Production)
Hosting URL: https://yago-vibe-spt.web.app
결과: Deploy complete · release complete · 456 files in dist
```

### Commits

| Role | SHA | Note |
|---|---|---|
| Feature (PAI-012) | `61cf9ac` | VOC-012 coach match-flow FII trend |
| Deployed HEAD | `30170a18a7838ffcc33e4b99de3a3014228157db` | Pre-Deploy GO · action items |
| Rollback parent | `64270a31918fc091f32c4996bd3ee0e782d28592` | PAI-011 Hosting HEAD |

> **Deployed tree = `30170a1`**.  
> CF / Firestore Rules: **미배포** (`firebase deploy --only hosting`).

---

## Scope Fact

| Item | Value |
|---|---|
| PAI-012 match-flow trend (Coach) | 포함 |
| Vision Match Detail + Ranking Avg/Δ | 포함 |
| 신규 Cloud Functions | **N** |
| Firestore Rules 변경 | **N** |
| 신규 root SoT / composite index | **N** |

---

## Build

```text
npm run build (production) → PASS
BUILD_START: 2026-07-12 09:15 KST
BUILD_END:   2026-07-12 09:16 KST (~1m 33s)
```

---

## Gate Chain (CLOSED)

```text
Deploy Fact ✅
    ↓
Production Post-Deploy Smoke ✅ PASS
    ↓
PAI-012 COMPLETE / CLOSED 🔒
```

SoT (Smoke): `PAI_012_POST_DEPLOY_SMOKE.md`  
Separated obs: `PROD-OBS-012` (`PRODUCTION_INCIDENTS.md`)

---

**Recorded:** 2026-07-12 09:18 KST · **Closed:** 2026-07-12 09:28 KST
