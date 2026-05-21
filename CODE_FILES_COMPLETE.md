# 📋 전체 코드 파일 (아키텍트 설계용)

## 1️⃣ AdminDashboard.tsx (전체 329줄)

**파일 위치**: `src/pages/admin/AdminDashboard.tsx`

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

## 2️⃣ AdminHome.tsx (전체 962줄)

**파일 위치**: `src/pages/admin/AdminHome.tsx`

```typescript
import React, { useEffect, useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, onSnapshot, query, orderBy, getDocs, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RefreshCcw,
  LineChart,
  Rocket,
  Sparkles,
  Mic,
  FileText,
  Share2,
  Headphones,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Play,
  Loader2,
  MapPin,
} from "lucide-react";
import AIAutoInsightCard from "@/components/AIAutoInsightCard";
import AIInsightWordCloud from "@/components/AIInsightWordCloud";
import MarketReportDashboard from "@/components/MarketReportDashboard";
import TTSAudioPanel from "@/components/TTSAudioPanel";
import AdminAuditCard from "@/components/AdminAuditCard";
import WorkflowStatusCard from "@/components/WorkflowStatusCard";
import HealthBoardCard from "@/components/HealthBoardCard";
import BetaFeedbackCard from "@/components/admin/BetaFeedbackCard";
import ReleaseBoard from "@/components/admin/ReleaseBoard";
import { useRoleGate } from "@/hooks/useRoleGate";
import { logAdminAction } from "@/lib/logAdminAction";
import AIReportCard from "@/components/AIReportCard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export default function AdminHome() {
  const { role, isAdmin, isManager, canEdit, canManage, canView, loading: roleLoading } = useRoleGate();
  const [busy, setBusy] = useState<string | null>(null);
  const [reportCount, setReportCount] = useState<number | null>(null);
  const [aiReports, setAiReports] = useState<any[]>([]);
  const [aiReportsLoading, setAiReportsLoading] = useState(true);

  // 🧠 운영자 AI 도우미
  const [adminQuestion, setAdminQuestion] = useState("");
  const [adminAnswer, setAdminAnswer] = useState("");
  const [important, setImportant] = useState<string[]>([]);
  const [action, setAction] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  // 🚀 Vercel 배포
  const [deploying, setDeploying] = useState<"prod" | "dev" | null>(null);
  const [deployHistory, setDeployHistory] = useState<any[]>([]);

  // 리포트 수 집계
  useEffect(() => {
    const q = query(collection(db, "reports"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setReportCount(snapshot.size);
      },
      (error) => {
        console.error("리포트 수 집계 오류:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "aiReports"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAiReports(data);
        setAiReportsLoading(false);
      },
      (error) => {
        console.error("AI 리포트 구독 오류:", error);
        setAiReportsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // 배포 이력 불러오기
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "deployHistory"), orderBy("timestamp", "desc"), limit(10));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDeployHistory(data);
      },
      (error) => {
        console.error("배포 이력 구독 오류:", error);
      },
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // 🧠 운영자 AI 도우미 - 데이터 수집 함수
  const fetchAdminData = async () => {
    try {
      // 1) 사기 위험 HIGH 상품 목록 (최근 50개)
      const fraudProductsQuery = query(
        collection(db, "marketProducts"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const fraudProductsSnap = await getDocs(fraudProductsQuery);
      const fraudProducts = fraudProductsSnap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            price: data.price || 0,
            category: data.category || "",
            fraudRisk: (data as any).fraudRisk || 0,
            description: typeof data.description === "string" ? data.description.substring(0, 200) : "",
            createdAt: data.createdAt,
          };
        })
        .filter((p: any) => p.fraudRisk > 0.5) // HIGH 위험 상품만
        .slice(0, 50);

      // 2) 판매자 위험도 통계 (최근 30개)
      const sellersQuery = query(
        collection(db, "sellerProfiles"),
        orderBy("reports", "desc"),
        limit(30)
      );
      const sellersSnap = await getDocs(sellersQuery);
      const sellerStats = sellersSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          nickname: data.nickname || "",
          totalSales: data.totalSales || 0,
          successfulSales: data.successfulSales || 0,
          cancelledSales: data.cancelledSales || 0,
          reports: data.reports || 0,
          avgFraudRisk: data.avgFraudRisk || 0,
          avgResponseMinutes: data.avgResponseMinutes || null,
          accountAgeDays: data.accountAgeDays || null,
        };
      });

      // 3) 검색 트렌드 (최근 20개 검색어 - 검색 로그가 있다면 사용, 없으면 빈 배열)
      const searchTrends: any[] = []; // 검색 로그 컬렉션이 있다면 여기서 가져오기
      // TODO: 실제 검색 로그 컬렉션에서 가져오기
      // const searchLogsQuery = query(collection(db, "searchLogs"), orderBy("createdAt", "desc"), limit(100));
      // const searchLogsSnap = await getDocs(searchLogsQuery);
      // ...

      // 4) 일일 통계
      const dailyStats = {
        totalProducts: (await getDocs(collection(db, "marketProducts"))).size,
        totalSellers: (await getDocs(collection(db, "sellerProfiles"))).size,
        totalReports: reportCount || 0,
        highRiskProducts: fraudProducts.length,
        highRiskSellers: sellerStats.filter((s: any) => (s.reports || 0) > 5).length,
      };

      return {
        fraudItems: fraudProducts,
        sellerStats: sellerStats,
        searchTrends: searchTrends,
        dailyStats: dailyStats,
      };
    } catch (error) {
      console.error("관리자 데이터 수집 오류:", error);
      return {
        fraudItems: [],
        sellerStats: [],
        searchTrends: [],
        dailyStats: {},
      };
    }
  };

  // 🧠 운영자 AI 도우미 - 질문 실행
  const askAI = async () => {
    if (!adminQuestion.trim()) {
      alert("질문을 입력해주세요.");
      return;
    }

    setLoadingAI(true);
    try {
      const data = await fetchAdminData();

      const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      const response = await fetch(
        `${functionsOrigin}/askAdminAI`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: adminQuestion,
            ...data,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("AI 도우미 서버 응답 오류");
      }

      const result = await response.json();
      setAdminAnswer(result.answer || "");
      setImportant(result.important || []);
      setAction(result.action || []);
    } catch (err: any) {
      console.error("🧠 운영자 AI 도우미 오류:", err);
      setAdminAnswer("AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setImportant([]);
      setAction([]);
    } finally {
      setLoadingAI(false);
    }
  };

  const aiReportStats = useMemo(() => {
    const total = aiReports.length;
    const unread = aiReports.filter((report) => !report.read).length;
    const latest = aiReports[0];
    const latestName = latest?.name || latest?.title || "데이터 없음";
    const latestTime = latest?.createdAt?.toDate?.()?.toLocaleString?.("ko-KR") || "시간 정보 없음";

    return {
      total,
      unread,
      latestName,
      latestTime,
    };
  }, [aiReports]);

  const handleExportAiReportsPdf = () => {
    if (!aiReports.length) {
      toast.info("내보낼 리포트가 없습니다.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("📊 YAGO VIBE AI 리포트 요약", 14, 20);

    doc.setFontSize(12);
    doc.text(`생성일: ${new Date().toLocaleString("ko-KR")}`, 14, 30);
    doc.text(`총 리포트 수: ${aiReportStats.total}`, 14, 38);
    doc.text(`미확인 리포트: ${aiReportStats.unread}`, 14, 46);
    doc.text(`최신 리포트 시각: ${aiReportStats.latestTime}`, 14, 54);

    const tableData = aiReports.map((report: any, index: number) => [
      index + 1,
      report.name || report.title || "제목 없음",
      report.analysis?.summary || report.summary || "요약 없음",
      report.createdAt?.toDate?.()?.toLocaleString?.("ko-KR") || "시간 없음",
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["번호", "제목", "요약", "생성 시각"]],
      body: tableData,
      styles: { fontSize: 10, cellPadding: 2, overflow: "linebreak" },
    });

    doc.save(`YAGO_VIBE_AI_Report_${Date.now()}.pdf`);
    toast.success("📄 AI 리포트 PDF가 생성되었습니다.");
  };

  // 🚀 Vercel 배포 트리거
  const handleDeploy = async (target: "prod" | "dev") => {
    if (!isAdmin) {
      toast.error("❌ 관리자만 배포할 수 있습니다.");
      return;
    }

    if (deploying) {
      toast.info("이미 배포 중입니다. 잠시만 기다려주세요.");
      return;
    }

    setDeploying(target);
    try {
      const functions = getFunctions();
      const deployFn = httpsCallable(functions, "deployToVercel");

      // Audit Log 기록
      await logAdminAction(
        `Vercel 배포 시작: ${target === "prod" ? "Production" : "Preview"}`,
        `배포 대상: ${target}`,
        { target }
      );

      const result = await deployFn({ target });
      const data = result.data as any;

      if (data.success) {
        toast.success(`✅ ${data.message || "배포가 시작되었습니다."}`);
        
        // 성공 Audit Log
        await logAdminAction(
          `Vercel 배포 성공: ${target === "prod" ? "Production" : "Preview"}`,
          `배포 완료`,
          { target, result: data }
        );
      } else {
        throw new Error(data.message || "배포 실패");
      }
    } catch (error: any) {
      console.error("🚀 Vercel 배포 오류:", error);
      
      const errorMessage = error.message || "알 수 없는 오류";
      toast.error(`❌ 배포 실패: ${errorMessage}`);

      // 실패 Audit Log
      await logAdminAction(
        `Vercel 배포 실패: ${target === "prod" ? "Production" : "Preview"}`,
        `오류: ${errorMessage}`,
        { target, error: errorMessage }
      );
    } finally {
      setDeploying(null);
    }
  };

  // Cloud Functions 호출
  const callFn = async (name: string, requiresAdminOnly: boolean = false) => {
    // 권한 체크
    if (requiresAdminOnly && !isAdmin) {
      alert("❌ 권한이 없습니다. 관리자 권한이 필요합니다.");
      return;
    }
    if (!canManage) {
      alert("❌ 권한이 없습니다. 관리자 또는 매니저 권한이 필요합니다.");
      return;
    }

    setBusy(name);
    try {
      const functionsOrigin =
        import.meta.env.VITE_FUNCTIONS_ORIGIN ||
        "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";

      // 함수 이름에 따라 적절한 HTTP 함수 호출
      let functionName = name;
      if (name === "generateInsightAudio") {
        functionName = "triggerInsightAudio";
      } else if (name === "generateInsightPDF") {
        functionName = "triggerInsightPDF";
      } else if (name === "distributeInsight") {
        functionName = "triggerDistributeInsight";
      } else if (name === "notifySlack") {
        functionName = "notifyLatestReport"; // 매니저용 Slack 전송 함수
      }

      // Audit Log 기록 (함수 호출 전)
      await logAdminAction(
        `퀵 액션 실행: ${name}`,
        `AdminHome에서 수동 실행`,
        { functionName }
      );

      const response = await fetch(`${functionsOrigin}/${functionName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.ok) {
        // 성공 Audit Log
        await logAdminAction(
          `퀵 액션 완료: ${name}`,
          `성공적으로 실행됨`,
          { functionName, result }
        );
        alert(`✅ ${name} 실행 완료!`);
      } else {
        // 실패 Audit Log
        await logAdminAction(
          `퀵 액션 실패: ${name}`,
          `오류: ${result.error || "알 수 없는 오류"}`,
          { functionName, error: result.error }
        );
        alert(`❌ 오류: ${result.error || "알 수 없는 오류"}`);
      }
    } catch (error: any) {
      console.error(`❌ ${name} 실행 오류:`, error);
      // 에러 Audit Log
      await logAdminAction(
        `퀵 액션 오류: ${name}`,
        `예외 발생: ${error.message || "알 수 없는 오류"}`,
        { functionName: name, error: error.message }
      );
      alert(`❌ ${name} 실행 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setBusy(null);
    }
  };

  // 권한 없음 화면
  if (roleLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <Card className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">접근 권한이 없습니다</h3>
                <p className="text-sm mt-1">
                  관리자 대시보드를 보려면 관리자, 매니저 또는 뷰어 권한이 필요합니다.
                </p>
                <p className="text-xs mt-2 opacity-75">
                  현재 역할: <span className="font-mono">{role}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
            🧠 YAGO VIBE — 통합 관리자 홈
          </h1>
          <p className="text-sm text-neutral-500 dark:text-gray-400">
            AI 요약 → 음성/TTS → 트렌드/차트 → PDF → Slack/이메일/Notion/Drive 자동 배포까지 한 화면에서 관리
          </p>
          <p className="text-xs text-neutral-400 dark:text-gray-500 mt-1">
            현재 역할: <span className="font-mono font-semibold">{role}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCcw className="h-4 w-4 mr-1" /> 새로고침
          </Button>
          <Button variant="secondary" asChild>
            <a href="/app/admin/dashboard">
              <LineChart className="h-4 w-4 mr-1" /> 상세 대시보드
            </a>
          </Button>
          <Button variant="secondary" asChild>
            <a href="/app/admin/location-quality">
              <MapPin className="h-4 w-4 mr-1" /> 위치 품질
            </a>
          </Button>
        </div>
      </div>

      {/* 퀵 액션 */}
      {canManage && (
        <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Rocket className="h-5 w-5" /> 자동화 퀵 액션
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {isAdmin
                ? "전체 기능 접근 가능 (관리자 전용)"
                : "리포트 확인 및 Slack 전송만 가능 (매니저 전용)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 관리자 전용: 주간 인사이트 생성 */}
            {isAdmin && (
              <ActionBtn
                icon={<Sparkles className="h-4 w-4" />}
                text="주간 인사이트 생성"
                busy={busy}
                name="generateWeeklyInsight"
                onClick={(name) => callFn(name, true)}
              />
            )}
            {/* 관리자 전용: 인사이트 음성 변환 */}
            {isAdmin && (
              <ActionBtn
                icon={<Mic className="h-4 w-4" />}
                text="인사이트 음성 변환"
                busy={busy}
                name="generateInsightAudio"
                onClick={(name) => callFn(name, true)}
              />
            )}
            {/* 관리자 전용: 인사이트 PDF 생성 */}
            {isAdmin && (
              <ActionBtn
                icon={<FileText className="h-4 w-4" />}
                text="인사이트 PDF 생성"
                busy={busy}
                name="generateInsightPDF"
                onClick={(name) => callFn(name, true)}
              />
            )}
            {/* 관리자 전용: Notion/Drive/메일 배포 */}
            {isAdmin && (
              <ActionBtn
                icon={<Share2 className="h-4 w-4" />}
                text="Notion/Drive/메일 배포"
                busy={busy}
                name="distributeInsight"
                onClick={(name) => callFn(name, true)}
              />
            )}
            {/* 관리자 전용: 릴리즈 체크 (SLO) */}
            {isAdmin && (
              <ActionBtn
                icon={<CheckCircle className="h-4 w-4" />}
                text="릴리즈 체크 (SLO)"
                busy={busy}
                name="releaseCheck"
                onClick={(name) => callFn(name, true)}
              />
            )}
            {/* 관리자 전용: 릴리즈 노트 생성 */}
            {isAdmin && (
              <ActionBtn
                icon={<FileText className="h-4 w-4" />}
                text="릴리즈 노트 생성"
                busy={busy}
                name="generateReleaseNotes"
                onClick={(name) => callFn(name, true)}
              />
            )}
            {/* 관리자 전용: 종합 리포트 PDF 생성 */}
            {isAdmin && (
              <ActionBtn
                icon={<FileText className="h-4 w-4" />}
                text="종합 리포트 PDF 생성"
                busy={busy}
                name="generateCombinedReport"
                onClick={(name) => callFn(name, true)}
              />
            )}
            {/* 매니저용: Slack 전송만 표시 */}
            {!isAdmin && isManager && (
              <ActionBtn
                icon={<Share2 className="h-4 w-4" />}
                text="Slack 전송 (리포트)"
                busy={busy}
                name="notifySlack"
                onClick={(name) => callFn(name, false)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {!canManage && (
        <Card className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">읽기 전용 모드</h3>
                <p className="text-sm mt-1">
                  뷰어 권한으로는 퀵 액션을 사용할 수 없습니다. 관리자 또는 매니저 권한이 필요합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상단 AI 카드 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIAutoInsightCard />
        <AIInsightWordCloud />
      </div>

      {/* 헬스보드 카드 */}
      <HealthBoardCard />

      {/* KPI/트렌드/최근5개 */}
      <MarketReportDashboard />

      <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle>🧠 AI 리포트 대시보드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-neutral-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
              <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-300">📈 총 리포트 수</h4>
              <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-200">{aiReportStats.total}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20 p-4 text-center">
              <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-300">🕓 미확인 리포트</h4>
              <p className="text-2xl font-extrabold text-yellow-700 dark:text-yellow-200">{aiReportStats.unread}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20 p-4 text-center">
              <h4 className="text-sm font-semibold text-green-600 dark:text-green-300">⏰ 최신 리포트</h4>
              <p className="text-sm text-green-700 dark:text-green-200">{aiReportStats.latestTime}</p>
              <p className="text-xs text-green-600 dark:text-green-300 mt-1">{aiReportStats.latestName}</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleExportAiReportsPdf} className="bg-blue-600 hover:bg-blue-700 text-white">
              📄 PDF 내보내기
            </Button>
          </div>

          <div className="grid gap-3">
            {aiReportsLoading ? (
              <div>로딩 중...</div>
            ) : aiReports.length === 0 ? (
              <div>아직 분석된 리포트가 없습니다.</div>
            ) : (
              aiReports.map((report) => <AIReportCard key={report.id} report={report} />)
            )}
          </div>
        </CardContent>
      </Card>

      {/* 오디오 플레이어 */}
      <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Headphones className="h-5 w-5" /> TTS 플레이어
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            생성된 리포트 음성 파일을 바로 재생/다운로드할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TTSAudioPanel />
        </CardContent>
      </Card>

      {/* 시스템 상태 */}
      <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <ShieldCheck className="h-5 w-5" /> 시스템 상태
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            데이터 현황과 함수 연결 상태를 간단히 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="리포트 총계" value={reportCount ?? "-"} />
          <StatTile label="함수 연결" value="httpsCallable OK" />
          <StatTile label="배포 상태" value="Stable" />
          <StatTile label="버전" value={`AdminHome v1.0`} />
        </CardContent>
      </Card>

      {/* 🚀 Vercel 배포 센터 */}
      {isAdmin && (
        <Card className="border border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
              <Rocket className="h-5 w-5" /> 🚀 Vercel 배포 센터
            </CardTitle>
            <CardDescription className="text-indigo-700 dark:text-indigo-300">
              버튼 하나로 Production 또는 Preview 환경에 즉시 배포합니다. GitHub/Vercel 사이트 접속 불필요!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Production 배포 버튼 */}
              <Button
                onClick={() => handleDeploy("prod")}
                disabled={deploying !== null}
                className="w-full h-auto py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                size="lg"
              >
                <div className="flex flex-col items-center gap-2">
                  {deploying === "prod" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">배포 중...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-base">🔄 프로덕션 배포하기</div>
                        <div className="text-xs opacity-90 mt-1">main 브랜치 → Production</div>
                      </div>
                    </>
                  )}
                </div>
              </Button>

              {/* Preview 배포 버튼 */}
              <Button
                onClick={() => handleDeploy("dev")}
                disabled={deploying !== null}
                className="w-full h-auto py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                size="lg"
              >
                <div className="flex flex-col items-center gap-2">
                  {deploying === "dev" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">배포 중...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      <div className="text-center">
                        <div className="font-semibold text-base">🧪 테스트 서버(dev) 배포하기</div>
                        <div className="text-xs opacity-90 mt-1">dev 브랜치 → Preview</div>
                      </div>
                    </>
                  )}
                </div>
              </Button>
            </div>

            {/* 배포 이력 */}
            {deployHistory.length > 0 && (
              <div className="mt-4 p-4 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-indigo-200 dark:border-indigo-700">
                <h4 className="text-sm font-semibold mb-3 text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" /> 최근 배포 이력
                </h4>
                <div className="space-y-2">
                  {deployHistory.slice(0, 5).map((history: any) => (
                    <div
                      key={history.id}
                      className={`flex items-center justify-between p-2 rounded text-xs ${
                        history.success
                          ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                          : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {history.success ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                        <span className="font-medium">
                          {history.target === "prod" ? "Production" : "Preview"}
                        </span>
                        <span className="opacity-70">
                          {history.timestamp?.toDate
                            ? new Date(history.timestamp.toDate()).toLocaleString("ko-KR", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : new Date(history.createdAt).toLocaleString("ko-KR", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                        </span>
                      </div>
                      <span className="opacity-70 text-[10px]">{history.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 안내 메시지 */}
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                ⚠️ <strong>주의:</strong> Production 배포는 즉시 라이브 서비스에 반영됩니다. 신중하게 진행하세요.
                <br />
                💡 <strong>팁:</strong> 배포 후 Vercel Dashboard에서 배포 상태를 확인할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 워크플로우 상태 및 관리자 활동 로그 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkflowStatusCard />
        {isAdmin && <AdminAuditCard />}
      </div>

      {/* 베타 피드백 및 릴리즈 상태 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdmin && <BetaFeedbackCard />}
        {isAdmin && <ReleaseBoard />}
      </div>

      {/* 🧠 운영자용 AI 도우미 */}
      {isAdmin && (
        <Card className="border border-neutral-200 dark:border-gray-700 shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Sparkles className="h-5 w-5" /> 🧠 운영자용 AI 도우미
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              플랫폼 데이터를 기반으로 AI가 질문에 답변합니다. 사기 위험 상품, 판매자 통계, 검색 트렌드 등을 분석합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  질문 입력
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  rows={3}
                  placeholder="예: 최근 일주일간 사기 위험 높은 상품 20개만 보여줘&#10;예: 어떤 판매자가 위험해?&#10;예: 어제 검색량 높은 5개 검색어 알려줘&#10;예: 애플워치 카테고리에서 이상거래 증가했어?"
                  value={adminQuestion}
                  onChange={(e) => setAdminQuestion(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      void askAI();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Ctrl+Enter (또는 Cmd+Enter)로 실행
                </p>
              </div>

              <Button
                onClick={askAI}
                disabled={loadingAI || !adminQuestion.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loadingAI ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> AI 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> AI 분석 실행
                  </>
                )}
              </Button>

              {adminAnswer && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> 📌 분석 결과
                  </h3>
                  <p className="text-sm mb-4 whitespace-pre-line leading-relaxed text-gray-700 dark:text-gray-300">
                    {adminAnswer}
                  </p>

                  {important.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-300 flex items-center gap-2">
                        🔎 핵심 포인트
                      </h4>
                      <ul className="list-disc ml-5 text-xs space-y-1 text-blue-800 dark:text-blue-200">
                        {important.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {action.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
                      <h4 className="font-semibold text-sm mb-2 text-red-900 dark:text-red-300 flex items-center gap-2">
                        ⚠ 조치 사항
                      </h4>
                      <ul className="list-disc ml-5 text-xs space-y-1 text-red-800 dark:text-red-200">
                        {action.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border-t border-neutral-200 dark:border-gray-700 my-6" />

      <FooterNote />
    </div>
  );
}

function ActionBtn({
  icon,
  text,
  name,
  onClick,
  busy,
}: {
  icon: React.ReactNode;
  text: string;
  name: string;
  onClick: (n: string) => Promise<void>;
  busy: string | null;
}) {
  const isBusy = busy === name;

  return (
    <Button className="justify-start" disabled={isBusy} onClick={() => onClick(name)} variant="outline">
      {icon}
      <span className="ml-2">{text}</span>
      {isBusy && <span className="ml-auto text-xs opacity-80">실행중…</span>}
    </Button>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
      <p className="text-xs text-neutral-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-semibold mt-1 text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function FooterNote() {
  return (
    <div className="text-[11px] text-neutral-500 dark:text-gray-400 text-center">
      ⚙️ 퀵 액션은 Cloud Functions의 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">httpsCallable</code> 이름과 일치해야 합니다.
      <br />
      예) <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">generateWeeklyInsight</code>,{" "}
      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">generateInsightAudio</code>,{" "}
      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">generateInsightPDF</code>,{" "}
      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">distributeInsight</code>
    </div>
  );
}
```

---

## 3️⃣ admin.dashboard.ts (백엔드 라우트, 전체 289줄)

**파일 위치**: `server/src/routes/admin.dashboard.ts`

```typescript
/**
 * 🔥 Admin Dashboard Route - 대시보드 v2 통합 API
 * 
 * Week6 핵심: KPI 관제 + AB 실험 모니터 + 정산 관리 + 위험 알림
 */

import { Router } from "express";
import { prisma } from "../data/prisma";

const router = Router();

/**
 * GET /api/admin/dashboard/summary
 * 메인 요약 (KPI + 위험 신호)
 */
router.get("/summary", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0]; // 오늘 날짜

    // KPI 조회
    const kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    // 위험 신호: CTR이 낮은 스토리
    const lowCtrStories = await prisma.story.findMany({
      where: {
        region,
        status: "PUBLISHED",
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    // 최근 이벤트 로그에서 CTR 계산 (간단 버전)
    const recentLogs = await prisma.eventLog.findMany({
      where: {
        eventName: { in: ["story_impression", "story_click"] },
        region,
        createdAt: {
          gte: new Date(new Date().getTime() - 24 * 60 * 60 * 1000), // 최근 24시간
        },
      },
      take: 1000,
    });

    const impressions = recentLogs.filter(
      (l) => l.eventName === "story_impression"
    ).length;
    const clicks = recentLogs.filter((l) => l.eventName === "story_click")
      .length;
    const currentCtr = impressions > 0 ? clicks / impressions : 0;

    res.json({
      kpi: kpi
        ? {
            ...kpi,
            createdAt: kpi.createdAt.toISOString(),
          }
        : null,
      risk: {
        lowCtrStories: lowCtrStories.map((s) => s.id),
        apiError: kpi?.apiError || 0,
        currentCtr: currentCtr,
        isLowCtr: currentCtr < 0.01, // 1% 미만
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/summary]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/experiments
 * AB 실험 모니터
 */
router.get("/experiments", async (req, res) => {
  try {
    const exps = await prisma.experiment.findMany({
      orderBy: { createdAt: "desc" },
    });

    // 각 실험의 통계 조회
    const view = await Promise.all(
      exps.map(async (e) => {
        const stats = await prisma.experimentStat.findMany({
          where: { expId: e.id },
        });

        const variantA = stats.find((s) => s.variant === "A");
        const variantB = stats.find((s) => s.variant === "B");

        const impA = variantA?.imp || 0;
        const clickA = variantA?.click || 0;
        const impB = variantB?.imp || 0;
        const clickB = variantB?.click || 0;

        const ctrA = impA > 0 ? clickA / impA : 0;
        const ctrB = impB > 0 ? clickB / impB : 0;

        const uplift = ctrA > 0 ? (ctrB - ctrA) / ctrA : 0;

        return {
          id: e.id,
          status: e.status,
          winner: e.winner,
          startedAt: e.startedAt.toISOString(),
          endedAt: e.endedAt?.toISOString() || null,
          stats: {
            A: {
              imp: impA,
              click: clickA,
              ctr: ctrA,
            },
            B: {
              imp: impB,
              click: clickB,
              ctr: ctrB,
            },
          },
          uplift: uplift,
          totalImp: impA + impB,
          totalClick: clickA + clickB,
        };
      })
    );

    res.json(view);
  } catch (error) {
    console.error("[GET /admin/dashboard/experiments]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/settlements
 * 정산 관제
 */
router.get("/settlements", async (req, res) => {
  try {
    const ownerId = req.query.ownerId as string | undefined;
    const region = req.query.region as string | undefined;
    const status = req.query.status as string | undefined;

    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (region) where.region = region;
    if (status) where.status = status;

    const items = await prisma.settlementItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const total = items.reduce((sum, item) => sum + item.net, 0);
    const ready = items.filter((i) => i.status === "READY").length;
    const settled = items.filter((i) => i.status === "SETTLED").length;
    const hold = items.filter((i) => i.status === "HOLD").length;

    res.json({
      summary: {
        total,
        ready,
        settled,
        hold,
        totalCount: items.length,
      },
      items: items.map((item) => ({
        ...item,
        usedAt: item.usedAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/settlements]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/health
 * 헬스 체크 (스토리 채움률, 오프라인률, 시드률)
 */
router.get("/health", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";
    const date =
      (req.query.date as string) ||
      new Date().toISOString().split("T")[0];

    const kpi = await prisma.dailyKpi.findUnique({
      where: {
        date_region: {
          date,
          region,
        },
      },
    });

    // 실시간 스토리 채움률 계산
    const activeStories = await prisma.story.count({
      where: {
        region,
        status: "PUBLISHED",
        startAt: { lte: new Date() },
        endAt: { gte: new Date() },
      },
    });

    const storyFillRate = activeStories >= 5 ? 1.0 : activeStories / 5;

    res.json({
      storyFillRate: kpi?.storyFillRate ?? storyFillRate,
      offlineRate: kpi?.offlineRate ?? 0,
      seedRate: kpi?.seedRate ?? 0,
      apiError: kpi?.apiError ?? 0,
      activeStories,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/health]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

/**
 * GET /api/admin/dashboard/stories
 * 스토리 현황 (관제용)
 */
router.get("/stories", async (req, res) => {
  try {
    const region = (req.query.region as string) || "seoul";

    const stories = await prisma.story.findMany({
      where: { region },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const byStatus = {
      PUBLISHED: stories.filter((s) => s.status === "PUBLISHED").length,
      DRAFT: stories.filter((s) => s.status === "DRAFT").length,
      EXPIRED: stories.filter((s) => s.status === "EXPIRED").length,
      REJECTED: stories.filter((s) => s.status === "REJECTED").length,
    };

    res.json({
      summary: {
        total: stories.length,
        ...byStatus,
      },
      stories: stories.map((s) => ({
        ...s,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /admin/dashboard/stories]", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
});

export default router;
```

---

## 📊 Firestore 의존 코드 추출 요약

### AdminDashboard.tsx
- **84-96줄**: `collection(db, "users")` - 유저 목록 실시간 구독
- **99-118줄**: `collection(db, "auth_logs")` - 인증 로그 실시간 구독

### AdminHome.tsx
- **58-71줄**: `collection(db, "reports")` - 리포트 수 집계
- **73-89줄**: `collection(db, "aiReports")` - AI 리포트 목록
- **92-108줄**: `collection(db, "deployHistory")` - 배포 이력
- **111-189줄**: `fetchAdminData()` 함수 - Firestore 직접 조회
  - `collection(db, "marketProducts")` - 사기 위험 상품
  - `collection(db, "sellerProfiles")` - 판매자 통계
  - `collection(db, "marketProducts")`, `collection(db, "sellerProfiles")` - 일일 통계

---

## 🎯 백엔드 API 매핑

### 사용 가능한 엔드포인트
- `GET /api/admin/dashboard/summary` → KPI + 위험 신호
- `GET /api/admin/dashboard/health` → 헬스 체크
- `GET /api/admin/dashboard/stories` → 스토리 현황
- `GET /api/admin/dashboard/experiments` → AB 실험
- `GET /api/admin/dashboard/settlements` → 정산
- `GET /api/leagues` → 리그 목록
- `GET /api/stories` → 스토리 목록

---

**이제 아키텍트가 설계안을 작성할 수 있습니다!** 🚀
