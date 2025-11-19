# Step 57: Global Knowledge Graph for AI Operations

Copilot 명령, QA/알람, 튜닝, 모델 배포, 정책 이벤트를 그래프(관계형)로 통합하여 "원인→결과→대응" 흐름을 질의/시각화하고, 자동 인사이트를 생성합니다.

## 📋 목표

1. 모든 운영 이벤트를 그래프 데이터베이스로 통합
2. 관계형 질의를 통한 원인 분석
3. 그래프 시각화를 통한 직관적 탐색
4. 자동 인사이트 생성

## 🧩 그래프 개념 및 스키마

### 노드(Node)

- **Team** (id)
- **Report** (id)
- **Event** (id, type=anomaly|alert|approval|qa|deploy|retune)
- **Action** (id, type=tuning|retuning|predict|deploy|block)
- **ModelVersion** (id, ver, sha)
- **PolicyRule** (id, name)

### 엣지(Edge)

- `(Event)-[:AFFECTS]->(Team|Report)`
- `(Action)-[:APPLIED_TO]->(Team|Report)`
- `(Event)-[:TRIGGERED]->(Action)`
- `(PolicyRule)-[:FIRED_ON]->(Event)`
- `(ModelVersion)-[:DEPLOYED_FOR]->(Team)`
- `(Event)-[:CORRELATED_WITH {score}]->(Event)`
- `(ModelVersion)-[:REPLACED_BY]->(ModelVersion)`

### 공통 프로퍼티

- `ts` (timestamp)
- `source` (function/dataflow)
- `meta` (JSON)

## 🗄️ 백엔드 스토리지

### Neo4j Aura (권장)

- 풍부한 Cypher/관계 질의
- Graph 알고리즘 지원
- 실시간 탐색 최적화

### 환경 변수

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=password
```

## 🔄 ETL 파이프라인

### 1. 알람 수집기

**파일**: `functions/src/step57.ingestAlertsToKG.ts`

- **트리거**: `teams/{teamId}/alerts/{alertId}` 문서 생성 시
- **기능**:
  - Team 노드 생성/업데이트
  - Event 노드 생성 및 AFFECTS 관계 생성
  - Report 연결 (있는 경우)
  - PolicyRule 연결 (있는 경우)
  - Action 트리거 연결 (있는 경우)

### 2. 액션 수집기

**파일**: `functions/src/step57.ingestActionsToKG.ts`

- **트리거**: `tuningLogs/{logId}` 또는 `actions/{actionId}` 문서 생성 시
- **기능**:
  - Team 노드 생성/업데이트
  - Action 노드 생성 및 APPLIED_TO 관계 생성
  - Report 연결 (있는 경우)
  - Event 트리거 연결 (있는 경우)

### 3. 모델 배포 기록

**파일**: `functions/src/step57.ingestModelDeploy.ts`

- **트리거**: Pub/Sub `model-deploy-events` 토픽 메시지 수신 시
- **기능**:
  - ModelVersion 노드 생성
  - DEPLOYED_FOR 관계 생성
  - 이전 버전 연결 (REPLACED_BY)

## 📊 API 엔드포인트

### GET /getKGSnapshot

**설명**: Knowledge Graph 스냅샷 조회

**파라미터**:
- `team` (선택): 팀 ID 필터
- `days` (기본값: 7): 기간 (일)
- `limit` (기본값: 50): 최대 노드 수

**응답**:
```json
{
  "nodes": [
    { "id": "team1", "label": "SOHEUL_FC", "group": "Team" },
    { "id": "event1", "label": "alert", "group": "Event" }
  ],
  "edges": [
    { "id": "ae-event1-team1", "source": "event1", "target": "team1", "label": "AFFECTS" }
  ],
  "meta": { "team": "SOHEUL_FC", "limit": 50, "days": 7, "timestamp": "..." }
}
```

### POST /queryKG

**설명**: Cypher 쿼리 직접 실행

**Body**:
```json
{
  "query": "MATCH (t:Team)-[:AFFECTS]-(e:Event) RETURN t, e LIMIT 10",
  "params": {}
}
```

**응답**:
```json
{
  "records": [
    { "t": {...}, "e": {...} }
  ],
  "count": 1
}
```

## 🔍 대표 Cypher 질의

### "최근 7일 경보를 유발한 상위 원인은?"

```cypher
MATCH (p:PolicyRule)-[:FIRED_ON]->(e:Event)
WHERE datetime(e.ts) > datetime() - duration('P7D')
RETURN p.id AS rule, count(*) AS hits
ORDER BY hits DESC LIMIT 5;
```

### "특정 팀의 경보→조치→결과 흐름 트레이스"

```cypher
MATCH (t:Team {id: $team})<-[:AFFECTS]-(e:Event)-[:TRIGGERED]->(a:Action)
OPTIONAL MATCH (a)-[:APPLIED_TO]->(t)
RETURN e.id, e.type, a.id, a.type, e.ts, a.ts
ORDER BY e.ts DESC LIMIT 20;
```

### "모델 버전 교체 후 경보율 변화?"

```cypher
MATCH (v:ModelVersion {id: $ver})-[:DEPLOYED_FOR]->(t:Team)<-[:AFFECTS]-(e:Event)
WHERE e.type='anomaly'
WITH t, v, e
RETURN t.id AS team, count(e) AS anomalies
ORDER BY anomalies DESC;
```

### "경보 간 상관(동시발생) 링크"

```cypher
MATCH (e1:Event)-[c:CORRELATED_WITH]->(e2:Event)
WHERE c.score > 0.7
RETURN e1.id, e2.id, c.score ORDER BY c.score DESC LIMIT 20;
```

## 🖥️ 프런트엔드 - KG 시각화

### KGExplorer 컴포넌트

**파일**: `src/components/KGExplorer.tsx`

- **기술**: Cytoscape.js
- **기능**:
  - 인터랙티브 그래프 시각화
  - 줌 인/아웃, 리셋
  - 노드/엣지 클릭 이벤트
  - 그룹별 색상 구분

### Knowledge Graph 페이지

**파일**: `src/pages/admin/KnowledgeGraph.tsx`

- **기능**:
  - 팀 필터
  - 기간 선택 (1일, 3일, 7일, 14일, 30일)
  - 최대 노드 수 제한
  - 통계 정보 표시

### 접근 경로

```
/app/admin/knowledge-graph
(관리자 권한 필요)
```

## 🔧 배포 절차

### 1. Neo4j 설치

#### Neo4j Desktop (로컬)

```bash
# Neo4j Desktop 다운로드 및 설치
# https://neo4j.com/download/
```

#### Neo4j Aura (클라우드)

```bash
# Neo4j Aura 계정 생성
# https://neo4j.com/cloud/aura/
```

### 2. 환경 변수 설정

```bash
firebase functions:config:set \
  neo4j.uri="bolt://localhost:7687" \
  neo4j.user="neo4j" \
  neo4j.pass="password"
```

또는 `.env` 파일:

```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=password
```

### 3. 패키지 설치

```bash
cd functions
npm install neo4j-driver
```

```bash
npm install cytoscape @types/cytoscape
```

### 4. Functions 배포

```bash
firebase deploy --only functions:ingestAlertsToKG,functions:ingestActionsToKG,functions:ingestModelDeploy,functions:getKGSnapshot,functions:queryKG
```

### 5. Pub/Sub 토픽 생성

```bash
gcloud pubsub topics create model-deploy-events
```

## 📈 사용 시나리오

### 시나리오 1: 원인 분석

1. Knowledge Graph 페이지 접근
2. 팀 필터 선택 (예: SOHEUL_FC)
3. 기간 선택 (7일)
4. 그래프에서 Event 노드 클릭
5. 연결된 PolicyRule, Action 확인
6. 원인-결과 흐름 추적

### 시나리오 2: 모델 배포 영향 분석

1. 모델 배포 이벤트 발행
2. `ingestModelDeploy` 함수가 그래프에 추가
3. Knowledge Graph에서 ModelVersion 노드 확인
4. 연결된 Team, Event 확인
5. 배포 전후 경보율 비교

### 시나리오 3: 커스텀 쿼리 실행

1. Knowledge Graph 페이지 접근
2. Cypher 쿼리 작성
3. `/queryKG` API 호출
4. 결과 시각화

## 🎨 확장 아이디어

### 1. Graph-Aware Copilot (Step 58)

자연어로 "지난주 소흘FC에서 경보를 유발한 주요 원인과 그에 따른 조치 결과를 보여줘"라고 하면:
- Cypher 쿼리 자동 생성
- 결과 설명형 답변 제공
- 그래프 시각화 동시 제공

### 2. 자동 상관 분석

- Dataflow로 Event 간 상관 스코어 계산
- CORRELATED_WITH 엣지 자동 생성
- 인사이트 자동 생성

### 3. 예측 분석

- 그래프 알고리즘 활용 (PageRank, Centrality)
- 영향력 있는 노드 식별
- 예측 모델 통합

## 🐛 문제 해결

### 문제 1: Neo4j 연결 실패

**원인**: 환경 변수가 설정되지 않음

**해결**:
```bash
firebase functions:config:get
# 환경 변수 확인 및 설정
```

### 문제 2: 그래프가 비어있음

**원인**: ETL 파이프라인이 실행되지 않음

**해결**:
- Firestore 문서 생성 확인
- Functions 로그 확인
- 수동으로 테스트 데이터 생성

### 문제 3: Cytoscape 렌더링 오류

**원인**: 노드/엣지 데이터 형식 오류

**해결**:
- 브라우저 콘솔 확인
- 데이터 형식 검증
- 빈 데이터 처리

## 📚 다음 단계

- Step 58: Graph-Aware Copilot
- Step 59: 자동 상관 분석
- Step 60: 예측 분석

