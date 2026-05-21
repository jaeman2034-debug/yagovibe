# YAGO AI League Copilot - 대화형 관리 시스템

## 🎯 핵심 개념

**관리자가 시스템 메뉴를 찾지 않아도 AI에게 말하면 리그 운영 작업을 수행**

```
기존: 메뉴 → 클릭 → 입력 → 저장
AI Copilot: 대화 → 실행
```

---

## 📊 전체 구조

```
Admin Dashboard
        │
        ▼
AI Copilot Panel (대화형 UI)
        │
        ▼
Intent Parser (자연어 분석)
        │
        ▼
Action Engine (작업 실행)
        │
        ▼
Platform API
        │
        ▼
Database
```

---

## 🎨 UI 구조

### Dashboard 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│  [Header]                                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Main Content]          │  [AI Copilot Panel]        │
│                          │                            │
│  - League List           │  AI League Copilot         │
│  - Teams                 │                            │
│  - Matches               │  💬                        │
│                          │                            │
│                          │  [Chat Window]             │
│                          │                            │
│                          │  관리자:                   │
│                          │  "8팀 리그 만들어줘"       │
│                          │                            │
│                          │  AI:                       │
│                          │  "리그 이름을 입력해주세요" │
│                          │                            │
│                          │  [Suggestion Buttons]      │
│                          │  + 리그 생성               │
│                          │  + 팀 등록                 │
│                          │  + 경기 일정               │
│                          │                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 React 컴포넌트 구조

```typescript
OrganizationDashboard
 ├─ MainContent
 │   ├─ LeagueList
 │   ├─ TeamsList
 │   └─ MatchesList
 │
 └─ AICopilotPanel
     ├─ ChatWindow
     ├─ MessageList
     ├─ InputBox
     ├─ SuggestionButtons
     └─ ActionPreview
```

---

## 💬 AI Copilot Panel 컴포넌트

```typescript
interface AICopilotPanelProps {
  organizationId: string;
  organizationType: "federation" | "academy" | "club";
}

export default function AICopilotPanel({
  organizationId,
  organizationType
}: AICopilotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleSend = async () => {
    if (!input.trim()) return;
    
    // 사용자 메시지 추가
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    
    try {
      // AI Copilot API 호출
      const response = await callAICopilot({
        message: input,
        organizationId,
        organizationType,
        context: getContext() // 현재 상태 컨텍스트
      });
      
      // AI 응답 추가
      const aiMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: response.message,
        action: response.action, // 실행된 액션
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      
      // 액션이 실행된 경우 UI 업데이트
      if (response.action?.executed) {
        await refreshData();
      }
    } catch (error) {
      console.error("Copilot error:", error);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: "assistant",
        content: "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">AI League Copilot</h3>
        <p className="text-sm text-gray-500">대화로 리그를 관리하세요</p>
      </div>
      
      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {loading && <LoadingIndicator />}
      </div>
      
      {/* Suggestion Buttons */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">빠른 명령</div>
        <div className="flex flex-wrap gap-2">
          <SuggestionButton
            label="리그 생성"
            onClick={() => setInput("리그 생성")}
          />
          <SuggestionButton
            label="팀 등록"
            onClick={() => setInput("팀 등록")}
          />
          <SuggestionButton
            label="경기 일정"
            onClick={() => setInput("경기 일정 추가")}
          />
          <SuggestionButton
            label="결과 입력"
            onClick={() => setInput("경기 결과 입력")}
          />
        </div>
      </div>
      
      {/* Input Box */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="무엇을 도와드릴까요?"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🧠 Intent Parser (자연어 분석)

### AI 프롬프트 구조

```typescript
interface CopilotRequest {
  message: string;
  organizationId: string;
  organizationType: "federation" | "academy" | "club";
  context: {
    currentLeagues: League[];
    currentTeams: Team[];
    currentMatches: LeagueMatch[];
  };
}

async function callAICopilot(request: CopilotRequest): Promise<CopilotResponse> {
  const prompt = buildCopilotPrompt(request);
  
  // AI API 호출 (OpenAI / Claude 등)
  const aiResponse = await callAI(prompt);
  
  // Intent 파싱
  const intent = parseIntent(aiResponse);
  
  // 액션 실행
  const actionResult = await executeAction(intent, request);
  
  return {
    message: actionResult.message,
    action: actionResult.action
  };
}
```

### 프롬프트 생성

```typescript
function buildCopilotPrompt(request: CopilotRequest): string {
  return `
당신은 스포츠 리그 관리 AI 어시스턴트입니다.
사용자의 요청을 분석하여 적절한 작업을 수행하세요.

**현재 상태**
- 조직 ID: ${request.organizationId}
- 조직 유형: ${request.organizationType}
- 현재 리그 수: ${request.context.currentLeagues.length}
- 현재 팀 수: ${request.context.currentTeams.length}
- 현재 경기 수: ${request.context.currentMatches.length}

**사용자 요청**
"${request.message}"

**지원 가능한 작업**
1. create_league: 리그 생성
   - 파라미터: name, season, format, maxTeams
2. register_team: 팀 등록
   - 파라미터: name, logoUrl
3. create_match: 경기 일정 생성
   - 파라미터: homeTeam, awayTeam, scheduledAt
4. record_result: 경기 결과 입력
   - 파라미터: matchId, homeScore, awayScore
5. create_announcement: 공지 작성
   - 파라미터: title, content

**응답 형식 (JSON)**
{
  "intent": "create_league" | "register_team" | "create_match" | "record_result" | "create_announcement" | "clarify",
  "parameters": {
    // intent에 따른 파라미터
  },
  "message": "사용자에게 보여줄 메시지",
  "needsConfirmation": true/false,
  "missingParameters": ["name"] // 필요한데 없는 파라미터
}
`;
}
```

---

## ⚙️ Action Engine (작업 실행)

### Intent별 액션 핸들러

```typescript
async function executeAction(
  intent: ParsedIntent,
  request: CopilotRequest
): Promise<ActionResult> {
  switch (intent.intent) {
    case "create_league":
      return await handleCreateLeague(intent.parameters, request);
    
    case "register_team":
      return await handleRegisterTeam(intent.parameters, request);
    
    case "create_match":
      return await handleCreateMatch(intent.parameters, request);
    
    case "record_result":
      return await handleRecordResult(intent.parameters, request);
    
    case "create_announcement":
      return await handleCreateAnnouncement(intent.parameters, request);
    
    case "clarify":
      return {
        message: intent.message,
        action: { executed: false, type: "clarification" }
      };
    
    default:
      return {
        message: "죄송합니다. 요청을 이해하지 못했습니다.",
        action: { executed: false, type: "error" }
      };
  }
}
```

### 리그 생성 핸들러

```typescript
async function handleCreateLeague(
  parameters: any,
  request: CopilotRequest
): Promise<ActionResult> {
  // 필수 파라미터 확인
  if (!parameters.name) {
    return {
      message: "리그 이름을 알려주세요. 예: 'K7 리그'",
      action: { executed: false, type: "clarification" }
    };
  }
  
  // 기본값 설정
  const leagueData = {
    organizationId: request.organizationId,
    seasonId: getCurrentSeasonId(request.organizationId),
    name: parameters.name,
    format: parameters.format || "round_robin",
    maxTeams: parameters.maxTeams || 16,
    minTeams: parameters.minTeams || 8,
    status: "draft"
  };
  
  // 리그 생성
  const leagueId = await createLeague(leagueData);
  
  return {
    message: `"${parameters.name}" 리그가 생성되었습니다. 이제 팀을 등록할 수 있습니다.`,
    action: {
      executed: true,
      type: "create_league",
      result: { leagueId }
    }
  };
}
```

### 팀 등록 핸들러

```typescript
async function handleRegisterTeam(
  parameters: any,
  request: CopilotRequest
): Promise<ActionResult> {
  if (!parameters.name) {
    return {
      message: "팀 이름을 알려주세요. 예: '노원FC'",
      action: { executed: false, type: "clarification" }
    };
  }
  
  // 팀 생성
  const teamData = {
    organizationId: request.organizationId,
    name: parameters.name,
    sportType: getOrganizationSport(request.organizationId),
    logoUrl: parameters.logoUrl
  };
  
  const teamId = await createTeam(teamData);
  
  return {
    message: `"${parameters.name}" 팀이 등록되었습니다.`,
    action: {
      executed: true,
      type: "register_team",
      result: { teamId }
    }
  };
}
```

### 경기 일정 생성 핸들러

```typescript
async function handleCreateMatch(
  parameters: any,
  request: CopilotRequest
): Promise<ActionResult> {
  // 팀 이름으로 팀 ID 찾기
  const homeTeam = await findTeamByName(
    request.organizationId,
    parameters.homeTeam
  );
  const awayTeam = await findTeamByName(
    request.organizationId,
    parameters.awayTeam
  );
  
  if (!homeTeam || !awayTeam) {
    return {
      message: "팀을 찾을 수 없습니다. 정확한 팀 이름을 알려주세요.",
      action: { executed: false, type: "clarification" }
    };
  }
  
  // 날짜 파싱
  const scheduledAt = parseDate(parameters.date || parameters.scheduledAt);
  
  // 경기 생성
  const matchData = {
    organizationId: request.organizationId,
    leagueId: parameters.leagueId || getCurrentLeagueId(request.organizationId),
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    scheduledAt
  };
  
  const matchId = await createMatch(matchData);
  
  return {
    message: `${homeTeam.name} vs ${awayTeam.name} 경기가 ${formatDate(scheduledAt)}에 추가되었습니다.`,
    action: {
      executed: true,
      type: "create_match",
      result: { matchId }
    }
  };
}
```

---

## 📊 데이터 구조

### CopilotAction (실행 이력)

```typescript
interface CopilotAction {
  id: string;
  organizationId: string;
  userId: string;
  
  // 요청
  userMessage: string;
  intent: string;
  parameters: Record<string, any>;
  
  // 실행 결과
  executed: boolean;
  actionType?: string;
  result?: any;
  error?: string;
  
  // 메타
  createdAt: Timestamp;
  executionTime?: number; // 실행 시간 (ms)
}
```

### Message (대화 메시지)

```typescript
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: {
    executed: boolean;
    type?: string;
    result?: any;
  };
  timestamp: Date;
}
```

---

## 🔄 실제 시나리오

### 시나리오 1: 리그 생성

```
관리자: "2026 시즌 K7 리그 만들어줘"

AI: "리그 이름: K7 리그
     시즌: 2026
     형식: 풀리그
     최대 팀 수: 16팀
     
     이대로 생성할까요?"

관리자: "네"

AI: "K7 리그가 생성되었습니다. 이제 팀을 등록할 수 있습니다."
```

### 시나리오 2: 팀 등록

```
관리자: "노원FC 팀 등록"

AI: "노원FC 팀이 등록되었습니다.
     다음 작업을 하시겠습니까?
     
     + 선수 추가
     + 리그 참가
     + 경기 일정"
```

### 시나리오 3: 경기 일정

```
관리자: "노원FC vs 상계유나이티드 4월 12일 경기 추가"

AI: "노원FC vs 상계유나이티드 경기가
     2026년 4월 12일로 추가되었습니다.
     
     경기 시간을 설정하시겠습니까?"
```

### 시나리오 4: 경기 결과 입력

```
관리자: "노원FC 3-1 상계유나이티드 결과 입력"

AI: "경기 결과가 입력되었습니다.
     AI 경기 리포트를 생성할까요?"
```

---

## 🎯 지원 가능한 Intent

### 1. create_league (리그 생성)

**예시 입력**:
- "8팀 리그 만들어줘"
- "2026 시즌 K7 리그 생성"
- "토너먼트 형식 리그 추가"

**파라미터**:
- name: 리그 이름
- season: 시즌
- format: "round_robin" | "tournament" | "hybrid"
- maxTeams: 최대 팀 수

---

### 2. register_team (팀 등록)

**예시 입력**:
- "노원FC 팀 등록"
- "상계유나이티드 추가"
- "새 팀 만들기"

**파라미터**:
- name: 팀 이름
- logoUrl: 로고 URL (선택)

---

### 3. create_match (경기 일정 생성)

**예시 입력**:
- "노원FC vs 상계유나이티드 4월 12일 경기"
- "내일 경기 추가"
- "주말 경기 일정"

**파라미터**:
- homeTeam: 홈팀 이름
- awayTeam: 어웨이팀 이름
- scheduledAt: 경기 일시

---

### 4. record_result (경기 결과 입력)

**예시 입력**:
- "노원FC 3-1 상계유나이티드 결과"
- "경기 결과 입력"
- "스코어 업데이트"

**파라미터**:
- matchId: 경기 ID (또는 팀 이름으로 찾기)
- homeScore: 홈팀 스코어
- awayScore: 어웨이팀 스코어

---

### 5. create_announcement (공지 작성)

**예시 입력**:
- "공지 작성"
- "새 공지 올려줘"
- "리그 공지 게시"

**파라미터**:
- title: 공지 제목
- content: 공지 내용

---

## 🔧 API 구조

### Copilot API

```typescript
// POST /api/copilot/action
interface CopilotActionRequest {
  message: string;
  organizationId: string;
  context?: {
    currentLeagues?: League[];
    currentTeams?: Team[];
    currentMatches?: LeagueMatch[];
  };
}

interface CopilotActionResponse {
  message: string;
  action: {
    executed: boolean;
    type?: string;
    result?: any;
  };
  suggestions?: string[]; // 다음 작업 제안
}
```

### Cloud Function

```typescript
export const processCopilotAction = onCall(async (request) => {
  const { message, organizationId, context } = request.data;
  const userId = request.auth?.uid;
  
  if (!userId || !organizationId) {
    throw new HttpsError("invalid-argument", "필수 파라미터가 누락되었습니다.");
  }
  
  // Intent 파싱
  const intent = await parseIntent(message, organizationId, context);
  
  // 액션 실행
  const result = await executeAction(intent, {
    organizationId,
    userId,
    context
  });
  
  // 실행 이력 저장
  await admin.firestore().collection("copilot_actions").add({
    organizationId,
    userId,
    userMessage: message,
    intent: intent.intent,
    parameters: intent.parameters,
    executed: result.action.executed,
    actionType: result.action.type,
    result: result.action.result,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return result;
});
```

---

## 🎨 Suggestion Buttons

### 빠른 명령 버튼

```typescript
const SUGGESTIONS = [
  {
    label: "리그 생성",
    message: "리그 생성",
    icon: "🏆"
  },
  {
    label: "팀 등록",
    message: "팀 등록",
    icon: "👥"
  },
  {
    label: "경기 일정",
    message: "경기 일정 추가",
    icon: "⚽"
  },
  {
    label: "결과 입력",
    message: "경기 결과 입력",
    icon: "📊"
  },
  {
    label: "공지 작성",
    message: "공지 작성",
    icon: "📢"
  }
];
```

---

## 🎯 이 기능의 가치

### 1. 사용성 향상

**기존**: 메뉴 찾기 → 클릭 → 입력 → 저장 (4단계)  
**AI Copilot**: 대화 → 실행 (2단계)

### 2. 학습 곡선 단축

**기존**: 시스템 구조 학습 필요  
**AI Copilot**: 자연어로 바로 사용

### 3. 플랫폼 차별화

**기존 리그 시스템**: 메뉴 기반 관리  
**YAGO**: AI 대화형 관리

### 4. 확장 가능

**추가 가능한 기능**:
- AI 일정 자동 생성
- AI 리그 분석
- AI 공지 자동 작성
- AI 경기 리포트 생성

---

## ✅ 구현 체크리스트

### Phase 1: 기본 구조
- [ ] AICopilotPanel 컴포넌트
- [ ] ChatWindow 컴포넌트
- [ ] MessageBubble 컴포넌트
- [ ] SuggestionButtons 컴포넌트

### Phase 2: Intent Parser
- [ ] 자연어 파싱 로직
- [ ] Intent 분류
- [ ] 파라미터 추출
- [ ] AI 프롬프트 생성

### Phase 3: Action Engine
- [ ] create_league 핸들러
- [ ] register_team 핸들러
- [ ] create_match 핸들러
- [ ] record_result 핸들러
- [ ] create_announcement 핸들러

### Phase 4: API 통합
- [ ] Copilot API 엔드포인트
- [ ] Cloud Function 구현
- [ ] 실행 이력 저장
- [ ] 컨텍스트 관리

---

## 🚀 Cursor에게 전달할 지시

```
Implement YAGO AI League Copilot.
Create a chat-based interface for league management.
Parse natural language input to identify intents (create_league, register_team, etc.).
Execute actions based on parsed intents.
Display suggestions for common tasks.
Store action history for learning and improvement.
```

---

이 기능을 구현하면 **YAGO가 진짜 AI 기반 플랫폼이 됩니다!** 🚀
