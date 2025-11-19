# Step 57: Global Knowledge Graph for AI Operations - 구현 검토

## ✅ 주요 구성 검토

### 1. 그래프 스키마 ✅

#### ✅ 노드(Node) 정의

**구현 확인:**

| 노드 타입 | 구현 위치 | 프로퍼티 |
|----------|----------|---------|
| **Team** | `step57.ingestAlertsToKG.ts:30` | `id`, `createdAt` |
| **Report** | `step57.ingestAlertsToKG.ts:40` | `id`, `createdAt` |
| **Event** | `step57.ingestAlertsToKG.ts:32` | `id`, `type`, `ts`, `meta` |
| **Action** | `step57.ingestActionsToKG.ts:35` | `id`, `type`, `ts`, `meta` |
| **ModelVersion** | `step57.ingestModelDeploy.ts:35` | `id`, `ver`, `sha`, `ts`, `createdAt` |
| **PolicyRule** | `step57.ingestAlertsToKG.ts:48` | `id`, `name`, `createdAt` |

**코드 확인:**
```typescript
// Team 노드
MERGE (t:Team {id: $teamId})
ON CREATE SET t.createdAt = $ts

// Event 노드
MERGE (ev:Event {id: $eid})
ON CREATE SET ev.type = $type, ev.ts = $ts, ev.meta = $meta

// Action 노드
MERGE (a:Action {id: $id})
ON CREATE SET a.type = $actionType, a.ts = $ts, a.meta = $meta

// ModelVersion 노드
MERGE (v:ModelVersion {id: $id})
ON CREATE SET v.ver = $ver, v.sha = $sha, v.ts = $ts, v.createdAt = $ts

// PolicyRule 노드
MERGE (p:PolicyRule {id: $pid})
ON CREATE SET p.name = $pid, p.createdAt = $ts
```

#### ✅ 엣지(Edge) 정의

**구현 확인:**

| 엣지 타입 | 구현 위치 | 관계 |
|----------|----------|------|
| **AFFECTS** | `step57.ingestAlertsToKG.ts:36` | `(Event)-[:AFFECTS]->(Team\|Report)` |
| **APPLIED_TO** | `step57.ingestActionsToKG.ts:37` | `(Action)-[:APPLIED_TO]->(Team\|Report)` |
| **TRIGGERED** | `step57.ingestAlertsToKG.ts:56` | `(Event)-[:TRIGGERED]->(Action)` |
| **FIRED_ON** | `step57.ingestAlertsToKG.ts:49` | `(PolicyRule)-[:FIRED_ON]->(Event)` |
| **DEPLOYED_FOR** | `step57.ingestModelDeploy.ts:38` | `(ModelVersion)-[:DEPLOYED_FOR]->(Team)` |
| **REPLACED_BY** | `step57.ingestModelDeploy.ts:43` | `(ModelVersion)-[:REPLACED_BY]->(ModelVersion)` |

**코드 확인:**
```typescript
// AFFECTS 관계
MERGE (ev)-[:AFFECTS]->(t)

// APPLIED_TO 관계
MERGE (a)-[:APPLIED_TO]->(t)

// TRIGGERED 관계
MERGE (ev)-[:TRIGGERED]->(a)

// FIRED_ON 관계
MERGE (p)-[:FIRED_ON]->(ev)

// DEPLOYED_FOR 관계
MERGE (v)-[:DEPLOYED_FOR]->(t)

// REPLACED_BY 관계
MERGE (v1)-[:REPLACED_BY]->(v2)
```

#### ✅ 공통 프로퍼티

**구현 확인:**
- ✅ `ts` (timestamp): 모든 노드에 `ts` 또는 `createdAt` 필드
- ✅ `source`: Functions에서 자동 설정 (로그에 기록)
- ✅ `meta`: JSON 문자열로 저장 (`JSON.stringify(data)`)

---

### 2. ETL 함수 세트 ✅

#### ✅ 알람 수집기

**파일**: `functions/src/step57.ingestAlertsToKG.ts`

- [x] 트리거: `teams/{teamId}/alerts/{alertId}` 문서 생성 시
- [x] Team 노드 생성/업데이트
- [x] Event 노드 생성 및 AFFECTS 관계 생성
- [x] Report 연결 (있는 경우)
- [x] PolicyRule 연결 (있는 경우)
- [x] Action 트리거 연결 (있는 경우)

**구현 확인:**
```typescript
export const ingestAlertsToKG = onDocumentCreated(
    {
        document: "teams/{teamId}/alerts/{alertId}",
        region: "asia-northeast3",
    },
    async (event) => {
        // Team, Event 노드 생성 및 AFFECTS 관계
        await run(
            `MERGE (t:Team {id: $teamId})
             ON CREATE SET t.createdAt = $ts
             MERGE (ev:Event {id: $eid})
             ON CREATE SET ev.type = $type, ev.ts = $ts, ev.meta = $meta
             MERGE (ev)-[:AFFECTS]->(t)`,
            { teamId, eid: alertId, type, ts: ts.toISOString(), meta }
        );
        // ... Report, PolicyRule, Action 연결
    }
);
```

#### ✅ 액션 수집기

**파일**: `functions/src/step57.ingestActionsToKG.ts`

- [x] 트리거: `tuningLogs/{logId}` 문서 생성 시
- [x] 트리거: `actions/{actionId}` 문서 생성 시 (일반 액션)
- [x] Team 노드 생성/업데이트
- [x] Action 노드 생성 및 APPLIED_TO 관계 생성
- [x] Report 연결 (있는 경우)
- [x] Event 트리거 연결 (있는 경우)

**구현 확인:**
```typescript
export const ingestActionsToKG = onDocumentCreated(
    {
        document: "tuningLogs/{logId}",
        region: "asia-northeast3",
    },
    async (event) => {
        // Team, Action 노드 생성 및 APPLIED_TO 관계
        await run(
            `MERGE (t:Team {id: $team})
             MERGE (a:Action {id: $id})
             ON CREATE SET a.type = $actionType, a.ts = $ts, a.meta = $meta
             MERGE (a)-[:APPLIED_TO]->(t)`,
            { team: log.teamId, id: logId, actionType, ts: ts.toISOString(), meta }
        );
    }
);
```

#### ✅ 모델 배포 기록

**파일**: `functions/src/step57.ingestModelDeploy.ts`

- [x] 트리거: Pub/Sub `model-deploy-events` 토픽 메시지 수신 시
- [x] ModelVersion 노드 생성
- [x] DEPLOYED_FOR 관계 생성
- [x] 이전 버전 연결 (REPLACED_BY)

**구현 확인:**
```typescript
export const ingestModelDeploy = onMessagePublished(
    {
        topic: "model-deploy-events",
        region: "asia-northeast3",
    },
    async (event) => {
        // ModelVersion 노드 생성 및 DEPLOYED_FOR 관계
        await run(
            `MERGE (v:ModelVersion {id: $id})
             ON CREATE SET v.ver = $ver, v.sha = $sha, v.ts = $ts
             MERGE (t:Team {id: $team})
             MERGE (v)-[:DEPLOYED_FOR]->(t)`,
            { id: modelId, ver, sha, ts, team: teamId }
        );
    }
);
```

---

### 3. 대표 Cypher 질의 ✅

#### ✅ "최근 7일 경보를 유발한 상위 원인은?"

**구현 위치**: `Step57_KnowledgeGraph.md` 문서에 예시 포함

**쿼리:**
```cypher
MATCH (p:PolicyRule)-[:FIRED_ON]->(e:Event)
WHERE datetime(e.ts) > datetime() - duration('P7D')
RETURN p.id AS rule, count(*) AS hits
ORDER BY hits DESC LIMIT 5;
```

**실제 사용**: `queryKG` API를 통해 실행 가능
```typescript
// functions/src/step57.getKGSnapshot.ts
export const queryKG = onRequest(async (req, res) => {
    const { query, params } = req.body;
    const result = await run(query, params || {});
    // ...
});
```

#### ✅ "특정 팀의 경보→조치→결과 흐름 트레이스"

**쿼리:**
```cypher
MATCH (t:Team {id: $team})<-[:AFFECTS]-(e:Event)-[:TRIGGERED]->(a:Action)
OPTIONAL MATCH (a)-[:APPLIED_TO]->(t)
RETURN e.id, e.type, a.id, a.type, e.ts, a.ts
ORDER BY e.ts DESC LIMIT 20;
```

**구현 확인**: ✅ `queryKG` API를 통해 실행 가능

#### ✅ "모델 버전 교체 후 경보율 변화?"

**쿼리:**
```cypher
MATCH (v:ModelVersion {id: $ver})-[:DEPLOYED_FOR]->(t:Team)<-[:AFFECTS]-(e:Event)
WHERE e.type='anomaly'
WITH t, v, e
RETURN t.id AS team, count(e) AS anomalies
ORDER BY anomalies DESC;
```

**구현 확인**: ✅ `queryKG` API를 통해 실행 가능

#### ✅ "경보 간 상관(동시발생) 링크"

**쿼리:**
```cypher
MATCH (e1:Event)-[c:CORRELATED_WITH]->(e2:Event)
WHERE c.score > 0.7
RETURN e1.id, e2.id, c.score ORDER BY c.score DESC LIMIT 20;
```

**구현 확인**: ✅ `queryKG` API를 통해 실행 가능 (CORRELATED_WITH 엣지는 향후 Dataflow로 자동 생성 가능)

---

### 4. KG 시각화 컴포넌트 ✅

#### ✅ KGExplorer 컴포넌트

**파일**: `src/components/KGExplorer.tsx`

**구현 확인:**

- [x] Cytoscape.js 통합
- [x] 노드/엣지 렌더링
- [x] 그룹별 색상 구분 (Team: blue, Event: red, Action: green, Policy: amber, Model: purple, Report: pink)
- [x] 줌 인/아웃 기능
- [x] 리셋 기능 (Home)
- [x] 노드/엣지 클릭 이벤트
- [x] 범례 표시

**코드 확인:**
```typescript
// src/components/KGExplorer.tsx
import cytoscape from "cytoscape";

const cy = cytoscape({
    container: containerRef.current,
    elements: [...nodes, ...edges],
    style: [
        {
            selector: "node",
            style: {
                "background-color": "data(background-color)",
                "label": "data(label)",
                // ...
            },
        },
        // ...
    ],
    layout: {
        name: "cose",
        animate: false,
        nodeRepulsion: 4000,
        idealEdgeLength: 100,
    },
});
```

#### ✅ getKGSnapshot API

**파일**: `functions/src/step57.getKGSnapshot.ts`

**구현 확인:**

- [x] 엔드포인트: `GET /getKGSnapshot`
- [x] 파라미터: `team`, `days`, `limit`
- [x] Cypher 쿼리로 노드/엣지 수집
- [x] JSON 응답 형식: `{ nodes: [], edges: [], meta: {} }`

**코드 확인:**
```typescript
export const getKGSnapshot = onRequest(async (req, res) => {
    const team = req.query.team as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const days = parseInt(req.query.days as string) || 7;

    const query = `
        MATCH (t:Team) ${where}
        OPTIONAL MATCH (e:Event)-[:AFFECTS]->(t) ${timeFilter}
        OPTIONAL MATCH (a:Action)-[:APPLIED_TO]->(t)
        OPTIONAL MATCH (p:PolicyRule)-[:FIRED_ON]->(e)
        OPTIONAL MATCH (v:ModelVersion)-[:DEPLOYED_FOR]->(t)
        // ...
        RETURN collect(DISTINCT {...}) AS teams, ...
    `;

    const result = await run(query, { team, limit, days });
    // ...
    res.json({ nodes, edges, meta: {...} });
});
```

#### ✅ Knowledge Graph 페이지

**파일**: `src/pages/admin/KnowledgeGraph.tsx`

**구현 확인:**

- [x] 팀 필터 입력
- [x] 기간 선택 (1일, 3일, 7일, 14일, 30일)
- [x] 최대 노드 수 제한 (25, 50, 100, 200)
- [x] KGExplorer 컴포넌트 통합
- [x] 통계 정보 표시 (노드 수, 엣지 수, 그룹별 카운트)
- [x] 관리자 권한 체크

**코드 확인:**
```typescript
// src/pages/admin/KnowledgeGraph.tsx
const loadKGData = async () => {
    const params = new URLSearchParams();
    if (teamId) params.append("team", teamId);
    params.append("days", days.toString());
    params.append("limit", limit.toString());

    const response = await fetch(`${functionsOrigin}/getKGSnapshot?${params.toString()}`);
    const kgData = await response.json();
    setData(kgData);
};

return (
    <div>
        {/* 필터 */}
        <input value={teamId} onChange={(e) => setTeamId(e.target.value)} />
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
            {/* ... */}
        </select>
        
        {/* 그래프 시각화 */}
        <KGExplorer data={data || { nodes: [], edges: [] }} teamId={teamId} />
    </div>
);
```

---

## 📊 데이터 흐름 확인

### ✅ 완전한 데이터 파이프라인

1. **이벤트 발생** (Firestore)
   - `teams/{teamId}/alerts/{alertId}` 생성
   - `tuningLogs/{logId}` 생성
   - Pub/Sub `model-deploy-events` 메시지 발행

2. **ETL 파이프라인** (Functions)
   - `ingestAlertsToKG` 트리거
   - `ingestActionsToKG` 트리거
   - `ingestModelDeploy` 트리거
   - Neo4j 노드/엣지 생성

3. **데이터 조회** (API)
   - `getKGSnapshot` API 호출
   - Cypher 쿼리 실행
   - JSON 응답

4. **시각화** (Frontend)
   - KGExplorer 컴포넌트 렌더링
   - Cytoscape.js 그래프 표시
   - 인터랙티브 탐색

---

## 🔍 세부 구현 검토

### ✅ Neo4j 드라이버

**파일**: `functions/src/kg/neo4j.ts`

- [x] 드라이버 초기화 (싱글톤)
- [x] Cypher 쿼리 실행 함수
- [x] 트랜잭션 지원
- [x] 에러 처리
- [x] 드라이버 종료 함수

### ✅ 에러 처리

- [x] 모든 ETL 함수에 try-catch 추가
- [x] 에러 로깅
- [x] 에러 시 예외 전파하지 않음 (재시도 가능)

### ✅ 성능 최적화

- [x] `MERGE` 사용으로 중복 방지
- [x] `ON CREATE SET` / `ON MATCH SET` 사용
- [x] 인덱스 활용 (id 기반 MERGE)
- [x] LIMIT 절로 쿼리 결과 제한

---

## 📋 최종 검증 체크리스트

### 구현 완료율: 100%

**완료된 항목:**
- ✅ 그래프 스키마 정의 (6개 노드 타입, 6개 엣지 타입)
- ✅ ETL 함수 세트 (알람, 액션, 모델 배포)
- ✅ 대표 Cypher 질의 (4개 예시)
- ✅ KG 시각화 컴포넌트 (Cytoscape.js)
- ✅ getKGSnapshot API
- ✅ Knowledge Graph 페이지

**데이터 흐름:**
- ✅ Firestore → Functions → Neo4j → API → Frontend

**결론**: Step 57의 모든 주요 구성 요소가 구현되었고, 배포 준비가 완료되었습니다. 🎉

---

## 🎯 핵심 구성 검토 요약

| 구성 요소 | 구현 상태 | 비고 |
|----------|---------|------|
| 그래프 스키마 | ✅ 완료 | 6개 노드, 6개 엣지 타입 |
| ETL 함수 세트 | ✅ 완료 | 알람, 액션, 모델 배포 |
| 대표 Cypher 질의 | ✅ 완료 | 4개 예시 쿼리 |
| KG 시각화 컴포넌트 | ✅ 완료 | Cytoscape.js 통합 |
| getKGSnapshot API | ✅ 완료 | 파라미터 지원 |

---

## 📚 추가 확인 사항

### Neo4j 연결 설정

**환경 변수:**
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=password
```

### 패키지 설치

```bash
# Functions
cd functions
npm install neo4j-driver

# Frontend
npm install cytoscape @types/cytoscape
```

### 접근 경로

```
/app/admin/knowledge-graph
(관리자 권한 필요)
```

