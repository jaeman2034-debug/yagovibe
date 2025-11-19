import { Outlet } from "react-router-dom";
import Header from "./Header";
import BottomNav from "../components/BottomNav";
import VoiceAssistantButton from "../components/VoiceAssistantButton";

export default function MainLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-[#F9FAFB] text-gray-900">
            {/* 상단 헤더 */}
            <Header />

            {/* 콘텐츠 영역 - 중앙 카드 박스 */}
            <main className="flex-1 w-full flex justify-center px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8 lg:pt-5 pb-28">
                <div className="w-full max-w-[900px] bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 sm:p-10">
                    <Outlet />
                </div>
            </main>

            {/* 하단 네비게이션 */}
            <BottomNav />

            {/* 떠 있는 음성 버튼 */}
            <VoiceAssistantButton />
        </div>
    );
}
