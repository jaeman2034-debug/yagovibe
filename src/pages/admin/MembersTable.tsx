/**
 * 🔥 MembersTable - 멤버 관리 테이블
 * 
 * 표시 정보:
 * - 이름 / 이메일
 * - role (admin / member)
 * - status (active / inactive)
 * - joinedAt
 * 
 * 액션 (admin만):
 * - role 변경
 * - 비활성화 (soft remove)
 * - ❌ 삭제 금지 (AuditLogs 보존)
 */

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { Shield, User, Clock } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

interface Member {
  uid: string;
  email?: string;
  displayName?: string;
  role: "admin" | "member" | "manager";
  status: "active" | "inactive";
  joinedAt: any;
}

export function MembersTable({ teamId }: { teamId: string }) {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // 1. members 컬렉션 조회
        const membersRef = collection(db, `teams/${teamId}/members`);
        const membersSnap = await getDocs(membersRef);

        // 2. 각 멤버의 사용자 정보 조회
        const membersList: Member[] = [];
        
        for (const memberDoc of membersSnap.docs) {
          const memberData = memberDoc.data();
          const uid = memberDoc.id;

          // 사용자 정보 조회 (옵셔널)
          let email: string | undefined;
          let displayName: string | undefined;
          
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              email = userData.email;
              displayName = userData.displayName || userData.name;
            }
          } catch (err) {
            console.warn(`⚠️ 사용자 ${uid} 정보 조회 실패:`, err);
          }

          membersList.push({
            uid,
            email,
            displayName,
            role: (memberData.role as "admin" | "member" | "manager") || "member",
            status: (memberData.status as "active" | "inactive") || "active",
            joinedAt: memberData.joinedAt,
          });
        }

        // 정렬: admin 먼저, 그 다음 joinedAt
        membersList.sort((a, b) => {
          if (a.role === "admin" && b.role !== "admin") return -1;
          if (a.role !== "admin" && b.role === "admin") return 1;
          
          const aDate = a.joinedAt?.toDate?.() || new Date(0);
          const bDate = b.joinedAt?.toDate?.() || new Date(0);
          return bDate.getTime() - aDate.getTime();
        });

        setMembers(membersList);
      } catch (error) {
        console.error("❌ [MembersTable] 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [teamId]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          멤버 관리
        </h2>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          총 {members.length}명
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                멤버
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                역할
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                상태
              </th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                가입일
              </th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  멤버가 없습니다
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.uid}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {member.displayName || member.email || member.uid.slice(0, 8)}
                      </div>
                      {member.email && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {member.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {member.role === "admin" ? (
                        <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <User className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {member.role === "owner" ? "팀장" : member.role === "admin" ? "관리자" : "멤버"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        member.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {member.status === "active" ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4" />
                      {formatDate(member.joinedAt)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
