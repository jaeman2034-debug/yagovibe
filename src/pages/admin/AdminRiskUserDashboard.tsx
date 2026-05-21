import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRoleGate } from "@/hooks/useRoleGate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, User, Ban, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

interface RiskUser {
  uid: string;
  nickname?: string;
  email?: string;
  reportCount: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  lastReportedAt?: any;
  banned?: boolean;
}

export default function AdminRiskUserDashboard() {
  const { isAdmin, loading: roleLoading } = useRoleGate();
  const [riskUsers, setRiskUsers] = useState<RiskUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 위험 유저 리스트 로드
  useEffect(() => {
    if (!isAdmin || roleLoading) return;

    let q;
    if (filter === "all") {
      q = query(
        collection(db, "users"),
        where("riskLevel", "in", ["LOW", "MEDIUM", "HIGH"]),
        orderBy("lastReportedAt", "desc")
      );
    } else {
      q = query(
        collection(db, "users"),
        where("riskLevel", "==", filter),
        orderBy("lastReportedAt", "desc")
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const usersData: RiskUser[] = snapshot.docs
          .map((docSnap) => ({
            uid: docSnap.id,
            ...docSnap.data(),
          } as RiskUser))
          .filter((user) => user.riskLevel && user.reportCount > 0);
        
        setRiskUsers(usersData);
        setLoading(false);
      },
      (error) => {
        console.error("위험 유저 리스트 로드 오류:", error);
        toast.error("위험 유저 리스트를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, roleLoading, filter]);

  // 유저 제재 (밴)
  const handleBan = async (uid: string, currentBanned: boolean) => {
    const action = currentBanned ? "해제" : "제재";
    if (!confirm(`이 사용자의 ${action}를 진행하시겠습니까?`)) return;

    try {
      setProcessingId(uid);
      await updateDoc(doc(db, "users", uid), {
        banned: !currentBanned,
      });
      toast.success(`사용자 ${action}가 완료되었습니다.`);
    } catch (err: any) {
      console.error("유저 제재 오류:", err);
      toast.error("유저 제재 중 오류가 발생했습니다.");
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
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-semibold">관리자 권한이 필요합니다.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "HIGH":
        return <Badge variant="destructive">🚨 HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700">⚠️ MEDIUM</Badge>;
      case "LOW":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">LOW</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🚩 위험 유저 관리</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            신고 누적으로 인한 위험 유저를 확인하고 관리할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          전체
        </Button>
        <Button
          variant={filter === "HIGH" ? "default" : "outline"}
          onClick={() => setFilter("HIGH")}
        >
          🚨 HIGH
        </Button>
        <Button
          variant={filter === "MEDIUM" ? "default" : "outline"}
          onClick={() => setFilter("MEDIUM")}
        >
          ⚠️ MEDIUM
        </Button>
        <Button
          variant={filter === "LOW" ? "default" : "outline"}
          onClick={() => setFilter("LOW")}
        >
          LOW
        </Button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">HIGH 위험 유저</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {riskUsers.filter((u) => u.riskLevel === "HIGH").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">MEDIUM 위험 유저</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {riskUsers.filter((u) => u.riskLevel === "MEDIUM").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">총 위험 유저</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {riskUsers.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 위험 유저 리스트 */}
      {loading ? (
        <div className="text-center py-12">로딩 중...</div>
      ) : riskUsers.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>위험 유저가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {riskUsers.map((user) => (
            <Card key={user.uid} className={user.banned ? "border-red-500" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">
                        {user.nickname || user.email || "이름 없음"}
                      </CardTitle>
                      {getRiskBadge(user.riskLevel)}
                      {user.banned && (
                        <Badge variant="destructive">
                          <Ban className="w-3 h-3 mr-1" />
                          제재됨
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      <div className="flex items-center gap-4 text-sm">
                        <span>UID: {user.uid}</span>
                        {user.lastReportedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {dayjs(user.lastReportedAt.toDate?.() || user.lastReportedAt).format("YYYY-MM-DD HH:mm:ss")}
                          </div>
                        )}
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {user.banned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBan(user.uid, true)}
                        disabled={processingId === user.uid}
                      >
                        {processingId === user.uid ? "처리 중..." : "제재 해제"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleBan(user.uid, false)}
                        disabled={processingId === user.uid}
                      >
                        {processingId === user.uid ? "처리 중..." : "제재"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="font-semibold">신고 횟수</span>
                    </div>
                    <div className="text-2xl font-bold text-red-600 pl-6">
                      {user.reportCount}회
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold">위험도</span>
                    </div>
                    <div className="pl-6">
                      {getRiskBadge(user.riskLevel)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      <span className="font-semibold">상태</span>
                    </div>
                    <div className="pl-6">
                      {user.banned ? (
                        <Badge variant="destructive">제재됨</Badge>
                      ) : (
                        <Badge variant="outline">정상</Badge>
                      )}
                    </div>
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

