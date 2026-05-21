import React from "react";
import { SystemMessage } from "./SystemMessage";
import { LocationMessage } from "./LocationMessage";
import { TextMessage } from "./TextMessage";
import { ImageMessage } from "./ImageMessage";
import { VideoMessage } from "./VideoMessage";

export interface TradeMessage {
  id: string;
  senderId: string;
  text?: string;
  type?: string;
  images?: Array<{ url: string; thumbUrl: string; width: number; height: number }>;
  videos?: Array<{ url: string; thumbUrl: string; duration: number; size: number }>;
  location?: { lat: number; lng: number; address?: string };
  pending?: boolean;
  systemType?: boolean;
}

export interface MediaViewerApi {
  show: (items: Array<{ kind: "image" | "video"; url: string; thumbUrl: string; [key: string]: unknown }>, index: number) => void;
}

interface TradeMessageRendererProps {
  messages: TradeMessage[];
  myUid: string;
  mediaViewer: MediaViewerApi;
}

/**
 * 중고거래 채팅 메시지 렌더러
 * SystemMessage, LocationMessage, VideoMessage, ImageMessage, TextMessage 처리
 */
export function TradeMessageRenderer({ messages, myUid, mediaViewer }: TradeMessageRendererProps) {
  return (
    <>
      {messages.map((m, idx) => {
        const isMine = m.senderId === myUid;
        const prev = idx > 0 ? messages[idx - 1] : undefined;
        const isSameUser = prev && prev.senderId === m.senderId;
        const within2Min = (() => {
          try {
            const ct = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
            const pt = prev?.createdAt?.toDate ? prev.createdAt.toDate() : (prev?.createdAt ? new Date(prev.createdAt) : null);
            if (!pt) return false;
            return Math.abs(ct.getTime() - pt.getTime()) < 2 * 60 * 1000;
          } catch {
            return false;
          }
        })();
        const compact = !!(isSameUser && within2Min);

        if (m.type === "system" || m.systemType) {
          return <SystemMessage key={m.id} text={m.text || ""} />;
        }

        if (m.location) {
          return (
            <LocationMessage
              key={m.id}
              location={m.location}
              isMine={isMine}
            />
          );
        }

        if (m.type === "video" && m.videos && m.videos.length > 0) {
          return (
            <VideoMessage
              key={m.id}
              videos={m.videos}
              images={m.images}
              text={m.text && m.text !== "동영상을 보냈습니다" ? m.text : undefined}
              isMine={isMine}
              mediaViewer={mediaViewer}
            />
          );
        }

        if (m.type === "image" && m.images && m.images.length > 0) {
          return (
            <ImageMessage
              key={m.id}
              images={m.images}
              videos={m.videos}
              text={m.text && m.text !== "사진을 보냈습니다" ? m.text : undefined}
              isMine={isMine}
              mediaViewer={mediaViewer}
            />
          );
        }

        const isPending = m.pending || m.id.startsWith("temp-");
        return (
          <TextMessage
            key={m.id}
            text={m.text || ""}
            isMine={isMine}
            isPending={isPending}
            createdAt={m.createdAt}
            readBy={(m as any).readBy}
            compact={compact}
          />
        );
      })}
    </>
  );
}
