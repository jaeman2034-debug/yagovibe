import React from "react";
import { cn } from "@/lib/utils";
import RecruitGroupMessageItem from "@/pages/chat/components/RecruitGroupMessageItem";
import NoticeMessageCard from "@/pages/chat/components/NoticeMessageCard";
import EventMessageCard from "@/pages/chat/components/EventMessageCard";
import SummaryMessageCard from "@/pages/chat/components/SummaryMessageCard";
import ReportMessageCard from "@/pages/chat/components/ReportMessageCard";

export interface RecruitGroupMessage {
  id: string;
  senderId?: string;
  text?: string;
  type?: string;
  images?: unknown[];
  videos?: unknown[];
  createdAt?: unknown;
  noticeId?: string;
  /** 이벤트 장소(string) 또는 위치 공유(lat,lng) */
  location?: string | { lat: number; lng: number; address?: string };
  title?: string;
  content?: string;
  isPinned?: boolean;
  eventId?: string;
  description?: string;
  date?: string;
  attendees?: string[];
  declined?: string[];
  summaryText?: string;
  reportId?: string;
  month?: string;
  totalMessages?: number;
  activeMembers?: number;
  eventsCreated?: number;
  topMemberId?: string;
  topMemberName?: string;
  topMemberScore?: number;
  readBy?: string[];
  seq?: number;
  reactions?: { [emoji: string]: string[] };
}

export interface ChatRoomForRenderer {
  teamId?: string;
  [key: string]: unknown;
}

interface RecruitGroupMessageRendererProps {
  messages: RecruitGroupMessage[];
  roomId: string;
  room: ChatRoomForRenderer | null | undefined;
  myUid: string;
  /** 알림 `?messageId=` 하이라이트 */
  highlightedMessageId?: string | null;
}

function highlightRowClass(messageId: string, highlightedMessageId?: string | null) {
  return highlightedMessageId && String(messageId) === String(highlightedMessageId)
    ? "rounded-xl ring-2 ring-blue-300/95 bg-blue-50/90 shadow-sm transition-colors duration-700 dark:bg-blue-950/40 dark:ring-blue-400/75"
    : "";
}

/**
 * 모집/팀 채팅 메시지 렌더러
 * NoticeMessageCard, EventMessageCard, SummaryMessageCard, ReportMessageCard, RecruitGroupMessageItem 처리
 */
export function RecruitGroupMessageRenderer({
  messages,
  roomId,
  room,
  myUid,
  highlightedMessageId,
}: RecruitGroupMessageRendererProps) {
  return (
    <>
      {messages.map((m) => {
        if (m.type === "notice") {
          return (
            <div key={m.id} style={{ marginBottom: 12 }}>
              <NoticeMessageCard
                noticeId={m.noticeId || ""}
                title={m.title || "공지"}
                content={m.content || ""}
                isPinned={m.isPinned || false}
                teamId={room?.teamId}
              />
            </div>
          );
        }

        if (m.type === "event") {
          return (
            <div
              key={m.id}
              data-message-id={m.id}
              className={cn(highlightRowClass(m.id, highlightedMessageId))}
              style={{ marginBottom: 12 }}
            >
              <EventMessageCard
                eventId={m.eventId || ""}
                teamId={room?.teamId || ""}
                title={m.title || "이벤트"}
                description={m.description}
                date={m.date}
                location={typeof m.location === "string" ? m.location : undefined}
                initialAttendees={m.attendees || []}
                initialDeclined={m.declined || []}
              />
            </div>
          );
        }

        if (m.type === "summary") {
          return (
            <div
              key={m.id}
              data-message-id={m.id}
              className={cn(highlightRowClass(m.id, highlightedMessageId))}
              style={{ marginBottom: 12 }}
            >
              <SummaryMessageCard
                summaryText={m.summaryText || ""}
                date={m.date || ""}
              />
            </div>
          );
        }

        if (m.type === "report") {
          return (
            <div
              key={m.id}
              data-message-id={m.id}
              className={cn(highlightRowClass(m.id, highlightedMessageId))}
              style={{ marginBottom: 12 }}
            >
              <ReportMessageCard
                reportId={m.reportId || ""}
                teamId={room?.teamId}
                month={m.month || ""}
                totalMessages={m.totalMessages || 0}
                activeMembers={m.activeMembers || 0}
                eventsCreated={m.eventsCreated || 0}
                topMemberId={m.topMemberId}
                topMemberName={m.topMemberName}
                topMemberScore={m.topMemberScore}
              />
            </div>
          );
        }

        return (
          <div key={m.id} data-message-id={m.id} className={cn(highlightRowClass(m.id, highlightedMessageId))}>
          <RecruitGroupMessageItem
            roomId={roomId}
            message={{
              id: m.id,
              senderId: m.senderId || "",
              text: m.text,
              type: m.type || (!m.senderId ? "system" : "message"),
              images: m.images,
              videos: m.videos,
              createdAt: m.createdAt,
              location: m.location,
              readBy: m.readBy,
              seq: m.seq,
              reactions: m.reactions,
            }}
            myUid={myUid}
            room={room}
          />
          </div>
        );
      })}
    </>
  );
}
