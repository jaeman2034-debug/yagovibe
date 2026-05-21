import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRoleGate } from "@/hooks/useRoleGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Shield, User, MessageSquare, Clock, X } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

interface Report {
  id: string;
  chatId: string;
  messageId: string;
  reportedUserId: string;
  reporterId: string;
  reason: string;
  createdAt: any;
  resolved?: boolean;
  reportedUser?: {
    nickname?: string;
    email?: string;
  };
  reporter?: {
    nickname?: string;
    email?: string;
  };
}

export default function AdminReportDashboard() {
  const { isAdmin, loading: roleLoading } = useRoleGate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 신고 리스트 로드
  useEffect(() => {
    if (!isAdmin || roleLoading) return;

    let q;
    if (filter === "unresolved") {
      q = query(
        collection(db, "chatReports"),
        where("resolved", "!=", true),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    } else if (filter === "resolved") {
      q = query(
        collection(db, "chatReports"),
        where("resolved", "==", true),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    } else {
      q = query(
        collection(db, "chatReports"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const reportsData: Report[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          
          // 유저 정보 로드
          let reportedUser = {};
          let reporter = {};
          
          try {
            if (data.reportedUserId) {
              const reportedUserDoc = await getDoc(doc(db, "users", data.reportedUserId));
              if (reportedUserDoc.exists()) {
                reportedUser = reportedUserDoc.data();
              }
            }
            
            if (data.reporterId) {
              const reporterDoc = await getDoc(doc(db, "users", data.reporterId));
              if (reporterDoc.exists()) {
                reporter = reporterDoc.data();
              }
            }
          } catch (err) {
            console.error("유저 정보 로드 오류:", err);
          }
          
          reportsData.push({
            id: docSnap.id,
            ...data,
            reportedUser,
            reporter,
          } as Report);
        }
        
        setReports(reportsData);
        setLoading(false);
      },
      (error) => {
        console.error("신고 리스트 로드 오류:", error);
        toast.error("신고 리스트를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, roleLoading, filter]);

  // 신고 처리 완료
  const handleResolve = async (reportId: string) => {
    if (!confirm("이 신고를 처리 완료로 표시하시겠습니까?")) return;

    try {
      setProcessingId(reportId);
      await updateDoc(doc(db, "chatReports", reportId), {
        resolved: true,
      });
      toast.success("신고가 처리 완료로 표시되었습니다.");
    } catch (err: any) {
      console.error("신고 처리 오류:", err);
      toast.error("신고 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  if (roleLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-semibold">관리자 권한이 필요합니다.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🚨 신고 관리 대시보드</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            채팅 메시지 신고 현황을 확인하고 처리할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          전체 ({reports.length})
        </Button>
        <Button
          variant={filter === "unresolved" ? "default" : "outline"}
          onClick={() => setFilter("unresolved")}
        >
          미처리
        </Button>
        <Button
          variant={filter === "resolved" ? "default" : "outline"}
          onClick={() => setFilter("resolved")}
        >
          처리 완료
        </Button>
      </div>

      {/* 신고 리스트 */}
      {loading ? (
        <div className="text-center py-12">로딩 중...</div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>신고 내역이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className={report.resolved ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">
                        신고 #{report.id.slice(0, 8)}
                      </CardTitle>
                      {report.resolved ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          처리 완료
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          미처리
                        </Badge>
                      )}
                      <Badge variant="secondary">{report.reason}</Badge>
                    </div>
                    <CardDescription>
                      {report.createdAt && (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {dayjs(report.createdAt.toDate?.() || report.createdAt).format("YYYY-MM-DD HH:mm:ss")}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  {!report.resolved && (
                    <Button
                      size="sm"
                      onClick={() => handleResolve(report.id)}
                      disabled={processingId === report.id}
                    >
                      {processingId === report.id ? "처리 중..." : "처리 완료"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">신고당한 사용자</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 pl-6">
                      <p>UID: {report.reportedUserId}</p>
                      {report.reportedUser?.nickname && (
                        <p>닉네임: {report.reportedUser.nickname}</p>
                      )}
                      {report.reportedUser?.email && (
                        <p>이메일: {report.reportedUser.email}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">신고한 사용자</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 pl-6">
                      <p>UID: {report.reporterId}</p>
                      {report.reporter?.nickname && (
                        <p>닉네임: {report.reporter.nickname}</p>
                      )}
                      {report.reporter?.email && (
                        <p>이메일: {report.reporter.email}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="font-semibold">채팅 정보</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 pl-6">
                    <p>채팅방 ID: {report.chatId}</p>
                    <p>메시지 ID: {report.messageId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

