import ChatListPage from "./ChatListPage";
import ChatRoomPage from "./ChatRoomPage";
import { useParams } from "react-router-dom";

export default function ChatLayoutPage() {
  const { chatId } = useParams<{ chatId?: string }>();
  return (
    <div className="h-screen flex w-full">
      {/* 좌측 리스트 (데스크탑 전용) */}
      <div className="hidden md:block w-[320px] border-r">
        <ChatListPage />
      </div>
      {/* 우측 채팅 */}
      <div className="flex-1 flex flex-col">
        {chatId ? (
          <ChatRoomPage />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            채팅을 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}

