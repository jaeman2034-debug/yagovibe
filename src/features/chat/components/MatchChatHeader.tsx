/**
 * 경기 매칭 스레드(chatRooms/match_*) 전용 헤더 — 거래 UI(상품·판매 종료)와 분리
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/firebase";
import type { ChatRoomDoc } from "@/features/chat/hooks/useChatRoom";
import { toDate } from "@/utils/timeUtils";

type Props = {
  chatRoomId: string;
  room: ChatRoomDoc | null;
};

export function MatchChatHeader({ chatRoomId, room }: Props) {
  const navigate = useNavigate();

  const matchId = useMemo(() => {
    const fromRoom = String((room as { matchId?: string })?.matchId || "").trim();
    if (fromRoom) return fromRoom;
    return chatRoomId.startsWith("match_") ? chatRoomId.slice("match_".length) : "";
  }, [room, chatRoomId]);

  const hostName = String((room as { hostTeamName?: string })?.hostTeamName || "").trim() || "호스트 팀";
  const oppName = String((room as { opponentTeamName?: string })?.opponentTeamName || "").trim();

  const titleLine = oppName ? `${hostName} vs ${oppName}` : `${hostName} · 매칭 협의`;

  const [meta, setMeta] = useState<{
    dateLabel: string;
    region: string;
    status: string;
  }>({ dateLabel: "", region: "", status: "" });

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    void getDoc(doc(db, "matches", matchId)).then((snap) => {
      if (cancelled || !snap.exists()) return;
      const d = snap.data() as {
        date?: unknown;
        time?: string;
        matchRegion?: string;
        region?: string;
        stadium?: string;
        status?: string;
      };
      const dt = toDate(d.date);
      let dateLabel = "";
      if (dt && !Number.isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, "0");
        const da = String(dt.getDate()).padStart(2, "0");
        const t = String(d.time || "").trim();
        dateLabel = t ? `${y}.${mo}.${da} ${t}` : `${y}.${mo}.${da}`;
      }
      const region =
        String(d.matchRegion || d.region || "").trim() ||
        String(d.stadium || "").trim();
      setMeta({
        dateLabel,
        region,
        status: String(d.status || "").trim(),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const banner = useMemo(() => {
    switch (meta.status) {
      case "open":
        return "모집 중입니다. 일정·장소는 이 채팅에서 자유롭게 맞춰 주세요.";
      case "matched":
        return "매칭이 확정되었습니다. 경기 일정과 장소를 확정해 주세요.";
      case "finished":
        return "경기가 종료되었습니다. 대화는 계속할 수 있습니다.";
      default:
        return "상대와 경기 일정·장소를 협의하세요.";
    }
  }, [meta.status]);

  return (
    <div
      className="sticky top-[var(--header-h,48px)] z-10 border-b border-gray-200 bg-white shadow-sm"
      data-match-chat-header
    >
      <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="shrink-0 rounded-full p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          aria-label="뒤로"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-gray-900">{titleLine}</h2>
          {(meta.dateLabel || meta.region) && (
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {meta.dateLabel ? (
                <>
                  <span aria-hidden>📅 </span>
                  {meta.dateLabel}
                </>
              ) : null}
              {meta.dateLabel && meta.region ? " · " : null}
              {meta.region ? (
                <>
                  <span aria-hidden>📍 </span>
                  {meta.region}
                </>
              ) : null}
            </p>
          )}
        </div>
        {matchId ? (
          <button
            type="button"
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
            onClick={() => navigate(`/match/${matchId}`)}
          >
            글 보기
          </button>
        ) : null}
      </div>
      <div className="border-t border-blue-100 bg-blue-50 px-3 py-1.5 text-xs leading-snug text-blue-900 sm:px-4">
        {banner}
      </div>
    </div>
  );
}
