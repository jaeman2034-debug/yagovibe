# 📋 어드민 대시보드 파일 및 백엔드 API 엔드포인트 목록

## 1. AdminDashboard.tsx (전체 파일)

```typescript
/**
 * 🔥 Admin 대시보드 - 유저 현황 / 온보딩 퍼널 / SMS 로그
 * 
 * 역할:
 * - 관리자만 접근 가능 (AdminRoute로 보호)
 * - 유저 현황 통계
 * - 온보딩 퍼널 (단계별 이탈률)
 * - SMS 인증 로그 최근 목록
 * - Firestore read-only 안전 조회
 */

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserStats {
  total: number;
  onboarded: number;
  notOnboarded: number;
  byStep: Record<number, number>;
}

interface AuthLog {
  id: string;
  type: string;
  phoneNumber: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Timestamp | null;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<AuthLog[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔥 유저 통계 계산
  const userStats: UserStats = useMemo(() => {
    const total = users.length;
    const onboarded = users.filter((u) => u.onboardingCompleted === true).length;
    const notOnboarded = total - onboarded;

    // 단계별 유저 수
    const byStep: Record<number, number> = {};
    users.forEach((u) => {
      const step = u.onboardingStep ?? -1; // -1은 단계 정보 없음
      byStep[step] = (byStep[step] || 0) + 1;
    });

    return {
      total,
      onboarded,
      notOnboarded,
      byStep,
    };
  }, [users]);

  // 🔥 SMS 로그 통계
  const smsStats = useMemo(() => {
    const total = logs.filter((log) => log.type.startsWith("sms_")).length;
    const success = logs.filter((log) => log.type === "sms_success").length;
    const error = logs.filter((log) => log.type === "sms_error").length;
    const request = logs.filter((log) => log.type === "sms_request").length;

    return {
      total,
      success,
      error,
      request,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    };
  }, [logs]);

  useEffect(() => {
    // 🔥 유저 목록 실시간 구독
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("❌ [AdminDashboard] 유저 목록 구독 실패:", error);
        setLoading(false);
      }
    );

    // 🔥 최근 인증 로그 실시간 구독
    const q = query(
      collection(db, "auth_logs"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubLogs = onSnapshot(
      q,
      (snap) => {
        setLogs(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as AuthLog[]
        );
      },
      (error) => {
        console.error("❌ [AdminDashboard] 로그 구독 실패:", error);
      }
    );

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>불러오는 중...</div>
      </div>
    );
  }

  const conversionRate =
    userStats.total > 0
      ? Math.round((userStats.onboarded / userStats.total) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            새로고침
          </Button>
        </div>

        {/* 📊 유저 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>📊 유저 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{userStats.total}</div>
                <div className="text-sm text-muted-foreground">전체 유저</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {userStats.onboarded}
                </div>
                <div className="text-sm text-muted-foreground">온보딩 완료</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {userStats.notOnboarded}
                </div>
                <div className="text-sm text-muted-foreground">온보딩 미완료</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {conversionRate}%
                </div>
                <div className="text-sm text-muted-foreground">전환율</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 📈 온보딩 퍼널 */}
        <Card>
          <CardHeader>
            <CardTitle>📈 온보딩 퍼널</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>Step 0 (이름 입력)</span>
                <span className="font-bold">
                  {userStats.byStep[0] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Step 1 (목적 선택)</span>
                <span className="font-bold">
                  {userStats.byStep[1] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Step 2 (종목 선택)</span>
                <span className="font-bold">
                  {userStats.byStep[2] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Step 3 (지역 선택)</span>
                <span className="font-bold">
                  {userStats.byStep[3] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Step 4 (완료)</span>
                <span className="font-bold">
                  {userStats.byStep[4] || 0}명
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>단계 정보 없음</span>
                <span className="font-bold">
                  {userStats.byStep[-1] || 0}명
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 📱 SMS 인증 통계 */}
        <Card>
          <CardHeader>
            <CardTitle>📱 SMS 인증 통계 (최근 100건)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold">{smsStats.request}</div>
                <div className="text-sm text-muted-foreground">요청</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {smsStats.success}
                </div>
                <div className="text-sm text-muted-foreground">성공</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {smsStats.error}
                </div>
                <div className="text-sm text-muted-foreground">실패</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {smsStats.successRate}%
                </div>
                <div className="text-sm text-muted-foreground">성공률</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 📋 최근 SMS 인증 로그 */}
        <Card>
          <CardHeader>
            <CardTitle>📋 최근 SMS 인증 로그</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  로그가 없습니다
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.type === "sms_success" ||
                            log.type === "verify_success"
                              ? "bg-green-100 text-green-800"
                              : log.type === "sms_error" ||
                                log.type === "verify_error"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {log.type}
                        </span>
                        <span className="text-sm">
                          {log.phoneNumber
                            ? log.phoneNumber.replace(
                                /(\d{3})(\d{4})(\d{4})/,
                                "$1-****-$3"
                              )
                            : "-"}
                        </span>
                      </div>
                      {log.errorCode && (
                        <div className="text-xs text-red-600 mt-1">
                          {log.errorCode}: {log.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {log.createdAt
                        ? new Date(
                            log.createdAt.toMillis()
                          ).toLocaleString("ko-KR")
                        : "-"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

---

## 2. AdminHome.tsx (전체 파일)

파일이 너무 길어서 별도 파일로 저장했습니다. 위치: `src/pages/admin/AdminHome.tsx` (962줄)

주요 기능:
- AI 도우미
- 리포트 통계
- 배포 관리
- 퀵 액션
- Vercel 배포 센터
- 운영자용 AI 도우미

---

## 3. 백엔드 API 엔드포인트 전체 목록

### 3.1 Admin Dashboard API (`/api/admin/dashboard/*`)

#### GET `/api/admin/dashboard/summary`
- **설명**: 메인 요약 (KPI + 위험 신호)
- **Query Parameters**:
  - `region` (optional, default: "seoul")
  - `date` (optional, default: 오늘 날짜 YYYY-MM-DD)
- **Response**:
```json
{
  "kpi": {
    "storyImp": 0,
    "storyClick": 0,
    "storyCtr": 0,
    "bookingStart": 0,
    "paymentSuccess": 0,
    "paymentFail": 0,
    "revenue": 0,
    "seedRate": 0,
    "offlineRate": 0,
    "apiError": 0,
    "storyFillRate": 0,
    "createdAt": "2026-02-03T03:50:24.282Z"
  } | null,
  "risk": {
    "lowCtrStories": ["story-id-1", "story-id-2"],
    "apiError": 0,
    "currentCtr": 0,
    "isLowCtr": true
  },
  "timestamp": "2026-02-03T03:50:24.282Z"
}
```

#### GET `/api/admin/dashboard/experiments`
- **설명**: AB 실험 모니터
- **Response**: 실험 목록 배열

#### GET `/api/admin/dashboard/settlements`
- **설명**: 정산 관제
- **Query Parameters**:
  - `ownerId` (optional)
  - `region` (optional)
  - `status` (optional)
- **Response**: 정산 아이템 목록

#### GET `/api/admin/dashboard/health`
- **설명**: 헬스 체크 (스토리 채움률, 오프라인률, 시드률)
- **Query Parameters**:
  - `region` (optional, default: "seoul")
  - `date` (optional, default: 오늘 날짜)
- **Response**:
```json
{
  "storyFillRate": 1.0,
  "offlineRate": 0,
  "seedRate": 0,
  "apiError": 0,
  "activeStories": 5,
  "timestamp": "2026-02-03T03:50:24.282Z"
}
```

#### GET `/api/admin/dashboard/stories`
- **설명**: 스토리 현황 (관제용)
- **Query Parameters**:
  - `region` (optional, default: "seoul")
- **Response**:
```json
{
  "summary": {
    "total": 10,
    "PUBLISHED": 5,
    "DRAFT": 2,
    "EXPIRED": 2,
    "REJECTED": 1
  },
  "stories": [...]
}
```

### 3.2 기타 Admin API

#### GET `/api/admin/daily/check`
- 매일 체크리스트용 통합 API

#### GET `/api/admin/widgets/all`
- 6개 위젯 통합 조회

#### GET `/api/admin/playbook/*`
- 운영 플레이북 체크리스트

#### GET `/api/admin/stories`
- 스토리 관리 API

#### GET `/api/admin/settlement`
- 정산 관리 API

#### GET `/api/admin/exp`
- 실험 관리 API

#### GET `/api/admin/campaign`
- 캠페인 관리 API

### 3.3 Core API

#### GET `/api/stories`
- **설명**: 스토리 목록 조회
- **Query Parameters**:
  - `region` (optional)
- **Response**: 스토리 배열

#### GET `/api/leagues`
- **설명**: 리그 목록 조회
- **Query Parameters**:
  - `region` (optional)
- **Response**: 리그 배열

#### GET `/api/logs`
- 이벤트 로그 조회

#### GET `/api/experiments`
- 실험 목록 조회

#### GET `/api/assoc`
- 협회 동기화 API

### 3.4 Health Check

#### GET `/health`
- 기본 헬스 체크

#### GET `/healthz`
- DB 연결 확인 헬스 체크

---

## 4. API Base URL

개발 환경:
```
http://localhost:3001
```

프로덕션 환경:
```
VITE_API_BASE 환경 변수로 설정
```

---

## 5. 주요 데이터 타입

### League
```typescript
interface League {
  id: string;
  region: string;
  name: string;
  startAt: string; // ISO string
  endAt: string; // ISO string
  season?: string;
  status?: string;
}
```

### Story
```typescript
interface Story {
  id: string;
  region: string;
  source: string;
  category: string;
  title: string;
  subtitle: string;
  status: string; // "PUBLISHED" | "DRAFT" | "EXPIRED" | "REJECTED"
  startAt: string; // ISO string
  endAt: string; // ISO string
  ctaType?: string;
  priority: number;
  score: number;
  isVerifiedAuthor: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
```

### Dashboard Summary
```typescript
interface DashboardSummary {
  kpi: DailyKpi | null;
  risk: {
    lowCtrStories: string[];
    apiError: number;
    currentCtr: number;
    isLowCtr: boolean;
  };
  timestamp: string;
}
```

---

**이제 이 정보를 바탕으로 아키텍트가 설계안을 작성할 수 있습니다!** 🚀
