// src/pages/team/TeamAssemblyPage.tsx
// 🔥 전자 총회·의결 관리 (운영자용)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { useAuth } from "@/context/AuthProvider";
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type Assembly, type Agenda, hasQuorum, resolveVote, getVoteStats } from "@/utils/assemblyRules";

export default function TeamAssemblyPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam } = useTeam();
  const { user } = useAuth();
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [selectedAssembly, setSelectedAssembly] = useState<Assembly | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState({ total: 0, presentCount: 0, absentCount: 0, excusedCount: 0 });

  // 🔥 총회 목록 조회
  useEffect(() => {
    if (!myTeam?.id) return;

    const fetchAssemblies = async () => {
      try {
        const assembliesQuery = query(
          collection(db, "teams", myTeam.id, "assemblies"),
          where("status", "!=", "draft")
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
            status: data.status || "draft",
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        setAssemblies(assembliesList.sort((a, b) => {
          const dateA = a.heldAt instanceof Date ? a.heldAt : new Date(a.heldAt);
          const dateB = b.heldAt instanceof Date ? b.heldAt : new Date(b.heldAt);
          return dateB.getTime() - dateA.getTime();
        }));
      } catch (error) {
        console.error("총회 목록 조회 실패:", error);
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
          collection(db, "teams", myTeam.id, "assemblies", selectedAssembly.id, "agendas")
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
        console.error("안건 목록 조회 실패:", error);
      }
    };

    fetchAgendas();
  }, [myTeam?.id, selectedAssembly?.id]);

  // 🔥 출석 요약 조회 (정족수 판정용)
  useEffect(() => {
    if (!myTeam?.id || !selectedAssembly?.id) return;

    const fetchAttendance = async () => {
      try {
        // 전체 회원 수
        const membersQuery = query(collection(db, "teams", myTeam.id, "members"));
        const membersSnapshot = await getDocs(membersQuery);
        const total = membersSnapshot.size;

        // 총회일 출석 기록 조회
        const heldDate = selectedAssembly.heldAt instanceof Date 
          ? selectedAssembly.heldAt 
          : new Date(selectedAssembly.heldAt);
        const yyyymmdd = `${heldDate.getFullYear()}-${String(heldDate.getMonth() + 1).padStart(2, "0")}-${String(heldDate.getDate()).padStart(2, "0")}`;
        
        const attendanceRef = collection(db, "teams", myTeam.id, "attendance", yyyymmdd, "items");
        const attendanceSnapshot = await getDocs(attendanceRef);
        
        let presentCount = 0;
        let absentCount = 0;
        let excusedCount = 0;
        
        attendanceSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.status === "present") presentCount++;
          else if (data.status === "absent") absentCount++;
          else if (data.status === "excused") excusedCount++;
        });

        setAttendanceSummary({ total, presentCount, absentCount, excusedCount });
      } catch (error) {
        console.error("출석 요약 조회 실패:", error);
      }
    };

    fetchAttendance();
  }, [myTeam?.id, selectedAssembly?.id, selectedAssembly?.heldAt]);

  // 🔥 총회 생성
  const handleCreateAssembly = async (assembly: Omit<Assembly, "id" | "createdAt">) => {
    if (!myTeam?.id || !user?.uid) return;

    setLoading(true);
    try {
      const assemblyRef = await addDoc(collection(db, "teams", myTeam.id, "assemblies"), {
        ...assembly,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      // 🔥 감사 로그
      await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
        actorId: user.uid,
        actorName: user.email || "시스템",
        action: "ASSEMBLY_CREATED",
        targetMemberId: null,
        before: {},
        after: { assemblyId: assemblyRef.id, title: assembly.title },
        reason: `${assembly.type} 생성`,
        createdAt: serverTimestamp(),
      });

      setShowCreateModal(false);
      // 목록 새로고침
      window.location.reload();
    } catch (error) {
      console.error("총회 생성 실패:", error);
      alert("총회 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 안건 추가
  const handleCreateAgenda = async (agenda: Omit<Agenda, "id" | "createdAt">) => {
    if (!myTeam?.id || !selectedAssembly?.id || !user?.uid) return;

    setLoading(true);
    try {
      await addDoc(
        collection(db, "teams", myTeam.id, "assemblies", selectedAssembly.id, "agendas"),
        {
          ...agenda,
          createdAt: serverTimestamp(),
        }
      );

      // 🔥 감사 로그
      await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
        actorId: user.uid,
        actorName: user.email || "시스템",
        action: "AGENDA_CREATED",
        targetMemberId: null,
        before: {},
        after: { assemblyId: selectedAssembly.id, agendaTitle: agenda.title },
        reason: "안건 추가",
        createdAt: serverTimestamp(),
      });

      setShowAgendaModal(false);
      // 안건 목록 새로고침
      const agendasQuery = query(
        collection(db, "teams", myTeam.id, "assemblies", selectedAssembly.id, "agendas")
      );
      const snapshot = await getDocs(agendasQuery);
      const agendasList: Agenda[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        agendasList.push({
          id: doc.id,
          assemblyId: selectedAssembly.id,
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
      console.error("안건 추가 실패:", error);
      alert("안건 추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 총회 종료 (결과 확정)
  const handleCloseAssembly = async () => {
    if (!myTeam?.id || !selectedAssembly?.id || !user?.uid) return;

    if (!window.confirm("총회를 종료하고 모든 안건의 결과를 확정하시겠습니까?")) return;

    setLoading(true);
    try {
      // 모든 안건의 투표 결과 확정
      for (const agenda of agendas) {
        if (agenda.status === "closed") continue;

        // 투표 조회
        const votesQuery = query(
          collection(db, "teams", myTeam.id, "assemblies", selectedAssembly.id, "agendas", agenda.id!, "votes")
        );
        const votesSnapshot = await getDocs(votesQuery);
        const votes: any[] = [];
        votesSnapshot.forEach((doc) => {
          const data = doc.data();
          votes.push({
            id: doc.id,
            agendaId: agenda.id,
            memberId: data.memberId,
            choice: data.choice,
            votedAt: data.votedAt?.toDate() || new Date(),
          });
        });

        // 결과 확정
        const result = resolveVote(votes, agenda.voteRule);

        // 안건 업데이트
        await updateDoc(
          doc(db, "teams", myTeam.id, "assemblies", selectedAssembly.id, "agendas", agenda.id!),
          {
            status: "closed",
            result,
            closedAt: serverTimestamp(),
          }
        );
      }

      // 총회 종료
      await updateDoc(
        doc(db, "teams", myTeam.id, "assemblies", selectedAssembly.id),
        {
          status: "closed",
          closedAt: serverTimestamp(),
        }
      );

      // 🔥 감사 로그
      await addDoc(collection(db, "teams", myTeam.id, "auditLogs"), {
        actorId: user.uid,
        actorName: user.email || "시스템",
        action: "ASSEMBLY_CLOSED",
        targetMemberId: null,
        before: { status: selectedAssembly.status },
        after: { status: "closed" },
        reason: "총회 종료 및 결과 확정",
        createdAt: serverTimestamp(),
      });

      alert("총회가 종료되었습니다.");
      navigate(`/sports/${type}/team`);
    } catch (error) {
      console.error("총회 종료 실패:", error);
      alert("총회 종료에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const quorumMet = selectedAssembly 
    ? hasQuorum(attendanceSummary, selectedAssembly.quorumRule)
    : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← 뒤로
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">전자 총회·의결</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              총회 생성
            </button>
          </div>
        </div>

        {/* 총회 목록 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">총회 목록</h2>
          {assemblies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">생성된 총회가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {assemblies.map((assembly) => {
                const heldDate = assembly.heldAt instanceof Date 
                  ? assembly.heldAt 
                  : new Date(assembly.heldAt);
                return (
                  <button
                    key={assembly.id}
                    onClick={() => setSelectedAssembly(assembly)}
                    className={`w-full text-left p-4 border-2 rounded-lg ${
                      selectedAssembly?.id === assembly.id
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{assembly.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {assembly.type} · {heldDate.toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          assembly.status === "open"
                            ? "bg-green-100 text-green-700"
                            : assembly.status === "closed"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {assembly.status === "open" ? "진행 중" : assembly.status === "closed" ? "종료" : "초안"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 선택된 총회 상세 */}
        {selectedAssembly && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-700">{selectedAssembly.title}</h2>
              {selectedAssembly.status === "open" && (
                <button
                  onClick={handleCloseAssembly}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  총회 종료
                </button>
              )}
            </div>

            {/* 정족수 정보 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">정족수 현황</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">전체 회원:</span>{" "}
                  <span className="font-bold">{attendanceSummary.total}명</span>
                </div>
                <div>
                  <span className="text-gray-600">출석:</span>{" "}
                  <span className="font-bold text-green-600">{attendanceSummary.presentCount}명</span>
                </div>
                <div>
                  <span className="text-gray-600">필요 정족수:</span>{" "}
                  <span className="font-bold">
                    {Math.ceil(attendanceSummary.total * selectedAssembly.quorumRule.ratio)}명
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">정족수 충족:</span>{" "}
                  <span className={`font-bold ${quorumMet ? "text-green-600" : "text-red-600"}`}>
                    {quorumMet ? "✅ 충족" : "❌ 미충족"}
                  </span>
                </div>
              </div>
            </div>

            {/* 안건 목록 */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">안건 목록</h3>
                {selectedAssembly.status === "open" && quorumMet && (
                  <button
                    onClick={() => setShowAgendaModal(true)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    안건 추가
                  </button>
                )}
              </div>
              {agendas.length === 0 ? (
                <p className="text-gray-500 text-center py-4">등록된 안건이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {agendas.map((agenda) => (
                    <AgendaCard
                      key={agenda.id}
                      teamId={myTeam!.id}
                      assemblyId={selectedAssembly.id!}
                      agenda={agenda}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 총회 생성 모달 */}
        {showCreateModal && (
          <CreateAssemblyModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateAssembly}
          />
        )}

        {/* 안건 추가 모달 */}
        {showAgendaModal && selectedAssembly && (
          <CreateAgendaModal
            onClose={() => setShowAgendaModal(false)}
            onSubmit={handleCreateAgenda}
          />
        )}
      </div>
    </div>
  );
}

// 🔥 안건 카드 컴포넌트
function AgendaCard({
  teamId,
  assemblyId,
  agenda,
}: {
  teamId: string;
  assemblyId: string;
  agenda: Agenda;
}) {
  const [votes, setVotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
            memberName: data.memberName,
            choice: data.choice,
            votedAt: data.votedAt?.toDate() || new Date(),
          });
        });
        setVotes(votesList);
      } catch (error) {
        console.error("투표 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    if (agenda.id) {
      fetchVotes();
    }
  }, [teamId, assemblyId, agenda.id]);

  const stats = getVoteStats(votes);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{agenda.title}</h4>
          {agenda.description && (
            <p className="text-sm text-gray-600 mt-1">{agenda.description}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            agenda.status === "open"
              ? "bg-blue-100 text-blue-700"
              : agenda.result === "passed"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {agenda.status === "open"
            ? "투표 중"
            : agenda.result === "passed"
            ? "가결"
            : agenda.result === "rejected"
            ? "부결"
            : "대기"}
        </span>
      </div>
      {!loading && (
        <div className="mt-3 text-sm text-gray-600">
          <span className="text-green-600">찬성 {stats.agree}표</span> ·{" "}
          <span className="text-red-600">반대 {stats.disagree}표</span> ·{" "}
          <span className="text-gray-500">기권 {stats.abstain}표</span> ·{" "}
          <span>총 {stats.total}표</span>
        </div>
      )}
    </div>
  );
}

// 🔥 총회 생성 모달
function CreateAssemblyModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (assembly: Omit<Assembly, "id" | "createdAt">) => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"정기총회" | "임시총회">("정기총회");
  const [heldAt, setHeldAt] = useState(new Date().toISOString().split("T")[0]);
  const [quorumRatio, setQuorumRatio] = useState(0.5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      type,
      heldAt: new Date(heldAt),
      quorumRule: { ratio: quorumRatio },
      createdBy: "",
      status: "open",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-2xl font-bold mb-4">총회 생성</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">총회명</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">총회 유형</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "정기총회" | "임시총회")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="정기총회">정기총회</option>
              <option value="임시총회">임시총회</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">개최일</label>
            <input
              type="date"
              value={heldAt}
              onChange={(e) => setHeldAt(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              정족수 비율 (기본: 0.5 = 과반)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={quorumRatio}
              onChange={(e) => setQuorumRatio(parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 🔥 안건 추가 모달
function CreateAgendaModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (agenda: Omit<Agenda, "id" | "createdAt">) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [voteRule, setVoteRule] = useState<"majority" | "two_thirds">("majority");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      assemblyId: "",
      title,
      description,
      voteRule,
      status: "open",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-2xl font-bold mb-4">안건 추가</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">안건명</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">안건 설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">의결 기준</label>
            <select
              value={voteRule}
              onChange={(e) => setVoteRule(e.target.value as "majority" | "two_thirds")}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="majority">과반 (찬성 {'>'} 반대)</option>
              <option value="two_thirds">2/3 이상 (찬성 {'>='} 전체 투표의 2/3)</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

