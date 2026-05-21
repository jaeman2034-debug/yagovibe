// src/pages/team/TeamVotePage.tsx
// 🔥 전자 총회·의결 투표 (회원용)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import { collection, query, where, getDocs, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type Assembly, type Agenda, type Vote, getVoteStats } from "@/utils/assemblyRules";

export default function TeamVotePage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam } = useTeam();
  const { user } = useAuth();
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [myVotes, setMyVotes] = useState<{ [agendaId: string]: Vote }>({});
  const [loading, setLoading] = useState(false);

  // 🔥 진행 중인 총회 조회
  useEffect(() => {
    if (!myTeam?.id) return;

    const fetchAssemblies = async () => {
      try {
        const assembliesQuery = query(
          collection(db, "teams", myTeam.id, "assemblies"),
          where("status", "==", "open")
        );
        const snapshot = await getDocs(assembliesQuery);
        const assembliesList: Assembly[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          assembliesList.push({
            id: doc.id,
            title: data.title || "",
            type: data.type || "정기총회",
            heldAt: data.heldAt?.toDate() || new Date(),
            quorumRule: data.quorumRule || { ratio: 0.5 },
            createdBy: data.createdBy || "",
            status: data.status || "open",
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        setAssemblies(assembliesList);
        if (assembliesList.length > 0) {
          setSelectedAssembly(assembliesList[0]);
        }
      } catch (error) {
        console.error("총회 조회 실패:", error);
      }
    };

    fetchAssemblies();
  }, [myTeam?.id]);

  // 🔥 선택된 총회의 안건 조회
  useEffect(() => {
    if (!myTeam?.id || !selectedAssembly?.id) return;

    const fetchAgendas = async () => {
      try {
        const agendasQuery = query(
          collection(db, "teams", myTeam.id, "assemblies", selectedAssembly.id, "agendas"),
          where("status", "==", "open")
        );
        const snapshot = await getDocs(agendasQuery);
        const agendasList: Agenda[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          agendasList.push({
            id: doc.id,
            assemblyId: selectedAssembly.id!,
            title: data.title || "",
            description: data.description || "",
            voteRule: data.voteRule || "majority",
            status: data.status || "open",
            result: data.result,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        setAgendas(agendasList);
      } catch (error) {
        console.error("안건 조회 실패:", error);
      }
    };

    fetchAgendas();
  }, [myTeam?.id, selectedAssembly?.id]);

  // 🔥 내 투표 조회
  useEffect(() => {
    if (!myTeam?.id || !selectedAssembly?.id || !user?.uid) return;

    const fetchMyVotes = async () => {
      try {
        const votesMap: { [agendaId: string]: Vote } = {};
        
        for (const agenda of agendas) {
          if (!agenda.id) continue;
          
          const votesQuery = query(
            collection(db, "teams", myTeam.id, "assemblies", selectedAssembly.id, "agendas", agenda.id, "votes"),
            where("memberId", "==", user.uid)
          );
          const snapshot = await getDocs(votesQuery);
          
          if (!snapshot.empty) {
            const voteDoc = snapshot.docs[0];
            const data = voteDoc.data();
            votesMap[agenda.id] = {
              id: voteDoc.id,
              agendaId: agenda.id,
              memberId: user.uid,
              memberName: user.email || "",
              choice: data.choice,
              votedAt: data.votedAt?.toDate() || new Date(),
            };
          }
        }
        
        setMyVotes(votesMap);
      } catch (error) {
        console.error("내 투표 조회 실패:", error);
      }
    };

    if (agendas.length > 0) {
      fetchMyVotes();
    }
  }, [myTeam?.id, selectedAssembly?.id, user?.uid, agendas]);

  // 🔥 투표하기
  const handleVote = async (agendaId: string, choice: "agree" | "disagree" | "abstain") => {
    if (!myTeam?.id || !selectedAssembly?.id || !user?.uid) return;

    // 이미 투표했는지 확인
    if (myVotes[agendaId]) {
      if (!window.confirm("이미 투표하셨습니다. 변경하시겠습니까?")) return;
    }

    setLoading(true);
    try {
      // 기존 투표 삭제 (변경 시)
      if (myVotes[agendaId]?.id) {
        // Firestore에서 삭제는 update로 처리 (실제로는 덮어쓰기)
        // 또는 새로 추가하고 기존 것은 무시
      }

      // 새 투표 추가
      const memberRef = doc(db, "teams", myTeam.id, "members", user.uid);
      const memberSnap = await getDoc(memberRef);
      const memberName = memberSnap.data()?.name || user.email || "";

      await addDoc(
        collection(db, "teams", myTeam.id, "assemblies", selectedAssembly.id, "agendas", agendaId, "votes"),
        {
          agendaId,
          memberId: user.uid,
          memberName,
          choice,
          votedAt: serverTimestamp(),
        }
      );

      // 내 투표 상태 업데이트
      setMyVotes({
        ...myVotes,
        [agendaId]: {
          id: "",
          agendaId,
          memberId: user.uid,
          memberName,
          choice,
          votedAt: new Date(),
        },
      });

      alert("투표가 완료되었습니다.");
    } catch (error) {
      console.error("투표 실패:", error);
      alert("투표에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (assemblies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-2">진행 중인 총회가 없습니다.</p>
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className="text-blue-600 hover:text-blue-700"
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-2xl py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 뒤로
          </button>
          <h1 className="text-2xl font-bold text-gray-900">전자 총회 투표</h1>
        </div>

        {/* 총회 선택 */}
        {assemblies.length > 1 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">총회 선택</label>
            <select
              value={selectedAssembly?.id || ""}
              onChange={(e) => {
                const assembly = assemblies.find((a) => a.id === e.target.value);
                setSelectedAssembly(assembly || null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              {assemblies.map((assembly) => (
                <option key={assembly.id} value={assembly.id}>
                  {assembly.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 안건 목록 */}
        {selectedAssembly && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedAssembly.title}</h2>
              {agendas.length === 0 ? (
                <p className="text-gray-500 text-center py-8">등록된 안건이 없습니다.</p>
              ) : (
                agendas.map((agenda) => (
                  <AgendaVoteCard
                    key={agenda.id}
                    teamId={myTeam!.id}
                    assemblyId={selectedAssembly.id!}
                    agenda={agenda}
                    myVote={myVotes[agenda.id || ""]}
                    onVote={handleVote}
                    loading={loading}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 🔥 안건 투표 카드
function AgendaVoteCard({
  teamId,
  assemblyId,
  agenda,
  myVote,
  onVote,
  loading,
}: {
  teamId: string;
  assemblyId: string;
  agenda: Agenda;
  myVote?: Vote;
  onVote: (agendaId: string, choice: "agree" | "disagree" | "abstain") => void;
  loading: boolean;
}) {
  const [votes, setVotes] = useState<any[]>([]);
  const [votesLoading, setVotesLoading] = useState(true);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const votesQuery = query(
          collection(db, "teams", teamId, "assemblies", assemblyId, "agendas", agenda.id!, "votes")
        );
        const snapshot = await getDocs(votesQuery);
        const votesList: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          votesList.push({
            id: doc.id,
            memberId: data.memberId,
            choice: data.choice,
            votedAt: data.votedAt?.toDate() || new Date(),
          });
        });
        setVotes(votesList);
      } catch (error) {
        console.error("투표 조회 실패:", error);
      } finally {
        setVotesLoading(false);
      }
    };

    if (agenda.id) {
      fetchVotes();
    }
  }, [teamId, assemblyId, agenda.id]);

  const stats = getVoteStats(votes);

  return (
    <div className="border border-gray-200 rounded-lg p-6 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{agenda.title}</h3>
      {agenda.description && (
        <p className="text-sm text-gray-600 mb-4">{agenda.description}</p>
      )}
      
      {/* 투표 버튼 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <button
          onClick={() => agenda.id && onVote(agenda.id, "agree")}
          disabled={loading || votesLoading}
          className={`py-4 rounded-lg font-bold text-lg border-4 ${
            myVote?.choice === "agree"
              ? "bg-green-600 text-white border-green-800"
              : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
          } disabled:opacity-50`}
        >
          ✅ 찬성
        </button>
        <button
          onClick={() => agenda.id && onVote(agenda.id, "disagree")}
          disabled={loading || votesLoading}
          className={`py-4 rounded-lg font-bold text-lg border-4 ${
            myVote?.choice === "disagree"
              ? "bg-red-600 text-white border-red-800"
              : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
          } disabled:opacity-50`}
        >
          ❌ 반대
        </button>
        <button
          onClick={() => agenda.id && onVote(agenda.id, "abstain")}
          disabled={loading || votesLoading}
          className={`py-4 rounded-lg font-bold text-lg border-4 ${
            myVote?.choice === "abstain"
              ? "bg-yellow-600 text-white border-yellow-800"
              : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
          } disabled:opacity-50`}
        >
          ⚪ 기권
        </button>
      </div>

      {/* 투표 현황 */}
      {!votesLoading && (
        <div className="text-sm text-gray-600">
          <span className="text-green-600 font-semibold">찬성 {stats.agree}표</span> ·{" "}
          <span className="text-red-600 font-semibold">반대 {stats.disagree}표</span> ·{" "}
          <span className="text-gray-500">기권 {stats.abstain}표</span> ·{" "}
          <span>총 {stats.total}표</span>
        </div>
      )}

      {/* 내 투표 표시 */}
      {myVote && (
        <div className="mt-2 text-sm text-blue-600 font-semibold">
          내 투표: {myVote.choice === "agree" ? "✅ 찬성" : myVote.choice === "disagree" ? "❌ 반대" : "⚪ 기권"}
        </div>
      )}
    </div>
  );
}

