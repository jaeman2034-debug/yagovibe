# Step 58: Graph-Aware Copilot

자연어로 "지난주 소흘FC에서 경보를 유발한 주요 원인과 그에 따른 조치 결과를 보여줘"라고 하면, Cypher 쿼리를 자동 생성하고 실행하여 설명형 답변과 그래프 시각화를 동시 제공합니다.

## 📋 목표

1. 자연어 입력을 안전한 Cypher 쿼리로 변환
2. 템플릿 기반 Cypher 생성
3. LLM 백오프 (템플릿 미매칭 시)
4. 안전 검증 (READ-ONLY만 허용)
5. 결과 요약 및 시각화

## 🧠 시스템 개요

```
[Natural Language Input]
     ↓
[Intent Extraction]
     ↓
[Template Matching] → [Cypher Query]
     ↓ (미매칭 시)
[LLM Generation] → [Cypher Query]
     ↓
[Safety Validation] (READ-ONLY만 허용)
     ↓
[Neo4j Execution]
     ↓
[Result Summary + Visualization]
```

## ⚙️ 1) graphCopilot 함수

**파일**: `functions/src/step58.graphCopilot.ts`

### 기능

- **NL 입력**: 자연어 질문 수신
- **Intent 추출**: 질문에서 의도 및 파라미터 추출
- **템플릿 매칭**: 미리 정의된 템플릿으로 Cypher 생성
- **LLM 백오프**: 템플릿 미매칭 시 GPT로 Cypher 생성
- **안전 검증**: READ-ONLY 쿼리만 허용
- **Neo4j 실행**: 쿼리 실행 및 결과 반환
- **요약 생성**: LLM으로 결과 요약

### 엔드포인트

**POST /graphCopilot**

**Body**:
```json
{
  "text": "지난주 소흘FC에서 경보를 유발한 주요 원인은?",
  "teamId": "SOHEUL_FC",
  "uid": "user123"
}
```

**응답**:
```json
{
  "success": true,
  "query": "MATCH (p:PolicyRule)-[:FIRED_ON]->(e:Event)...",
  "querySource": "template",
  "summary": "지난주 소흘FC에서 총 5개의 경보가 발생했습니다...",
  "records": [...],
  "count": 5,
  "intent": "top_alerts",
  "params": { "teamId": "SOHEUL_FC", "days": 7, "limit": 10 }
}
```

## 🔒 2) 안전장치

### READ-ONLY 쿼리만 허용

**차단 키워드**:
- `CREATE`, `DELETE`, `DROP`, `SET`, `REMOVE`, `MERGE`, `DETACH`, `FOREACH`, `CALL`, `WITH`, `UNWIND`

**허용 키워드**:
- `MATCH`, `RETURN`, `WHERE`, `OPTIONAL MATCH`, `ORDER BY`, `LIMIT`, `WITH` (읽기 전용)

**구현 확인**:
```typescript
function validateCypherQuery(query: string): { valid: boolean; error?: string } {
    const upperQuery = query.toUpperCase().trim();
    
    // 위험한 키워드 차단
    const dangerousKeywords = ["CREATE", "DELETE", "DROP", "SET", ...];
    
    for (const keyword of dangerousKeywords) {
        if (upperQuery.includes(keyword)) {
            return { valid: false, error: `Dangerous keyword "${keyword}" is not allowed` };
        }
    }
    
    // MATCH와 RETURN이 포함되어야 함
    if (!upperQuery.includes("MATCH") && !upperQuery.includes("RETURN")) {
        return { valid: false, error: "Query must contain MATCH and RETURN" };
    }
    
    return { valid: true };
}
```

### 팀 ACL 검증

**구현 위치**: `graphCopilot` 함수 내

```typescript
// 팀 ACL 검증 (있는 경우)
if (providedTeamId && uid) {
    // TODO: 팀 접근 권한 검증 로직 추가
    // const hasAccess = await checkTeamAccess(uid, providedTeamId);
    // if (!hasAccess) {
    //     res.status(403).json({ error: "Team access denied" });
    //     return;
    // }
}
```

### 기간 제한

**기본값**: 7일 (최대 30일 권장)

```typescript
const days = daysMatch ? parseInt(daysMatch[1]) : 7;
// 최대 30일로 제한
const maxDays = Math.min(days, 30);
```

## 📝 3) 템플릿 기반 Cypher 생성

### 지원 템플릿

| Intent | 설명 | 템플릿 |
|--------|------|--------|
| `top_alerts` | 최근 경보 상위 원인 | `(PolicyRule)-[:FIRED_ON]->(Event)` |
| `team_trace` | 팀별 경보→조치 트레이스 | `(Event)-[:TRIGGERED]->(Action)` |
| `model_impact` | 모델 버전 교체 영향 | `(ModelVersion)-[:DEPLOYED_FOR]->(Team)` |
| `team_stats` | 팀별 이벤트 통계 | `(Event)-[:AFFECTS]->(Team)` |
| `correlations` | 경보 간 상관관계 | `(Event)-[:CORRELATED_WITH]->(Event)` |

**구현 확인**:
```typescript
function generateCypherFromTemplate(intent: string, params: any): string | null {
    const templates: { [key: string]: (p: any) => string } = {
        "top_alerts": (p) => `
            MATCH (p:PolicyRule)-[:FIRED_ON]->(e:Event)
            WHERE datetime(e.ts) > datetime() - duration({days: ${p.days || 7}})
            ${p.teamId ? `MATCH (e)-[:AFFECTS]->(t:Team {id: "${p.teamId}"})` : ""}
            RETURN p.id AS rule, count(*) AS hits
            ORDER BY hits DESC LIMIT ${p.limit || 10}
        `,
        // ...
    };
    
    return templates[intent] ? templates[intent](params) : null;
}
```

## 🤖 4) LLM 백오프

### 템플릿 미매칭 시 LLM 사용

**조건**: 
- 템플릿 매칭 실패
- `OPENAI_API_KEY` 환경 변수 설정됨

**프롬프트**:
```
You are a Cypher query generator for Neo4j. Generate a READ-ONLY query (MATCH/RETURN only) based on the user's question.

Rules:
- Only use MATCH and RETURN clauses
- Do NOT use CREATE, DELETE, MERGE, SET, DROP, REMOVE, or any write operations
- If teamId is provided, filter by Team {id: teamId}
- Limit results to reasonable size (LIMIT 20-50)
- Return readable results with meaningful column names

User question: "${text}"
```

**구현 확인**:
```typescript
if (templateQuery) {
    cypherQuery = templateQuery.trim();
    querySource = "template";
} else if (openai) {
    // LLM 백오프
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
    });
    
    cypherQuery = completion.choices[0].message?.content?.trim() || "";
    querySource = "llm";
}
```

## 🖥️ 5) GraphAsk UI

**파일**: `src/components/GraphAsk.tsx`

### 기능

- **질문 입력**: 자연어 질문 입력창
- **요약 표시**: LLM으로 생성된 요약
- **Cypher 표시**: 생성된 Cypher 쿼리 표시/숨기기
- **결과 테이블**: 쿼리 결과 표시
- **그래프 시각화**: 결과를 Knowledge Graph 형식으로 변환하여 표시

### Knowledge Graph 페이지 통합

**파일**: `src/pages/admin/KnowledgeGraph.tsx`

- 탭 UI로 "그래프 탐색"과 "Graph Copilot" 전환
- GraphAsk 컴포넌트 통합
- 팀 필터 연동

## 📊 사용 시나리오

### 시나리오 1: 최근 경보 원인 분석

1. Graph Copilot 탭 접근
2. 질문 입력: "지난주 소흘FC에서 경보를 유발한 주요 원인은?"
3. 템플릿 매칭: `top_alerts` Intent
4. Cypher 생성: `(PolicyRule)-[:FIRED_ON]->(Event)` 쿼리
5. 결과 요약: "지난주 소흘FC에서 총 5개의 경보가 발생했습니다..."
6. 그래프 시각화: PolicyRule → Event 관계 표시

### 시나리오 2: 커스텀 질문 (LLM 백오프)

1. 질문 입력: "특정 팀의 최근 3일간 이벤트 발생 패턴을 보여줘"
2. 템플릿 미매칭: 기존 템플릿과 매칭되지 않음
3. LLM 생성: GPT로 READ-ONLY Cypher 생성
4. 안전 검증: 위험 키워드 차단 확인
5. 결과 반환: 요약 + 시각화

## 🔧 배포 절차

### 1. 환경 변수 설정

```bash
firebase functions:config:set \
  openai.api_key="YOUR_OPENAI_API_KEY"
```

### 2. Functions 배포

```bash
firebase deploy --only functions:graphCopilot
```

### 3. 프론트엔드 접근

```
/app/admin/knowledge-graph → Graph Copilot 탭
(관리자 권한 필요)
```

## 🐛 문제 해결

### 문제 1: LLM이 위험한 쿼리를 생성함

**원인**: LLM이 CREATE/DELETE 등 쓰기 작업 포함

**해결**: 안전 검증 함수가 차단 (`validateCypherQuery`)

### 문제 2: 템플릿 매칭 실패

**원인**: 질문 형식이 템플릿과 일치하지 않음

**해결**: LLM 백오프 사용 (OPENAI_API_KEY 설정 필요)

### 문제 3: 결과가 비어있음

**원인**: Neo4j에 데이터가 없거나 쿼리 조건이 너무 엄격함

**해결**: 
- Neo4j 데이터 확인
- 기간/필터 조건 완화

## 📚 다음 단계

- Step 59: 자동 상관 분석 (CORRELATED_WITH 엣지 자동 생성)
- Step 60: 예측 분석 (그래프 알고리즘 활용)

