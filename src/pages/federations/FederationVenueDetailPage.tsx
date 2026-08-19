import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { FederationHeader } from "@/components/federation/FederationHeader";
import { VenuePricingEstimateSummary } from "@/components/federation/VenuePricingEstimateSummary";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import {
  createVenueAllocationRequest,
  formatAllocationSlotLabel,
  subscribeVenueAllocationDay,
  type AllocationSlotView,
} from "@/lib/federation/venueAllocationService";
import { calculateVenuePricing } from "@/lib/federation/venuePricingEngine";
import { getEffectiveVenueBookingPolicy } from "@/lib/federation/venueBookingPolicy";
import { getFederationVenue } from "@/lib/federation/venueRentalService";
import { type FederationVenue } from "@/lib/federation/venueRentalTypes";
import { listFederationTeams, type FederationOperatingTeam } from "@/services/federationOperatingService";

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function statusClass(status: AllocationSlotView["status"]): string {
  switch (status) {
    case "AVAILABLE":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "OWN_PENDING":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "ALLOCATED":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "BLOCKED":
      return "border-gray-200 bg-gray-50 text-gray-500";
    default:
      return "border-gray-200 bg-white";
  }
}

export default function FederationVenueDetailPage() {
  const { federationSlug = "", venueId = "" } = useParams<{
    federationSlug: string;
    venueId: string;
  }>();
  const { user } = useAuth();
  const [venue, setVenue] = useState<FederationVenue | null>(null);
  const [bookingDate, setBookingDate] = useState(todayIsoLocal);
  const [slots, setSlots] = useState<AllocationSlotView[]>([]);
  const [teams, setTeams] = useState<FederationOperatingTeam[]>([]);
  const [memberTeamIds, setMemberTeamIds] = useState<Set<string>>(new Set());
  const [teamId, setTeamId] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [slotLoadError, setSlotLoadError] = useState<string | null>(null);
  const [fedMeta, setFedMeta] = useState<{ name: string; region: string; logoUrl?: string }>({
    name: federationSlug,
    region: "",
  });
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(
    null
  );
  const applicationPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!federationSlug || !venueId) return;
    getFederationVenue(federationSlug, venueId).then(setVenue);
  }, [federationSlug, venueId]);

  useEffect(() => {
    if (!federationSlug) return;
    getDoc(doc(db, "federations", federationSlug)).then((snap) => {
      if (!snap.exists()) return;
      const d = snap.data() as Record<string, unknown>;
      setFedMeta({
        name: String(d.name || federationSlug),
        region: String(d.region || ""),
        logoUrl: d.logoUrl != null ? String(d.logoUrl) : undefined,
      });
      const uid = user?.uid;
      if (!uid) {
        setIsManager(false);
        return;
      }
      const managers = Array.isArray(d.managers) ? d.managers : [];
      const ownerId = String(d.ownerId || "");
      setIsManager(ownerId === uid || managers.some((m: unknown) => String(m) === uid));
    });
  }, [federationSlug, user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setMemberTeamIds(new Set());
      return;
    }
    let cancelled = false;
    getDocs(collection(db, "users", user.uid, "teamMemberships"))
      .then((snap) => {
        if (!cancelled) setMemberTeamIds(new Set(snap.docs.map((item) => item.id)));
      })
      .catch(() => {
        if (!cancelled) setMemberTeamIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!federationSlug) return;
    listFederationTeams(federationSlug)
      .then((rows) => setTeams(rows.filter((t) => t.isActive)))
      .catch(() => setTeams([]));
  }, [federationSlug]);

  const venuePolicy = useMemo(
    () => getEffectiveVenueBookingPolicy(venue?.bookingPolicy ?? null),
    [venue?.bookingPolicy]
  );

  useEffect(() => {
    if (!federationSlug || !venueId || !bookingDate) return;
    setSlotLoadError(null);
    return subscribeVenueAllocationDay({
      federationSlug,
      venueId,
      bookingDate,
      viewerTeamId: teamId || null,
      policy: venuePolicy,
      onData: setSlots,
      onError: () => setSlotLoadError("슬롯 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."),
    });
  }, [federationSlug, venueId, bookingDate, teamId, venuePolicy]);

  useEffect(() => {
    setSelectedSlot(null);
  }, [venuePolicy]);

  useEffect(() => {
    if (!selectedSlot) return;
    applicationPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    applicationPanelRef.current?.focus({ preventScroll: true });
  }, [selectedSlot]);

  const applicantTeams = useMemo(
    () =>
      teams.filter(
        (team) =>
          isManager ||
          memberTeamIds.has(team.id) ||
          (team.platformTeamId ? memberTeamIds.has(team.platformTeamId) : false)
      ),
    [isManager, memberTeamIds, teams]
  );
  const hasApplicantTeam = applicantTeams.length > 0;
  const selectedTeam = applicantTeams.find((t) => t.id === teamId);
  const canRequest = Boolean(user?.uid && teamId && selectedTeam?.platformTeamId);

  useEffect(() => {
    if (!teamId && applicantTeams.length === 1) {
      setTeamId(applicantTeams[0].id);
    } else if (teamId && !applicantTeams.some((team) => team.id === teamId)) {
      setTeamId("");
    }
  }, [applicantTeams, teamId]);

  const pricingQuote = useMemo(() => {
    if (!venue || !selectedSlot || !bookingDate) return null;
    try {
      return calculateVenuePricing({
        venueId: venue.id,
        bookingDate,
        slotStart: selectedSlot.startTime,
        slotEnd: selectedSlot.endTime,
      });
    } catch {
      return null;
    }
  }, [venue, selectedSlot, bookingDate]);

  const headerFed = useMemo(
    () => ({
      id: federationSlug,
      name: fedMeta.name,
      slug: federationSlug,
      logoUrl: fedMeta.logoUrl,
      region: fedMeta.region || "노원구",
    }),
    [federationSlug, fedMeta]
  );

  async function submitRequest() {
    setMsg(null);
    setErr(null);
    if (!user?.uid) {
      setErr("로그인이 필요합니다.");
      return;
    }
    if (!canRequest || !selectedSlot || !venue || !selectedTeam?.platformTeamId) {
      setErr("YAGO 플랫폼 팀 연결이 확인된 팀·시간·권한을 확인해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await createVenueAllocationRequest({
        federationSlug,
        venueId: venue.id,
        venueName: venue.name,
        bookingDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        platformTeamId: selectedTeam.platformTeamId,
      });
      setMsg("구장 배정 신청이 접수되었습니다. 협회 심사 후 배정이 확정됩니다.");
      setSelectedSlot(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "배정 신청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FederationHeader federation={headerFed} />
        <main className="max-w-3xl mx-auto px-4 py-10 text-sm text-gray-600">구장 정보 로딩…</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FederationHeader federation={headerFed} />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link
          to={`/federations/${federationSlug}/venues`}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          구장 목록
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
        {venue.address && <p className="mt-1 text-sm text-gray-600">{venue.address}</p>}
        {venue.fieldType && <p className="text-sm text-gray-500">{venue.fieldType}</p>}

        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
          <label className="block text-sm font-medium text-gray-800">날짜 선택</label>
          <input
            type="date"
            value={bookingDate}
            onChange={(e) => {
              setBookingDate(e.target.value);
              setSelectedSlot(null);
            }}
            className="mt-2 w-full sm:w-auto rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <p className="mt-2 text-xs text-gray-500">
            구장 배정 신청 · 슬롯은 구장 예약 정책 기준 · 여러 클럽이 동일 시간에 신청할 수 있으며,
            협회가 1팀을 최종 배정합니다.
            {venuePolicy.slotIntervalMinutes === 120 && !venuePolicy.allowHourlyStart
              ? " (기본 2시간 · 짝수 시작)"
              : ` (${venuePolicy.slotIntervalMinutes / 60}시간${
                  venuePolicy.allowHourlyStart ? " · 매시 시작" : ""
                })`}
          </p>
        </div>

        <div className="mt-4 space-y-2">
          {slotLoadError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {slotLoadError}
            </p>
          )}
          {slots.map((s) => {
            const selected =
              selectedSlot?.startTime === s.startTime && selectedSlot?.endTime === s.endTime;
            const clickable = s.status === "AVAILABLE";
            return (
              <button
                key={`${s.startTime}-${s.endTime}`}
                type="button"
                disabled={!clickable}
                aria-pressed={selected}
                title={clickable ? "이 시간으로 배정 신청" : formatAllocationSlotLabel(s.status)}
                onClick={() => setSelectedSlot({ startTime: s.startTime, endTime: s.endTime })}
                className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm ${statusClass(
                  s.status
                )} ${selected ? "ring-2 ring-primary-500" : ""} ${
                  clickable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                }`}
              >
                <span className="font-medium">
                  {s.startTime} ~ {s.endTime}
                </span>
                <span>
                  {formatAllocationSlotLabel(s.status, { isOwnAllocated: s.isOwnAllocated })}
                  {/* Public: do not expose other clubs' names */}
                </span>
              </button>
            );
          })}
        </div>

        {selectedSlot && (
          <div
            ref={applicationPanelRef}
            tabIndex={-1}
            className="mt-6 rounded-xl border border-primary-200 bg-white p-4 space-y-3"
          >
            <h2 className="font-semibold text-gray-900">구장 배정 신청</h2>
            <dl className="text-sm text-gray-700 space-y-1">
              <div>
                <dt className="inline text-gray-500">구장 </dt>
                <dd className="inline">{venue.name}</dd>
              </div>
              <div>
                <dt className="inline text-gray-500">일시 </dt>
                <dd className="inline">
                  {bookingDate} {selectedSlot.startTime}–{selectedSlot.endTime} (
                  {venuePolicy.slotIntervalMinutes / 60}시간)
                </dd>
              </div>
            </dl>

            {pricingQuote ? (
              <VenuePricingEstimateSummary quote={pricingQuote} />
            ) : (
              <p className="text-sm text-amber-800">요금 확인 필요</p>
            )}

            {!user && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                로그인 후 신청할 수 있습니다. (익명 신청 불가)
              </p>
            )}

            {user && !hasApplicantTeam && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                신청 가능한 YAGO 팀 소속이 확인되지 않았습니다. 팀 가입 또는 협회 팀 연결 후 이용해 주세요.
              </p>
            )}

            {user && hasApplicantTeam && teamId && !selectedTeam?.platformTeamId && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                선택한 협회 팀은 YAGO 플랫폼 팀에 연결되어 있지 않아 현재 신청할 수 없습니다.
              </p>
            )}

            {user && hasApplicantTeam && (
              <label className="block text-sm">
                <span className="font-medium text-gray-800">신청 팀</span>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">선택</option>
                  {applicantTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {user && !hasApplicantTeam && teams.length === 0 && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                신청 가능한 팀/클럽 식별자가 없습니다. 협회에 팀 등록 후 이용해 주세요.
              </p>
            )}

            {err && <p className="text-sm text-red-600">{err}</p>}
            {msg && <p className="text-sm text-emerald-700">{msg}</p>}

            <button
              type="button"
              disabled={!canRequest || busy}
              onClick={() => void submitRequest()}
              className="w-full rounded-lg bg-primary-700 text-white py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "신청 중…" : "배정 신청"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
