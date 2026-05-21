# ⚠️ 리스크 시나리오 & 실패 대비 플랜

> **목표**: 문제는 반드시 생긴다는 전제 하에, 그때 당황하지 않고 대응 가능한 구조

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

---

## 1️⃣ 가장 현실적인 실패 TOP 5

### ① "차단했는데 또 보인다"

#### 원인 분석
- **캐시 불일치**: 클라이언트 캐시에 차단 상태가 반영되지 않음
- **서버 가드 누락**: Firestore Security Rules에서 차단 체크 누락
- **타이밍 이슈**: 차단 후 즉시 채팅 목록에서 제거되지 않음

#### 대응 방안

##### 즉시 대응 (핫픽스)
```typescript
// 채팅방 진입 시 서버 기준 재검증
useEffect(() => {
  const checkBlocked = async () => {
    if (!user?.uid || !otherUser?.uid) return;
    
    // 🔥 서버 기준 재검증 (클라이언트 캐시는 보조만)
    const blockedDoc = await getDoc(
      doc(db, "users", user.uid, "blockedUsers", otherUser.uid)
    );
    
    if (blockedDoc.exists()) {
      // 즉시 리다이렉트
      navigate("/app/chat", { replace: true });
      setToastMessage("차단된 사용자입니다.");
      return;
    }
  };
  
  checkBlocked();
}, [user?.uid, otherUser?.uid, navigate]);
```

##### 근본 대응 (구조 개선)
1. **Firestore Security Rules 강화**
   ```javascript
   match /chats/{chatId} {
     allow read: if !exists(/databases/$(database)/documents/users/$(request.auth.uid)/blockedUsers/$(resource.data.otherUserId));
   }
   ```

2. **채팅 목록 필터링**
   ```typescript
   // 채팅 목록 조회 시 차단된 사용자 제외
   const chatsQuery = query(
     collection(db, "chats"),
     where("participants", "array-contains", user.uid),
     // 차단된 사용자 필터링은 클라이언트에서 처리
   );
   ```

3. **실시간 동기화**
   ```typescript
   // 차단 상태 변경 시 실시간 업데이트
   onSnapshot(
     doc(db, "users", user.uid, "blockedUsers", otherUser.uid),
     (snapshot) => {
       if (snapshot.exists()) {
         navigate("/app/chat", { replace: true });
       }
     }
   );
   ```

#### 모니터링
- **로그**: `track("block_bypass_attempt", { userId, chatId })`
- **알림**: 차단 우회 시도 시 즉시 알림
- **정기 점검**: 주간 차단 상태 일관성 검증

---

### ② "신고했는데 아무 반응이 없다"

#### 원인 분석
- **토스트/상태 메시지 누락**: 신고 성공 후 피드백이 표시되지 않음
- **네트워크 지연**: 서버 응답이 느려서 사용자가 "안 됐나?"라고 생각
- **에러 처리 누락**: 실패했는데 사용자에게 알림이 없음

#### 대응 방안

##### 즉시 대응 (핫픽스)
```typescript
const confirmReportUser = async () => {
  if (!otherUser?.uid || !id || !user || isReporting) return;

  setIsReporting(true);
  
  // 🔥 즉각 피드백 필수 (서버 결과 기다리지 말고 선반영)
  setToastMessage("신고를 처리 중입니다...");
  
  try {
    // ... 신고 로직 ...
    
    // 🔥 성공 시 즉시 피드백
    setToastMessage("필요한 조치를 검토 중입니다.");
    
    // 🔥 상태 메시지는 서버 결과 기다리지 말고 선반영
    try {
      await addDoc(collection(db, `chats/${id}/messages`), {
        uid: "system",
        senderId: "system",
        text: "⚠️ 신고가 접수되었고, 현재 검토 중입니다.",
        type: "system_status",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      // 시스템 메시지 실패해도 신고는 정상 처리됨
      console.warn("[QA] system message failed:", err);
    }
  } catch (err: any) {
    // 🔥 실패 시 명확한 피드백
    console.error("[QA] api error - report:", err);
    setToastMessage("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
  } finally {
    setIsReporting(false);
    setShowReportingSpinner(false);
  }
};
```

##### 근본 대응 (구조 개선)
1. **낙관적 업데이트 (Optimistic Update)**
   ```typescript
   // 서버 응답 전에 UI 업데이트
   setReportStatus("submitted");
   setToastMessage("필요한 조치를 검토 중입니다.");
   
   // 서버 요청
   try {
     await reportUser(...);
   } catch (err) {
     // 실패 시 롤백
     setReportStatus(null);
     setToastMessage("요청에 실패했습니다. 다시 시도해주세요.");
   }
   ```

2. **재시도 로직**
   ```typescript
   const retryReport = async (maxRetries = 2) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         await reportUser(...);
         return; // 성공
       } catch (err) {
         if (i === maxRetries - 1) throw err; // 마지막 시도 실패
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   };
   ```

3. **상태 확인 UI**
   ```typescript
   // 신고 상태를 항상 표시
   {reportStatus === "submitted" && (
     <div className="system-message">
       ⚠️ 신고가 접수되었고, 현재 검토 중입니다.
     </div>
   )}
   ```

#### 모니터링
- **로그**: `track("report_feedback_missing", { userId, chatId, timestamp })`
- **알림**: 신고 후 피드백 누락 시 즉시 알림
- **정기 점검**: 신고 성공률 모니터링

---

### ③ "앱이 가끔 멈춘다"

#### 원인 분석
- **에러 바운더리 없음**: 예상치 못한 에러로 전체 앱이 크래시
- **예상 못 한 null**: `otherUser.uid`가 `undefined`인데 접근 시도
- **무한 루프**: `useEffect` 의존성 배열 문제로 무한 렌더링

#### 대응 방안

##### 즉시 대응 (핫픽스)
```typescript
// 🔥 ErrorBoundary로 앱 전체 보호
import { ErrorBoundary } from "react-error-boundary";

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // 에러 로깅
        console.error("[CRITICAL] App crash:", error, errorInfo);
        track("app_crash", { error: error.message, stack: error.stack });
      }}
    >
      <Router>
        <Routes>
          {/* ... */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

// 🔥 안전한 Fallback UI
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="error-container">
      <h2>문제가 발생했습니다</h2>
      <p>일시적인 오류로 불편을 드렸습니다. 현재 조치 중입니다.</p>
      <button onClick={resetErrorBoundary}>다시 시도</button>
      <button onClick={() => window.location.href = "/app/chat"}>
        채팅 목록으로 이동
      </button>
    </div>
  );
}
```

##### 근본 대응 (구조 개선)
1. **Null Safety 강화**
   ```typescript
   // ❌ 나쁜 예
   const handleBlock = () => {
     await blockUser(otherUser.uid); // otherUser가 null일 수 있음
   };
   
   // ✅ 좋은 예
   const handleBlock = () => {
     if (!otherUser?.uid) {
       console.error("[QA] otherUser.uid is missing");
       setToastMessage("사용자 정보를 불러올 수 없습니다.");
       return;
     }
     await blockUser(otherUser.uid);
   };
   ```

2. **타입 안전성 강화**
   ```typescript
   // TypeScript로 null 체크 강제
   interface ChatRoomProps {
     otherUser: { uid: string; displayName?: string } | null;
   }
   
   // Optional chaining 사용
   const displayName = otherUser?.displayName ?? "알 수 없음";
   ```

3. **useEffect 의존성 배열 정리**
   ```typescript
   // ❌ 나쁜 예 (무한 루프 위험)
   useEffect(() => {
     setMenuOpen(false);
   }); // 의존성 배열 없음
   
   // ✅ 좋은 예
   useEffect(() => {
     setMenuOpen(false);
   }, [showReportModal, showBlockModal]); // 명확한 의존성
   ```

#### 모니터링
- **로그**: `track("app_crash", { error, stack, userId, route })`
- **알림**: 크래시 발생 시 즉시 알림 (Sentry 등)
- **정기 점검**: 주간 크래시율 모니터링

---

### ④ "모바일에서만 이상하다"

#### 원인 분석
- **터치/스크롤 이벤트 충돌**: 메뉴 열림과 스크롤 이벤트가 충돌
- **iOS overflow 이슈**: iOS Safari에서 `overflow: hidden`이 제대로 작동하지 않음
- **뷰포트 높이 문제**: 키보드가 올라올 때 뷰포트 높이 변경

#### 대응 방안

##### 즉시 대응 (핫픽스)
```typescript
// 🔥 메뉴/모달은 무조건 position: fixed
const menuStyle: React.CSSProperties = {
  position: 'fixed', // absolute가 아닌 fixed
  top: HEADER_HEIGHT + 48,
  right: 12,
  zIndex: 99999,
};

// 🔥 iOS overflow 이슈 대응
useEffect(() => {
  if (menuOpen) {
    // iOS에서 body 스크롤 잠금
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }
}, [menuOpen]);
```

##### 근본 대응 (구조 개선)
1. **실기기 테스트 필수**
   - iOS Safari (iPhone SE, iPhone 14 Pro)
   - Android Chrome (Galaxy S21, Pixel 7)
   - 실제 디바이스에서 모든 기능 테스트

2. **터치 이벤트 처리 개선**
   ```typescript
   // 터치 영역 최소 44x44px
   const menuButtonStyle: React.CSSProperties = {
     width: '44px',
     height: '44px',
     minWidth: '44px',
     minHeight: '44px',
     touchAction: 'manipulation', // 더블탭 줌 방지
   };
   ```

3. **뷰포트 높이 대응**
   ```typescript
   // Visual Viewport API 사용
   const { viewportHeight } = useKeyboardViewport();
   
   useEffect(() => {
     if (viewportHeight) {
       document.documentElement.style.setProperty(
         '--vh',
         `${viewportHeight * 0.01}px`
       );
     }
   }, [viewportHeight]);
   ```

#### 모니터링
- **로그**: `track("mobile_issue", { device, os, browser, issue })`
- **알림**: 모바일 특정 에러 발생 시 즉시 알림
- **정기 점검**: 주간 모바일 사용자 만족도 조사

---

### ⑤ "운영자가 상황을 모른다"

#### 원인 분석
- **로그 부족**: 에러 발생 시 컨텍스트 정보 없음
- **재현 불가**: 사용자가 "어제 이상했어요"라고만 함
- **모니터링 부재**: 문제 발생을 사후에야 발견

#### 대응 방안

##### 즉시 대응 (핫픽스)
```typescript
// 🔥 최소 이벤트 로그 유지
const track = (event: string, params?: Record<string, any>) => {
  // Firebase Analytics 또는 자체 분석 도구
  console.log(`[TRACK] ${event}`, params);
  
  // 프로덕션에서는 실제 분석 도구로 전송
  if (process.env.NODE_ENV === 'production') {
    analytics.logEvent(event, {
      ...params,
      timestamp: new Date().toISOString(),
      userId: user?.uid,
    });
  }
};

// 🔥 에러는 context 포함
try {
  await reportUser(...);
} catch (err: any) {
  console.error("[QA] api error - report:", err);
  
  // 🔥 컨텍스트 포함 로깅
  track("api_error", {
    endpoint: "reportUser",
    chatId: id,
    userId: user?.uid,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });
  
  setToastMessage("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
}
```

##### 근본 대응 (구조 개선)
1. **에러 추적 시스템 구축**
   - Sentry 또는 유사 도구 도입
   - 에러 발생 시 자동 알림
   - 스택 트레이스 및 컨텍스트 정보 수집

2. **사용자 행동 추적**
   ```typescript
   // 주요 액션 추적
   track("report_clicked", { chatId, otherUserId });
   track("block_confirmed", { chatId, reason });
   track("menu_opened", { chatId });
   ```

3. **성능 모니터링**
   ```typescript
   // API 응답 시간 추적
   const startTime = performance.now();
   await reportUser(...);
   const duration = performance.now() - startTime;
   
   track("api_performance", {
     endpoint: "reportUser",
     duration,
     chatId: id,
   });
   ```

#### 모니터링
- **대시보드**: 실시간 에러율, API 응답 시간, 사용자 행동 추적
- **알림**: 에러율 임계값 초과 시 즉시 알림
- **정기 리포트**: 주간/월간 에러 리포트

---

## 2️⃣ 사고 등급 분류 (중요)

### 등급 정의

| 등급 | 정의 | 예시 | 대응 시간 | 대응 방법 |
|------|------|------|-----------|-----------|
| **P0** | 서비스 중단 또는 보안 취약점 | 차단 무력화, 데이터 유출 | 즉시 (1시간 이내) | 즉시 롤백, 핫픽스 |
| **P1** | 핵심 기능 불가 | 신고 안 됨, 차단 안 됨 | 긴급 (4시간 이내) | 핫픽스 배포 |
| **P2** | UX 불편 또는 부가 기능 불가 | 메뉴가 안 열림, 토스트 안 보임 | 보통 (24시간 이내) | 다음 배포에 포함 |
| **P3** | 미관 또는 사소한 불편 | 버튼 색상 오류, 텍스트 오타 | 낮음 (다음 스프린트) | 후순위 처리 |

### 등급 판단 기준

#### P0 (Critical)
- 사용자 데이터 보안 위협
- 서비스 전체 중단
- 법적 리스크 (신고/차단 기능 무력화)

#### P1 (High)
- 핵심 기능 완전 불가
- 대량 사용자 영향 (>10%)
- 수익에 직접 영향

#### P2 (Medium)
- 기능은 작동하지만 UX 불편
- 소수 사용자 영향 (<10%)
- 우회 방법 존재

#### P3 (Low)
- 시각적 문제만
- 개별 사용자 영향
- 기능에는 영향 없음

### 대응 프로세스

#### P0 대응
1. **즉시 알림**: 개발팀 전체 알림
2. **롤백**: 이전 버전으로 즉시 롤백
3. **공지**: 사용자에게 공지 (필요시)
4. **수정**: 핫픽스 개발 및 배포
5. **사후 분석**: 원인 분석 및 재발 방지

#### P1 대응
1. **긴급 알림**: 담당자 알림
2. **핫픽스**: 빠른 수정 및 배포
3. **모니터링**: 배포 후 모니터링
4. **사후 분석**: 원인 분석

#### P2 대응
1. **이슈 등록**: 이슈 트래커에 등록
2. **우선순위 결정**: 다음 배포에 포함 여부 결정
3. **일반 배포**: 정기 배포에 포함

#### P3 대응
1. **백로그 등록**: 백로그에 추가
2. **우선순위 낮음**: 리소스 여유 시 처리

👉 **등급 없으면 항상 과잉 대응한다.** 명확한 등급 분류로 효율적인 대응이 가능하다.

---

## 3️⃣ 롤백 플랜 (살아남는 서비스의 조건)

### 준비물

#### 1. 기능 플래그 (Feature Flags)
```typescript
// 🔥 기능 플래그로 기능 on/off 제어
const featureFlags = {
  blockFlowV2: true, // 새 차단 플로우
  reportFlowV2: true, // 새 신고 플로우
  typingIndicator: false, // 입력 중 표시 (아직 개발 중)
};

// 🔥 플래그로 기능 분기
if (!featureFlags.blockFlowV2) {
  // 이전 차단 플로우 사용
  useLegacyBlockFlow();
} else {
  // 새 차단 플로우 사용
  useNewBlockFlow();
}
```

#### 2. 이전 빌드 보관
- **최소 3개 버전 보관**: 현재, 이전, 그 이전
- **빠른 롤백**: 5분 이내 롤백 가능
- **자동화**: CI/CD 파이프라인에서 자동 보관

#### 3. 공지 템플릿
```markdown
## 🔧 일시적인 서비스 점검 안내

안녕하세요.

현재 일시적인 오류로 불편을 드리고 있습니다.
현재 조치 중이며, 곧 정상화될 예정입니다.

불편을 드려 죄송합니다.

---
발생 시간: YYYY-MM-DD HH:MM
복구 예상 시간: YYYY-MM-DD HH:MM
```

### 롤백 절차

#### Step 1: 문제 확인
1. 에러 로그 확인
2. 사용자 리포트 확인
3. 등급 판단 (P0/P1/P2/P3)

#### Step 2: 롤백 결정
- **P0**: 즉시 롤백
- **P1**: 30분 내 핫픽스 불가 시 롤백
- **P2/P3**: 롤백 불필요

#### Step 3: 롤백 실행
```bash
# 1. 이전 버전으로 롤백
git checkout <previous-version>
npm run build
npm run deploy

# 2. 기능 플래그로 기능 비활성화 (더 빠른 대응)
# Firebase Remote Config 또는 환경 변수로 제어
```

#### Step 4: 모니터링
1. 롤백 후 에러율 모니터링
2. 사용자 피드백 확인
3. 서비스 정상화 확인

#### Step 5: 사후 처리
1. 원인 분석
2. 재발 방지 대책 수립
3. 사용자 공지 (필요시)

### 기능 플래그 활용 예시

```typescript
// 🔥 Remote Config 또는 환경 변수로 제어
const getFeatureFlag = async (flagName: string): Promise<boolean> => {
  // Firebase Remote Config
  const config = await getRemoteConfig();
  return config.getValue(flagName).asBoolean();
};

// 🔥 실시간 플래그 변경 감지
onConfigChanged((config) => {
  if (!config.getValue('blockFlowV2').asBoolean()) {
    // 즉시 이전 플로우로 전환
    useLegacyBlockFlow();
  }
});
```

---

## 4️⃣ 유저 커뮤니케이션 원칙

### ❌ 하지 말 것

#### 변명
- ❌ "서버 문제로..."
- ❌ "예상치 못한 버그로..."
- ❌ "개발팀 실수로..."

#### 기술 설명
- ❌ "Firestore 쿼리 오류로..."
- ❌ "네트워크 타임아웃으로..."
- ❌ "React 렌더링 이슈로..."

### ⭕ 해야 할 것

#### 상황 설명
- ⭕ "일시적인 오류로 불편을 드렸습니다."
- ⭕ "현재 조치 중입니다."
- ⭕ "곧 정상화될 예정입니다."

#### 보호 메시지
- ⭕ "사용자님의 안전을 최우선으로 하고 있습니다."
- ⭕ "신고/차단 기능은 정상 작동 중입니다."
- ⭕ "문제가 지속되면 고객센터로 문의해주세요."

### 공지 템플릿

#### 긴급 공지 (P0)
```markdown
## ⚠️ 일시적인 서비스 오류 안내

안녕하세요.

현재 일시적인 오류로 일부 기능에 문제가 발생했습니다.
사용자님의 안전을 최우선으로 하고 있으며, 현재 조치 중입니다.

**영향받는 기능**: [기능명]
**복구 예상 시간**: [시간]

불편을 드려 죄송합니다.
```

#### 일반 공지 (P1/P2)
```markdown
## 🔧 서비스 점검 안내

안녕하세요.

더 나은 서비스를 위해 일시적인 점검을 진행합니다.

**점검 시간**: [시간]
**영향받는 기능**: [기능명]

불편을 드려 죄송합니다.
```

#### 사과 메시지 (P0/P1)
```markdown
## 🙏 서비스 오류에 대한 사과

안녕하세요.

[날짜] 발생한 서비스 오류로 불편을 드려 깊이 사과드립니다.

**발생 내용**: [내용]
**조치 사항**: [조치]
**재발 방지**: [대책]

앞으로 더 안정적인 서비스를 제공하겠습니다.
```

---

## 5️⃣ 네 자신을 위한 체크리스트

### 새 기능 배포 전

- [ ] **끄는 법부터 생각**
  - [ ] 기능 플래그로 on/off 가능한가?
  - [ ] 롤백 계획이 있는가?
  - [ ] 이전 버전으로 돌아갈 수 있는가?

- [ ] **테스트 완료**
  - [ ] 자동화 테스트 통과
  - [ ] 수동 테스트 완료
  - [ ] 모바일 테스트 완료

- [ ] **모니터링 준비**
  - [ ] 로그 추적 설정
  - [ ] 에러 알림 설정
  - [ ] 성능 모니터링 설정

### 에러 발생 시

- [ ] **재현 가능 상태 확보**
  - [ ] 에러 로그 수집
  - [ ] 사용자 행동 재현
  - [ ] 환경 정보 수집 (디바이스, OS, 브라우저)

- [ ] **등급 판단**
  - [ ] P0/P1/P2/P3 중 등급 결정
  - [ ] 대응 시간 결정
  - [ ] 담당자 할당

- [ ] **대응 실행**
  - [ ] 롤백 또는 핫픽스
  - [ ] 사용자 공지 (필요시)
  - [ ] 모니터링 강화

### 감정 흔들릴 때

- [ ] **로그 먼저**
  - [ ] 감정적으로 판단하지 말고 데이터 확인
  - [ ] 로그로 정확한 원인 파악
  - [ ] 사용자 리포트와 로그 대조

- [ ] **단계별 접근**
  - [ ] 문제 정의
  - [ ] 원인 분석
  - [ ] 해결 방안 수립
  - [ ] 실행 및 검증

- [ ] **팀과 소통**
  - [ ] 혼자 해결하려 하지 말기
  - [ ] 팀원과 상의
  - [ ] 필요시 외부 도움 요청

---

## 🧠 진짜 중요한 말 하나

> **문제 없는 서비스는 없다. 다만, 회복 빠른 서비스만 있다.**

### 회복 가능한 구조의 특징

1. **빠른 롤백**: 5분 이내 이전 버전으로 복구
2. **명확한 모니터링**: 문제를 즉시 감지
3. **체계적인 대응**: 등급별 명확한 대응 프로세스
4. **사용자 커뮤니케이션**: 투명하고 신뢰할 수 있는 소통

### 현재 구조 평가

✅ **회복 가능한 구조**
- 기능 플래그로 기능 on/off 가능
- 에러 바운더리로 앱 크래시 방지
- 로그 추적으로 문제 파악 가능
- 롤백 계획 수립 가능

👉 **너 지금 구조는 회복 가능한 구조다.**

---

## 📋 최종 체크리스트

### 배포 전 체크리스트

- [ ] 기능 플래그 설정 완료
- [ ] 롤백 계획 수립
- [ ] 테스트 완료 (자동화 + 수동)
- [ ] 모니터링 설정 완료
- [ ] 공지 템플릿 준비

### 에러 발생 시 체크리스트

- [ ] 에러 로그 수집
- [ ] 등급 판단 (P0/P1/P2/P3)
- [ ] 롤백 또는 핫픽스 결정
- [ ] 사용자 공지 (필요시)
- [ ] 모니터링 강화

### 사후 처리 체크리스트

- [ ] 원인 분석
- [ ] 재발 방지 대책 수립
- [ ] 문서화
- [ ] 팀 공유

---

## 🏁 최종 상태 선언

이제 **"잘 만들었다" 이후, 안 망하는 설계**가 완성되었다.

**문제는 반드시 생긴다.**  
하지만 **당황하지 않고 대응 가능한 구조**가 갖춰졌다.

👉 **회복 가능한 서비스가 되었다.**

---

**작성일**: 2024년  
**버전**: 1.0.0  
**담당자**: 개발팀

