# Step 52: AI 운영 Copilot - 배포 체크리스트

## ✅ 구현 완료 사항 확인

### 1. 프론트엔드 - OpsCopilot.tsx
- ✅ Web Speech STT/TTS 구현
- ✅ 명령 입력/로그 UI
- ✅ 퀵 액션 버튼 (팀 요약/이상 브리핑/재튜닝/재학습 상태)
- ✅ VITE_FUNCTIONS_ORIGIN 환경 변수 사용 (fallback 포함)

### 2. 백엔드 - opsRouter
- ✅ 간단한 NLU 정규식 기반 Intent 인식
- ✅ Step 44~51 함수 라우팅:
  - `getGlobalStats` (Step 51)
  - `triggerActions` (Step 51)
  - `predictQualityTrend` (Step 40)
- ✅ FUNCTIONS_ORIGIN 환경 변수 사용 (fallback 포함)

### 3. OpsCenter 페이지
- ✅ OpsCopilot 컴포넌트 통합
- ✅ 팀 필터 선택 기능
- ✅ 사용 가이드 표시
- ✅ 권한 가드 구현 (`isAdminUser()`)

## 🔍 체크리스트 항목 검토

### ✅ 1. VITE_FUNCTIONS_ORIGIN 환경 변수

**현재 구현 상태:**
- `src/components/OpsCopilot.tsx` (107번째 줄):
```typescript
const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
    "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
```

**설정 방법:**

1. **로컬 개발 환경** (`.env.local`):
```bash
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

2. **프로덕션 환경** (Firebase Hosting):
```bash
# Firebase Hosting 환경 변수 설정
firebase hosting:channel:deploy preview --env VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

3. **빌드 시 환경 변수 주입**:
```bash
# .env.production 파일 생성
echo "VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net" > .env.production
```

**확인 방법:**
```javascript
// 브라우저 콘솔에서 확인
console.log(import.meta.env.VITE_FUNCTIONS_ORIGIN);
```

**문제 해결:**
- 환경 변수가 설정되지 않은 경우, fallback URL이 자동으로 사용됩니다.
- 개발 서버 재시작 필요: `npm run dev` 또는 `pnpm dev`

---

### ✅ 2. 배포 명령

**Functions 배포:**
```bash
# Step 52 함수만 배포
firebase deploy --only functions:opsRouter

# 또는 모든 함수 배포
firebase deploy --only functions
```

**Functions 환경 변수 설정:**
```bash
# FUNCTIONS_ORIGIN 설정 (선택사항, fallback이 있으므로 필수 아님)
firebase functions:config:set \
  functions.origin="https://asia-northeast3-yago-vibe-spt.cloudfunctions.net"

# 또는 .env 파일 사용 (Firebase Functions v2)
# functions/.env 파일에 추가:
# FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

**프론트엔드 빌드 및 배포:**
```bash
# 빌드
npm run build

# Firebase Hosting 배포
firebase deploy --only hosting

# 또는 전체 배포
firebase deploy
```

**배포 확인:**
```bash
# Functions 배포 상태 확인
firebase functions:list

# Functions 로그 확인
firebase functions:log --only opsRouter

# 배포된 함수 URL 확인
# https://asia-northeast3-[PROJECT_ID].cloudfunctions.net/opsRouter
```

---

### ✅ 3. 권한 가드 검토

**현재 구현 상태:**
- `src/pages/admin/OpsCenter.tsx` (13-32번째 줄):
```typescript
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
    setIsAdmin(isAdminUser());
}, []);

if (!isAdmin) {
    return (
        <div className="p-4">
            <Card className="shadow-sm border-red-200 dark:border-red-800">
                <CardContent className="p-4">
                    <div className="text-center text-red-600 dark:text-red-400">
                        관리자 권한이 필요합니다.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
```

**권한 체크 함수:**
- `src/utils/auditLog.ts`의 `isAdminUser()` 함수 사용
- Step 43의 역할 기반 권한 시스템과 연동

**추가 권한 가드 옵션:**

1. **라우트 레벨 가드** (선택사항):
```typescript
// src/App.tsx에 추가
import { PrivateAdminRoute } from "@/components/PrivateAdminRoute";

<Route 
    path="/app/admin/ops-center" 
    element={
        <PrivateAdminRoute>
            <OpsCenter />
        </PrivateAdminRoute>
    } 
/>
```

2. **Backend 권한 체크** (선택사항):
```typescript
// functions/src/step52.opsRouter.ts에 추가
import { verifyAdminToken } from "./utils/auth";

export const opsRouter = onRequest(
    {
        region: "asia-northeast3",
        cors: true,
    },
    async (req, res) => {
        // 관리자 권한 확인
        const isAdmin = await verifyAdminToken(req.headers.authorization);
        if (!isAdmin) {
            res.status(403).json({ error: "관리자 권한이 필요합니다." });
            return;
        }
        // ... 기존 코드
    }
);
```

**권한 확인 방법:**
1. 브라우저에서 `/app/admin/ops-center` 접근
2. 관리자 권한이 없으면 "관리자 권한이 필요합니다." 메시지 표시
3. 관리자 권한이 있으면 Ops Copilot UI 표시

---

## 🧪 테스트 체크리스트

### 프론트엔드 테스트

- [ ] Ops Center 페이지 접근 가능 (`/app/admin/ops-center`)
- [ ] 관리자 권한 체크 작동
- [ ] "듣기" 버튼 클릭 시 음성 인식 시작
- [ ] 텍스트 입력 후 Enter로 명령 전송
- [ ] 퀵 액션 버튼 클릭 시 명령 실행
- [ ] 대화 로그에 사용자/어시스턴트 메시지 표시
- [ ] TTS로 응답 재생 (브라우저 지원 시)

### 백엔드 테스트

- [ ] `POST /opsRouter` 엔드포인트 호출 가능
- [ ] Intent 인식 정확도 확인
- [ ] 각 액션 실행 확인:
  - [ ] 팀 요약 (`team_summary`)
  - [ ] 이상 브리핑 (`anomaly_brief`)
  - [ ] 재튜닝 (`retuning`)
  - [ ] 예측 리포트 (`predict_report`)
  - [ ] 모델 상태 (`model_status`)
  - [ ] 모델 재로드 (`model_reload`)
  - [ ] 전체 통계 (`global_stats`)

### 통합 테스트

- [ ] 음성 명령: "팀 요약 알려줘" → TTS 응답 재생
- [ ] 텍스트 명령: "재튜닝 실행해" → 실행 결과 확인
- [ ] 퀵 액션: "이상 브리핑" 버튼 → 이상 탐지 로그 확인
- [ ] 팀 필터 적용: 특정 팀 ID로 필터링

---

## 🐛 알려진 문제 및 해결 방법

### 문제 1: Web Speech API가 작동하지 않음

**원인:**
- HTTPS 연결이 아님 (로컬 개발 환경 제외)
- 브라우저가 Web Speech API를 지원하지 않음
- 마이크 권한이 거부됨

**해결:**
- HTTPS 연결 확인 (프로덕션 환경)
- Chrome/Edge 브라우저 사용 권장
- 브라우저 마이크 권한 허용
- 텍스트 입력으로 대체 사용

### 문제 2: VITE_FUNCTIONS_ORIGIN이 undefined

**원인:**
- 환경 변수가 설정되지 않음
- 빌드 시 환경 변수가 주입되지 않음

**해결:**
- `.env.local` 파일에 `VITE_FUNCTIONS_ORIGIN` 설정
- 개발 서버 재시작
- Fallback URL이 자동으로 사용되므로 기능은 정상 작동

### 문제 3: 권한 가드가 작동하지 않음

**원인:**
- `isAdminUser()` 함수가 올바르게 구현되지 않음
- Step 43의 역할 시스템이 설정되지 않음

**해결:**
- `src/utils/auditLog.ts` 확인
- Firestore에 사용자 역할 정보 확인
- 관리자 권한 부여 확인

---

## 📝 배포 체크리스트 요약

### 사전 준비
- [x] `.env.local`에 `VITE_FUNCTIONS_ORIGIN` 설정
- [x] `functions/.env`에 `FUNCTIONS_ORIGIN` 설정 (선택사항)
- [x] 관리자 권한 확인

### 배포 단계
- [ ] Functions 배포: `firebase deploy --only functions:opsRouter`
- [ ] 프론트엔드 빌드: `npm run build`
- [ ] Hosting 배포: `firebase deploy --only hosting`

### 배포 후 확인
- [ ] Ops Center 페이지 접근 가능
- [ ] 권한 가드 작동 확인
- [ ] 음성/텍스트 명령 테스트
- [ ] Functions 로그 확인

---

## 🎯 최종 확인 사항

✅ **VITE_FUNCTIONS_ORIGIN**: 환경 변수 사용 및 fallback 구현 완료  
✅ **배포 명령**: Functions 및 Hosting 배포 명령 명시  
✅ **권한 가드**: `isAdminUser()` 함수로 권한 체크 구현 완료  

**추가 권장 사항:**
- Backend 권한 체크 추가 (선택사항)
- 라우트 레벨 가드 추가 (선택사항)
- 에러 핸들링 강화 (선택사항)

