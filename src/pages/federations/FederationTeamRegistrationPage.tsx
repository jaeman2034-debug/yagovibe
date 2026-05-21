import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import Papa from "papaparse";

type TeamDoc = {
  id: string;
  name: string;
  divisionId?: string | null;
  submittedRoster?: boolean;
  createdBy?: string;
};

type Player = {
  id: string;
  name: string;
  birthDate: string;
  number: number | null;
  position: string;
  phone?: string;
  kfaRegistered?: boolean;
  status?: string;
};
type PlayerDraft = Omit<Player, "id">;
const REQUIRED_HEADERS = ["이름", "생년월일", "등번호", "포지션"];

type TabId = "basic" | "staff" | "players" | "submission";
type RosterStatus = "draft" | "submitted" | "verified" | "returned";
type StatusLog = {
  from: RosterStatus | string;
  to: RosterStatus | string;
  changedAt: string;
  changedBy?: string | null;
};
type ReturnLog = {
  reason: string;
  createdAt: string;
  createdBy?: string | null;
};
const STATUS_LABEL: Record<string, string> = {
  draft: "작성중",
  submitted: "제출됨",
  verified: "승인됨",
  returned: "반려됨",
};

export default function FederationTeamRegistrationPage() {
  const { federationSlug, teamId } = useParams<{ federationSlug: string; teamId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("basic");
  const [team, setTeam] = useState<TeamDoc | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<RosterStatus>("draft");
  const [returnReason, setReturnReason] = useState("");
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [returnLogs, setReturnLogs] = useState<ReturnLog[]>([]);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "return" | "status">("all");
  const [canEdit, setCanEdit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [profile, setProfile] = useState({
    teamName: "",
    region: "",
    uniformPrimary: "",
    uniformSecondary: "",
    foundedYear: "",
  });
  const [staff, setStaff] = useState({
    presidentName: "",
    presidentPhone: "",
    coachName: "",
    coachPhone: "",
    managerName: "",
    managerPhone: "",
  });
  const [newPlayer, setNewPlayer] = useState({
    name: "",
    birthDate: "",
    number: "",
    position: "",
    phone: "",
    kfaRegistered: false,
  });
  const [previewPlayers, setPreviewPlayers] = useState<PlayerDraft[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!federationSlug || !teamId) return;
    void (async () => {
      const t = await getDoc(doc(db, "federations", federationSlug, "teams", teamId));
      if (!t.exists()) {
        setTeam(null);
        setLoading(false);
        return;
      }
      const td = t.data() as any;
      setTeam({
        id: t.id,
        name: String(td?.name || "팀"),
        divisionId: td?.divisionId || null,
        submittedRoster: !!td?.submittedRoster,
        createdBy: typeof td?.createdBy === "string" ? td.createdBy : undefined,
      });

      const fedSnap = await getDoc(doc(db, "federations", federationSlug));
      const fed = fedSnap.data() as any;
      const uid = user?.uid || "";
      const isManager =
        !!uid &&
        (fed?.ownerUid === uid ||
          fed?.ownerId === uid ||
          (Array.isArray(fed?.adminIds) && fed.adminIds.includes(uid)) ||
          (Array.isArray(fed?.roles?.admins) && fed.roles.admins.includes(uid)) ||
          (Array.isArray(fed?.roles?.editors) && fed.roles.editors.includes(uid)));
      const isAdminOnly =
        !!uid &&
        (fed?.ownerUid === uid ||
          fed?.ownerId === uid ||
          (Array.isArray(fed?.adminIds) && fed.adminIds.includes(uid)) ||
          (Array.isArray(fed?.roles?.admins) && fed.roles.admins.includes(uid)));
      const isCreator = !!uid && typeof td?.createdBy === "string" && td.createdBy === uid;
      setCanEdit(isManager || isCreator);
      setIsAdmin(isAdminOnly);

      const p = await getDoc(doc(db, "federations", federationSlug, "teams", teamId, "profile", "main"));
      if (p.exists()) {
        const pd = p.data() as any;
        setProfile({
          teamName: String(pd?.teamName || td?.name || ""),
          region: String(pd?.region || ""),
          uniformPrimary: String(pd?.uniformPrimary || ""),
          uniformSecondary: String(pd?.uniformSecondary || ""),
          foundedYear: pd?.foundedYear ? String(pd.foundedYear) : "",
        });
      } else {
        setProfile((prev) => ({ ...prev, teamName: String(td?.name || "") }));
      }

      const [pres, coach, mgr] = await Promise.all([
        getDoc(doc(db, "federations", federationSlug, "teams", teamId, "staff", "president")),
        getDoc(doc(db, "federations", federationSlug, "teams", teamId, "staff", "coach")),
        getDoc(doc(db, "federations", federationSlug, "teams", teamId, "staff", "manager")),
      ]);
      setStaff({
        presidentName: String((pres.data() as any)?.name || ""),
        presidentPhone: String((pres.data() as any)?.phone || ""),
        coachName: String((coach.data() as any)?.name || ""),
        coachPhone: String((coach.data() as any)?.phone || ""),
        managerName: String((mgr.data() as any)?.name || ""),
        managerPhone: String((mgr.data() as any)?.phone || ""),
      });

      const sub = await getDoc(doc(db, "federations", federationSlug, "teams", teamId, "submission", "roster"));
      if (sub.exists()) {
        const sd = sub.data() as any;
        if (sd?.status === "submitted" || sd?.status === "verified" || sd?.status === "returned") {
          setSubmissionStatus(sd.status);
        }
        if (typeof sd?.returnReason === "string") {
          setReturnReason(sd.returnReason);
        }
        if (Array.isArray(sd?.statusLogs)) {
          setStatusLogs(
            sd.statusLogs
              .map((x: any) => ({
                from: String(x?.from || ""),
                to: String(x?.to || ""),
                changedAt: String(x?.changedAt || ""),
                changedBy: x?.changedBy || null,
              }))
              .filter((x: StatusLog) => !!x.changedAt)
          );
        } else {
          setStatusLogs([]);
        }
        if (Array.isArray(sd?.returnLogs)) {
          setReturnLogs(
            sd.returnLogs
              .map((x: any) => ({
                reason: String(x?.reason || ""),
                createdAt: String(x?.createdAt || ""),
                createdBy: x?.createdBy || null,
              }))
              .filter((x: ReturnLog) => !!x.createdAt)
          );
        } else {
          setReturnLogs([]);
        }
      }
      setLoading(false);
    })().catch((e) => {
      console.error(e);
      toast.error("팀 정보를 불러오지 못했습니다.");
      setLoading(false);
    });
  }, [federationSlug, teamId, user?.uid]);

  useEffect(() => {
    if (!federationSlug || !teamId) return;
    const unsub = onSnapshot(collection(db, "federations", federationSlug, "teams", teamId, "players"), (snap) => {
      setPlayers(
        snap.docs.map((d) => {
          const x = d.data() as any;
          const normalizedBirth = String(x?.birthDate || x?.birth || "");
          const normalizedNumber =
            typeof x?.number === "number"
              ? x.number
              : typeof x?.jerseyNumber === "number"
              ? x.jerseyNumber
              : null;
          return {
            id: d.id,
            name: String(x?.name || ""),
            birthDate: normalizedBirth,
            number: normalizedNumber,
            position: String(x?.position || ""),
            phone: String(x?.phone || ""),
            kfaRegistered: !!x?.kfaRegistered,
            status: String(x?.status || "draft"),
          };
        })
      );
    });
    return () => unsub();
  }, [federationSlug, teamId]);

  const hasRequiredStaff = useMemo(
    () => !!(staff.presidentName.trim() && staff.coachName.trim() && staff.managerName.trim()),
    [staff]
  );
  const duplicateNumbers = useMemo(() => {
    const nums = players.map((p) => p.number).filter((n): n is number => typeof n === "number");
    return nums.filter((n, idx) => nums.indexOf(n) !== idx);
  }, [players]);
  const canSubmitRoster = hasRequiredStaff && players.length >= 11 && duplicateNumbers.length === 0;
  const isEditLocked = (submissionStatus === "submitted" && !isAdmin) || submissionStatus === "verified";
  const timeline = useMemo(() => {
    const statusItems = statusLogs.map((l) => ({
      type: "status" as const,
      at: l.changedAt,
      text: `${STATUS_LABEL[l.from] || l.from} → ${STATUS_LABEL[l.to] || l.to}`,
      by: l.changedBy || "",
    }));
    const returnItems = returnLogs.map((l) => ({
      type: "return" as const,
      at: l.createdAt,
      text: `반려: ${l.reason}`,
      by: l.createdBy || "",
    }));
    const merged = [...statusItems, ...returnItems].sort((a, b) => a.at.localeCompare(b.at));
    if (timelineFilter === "return") return merged.filter((x) => x.type === "return");
    if (timelineFilter === "status") return merged.filter((x) => x.type === "status");
    return merged;
  }, [statusLogs, returnLogs, timelineFilter]);
  const formatDate = (iso: string) => {
  const latestReturn = useMemo(() => {
    if (returnLogs.length === 0) return null;
    const sorted = [...returnLogs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return sorted[sorted.length - 1];
  }, [returnLogs]);

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ko-KR");
  };

  const validatePlayerDrafts = (rows: PlayerDraft[]) => {
    const errors: string[] = [];
    if (rows.length < 11) errors.push("선수는 최소 11명 이상 필요합니다.");
    const nums = rows.map((p) => p.number).filter((n): n is number => typeof n === "number");
    const dup = nums.filter((n, i) => nums.indexOf(n) !== i);
    if (dup.length > 0) errors.push(`중복 등번호: ${Array.from(new Set(dup)).join(", ")}`);
    rows.forEach((p, idx) => {
      if (!p.name.trim()) errors.push(`${idx + 1}행: 이름이 비어 있습니다.`);
      if (!p.birthDate.trim()) errors.push(`${idx + 1}행: 생년월일이 비어 있습니다.`);
      if (!p.position.trim()) errors.push(`${idx + 1}행: 포지션이 비어 있습니다.`);
    });
    return errors;
  };

  const parseRosterFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = (result.meta.fields || []).map((h) => String(h || "").trim());
        const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
        if (missing.length > 0) {
          setPreviewPlayers([]);
          setPreviewErrors([`필수 컬럼 누락: ${missing.join(", ")}`]);
          toast.error(`필수 컬럼 누락: ${missing.join(", ")}`);
          return;
        }
        const rows = (result.data as any[]).map((r) => ({
          name: String(r["이름"] || r["name"] || "").trim(),
          birthDate: String(r["생년월일"] || r["birthDate"] || "").trim(),
          number:
            String(r["등번호"] || r["number"] || "").trim() === ""
              ? null
              : Number(String(r["등번호"] || r["number"]).trim()),
          position: String(r["포지션"] || r["position"] || "").trim(),
          phone: String(r["연락처"] || r["phone"] || "").trim(),
          kfaRegistered:
            String(r["KFA등록여부"] || r["kfaRegistered"] || "")
              .trim()
              .toLowerCase() === "true" ||
            String(r["KFA등록여부"] || r["kfaRegistered"] || "").trim() === "Y" ||
            String(r["KFA등록여부"] || r["kfaRegistered"] || "").trim() === "예" ||
            String(r["KFA등록여부"] || r["kfaRegistered"] || "").trim() === "등록",
          status: "draft" as const,
        }));
        const normalized = rows.map((p) => ({
          ...p,
          number: p.number != null && Number.isFinite(p.number) ? p.number : null,
        }));
        const errs = validatePlayerDrafts(normalized);
        setPreviewPlayers(normalized);
        setPreviewErrors(errs);
        if (errs.length > 0) {
          toast.error("업로드 미리보기에서 오류가 발견되었습니다.");
        } else {
          toast.success(`미리보기 준비 완료 (${normalized.length}명)`);
        }
      },
      error: () => {
        toast.error("파일 파싱에 실패했습니다.");
      },
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">로딩 중...</div>;
  if (!team || !federationSlug || !teamId) return <div className="min-h-screen flex items-center justify-center">팀을 찾을 수 없습니다.</div>;
  if (!canEdit) return <div className="min-h-screen flex items-center justify-center">팀 등록 권한이 없습니다.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-16 md:pt-0">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="rounded-xl border bg-white p-4">
          <h1 className="text-xl font-bold text-gray-900">{team.name} 팀 등록</h1>
          <p className="text-sm text-gray-600 mt-1">팀 기본정보, 임원 정보, 선수 명단, 최종 제출</p>
          {submissionStatus === "returned" && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              반려됨: {returnReason || "사유가 등록되지 않았습니다."}
            </div>
          )}
          <div className="mt-3 text-xs text-gray-600 flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded border bg-gray-50">신청완료</span>
            <span className="px-2 py-1 rounded border bg-green-50 text-green-700 border-green-200">승인완료</span>
            <span className={`px-2 py-1 rounded border ${submissionStatus === "draft" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50"}`}>상세등록</span>
            <span className={`px-2 py-1 rounded border ${submissionStatus !== "draft" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50"}`}>선수제출</span>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 flex flex-wrap gap-2">
          {[
            { id: "basic", label: "팀 기본정보" },
            { id: "staff", label: "임원 정보" },
            { id: "players", label: "선수 명단" },
            { id: "submission", label: "제출 현황" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as TabId)}
              className={`px-3 py-1.5 rounded-md text-sm ${tab === t.id ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "basic" && (
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">팀 기본정보</h2>
            {isEditLocked && (
              <p className="text-xs text-amber-700">
                제출 완료 상태에서는 관리자 승인 전까지 수정할 수 없습니다.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" placeholder="팀명" value={profile.teamName} onChange={(e) => setProfile((p) => ({ ...p, teamName: e.target.value }))} />
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" placeholder="지역" value={profile.region} onChange={(e) => setProfile((p) => ({ ...p, region: e.target.value }))} />
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" placeholder="유니폼 주색" value={profile.uniformPrimary} onChange={(e) => setProfile((p) => ({ ...p, uniformPrimary: e.target.value }))} />
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" placeholder="유니폼 보조색" value={profile.uniformSecondary} onChange={(e) => setProfile((p) => ({ ...p, uniformSecondary: e.target.value }))} />
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500" placeholder="창단년도" value={profile.foundedYear} onChange={(e) => setProfile((p) => ({ ...p, foundedYear: e.target.value }))} />
            </div>
            <Button
              disabled={isEditLocked}
              onClick={() =>
                void setDoc(doc(db, "federations", federationSlug, "teams", teamId, "profile", "main"), {
                  teamName: profile.teamName.trim(),
                  region: profile.region.trim(),
                  uniformPrimary: profile.uniformPrimary.trim(),
                  uniformSecondary: profile.uniformSecondary.trim(),
                  foundedYear: profile.foundedYear ? Number(profile.foundedYear) : null,
                  updatedAt: serverTimestamp(),
                }).then(() => toast.success("팀 기본정보를 저장했습니다."))
              }
            >
              저장
            </Button>
          </div>
        )}

        {tab === "staff" && (
          <div className="rounded-xl border bg-white p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">임원 정보 (회장/감독/총무 필수)</h2>
            {isEditLocked && (
              <p className="text-xs text-amber-700">
                제출 완료 상태에서는 관리자 승인 전까지 수정할 수 없습니다.
              </p>
            )}
            {[
              { role: "president", label: "회장", name: "presidentName", phone: "presidentPhone" },
              { role: "coach", label: "감독", name: "coachName", phone: "coachPhone" },
              { role: "manager", label: "총무", name: "managerName", phone: "managerPhone" },
            ].map((row) => (
              <div key={row.role} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="text-sm text-gray-700 md:pt-2">{row.label}</div>
                <input
                  disabled={isEditLocked}
                  className="border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder={`${row.label} 이름`}
                  value={(staff as any)[row.name]}
                  onChange={(e) => setStaff((s: any) => ({ ...s, [row.name]: e.target.value }))}
                />
                <input
                  disabled={isEditLocked}
                  className="border rounded-md px-3 py-2 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder={`${row.label} 연락처`}
                  value={(staff as any)[row.phone]}
                  onChange={(e) => setStaff((s: any) => ({ ...s, [row.phone]: e.target.value }))}
                />
              </div>
            ))}
            <Button
              disabled={isEditLocked}
              onClick={() =>
                void Promise.all([
                  setDoc(doc(db, "federations", federationSlug, "teams", teamId, "staff", "president"), {
                    role: "president",
                    name: staff.presidentName.trim(),
                    phone: staff.presidentPhone.trim(),
                    updatedAt: serverTimestamp(),
                  }),
                  setDoc(doc(db, "federations", federationSlug, "teams", teamId, "staff", "coach"), {
                    role: "coach",
                    name: staff.coachName.trim(),
                    phone: staff.coachPhone.trim(),
                    updatedAt: serverTimestamp(),
                  }),
                  setDoc(doc(db, "federations", federationSlug, "teams", teamId, "staff", "manager"), {
                    role: "manager",
                    name: staff.managerName.trim(),
                    phone: staff.managerPhone.trim(),
                    updatedAt: serverTimestamp(),
                  }),
                ]).then(() => toast.success("임원 정보를 저장했습니다."))
              }
            >
              저장
            </Button>
          </div>
        )}

        {tab === "players" && (
          <div className="rounded-xl border bg-white p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">선수 명단</h2>
            {isEditLocked && (
              <p className="text-xs text-amber-700">
                제출 완료 상태에서는 관리자 승인 전까지 선수 명단을 수정할 수 없습니다.
              </p>
            )}
            <div className="flex items-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  className="hidden"
                  disabled={isEditLocked}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) parseRosterFile(f);
                  }}
                />
                <span className="inline-flex items-center rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  엑셀 업로드
                </span>
              </label>
            </div>
            {previewPlayers.length > 0 && (
              <div className="rounded-lg border p-3 space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">업로드 미리보기 ({previewPlayers.length}명)</h3>
                {previewErrors.length > 0 ? (
                  <div className="text-sm text-red-600 space-y-1">
                    {previewErrors.map((e, i) => (
                      <p key={i}>❌ {e}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-green-700">검증 통과 — 등록 가능합니다.</p>
                )}
                <p className="text-xs text-gray-500">
                  기본 컬럼: 이름, 생년월일, 등번호, 포지션, 연락처, KFA등록여부
                </p>
                <div className="max-h-52 overflow-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-2 py-1">이름</th>
                        <th className="text-left px-2 py-1">생년월일</th>
                        <th className="text-left px-2 py-1">등번호</th>
                        <th className="text-left px-2 py-1">포지션</th>
                        <th className="text-left px-2 py-1">연락처</th>
                        <th className="text-left px-2 py-1">KFA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewPlayers.map((p, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-2 py-1">{p.name}</td>
                          <td className="px-2 py-1">{p.birthDate}</td>
                          <td className="px-2 py-1">{p.number ?? "-"}</td>
                          <td className="px-2 py-1">{p.position}</td>
                          <td className="px-2 py-1">{p.phone || "-"}</td>
                          <td className="px-2 py-1">{p.kfaRegistered ? "등록" : "미확인"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={isEditLocked || previewErrors.length > 0}
                    onClick={() => {
                      void (async () => {
                        const batch = writeBatch(db);
                        previewPlayers.forEach((p) => {
                          const ref = doc(collection(db, "federations", federationSlug, "teams", teamId, "players"));
                          batch.set(ref, {
                            ...p,
                            // 하위 호환: 화면은 birthDate/number를 사용하고 외부 연동은 birth/jerseyNumber를 참조할 수 있다.
                            birth: p.birthDate,
                            jerseyNumber: p.number,
                            createdAt: serverTimestamp(),
                          });
                        });
                        await batch.commit();
                        toast.success(`${previewPlayers.length}명 등록 완료`);
                        setPreviewPlayers([]);
                        setPreviewErrors([]);
                      })().catch((e) => {
                        console.error(e);
                        toast.error("일괄 등록에 실패했습니다.");
                      });
                    }}
                  >
                    확인 후 등록
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewPlayers([]);
                      setPreviewErrors([]);
                    }}
                  >
                    미리보기 취소
                  </Button>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" placeholder="이름" value={newPlayer.name} onChange={(e) => setNewPlayer((p) => ({ ...p, name: e.target.value }))} />
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" placeholder="생년월일 (YYYY-MM-DD)" value={newPlayer.birthDate} onChange={(e) => setNewPlayer((p) => ({ ...p, birthDate: e.target.value }))} />
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" placeholder="등번호" value={newPlayer.number} onChange={(e) => setNewPlayer((p) => ({ ...p, number: e.target.value }))} />
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" placeholder="포지션" value={newPlayer.position} onChange={(e) => setNewPlayer((p) => ({ ...p, position: e.target.value }))} />
              <input disabled={isEditLocked} className="border rounded-md px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500" placeholder="연락처(선택)" value={newPlayer.phone} onChange={(e) => setNewPlayer((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                disabled={isEditLocked}
                checked={newPlayer.kfaRegistered}
                onChange={(e) => setNewPlayer((p) => ({ ...p, kfaRegistered: e.target.checked }))}
              />
              KFA 등록 선수
            </label>
            <Button
              variant="outline"
              disabled={isEditLocked}
              onClick={() => {
                void (async () => {
                  if (!newPlayer.name.trim() || !newPlayer.birthDate.trim() || !newPlayer.position.trim()) {
                    toast.error("이름/생년월일/포지션을 입력하세요.");
                    return;
                  }
                  if (newPlayer.number.trim()) {
                    const num = Number(newPlayer.number);
                    if (players.some((p) => p.number === num)) {
                      toast.error("중복 등번호는 사용할 수 없습니다.");
                      return;
                    }
                  }
                  const playerRef = doc(collection(db, "federations", federationSlug, "teams", teamId, "players"));
                  await setDoc(playerRef, {
                    name: newPlayer.name.trim(),
                    birthDate: newPlayer.birthDate.trim(),
                    birth: newPlayer.birthDate.trim(),
                    number: newPlayer.number.trim() ? Number(newPlayer.number) : null,
                    jerseyNumber: newPlayer.number.trim() ? Number(newPlayer.number) : null,
                    position: newPlayer.position.trim(),
                    phone: newPlayer.phone.trim() || "",
                    kfaRegistered: !!newPlayer.kfaRegistered,
                    status: "draft",
                    createdAt: serverTimestamp(),
                  });
                  setNewPlayer({ name: "", birthDate: "", number: "", position: "", phone: "", kfaRegistered: false });
                  toast.success("선수를 추가했습니다.");
                })();
              }}
            >
              선수 추가
            </Button>
            <div className="space-y-2">
              {players.length === 0 ? (
                <p className="text-sm text-gray-600">등록된 선수가 없습니다.</p>
              ) : (
                players.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3 flex items-center justify-between">
                    <div className="text-sm">
                      {p.name} · {p.birthDate} · #{p.number ?? "-"} · {p.position} · KFA {p.kfaRegistered ? "등록" : "미확인"}
                    </div>
                    <Button
                      variant="outline"
                      disabled={isEditLocked}
                      onClick={() =>
                        void deleteDoc(doc(db, "federations", federationSlug, "teams", teamId, "players", p.id)).then(() =>
                          toast.success("선수를 삭제했습니다.")
                        )
                      }
                    >
                      삭제
                    </Button>
                  </div>
                ))
              )}
            </div>
            {duplicateNumbers.length > 0 && (
              <p className="text-sm text-red-600">중복 등번호가 있습니다: {Array.from(new Set(duplicateNumbers)).join(", ")}</p>
            )}
          </div>
        )}

        {tab === "submission" && (
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">제출 현황</h2>
            <p className="text-sm text-gray-600">
              임원 3개 역할(회장/감독/총무)과 선수 최소 11명이 충족되어야 최종 제출할 수 있습니다.
            </p>
            <div className="text-sm text-gray-700">
              임원 필수 충족: {hasRequiredStaff ? "완료" : "미완료"} · 선수 수: {players.length}명
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              {!hasRequiredStaff && <p>❌ 회장/감독/총무 정보가 필요합니다.</p>}
              {players.length < 11 && <p>❌ 선수 최소 11명이 필요합니다.</p>}
              {duplicateNumbers.length > 0 && <p>❌ 중복 등번호가 있습니다.</p>}
            </div>
            <div className="text-sm text-gray-700">현재 상태: {submissionStatus}</div>
            <div className="text-sm">
              <span
                className={`px-2 py-1 rounded border ${
                  submissionStatus === "verified"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : submissionStatus === "returned"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : submissionStatus === "submitted"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                현재 상태: {STATUS_LABEL[submissionStatus] || submissionStatus}
              </span>
            </div>
            <Button
              disabled={!canSubmitRoster || (submissionStatus === "submitted" && !isAdmin) || submissionStatus === "verified"}
              onClick={() => {
                void (async () => {
                  if (!canSubmitRoster) {
                    toast.error("제출 요건을 충족하지 못했습니다.");
                    return;
                  }
                  const prevStatus: RosterStatus = submissionStatus;
                  await setDoc(doc(db, "federations", federationSlug, "teams", teamId, "submission", "roster"), {
                    status: "submitted",
                    submittedAt: serverTimestamp(),
                    playerCount: players.length,
                    requiredStaffCompleted: true,
                    returnReason: "",
                    statusLogs: arrayUnion({
                      from: prevStatus,
                      to: "submitted",
                      changedAt: new Date().toISOString(),
                      changedBy: user?.uid || null,
                    }),
                  });
                  setSubmissionStatus("submitted");
                  setReturnReason("");
                  await updateDoc(doc(db, "federations", federationSlug, "teams", teamId), {
                    submittedRoster: true,
                    rosterStatus: "submitted",
                    status: "submitted",
                    rosterSubmittedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                  toast.success("최종 제출 완료");
                })().catch((e) => {
                  console.error(e);
                  toast.error("최종 제출에 실패했습니다.");
                });
              }}
            >
              {submissionStatus === "returned" ? "수정 후 재제출" : "최종 제출"}
            </Button>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  disabled={submissionStatus !== "submitted" && submissionStatus !== "returned"}
                  onClick={() => {
                    void setDoc(
                      doc(db, "federations", federationSlug, "teams", teamId, "submission", "roster"),
                      {
                        status: "verified",
                        verifiedAt: serverTimestamp(),
                        playerCount: players.length,
                        requiredStaffCompleted: hasRequiredStaff,
                        returnReason: "",
                        statusLogs: arrayUnion({
                          from: submissionStatus,
                          to: "verified",
                          changedAt: new Date().toISOString(),
                          changedBy: user?.uid || null,
                        }),
                      },
                      { merge: true }
                    )
                      .then(async () => {
                        await updateDoc(doc(db, "federations", federationSlug, "teams", teamId), {
                          submittedRoster: true,
                          rosterStatus: "verified",
                          status: "approved",
                          approvedBy: user?.uid || null,
                          approvedAt: serverTimestamp(),
                          updatedBy: user?.uid || null,
                          updatedAt: serverTimestamp(),
                        });
                        setSubmissionStatus("verified");
                        setReturnReason("");
                        toast.success("관리자 승인 완료");
                      })
                      .catch((e) => {
                        console.error(e);
                        toast.error("승인 처리에 실패했습니다.");
                      });
                  }}
                >
                  관리자 승인
                </Button>
                <Button
                  variant="outline"
                  disabled={submissionStatus !== "submitted"}
                  onClick={() => {
                    void (async () => {
                      const reason = window.prompt("반려 사유를 입력하세요.");
                      if (!reason || !reason.trim()) return;
                      await setDoc(
                        doc(db, "federations", federationSlug, "teams", teamId, "submission", "roster"),
                        {
                          status: "returned",
                          returnReason: reason.trim(),
                          returnedAt: serverTimestamp(),
                          playerCount: players.length,
                          requiredStaffCompleted: hasRequiredStaff,
                          returnLogs: arrayUnion({
                            reason: reason.trim(),
                            createdAt: new Date().toISOString(),
                            createdBy: user?.uid || null,
                          }),
                          statusLogs: arrayUnion({
                            from: submissionStatus,
                            to: "returned",
                            changedAt: new Date().toISOString(),
                            changedBy: user?.uid || null,
                          }),
                        },
                        { merge: true }
                      );
                      setSubmissionStatus("returned");
                      setReturnReason(reason.trim());
                      await updateDoc(doc(db, "federations", federationSlug, "teams", teamId), {
                        rosterStatus: "returned",
                        status: "rejected",
                        updatedBy: user?.uid || null,
                        updatedAt: serverTimestamp(),
                      });
                      toast.success("반려 처리 완료");
                    })().catch((e) => {
                      console.error(e);
                      toast.error("반려 처리에 실패했습니다.");
                    });
                  }}
                >
                  관리자 반려
                </Button>
              </div>
            )}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">상태 타임라인</h3>
              {latestReturn && (
                <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm text-amber-800">최근 반려: {latestReturn.reason}</p>
                  <p className="text-xs text-amber-700 mt-1">{formatDate(latestReturn.createdAt)}</p>
                </div>
              )}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setTimelineFilter("all")}
                  className={`px-2 py-1 text-xs rounded border ${timelineFilter === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"}`}
                >
                  전체
                </button>
                <button
                  onClick={() => setTimelineFilter("return")}
                  className={`px-2 py-1 text-xs rounded border ${timelineFilter === "return" ? "bg-red-600 text-white border-red-600" : "bg-white text-gray-600 border-gray-200"}`}
                >
                  반려만
                </button>
                <button
                  onClick={() => setTimelineFilter("status")}
                  className={`px-2 py-1 text-xs rounded border ${timelineFilter === "status" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200"}`}
                >
                  상태변경만
                </button>
                <button
                  onClick={() => setTimelineExpanded((v) => !v)}
                  className="ml-auto px-2 py-1 text-xs rounded border bg-white text-gray-700 border-gray-200"
                >
                  {timelineExpanded ? "요약 보기 ▲" : "전체 보기 ▼"}
                </button>
              </div>
              {timeline.length === 0 ? (
                <p className="text-sm text-gray-600">아직 이력이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {(timelineExpanded ? timeline : timeline.slice(-4)).map((log, idx) => (
                    <div key={`${log.type}-${log.at}-${idx}`} className="flex gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          log.type === "return" ? "bg-red-500" : "bg-blue-500"
                        }`}
                      />
                      <div>
                        <p className={`text-sm ${log.type === "return" ? "text-red-600" : "text-gray-800"}`}>
                          {log.text}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(log.at)}
                          {log.by ? ` · by ${log.by}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

