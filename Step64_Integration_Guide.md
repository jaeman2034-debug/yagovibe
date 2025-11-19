# Step 64: Governance Enforcer 통합 가이드

핵심 함수에 `governanceEnforcer` 미들웨어를 통합하는 방법을 안내합니다.

## 🔧 통합 방법

### 1. opsRouterV2 통합

**파일**: `functions/src/step52.opsRouterV2.ts` (또는 해당 파일)

**통합 위치**: 함수 시작 부분, 인증 확인 후

```typescript
import { enforce } from './step64.governanceEnforcer';

export const opsRouterV2 = onRequest(async (req, res) => {
  try {
    // 기존 인증 로직...
    const { text, teamId } = req.body || {};
    
    // ⭐ Governance Enforcer 추가
    await enforce("ops", teamId, intent);
    
    // 기존 로직 계속...
  } catch (error: any) {
    if (error.message?.includes("blocked_by_policy")) {
      res.status(403).json({ error: error.message });
      return;
    }
    // 기존 에러 처리...
  }
});
```

### 2. graphCopilot 통합

**파일**: `functions/src/step58.graphCopilot.ts`

**통합 위치**: 함수 시작 부분

```typescript
import { enforce } from './step64.governanceEnforcer';

export const graphCopilot = onRequest(async (req, res) => {
  try {
    const { text, teamId } = req.body || {};
    
    // ⭐ Governance Enforcer 추가
    await enforce("kg", teamId);
    
    // 기존 로직 계속...
  } catch (error: any) {
    if (error.message?.includes("blocked_by_policy")) {
      res.status(403).json({ error: error.message });
      return;
    }
    // 기존 에러 처리...
  }
});
```

### 3. tuningLoop 통합

**파일**: `functions/src/step48.tuningLoop.ts` (또는 해당 파일)

**통합 위치**: 함수 시작 부분

```typescript
import { enforce } from './step64.governanceEnforcer';

export const tuningLoop = onSchedule(async () => {
  try {
    // ⭐ Governance Enforcer 추가
    await enforce("ops", undefined, "retuning");
    
    // 기존 로직 계속...
  } catch (error: any) {
    if (error.message?.includes("blocked_by_policy")) {
      logger.warn("⚠️ 정책에 의해 차단됨:", error.message);
      return;
    }
    // 기존 에러 처리...
  }
});
```

### 4. publishInsight 통합

**파일**: `functions/src/step60.publishInsight.ts`

**통합 위치**: 권한 확인 후

```typescript
import { enforce } from './step64.governanceEnforcer';

export const publishInsight = onRequest(async (req, res) => {
  try {
    const { id, decision, reviewer } = req.body || {};
    
    // 기존 권한 확인...
    
    // ⭐ Governance Enforcer 추가
    await enforce("insights", data.teamId, decision);
    
    // 기존 로직 계속...
  } catch (error: any) {
    if (error.message?.includes("blocked_by_policy")) {
      res.status(403).json({ error: error.message });
      return;
    }
    // 기존 에러 처리...
  }
});
```

### 5. complianceExporter 통합

**파일**: `functions/src/step63.complianceExporter.ts`

**통합 위치**: 권한 확인 후

```typescript
import { enforce } from './step64.governanceEnforcer';

export const complianceExporter = onRequest(async (req, res) => {
  try {
    const { uid } = req.query as any;
    
    // ⭐ Governance Enforcer 추가
    await enforce("exports", undefined, "export");
    
    // 기존 로직 계속...
  } catch (error: any) {
    if (error.message?.includes("blocked_by_policy")) {
      res.status(403).json({ error: error.message });
      return;
    }
    // 기존 에러 처리...
  }
});
```

## 📋 통합 체크리스트

### 통합 필요한 함수들

- [ ] `opsRouterV2` - Ops Copilot 라우터
- [ ] `graphCopilot` - Graph-Aware Copilot
- [ ] `tuningLoop` - 자동 보정 루프
- [ ] `publishInsight` - 인사이트 승인/반려
- [ ] `complianceExporter` - 감사 번들 생성
- [ ] 기타 주요 HTTPS 함수

### 통합 단계

1. **Import 추가**
   ```typescript
   import { enforce } from './step64.governanceEnforcer';
   ```

2. **함수 시작 부분에 enforce 호출**
   ```typescript
   await enforce(service, teamId, action);
   ```

3. **에러 처리 추가**
   ```typescript
   catch (error: any) {
     if (error.message?.includes("blocked_by_policy")) {
       res.status(403).json({ error: error.message });
       return;
     }
     // 기존 에러 처리...
   }
   ```

## 🎯 서비스 이름 매핑

| 함수 | 서비스 이름 | 설명 |
|------|------------|------|
| `opsRouterV2` | `"ops"` | Ops Copilot |
| `graphCopilot` | `"kg"` | Knowledge Graph Copilot |
| `tuningLoop` | `"ops"` | 자동 보정 루프 |
| `publishInsight` | `"insights"` | 인사이트 승인/반려 |
| `complianceExporter` | `"exports"` | 감사 번들 생성 |

## ⚠️ 주의사항

1. **에러 처리**: `blocked_by_policy` 에러는 403 Forbidden으로 반환
2. **로깅**: 차단된 경우 감사 로그 자동 기록 (enforce 함수 내부)
3. **비동기**: enforce는 async 함수이므로 await 필수
4. **서비스 이름**: 정책의 `scope.services`와 일치해야 함

## 📚 참고

- `functions/src/step64.governanceEnforcer.ts` - 미들웨어 구현
- `functions/src/step64.getPolicy.ts` - 정책 조회 API
- `Step64_GlobalGovernancePortal.md` - 전체 가이드

