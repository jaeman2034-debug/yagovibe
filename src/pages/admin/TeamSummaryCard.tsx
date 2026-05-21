/**
 * 🔥 TeamSummaryCard - 팀 상태 요약 카드
 * 
 * 필수 정보:
 * - 팀 이름 / 생성일
 * - 현재 플랜 (Free / Pro)
 * - 멤버 수 (active)
 * - 최근 활동 시간
 */

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTeam } from "@/context/TeamContext";
import { Calendar, Users, Crown, Clock } from "lucide-react";

interface TeamSummary {
  name: string;
  createdAt: any;
  plan: "free" | "pro" | "academy_pro";
  memberCount: number;
  lastActivity?: Date | null;
}

export function TeamSummaryCard({ teamId }: { teamId: string }) {
  const { myTeam } = useTeam();
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // 1. 팀 정보 조회
        const teamDoc = await getDoc(doc(db, "teams", teamId));
        if (!teamDoc.exists()) {
          setLoading(false);
          return;
        }

        const teamData = teamDoc.data();
        
        // 2. 활성 멤버 수 조회
        const membersRef = collection(db, `teams/${teamId}/members`);
        const membersQuery = query(membersRef, where("status", "==", "active"));
        const membersSnap = await getDocs(membersQuery);
        const memberCount = membersSnap.size;

        // 3. 최근 활동 시간 (AuditLogs 최신 항목)
        let lastActivity: Date | null = null;
        try {
          const auditLogsRef = collection(db, `teams/${teamId}/auditLogs`);
          const auditQuery = query(auditLogsRef);
          const auditSnap = await getDocs(auditQuery);
          
          if (!auditSnap.empty) {
            const latestLog = auditSnap.docs
              .map(doc => doc.data().createdAt?.toDate())
              .filter(Boolean)
              .sort((a, b) => b!.getTime() - a!.getTime())[0];
            
            lastActivity = latestLog || null;
          }
        } catch (err) {
          console.warn("⚠️ 최근 활동 시간 조회 실패:", err);
        }

        setSummary({
          name: teamData.name || "",
          createdAt: teamData.createdAt,
          plan: (teamData.plan as "free" | "pro" | "academy_pro") || "free",
          memberCount,
          lastActivity,
        });
      } catch (error) {
        console.error("❌ [TeamSummaryCard] 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [teamId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <p className="text-gray-500 dark:text-gray-400">팀 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "정보 없음";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "정보 없음";
    }
  };

  const formatLastActivity = (date: Date | null) => {
    if (!date) return "활동 기록 없음";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        팀 요약
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 팀 이름 / 생성일 */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">팀 이름</div>
            <div className="font-semibold text-gray-900 dark:text-white">{summary.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              생성: {formatDate(summary.createdAt)}
            </div>
          </div>
        </div>

        {/* 현재 플랜 */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
            <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">현재 플랜</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {summary.plan === "pro" ? "Pro" : summary.plan === "academy_pro" ? "Academy Pro" : "Free"}
            </div>
            <div className={`text-xs mt-1 ${
              summary.plan === "pro" || summary.plan === "academy_pro"
                ? "text-green-600 dark:text-green-400"
                : "text-gray-500 dark:text-gray-500"
            }`}>
              {summary.plan === "free" ? "Free 플랜" : "활성"}
            </div>
          </div>
        </div>

        {/* 멤버 수 */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">활성 멤버</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {summary.memberCount}명
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {summary.memberCount === 0 ? "멤버 없음" : "활성 상태"}
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">최근 활동</div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {formatLastActivity(summary.lastActivity || null)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {summary.lastActivity ? "마지막 활동" : "기록 없음"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
