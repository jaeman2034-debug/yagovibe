import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { initKakao } from "@/lib/kakaoAuth";
import { getAuth } from "firebase/auth";

type TournamentDoc = {
  id: string;
  name: string;
  mode: "league" | "tournament";
  publishStatus: "draft" | "published";
  published?: boolean;
};

type DivisionDoc = {
  id: string;
  name: string;
  sortOrder: number;
  status: "draft" | "published";
};

type MatchDoc = {
  id: string;
  divisionId?: string;
  group?: string;
  status?: "scheduled" | "live" | "completed";
  stage?: "semi" | "final";
  homeTeamId?: string;
  awayTeamId?: string;
  round?: string;
  roundOrder?: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  winner?: string | null;
  scheduledAt?: string | null;
  matchDate?: string;
  matchTime?: string;
  venueId?: string;
  venueName?: string;
  refereeName?: string;
};
type ParticipantDoc = {
  teamId: string;
  teamName: string;
};
type StandingRow = {
  teamId: string;
  teamName: string;
  played: number;
  win: number;
  draw: number;
  lose: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};
type NotificationDoc = {
  id: string;
  type: "match_start" | "goal" | "match_end" | "application_approved";
  title: string;
  message: string;
  read?: boolean;
  createdAt?: { seconds?: number } | null;
};

export default function FederationTournamentPublicPage() {
  const { federationSlug, tournamentId, divisionId } = useParams<{
    federationSlug: string;
    tournamentId: string;
    divisionId?: string;
  }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<TournamentDoc | null>(null);
  const [divisions, setDivisions] = useState<DivisionDoc[]>([]);
  const [legacyMatches, setLegacyMatches] = useState<MatchDoc[]>([]);
  const [leagueScopedMatches, setLeagueScopedMatches] = useState<MatchDoc[]>([]);
  const [participants, setParticipants] = useState<ParticipantDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [lastToastId, setLastToastId] = useState<string | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void initKakao();
  }, []);

  useEffect(() => {
    if (!federationSlug || !tournamentId) return;
    const load = async () => {
      const snap = await getDoc(doc(db, "federations", federationSlug, "leagues", tournamentId));
      if (!snap.exists()) {
        setTournament(null);
        setLoading(false);
        return;
      }
      const data = snap.data() as any;
      setTournament({
        id: snap.id,
        name: String(data?.name || "대회"),
        mode: data?.mode === "tournament" ? "tournament" : "league",
        publishStatus:
          data?.publishStatus === "published" || data?.published === true
            ? "published"
            : "draft",
        published: data?.published === true,
      });
      setLoading(false);
    };
    void load();
  }, [federationSlug, tournamentId]);
  useEffect(() => {
    if (!federationSlug) return;
    const q = query(
      collection(db, "federations", federationSlug, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: NotificationDoc[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          type:
            x?.type === "match_start" ||
            x?.type === "goal" ||
            x?.type === "match_end" ||
            x?.type === "application_approved"
              ? x.type
              : "goal",
          title: String(x?.title || "알림"),
          message: String(x?.message || ""),
          read: !!x?.read,
          createdAt: x?.createdAt || null,
        };
      });
      setNotifications(rows);
    });
    return () => unsub();
  }, [federationSlug]);
  useEffect(() => {
    if (notifications.length === 0) return;
    const latest = notifications[0];
    if (!latest || lastToastId === latest.id) return;
    setLastToastId(latest.id);
    toast(latest.message || latest.title);
  }, [notifications, lastToastId]);

  useEffect(() => {
    if (!federationSlug || !tournamentId) return;
    const q = query(collection(db, "federations", federationSlug, "divisions"), where("tournamentId", "==", tournamentId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: String(data?.name || "부문"),
          sortOrder: typeof data?.sortOrder === "number" ? data.sortOrder : 999,
          status: data?.status === "published" ? "published" : "draft",
        } as DivisionDoc;
      });
      rows.sort((a, b) => a.sortOrder - b.sortOrder);
      setDivisions(rows);
    });
    return () => unsub();
  }, [federationSlug, tournamentId]);

  const selectedDivisionId = divisionId || divisions.find((d) => d.status === "published")?.id || null;

  useEffect(() => {
    if (!federationSlug || !tournamentId) return;
    const scopedRef = collection(db, "federations", federationSlug, "leagues", tournamentId, "matches");
    const unsub = onSnapshot(scopedRef, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          divisionId: typeof data?.divisionId === "string" ? data.divisionId : undefined,
          group: typeof data?.group === "string" ? data.group : undefined,
          status:
            data?.status === "completed"
              ? "completed"
              : data?.status === "live"
              ? "live"
              : "scheduled",
          stage: data?.stage === "semi" || data?.stage === "final" ? data.stage : undefined,
          homeTeamId: typeof data?.homeTeamId === "string" ? data.homeTeamId : undefined,
          awayTeamId: typeof data?.awayTeamId === "string" ? data.awayTeamId : undefined,
          round: typeof data?.round === "string" ? data.round : undefined,
          roundOrder: typeof data?.roundOrder === "number" ? data.roundOrder : undefined,
          homeTeam: String(data?.homeTeam || ""),
          awayTeam: String(data?.awayTeam || ""),
          homeScore: typeof data?.homeScore === "number" ? data.homeScore : null,
          awayScore: typeof data?.awayScore === "number" ? data.awayScore : null,
          winner: typeof data?.winner === "string" ? data.winner : null,
          scheduledAt: typeof data?.scheduledAt === "string" ? data.scheduledAt : null,
          matchDate: typeof data?.matchDate === "string" ? data.matchDate : "",
          matchTime: typeof data?.matchTime === "string" ? data.matchTime : "",
          venueId: typeof data?.venueId === "string" ? data.venueId : "",
          venueName: typeof data?.venueName === "string" ? data.venueName : "",
          refereeName: typeof data?.refereeName === "string" ? data.refereeName : "",
        } as MatchDoc;
      });
      setLeagueScopedMatches(rows);
    });
    return () => unsub();
  }, [federationSlug, tournamentId]);

  useEffect(() => {
    if (!federationSlug || !tournamentId) return;
    const q = query(collection(db, "federations", federationSlug, "matches"), where("leagueId", "==", tournamentId));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          divisionId: typeof data?.divisionId === "string" ? data.divisionId : undefined,
          round: typeof data?.round === "string" ? data.round : undefined,
          roundOrder: typeof data?.roundOrder === "number" ? data.roundOrder : undefined,
          homeTeam: String(data?.homeTeam || ""),
          awayTeam: String(data?.awayTeam || ""),
          homeScore: typeof data?.homeScore === "number" ? data.homeScore : null,
          awayScore: typeof data?.awayScore === "number" ? data.awayScore : null,
          status:
            data?.status === "completed"
              ? "completed"
              : data?.status === "live"
              ? "live"
              : "scheduled",
          stage: data?.stage === "semi" || data?.stage === "final" ? data.stage : undefined,
          winner: typeof data?.winner === "string" ? data.winner : null,
          scheduledAt: typeof data?.scheduledAt === "string" ? data.scheduledAt : null,
          matchDate: typeof data?.matchDate === "string" ? data.matchDate : "",
          matchTime: typeof data?.matchTime === "string" ? data.matchTime : "",
          venueId: typeof data?.venueId === "string" ? data.venueId : "",
          venueName: typeof data?.venueName === "string" ? data.venueName : "",
          refereeName: typeof data?.refereeName === "string" ? data.refereeName : "",
        } as MatchDoc;
      });
      setLegacyMatches(rows);
    });
    return () => unsub();
  }, [federationSlug, tournamentId]);
  useEffect(() => {
    if (!federationSlug || !tournamentId) return;
    const ref = collection(db, "federations", federationSlug, "leagues", tournamentId, "participants");
    const unsub = onSnapshot(ref, (snap) => {
      const rows: ParticipantDoc[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          teamId: String(x?.teamId || d.id),
          teamName: String(x?.teamName || ""),
        };
      });
      setParticipants(rows);
    });
    return () => unsub();
  }, [federationSlug, tournamentId]);

  const matches = useMemo(
    () => (leagueScopedMatches.length > 0 ? leagueScopedMatches : legacyMatches),
    [leagueScopedMatches, legacyMatches]
  );
  const visibleMatches = useMemo(() => {
    if (!selectedDivisionId) return matches;
    const hasDivisionData = matches.some((m) => !!m.divisionId);
    if (!hasDivisionData) return matches;
    return matches.filter((m) => m.divisionId === selectedDivisionId);
  }, [matches, selectedDivisionId]);

  const rounds = useMemo(() => {
    const grouped: Record<number, MatchDoc[]> = {};
    for (const match of visibleMatches) {
      const order = match.roundOrder ?? 0;
      if (!grouped[order]) grouped[order] = [];
      grouped[order].push(match);
    }
    return Object.entries(grouped)
      .map(([order, items]) => ({
        order: Number(order),
        name: items[0]?.round || `${order}라운드`,
        items,
      }))
      .sort((a, b) => a.order - b.order);
  }, [visibleMatches]);
  const semiMatches = useMemo(
    () =>
      visibleMatches
        .filter((m) => m.stage === "semi")
        .sort((a, b) => (a.roundOrder || 0) - (b.roundOrder || 0)),
    [visibleMatches]
  );
  const finalMatch = useMemo(
    () => visibleMatches.find((m) => m.stage === "final") || null,
    [visibleMatches]
  );
  const finalWinner = useMemo(() => {
    if (!finalMatch) return null;
    if (finalMatch.status !== "completed") return null;
    if (typeof finalMatch.homeScore !== "number" || typeof finalMatch.awayScore !== "number") return null;
    if (finalMatch.homeScore === finalMatch.awayScore) return null;
    return finalMatch.homeScore > finalMatch.awayScore ? finalMatch.homeTeam : finalMatch.awayTeam;
  }, [finalMatch]);
  const standingsByGroup = useMemo(() => {
    const participantNameById = Object.fromEntries(participants.map((p) => [p.teamId, p.teamName]));
    const groups: Record<string, Record<string, StandingRow>> = {};
    const touchRow = (groupKey: string, teamId: string, teamName: string) => {
      if (!groups[groupKey]) groups[groupKey] = {};
      if (!groups[groupKey][teamId]) {
        groups[groupKey][teamId] = {
          teamId,
          teamName,
          played: 0,
          win: 0,
          draw: 0,
          lose: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
          points: 0,
        };
      }
      return groups[groupKey][teamId];
    };

    visibleMatches.forEach((m) => {
      const groupKey = m.group || "통합";
      const homeId = m.homeTeamId || m.homeTeam;
      const awayId = m.awayTeamId || m.awayTeam;
      if (!homeId || !awayId) return;
      const homeName = participantNameById[homeId] || m.homeTeam || homeId;
      const awayName = participantNameById[awayId] || m.awayTeam || awayId;

      const home = touchRow(groupKey, homeId, homeName);
      const away = touchRow(groupKey, awayId, awayName);
      const completed =
        m.status === "completed" &&
        typeof m.homeScore === "number" &&
        typeof m.awayScore === "number";
      if (!completed) return;

      home.played += 1;
      away.played += 1;
      home.goalsFor += m.homeScore as number;
      home.goalsAgainst += m.awayScore as number;
      away.goalsFor += m.awayScore as number;
      away.goalsAgainst += m.homeScore as number;

      if ((m.homeScore as number) > (m.awayScore as number)) {
        home.win += 1;
        home.points += 3;
        away.lose += 1;
      } else if ((m.homeScore as number) < (m.awayScore as number)) {
        away.win += 1;
        away.points += 3;
        home.lose += 1;
      } else {
        home.draw += 1;
        away.draw += 1;
        home.points += 1;
        away.points += 1;
      }
    });

    return Object.entries(groups).map(([group, table]) => {
      const rows = Object.values(table).map((r) => ({
        ...r,
        goalDiff: r.goalsFor - r.goalsAgainst,
      }));
      rows.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
      return { group, rows };
    });
  }, [visibleMatches, participants]);
  const liveMatches = useMemo(
    () => visibleMatches.filter((m) => m.status === "live"),
    [visibleMatches]
  );
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const notificationColorClass = (type: NotificationDoc["type"]) => {
    if (type === "match_start") return "border-blue-500";
    if (type === "goal") return "border-green-500";
    if (type === "match_end") return "border-gray-500";
    return "border-amber-500";
  };
  const sortedScheduleMatches = useMemo(() => {
    return [...visibleMatches]
      .filter((m) => m.status !== "live")
      .sort((a, b) => {
        const aKey = `${a.matchDate || ""} ${a.matchTime || ""}`;
        const bKey = `${b.matchDate || ""} ${b.matchTime || ""}`;
        return aKey.localeCompare(bKey);
      });
  }, [visibleMatches]);
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayMatches = useMemo(
    () => sortedScheduleMatches.filter((m) => m.matchDate === todayKey),
    [sortedScheduleMatches, todayKey]
  );
  const scheduleByDate = useMemo(() => {
    const grouped: Record<string, MatchDoc[]> = {};
    sortedScheduleMatches.forEach((m) => {
      const key = m.matchDate || "날짜 미정";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [sortedScheduleMatches]);

  // OG meta 동적 설정
  useEffect(() => {
    if (!tournament) return;
    const divisionName = divisions.find((d) => d.id === selectedDivisionId)?.name || "";
    const title = divisionName ? `${tournament.name} - ${divisionName}` : tournament.name;
    const description = "대진표 확인하기";
    const url = window.location.href;
    const image = "https://via.placeholder.com/1200x630.png?text=Tournament+Bracket";

    const ensureMeta = (attr: "name" | "property", key: string, content: string) => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const ensureLink = (rel: string, href: string) => {
      let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    };

    document.title = title;
    ensureMeta("property", "og:title", title);
    ensureMeta("property", "og:description", description);
    ensureMeta("property", "og:image", image);
    ensureMeta("property", "og:url", url);
    ensureMeta("property", "og:type", "website");
    ensureMeta("name", "twitter:card", "summary_large_image");
    ensureMeta("name", "twitter:title", title);
    ensureMeta("name", "twitter:description", description);
    ensureMeta("name", "twitter:image", image);
    ensureLink("canonical", url);
  }, [tournament, divisions, selectedDivisionId]);

  // 브래킷 캡처 (html2canvas)
  const captureBracketAsDataUrl = async (): Promise<string | null> => {
    try {
      const mod = await import("html2canvas");
      const html2canvas = mod.default;
      const el = document.getElementById("bracket");
      if (!el) return null;
      const canvas = await html2canvas(el as HTMLElement, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const handleDownloadBracket = async () => {
    const dataUrl = await captureBracketAsDataUrl();
    if (!dataUrl) {
      toast.error("이미지 생성에 실패했습니다");
      return;
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `bracket-${tournament?.name || "tournament"}-${selectedDivisionId || "division"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("브래킷 이미지를 저장했습니다");
  };

  const handleShareBracketImage = async () => {
    try {
      const dataUrl = await captureBracketAsDataUrl();
      if (!dataUrl) {
        toast.error("이미지 생성에 실패했습니다");
        return;
      }
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "bracket.png", { type: "image/png" });
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({
          title: tournament?.name || "대회 브래킷",
          text: "대진표 이미지",
          files: [file],
        });
      } else {
        // 파일 공유 미지원 → 다운로드 폴백
        await handleDownloadBracket();
      }
    } catch {
      toast.error("이미지 공유에 실패했습니다");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">로딩 중...</div>;
  }
  if (!tournament) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">대회를 찾을 수 없습니다.</div>;
  }
  if (tournament.mode !== "tournament") {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">토너먼트 대회가 아닙니다.</div>;
  }
  if (tournament.publishStatus !== "published") {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">아직 공개되지 않은 대회입니다.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16 md:pt-0">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <div className="fixed top-20 right-4 z-30 w-80 max-h-[70vh] overflow-auto space-y-2">
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">알림</h3>
              <span className="text-xs text-gray-500">미읽음 {unreadCount}</span>
            </div>
          </div>
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (!federationSlug || n.read) return;
                void updateDoc(doc(db, "federations", federationSlug, "notifications", n.id), {
                  read: true,
                }).catch(() => {});
              }}
              className={`w-full text-left bg-white shadow rounded border-l-4 p-3 ${
                n.read ? "border-gray-200 opacity-70" : notificationColorClass(n.type)
              }`}
            >
              <div className="font-semibold text-sm text-gray-900">{n.title}</div>
              <div className="text-xs text-gray-600 mt-1">{n.message}</div>
            </button>
          ))}
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
              <p className="text-sm text-gray-600 mt-1">읽기 전용 토너먼트 대진표</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowApply(true)} className="bg-blue-600 text-white hover:bg-blue-700">
                참가 신청
              </Button>
              <Button variant="outline" onClick={handleShareBracketImage}>
                이미지 공유
              </Button>
              <Button variant="outline" onClick={handleDownloadBracket}>
                이미지 저장
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void (async () => {
                    const title =
                      tournament.name +
                      (divisions.find((d) => d.id === selectedDivisionId)?.name
                        ? ` - ${divisions.find((d) => d.id === selectedDivisionId)?.name}`
                        : "");
                    const url = window.location.href;
                    try {
                      await initKakao();
                      const Kakao = (window as any).Kakao;
                      if (Kakao?.isInitialized?.() && Kakao.Share) {
                        Kakao.Share.sendDefault({
                          objectType: "feed",
                          content: {
                            title,
                            description: "대진표 확인하기",
                            imageUrl: "https://via.placeholder.com/600x315?text=Tournament", // 임시 썸네일
                            link: { mobileWebUrl: url, webUrl: url },
                          },
                          buttons: [
                            {
                              title: "대진표 보기",
                              link: { mobileWebUrl: url, webUrl: url },
                            },
                          ],
                        });
                      } else {
                        toast.error("카카오 공유를 사용할 수 없습니다. 개발자 콘솔 도메인·네트워크를 확인해 주세요.");
                      }
                    } catch {
                      toast.error("카카오 공유 중 오류가 발생했습니다");
                    }
                  })();
                }}
              >
                카카오 공유
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  const title =
                    tournament.name +
                    (divisions.find((d) => d.id === selectedDivisionId)?.name
                      ? ` - ${divisions.find((d) => d.id === selectedDivisionId)?.name}`
                      : "");
                  const url = window.location.href;
                  if ((navigator as any).share) {
                    try {
                      await (navigator as any).share({ title, text: "대진표 확인하기", url });
                    } catch {
                      // 취소 등 무시
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success("링크가 복사되었습니다");
                    } catch {
                      toast.error("공유 실패 — 링크 복사도 지원되지 않습니다");
                    }
                  }
                }}
              >
                공유
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success("링크가 복사되었습니다");
                  } catch {
                    toast.error("링크 복사에 실패했습니다");
                  }
                }}
              >
                링크 복사
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            {divisions.filter((d) => d.status === "published").map((d) => (
              <Link
                key={d.id}
                to={`/activity/federations/${federationSlug}/tournaments/${tournamentId}/divisions/${d.id}`}
                className={`px-3 py-1.5 rounded-md text-sm border ${
                  selectedDivisionId === d.id
                    ? "bg-primary-50 text-primary-700 border-primary-200"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                {d.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4" id="bracket">
          {rounds.length === 0 ? (
            <p className="text-sm text-gray-600">공개된 대진표가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-max flex items-start gap-4">
                {rounds.map((round) => (
                  <div key={round.order} className="w-72 rounded-lg border p-3 bg-white">
                    <div className="text-sm font-semibold text-gray-800 mb-2">[{round.name}]</div>
                    <div className="space-y-2">
                      {round.items.map((match) => (
                        <div key={match.id} className="relative rounded-lg border p-3">
                          <div className="text-sm text-gray-900">
                            {(match.homeTeam || "TBD")} vs {(match.awayTeam || "TBD")}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            점수: {match.homeScore ?? "-"} : {match.awayScore ?? "-"}
                            {match.winner ? ` · 승자: ${match.winner}` : ""}
                          </div>
                          {match.scheduledAt && <div className="text-xs text-gray-500 mt-1">시간: {match.scheduledAt}</div>}

                          {/* 간단한 브래킷 연결선: 다음 라운드가 있으면 오른쪽으로 연결 */}
                          {typeof match.nextMatchId === "string" && (
                            <>
                              {/* 가로선 */}
                              <div
                                className="absolute bg-gray-300"
                                style={{
                                  right: -16,
                                  top: "50%",
                                  transform: "translateY(-1px)",
                                  width: 16,
                                  height: 2,
                                }}
                              />
                              {/* ㄱ자 수직선(선택) — 기본 높이 32px 가정 */}
                              <div
                                className="absolute bg-gray-300"
                                style={{
                                  right: -16,
                                  top: match.nextSlot === "home" ? "calc(50% - 16px)" : "calc(50% + 0px)",
                                  width: 2,
                                  height: 16,
                                }}
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded bg-red-600 text-white text-xs font-semibold animate-pulse">
              LIVE
            </span>
            <h2 className="text-lg font-semibold text-red-700">실시간 경기</h2>
          </div>
          {liveMatches.length === 0 ? (
            <p className="text-sm text-red-700 mt-2">현재 진행 중인 경기가 없습니다.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {liveMatches.map((m) => (
                <div key={m.id} className="rounded-lg border border-red-200 bg-white p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-800">{m.homeTeam || "TBD"}</span>
                    <span className="font-bold text-xl text-red-600 animate-pulse">
                      {m.homeScore ?? 0} : {m.awayScore ?? 0}
                    </span>
                    <span className="text-gray-800">{m.awayTeam || "TBD"}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {m.group ? `${m.group} · ` : ""}
                    진행중
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">경기 일정</h2>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">오늘 경기</h3>
            {todayMatches.length === 0 ? (
              <p className="text-sm text-gray-600">오늘 예정된 경기가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {todayMatches.map((m) => (
                  <div key={`today-${m.id}`} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium text-gray-900">
                      {m.homeTeam || "TBD"} vs {m.awayTeam || "TBD"}
                    </p>
                    <p className="text-gray-600 mt-1">
                      {m.matchDate || "-"} {m.matchTime || "--:--"} · {m.venueName || "구장 미정"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">전체 일정</h3>
            {scheduleByDate.length === 0 ? (
              <p className="text-sm text-gray-600">등록된 일정이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {scheduleByDate.map(([date, rows]) => (
                  <div key={date} className="rounded-lg border p-3">
                    <p className="text-sm font-semibold text-gray-900 mb-2">{date}</p>
                    <div className="space-y-2">
                      {rows.map((m) => (
                        <div key={m.id} className="text-sm text-gray-700">
                          <span className="font-medium">{m.matchTime || "--:--"}</span>
                          {" · "}
                          {m.venueName || "구장 미정"}
                          {" · "}
                          {m.homeTeam || "TBD"} vs {m.awayTeam || "TBD"}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">토너먼트 브라켓</h2>
          {semiMatches.length === 0 && !finalMatch ? (
            <p className="text-sm text-gray-600">아직 생성된 4강/결승 경기가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-max flex items-start gap-8">
                <div className="w-72">
                  <h3 className="font-semibold text-gray-800 mb-2">4강</h3>
                  <div className="space-y-2">
                    {semiMatches.map((m) => {
                      const homeWin =
                        m.status === "completed" &&
                        typeof m.homeScore === "number" &&
                        typeof m.awayScore === "number" &&
                        m.homeScore > m.awayScore;
                      const awayWin =
                        m.status === "completed" &&
                        typeof m.homeScore === "number" &&
                        typeof m.awayScore === "number" &&
                        m.homeScore < m.awayScore;
                      return (
                        <div key={m.id} className="rounded-lg border p-3 bg-white">
                          <div className={`text-sm ${homeWin ? "font-semibold text-blue-700" : "text-gray-800"}`}>
                            {m.homeTeam || "TBD"} {m.homeScore ?? "-"}
                          </div>
                          <div className={`text-sm ${awayWin ? "font-semibold text-blue-700" : "text-gray-800"}`}>
                            {m.awayTeam || "TBD"} {m.awayScore ?? "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="w-72">
                  <h3 className="font-semibold text-gray-800 mb-2">결승</h3>
                  <div className="rounded-lg border p-3 bg-white">
                    {finalMatch ? (
                      <>
                        <div className="text-sm text-gray-800">
                          {finalMatch.homeTeam || "TBD"} {finalMatch.homeScore ?? "-"}
                        </div>
                        <div className="text-sm text-gray-800">
                          {finalMatch.awayTeam || "TBD"} {finalMatch.awayScore ?? "-"}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-600">결승 대진 대기중</p>
                    )}
                  </div>
                  {finalWinner && (
                    <div className="mt-3 text-base font-semibold text-blue-700">🏆 우승: {finalWinner}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">실시간 순위표</h2>
          {standingsByGroup.length === 0 ? (
            <p className="text-sm text-gray-600">완료된 경기 결과가 없어 순위를 계산할 수 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {standingsByGroup.map((g) => (
                <div key={g.group} className="rounded-lg border p-3">
                  <div className="font-semibold text-gray-900 mb-2">{g.group} 순위</div>
                  <div className="space-y-1">
                    {g.rows.map((row, idx) => (
                      <div key={row.teamId} className="flex items-center justify-between text-sm">
                        <span className={idx < 2 ? "font-semibold text-blue-700" : "text-gray-800"}>
                          {idx + 1}. {row.teamName}
                        </span>
                        <span className="text-gray-700">
                          {row.points}점 ({row.goalDiff >= 0 ? `+${row.goalDiff}` : row.goalDiff})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 참가 신청 모달 */}
        {showApply && (
          <div className="fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowApply(false)} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-none md:max-w-3xl rounded-xl border bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">참가 신청</h3>
                  <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowApply(false)}>
                    ✕
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">팀명 *</label>
                    <input
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      placeholder="예) 노원 유나이티드"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">대표자 *</label>
                      <input
                        value={managerName}
                        onChange={(e) => setManagerName(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        placeholder="대표자 성함"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">연락처 *</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm"
                        placeholder="010-1234-5678"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">참가 메모</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
                      placeholder="전달 사항이 있다면 남겨주세요"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowApply(false)}>
                    취소
                  </Button>
                  <Button
                    disabled={submitting}
                    onClick={async () => {
                      try {
                        if (!federationSlug || !tournamentId) return;
                        if (!teamName.trim() || !managerName.trim() || !phone.trim()) {
                          toast.error("필수 항목을 입력하세요");
                          return;
                        }
                        const auth = getAuth();
                        const user = auth.currentUser;
                        if (!user) {
                          toast.info("로그인 후 신청할 수 있습니다");
                          navigate("/login?next=" + encodeURIComponent(window.location.pathname + window.location.search));
                          return;
                        }
                        // 중복 신청 방지: 동일 리그 내 동일 팀명 pending 존재 여부 체크
                        {
                          const appsRef = collection(db, "federations", federationSlug, "leagues", tournamentId, "applications");
                          const qDup = query(appsRef, where("teamName", "==", teamName.trim()), where("status", "==", "pending"));
                          const snap = await (await import("firebase/firestore")).getDocs(qDup);
                          if (!snap.empty) {
                            toast.error("이미 접수된 신청이 있습니다.");
                            return;
                          }
                        }
                        setSubmitting(true);
                        await addDoc(
                          collection(db, "federations", federationSlug, "leagues", tournamentId, "applications"),
                          {
                            teamName: teamName.trim(),
                            managerName: managerName.trim(),
                            phone: phone.trim(),
                            note: note.trim() || "",
                            status: "pending",
                            createdAt: serverTimestamp(),
                            createdBy: user.uid,
                            divisionId: selectedDivisionId || null,
                          }
                        );
                        setSubmitting(false);
                        setShowApply(false);
                        setTeamName("");
                        setManagerName("");
                        setPhone("");
                        setNote("");
                        toast.success("신청이 접수되었습니다");
                      } catch {
                        setSubmitting(false);
                        toast.error("신청 접수에 실패했습니다");
                      }
                    }}
                  >
                    {submitting ? "신청 중..." : "신청하기"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

