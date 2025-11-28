import { Outlet } from "react-router-dom";
import Header from "./Header";
import BottomNav from "../components/BottomNav";
import VoiceAssistantButton from "../components/VoiceAssistantButton";

export default function MainLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-[#F9FAFB] text-gray-900">
            {/* 🟦 헤더 = full width (전체 폭, max-width 제약 없음) */}
            <Header />

            {/* 🟨 콘텐츠: 각 페이지에서 자체 max-width 관리 */}
            <main className="flex-1 w-full px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8 lg:pt-5 pb-28">
                <Outlet />
            </main>

            {/* 🟦 하단 네비 = full width (전체 폭, fixed로 화면 끝까지) */}
            <BottomNav />

            {/* 떠 있는 음성 버튼 */}
            <VoiceAssistantButton />
        </div>
    );
}
