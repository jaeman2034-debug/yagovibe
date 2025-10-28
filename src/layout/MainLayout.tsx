import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import BottomNav from "../components/BottomNav";
import VoiceAssistantButton from "../components/VoiceAssistantButton";
import { motion, AnimatePresence } from "framer-motion";

export default function MainLayout() {
    const location = useLocation();

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
            <Header />
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </div>
            <BottomNav />
            <VoiceAssistantButton /> {/* 전역 음성비서 - 플로팅 버튼 */}
        </div>
    );
}
