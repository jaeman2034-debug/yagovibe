import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatRoomDoc {
  matchId?: string;
  hostTeamName?: string;
  opponentTeamName?: string;
  members?: string[];
  participants?: string[];
}

interface MatchMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt?: { toDate?: () => Date };
}

export default function MatchChatPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState<ChatRoomDoc | null>(null);
  const [messages, setMessages] = useState<MatchMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!roomId || !user?.uid) return;
    const roomRef = doc(db, "chatRooms", roomId);
    const unsub = onSnapshot(
      roomRef,
      (snap) => {
        if (!snap.exists()) {
          setRoom(null);
          setForbidden(true);
          setLoading(false);
          return;
        }
        const data = snap.data() as ChatRoomDoc;
        const members = data.members || data.participants || [];
        if (!members.includes(user.uid)) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        setRoom(data);
        setForbidden(false);
        setLoading(false);
      },
      () => {
        setForbidden(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [roomId, user?.uid]);

  useEffect(() => {
    if (!roomId || forbidden) return;
    const q = query(collection(db, "chatRooms", roomId, "messages"), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MatchMessage, "id">) }));
      setMessages(rows);
    });
    return () => unsub();
  }, [roomId, forbidden]);

  const roomTitle = useMemo(() => {
    if (!room) return "매칭 채팅";
    return `${room.hostTeamName || "호스트팀"} vs ${room.opponentTeamName || "상대팀"}`;
  }, [room]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!roomId || !user?.uid) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await addDoc(collection(db, "chatRooms", roomId, "messages"), {
        senderId: user.uid,
        text: trimmed,
        createdAt: serverTimestamp(),
      });
      setText("");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">채팅방 불러오는 중...</div>;
  if (forbidden) return <div className="min-h-screen flex items-center justify-center">접근 권한이 없습니다.</div>;
  if (!roomId) return <div className="min-h-screen flex items-center justify-center">잘못된 접근입니다.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-4 h-[calc(100vh-56px)] flex flex-col">
        <div className="rounded-xl border bg-white px-4 py-3 mb-3">
          <button type="button" className="text-sm text-gray-500 mb-1" onClick={() => navigate(-1)}>
            ← 뒤로가기
          </button>
          <h1 className="text-lg font-semibold">{roomTitle}</h1>
        </div>

        <div className="flex-1 rounded-xl border bg-white p-3 overflow-y-auto space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500">첫 메시지를 보내보세요.</p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === user?.uid;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="mt-3 flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지를 입력하세요" />
          <Button type="submit" disabled={sending || !text.trim()}>
            {sending ? "전송 중..." : "전송"}
          </Button>
        </form>
      </div>
    </div>
  );
}

