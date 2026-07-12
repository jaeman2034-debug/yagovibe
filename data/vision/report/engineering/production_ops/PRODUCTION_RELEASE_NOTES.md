# Production Release Notes

**Document ID:** `PRODUCTION-RELEASE-NOTES-001`  
**SoT:** `PRODUCTION_RUN_SHEET.md`  
**Status:** ▶ ACTIVE

> 배포·변경 사실만 기록. 마케팅 문구·추정 금지.

---

## Releases

| Version / Tag | Date | Change (Fact) | Related Issue / VOC | Note |
|---|---|---|---|---|
| Hosting `30170a1` | 2026-07-12 09:18 KST | PAI-012 VOC-012 coach match-flow FII trend · Match Detail Ranking Avg/Δ | VOC-012 · PAI-012 | Production Hosting · **Deploy complete** · COMPLETE/CLOSED 금지 · Smoke 대기 |
| Hosting `64270a3` | 2026-07-11 20:56 KST | PAI-011 VOC-011 peer benchmark · Vision Parent UI stack · kakaoShare build fix | VOC-011 · PAI-011 | Production Hosting · **VERIFIED** · Post-Deploy Smoke PASS · PAI-011 **COMPLETE/CLOSED** |
| Hosting `4d508ac` | 2026-07-11 14:57 KST | PAI-001: Kakao iOS openExternal · persistence · next preserve · Safari CTA | BETA-ISSUE-001 · PAI-001 | Production Hosting · Verification PASS · ISSUE CLOSED (Verified) |
| — | 2026-07-21 | Production 운영 체계 개시 (`production_ops/`) | GO with Open Issue | Docs only |

### PAI-012 Deploy Fact (2026-07-12)

```text
배포 일시: 2026-07-12 09:18 KST
프로젝트: yago-vibe-spt
타깃: Firebase Hosting Production
Hosting URL: https://yago-vibe-spt.web.app
Feature commit: 61cf9ac
Deployed HEAD: 30170a18a7838ffcc33e4b99de3a3014228157db
Rollback: 64270a31918fc091f32c4996bd3ee0e782d28592
결과: Deploy complete · release complete · 456 files
CF / Rules: N (hosting only)
Scope: PAI-012 coach match-flow · Vision Match Detail
```

> SoT: `PAI_012_DEPLOY_FACT.md`  
> ❌ Deploy 성공 ≠ PAI-012 COMPLETE/CLOSED  
> 🛑 Day-03 DATE_GATE_PENDING 미변경 (VOC-011 원장 15 유지)

### PAI-011 Deploy Fact (2026-07-11) — VERIFIED

```text
배포 일시: 2026-07-11 20:56 KST
프로젝트: yago-vibe-spt
타깃: Firebase Hosting Production
Hosting URL: https://yago-vibe-spt.web.app
Feature commit: 07fb6895bdd03433a0913e9924151999d4ab2c4c
Deployed HEAD: 64270a31918fc091f32c4996bd3ee0e782d28592
Rollback: 4d508ac43b053a9f114f5ba32a99ba0d1eac27d7
결과: Deploy complete · release complete · 456 files
CF / Rules: N (hosting only)
Scope: PAI-011 peer + Vision Parent/관련 UI 스택 (동일 feature 커밋)
Post-Deploy Smoke: PASS (Parent Vision Report / peer benchmark card)
PAI-011: COMPLETE / CLOSED
```

> SoT: `PAI_011_DEPLOY_FACT.md` · Smoke: `PAI_011_POST_DEPLOY_SMOKE.md`  
> ✅ Release **VERIFIED** · PAI-011 **COMPLETE/CLOSED**  
> 🛑 Day-03 DATE_GATE_PENDING 미변경 (VOC-011 원장 15 유지)

---

## Template

```text
Release:
Date:
Scope: (docs / fix / feature)
Official Fact of change:
Known Issues remaining:
Rollback note:
```
