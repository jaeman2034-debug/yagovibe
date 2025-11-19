import { Outlet, useLocation } from "react-router-dom";
import Header from "../layout/Header";
import BottomNav from "../components/BottomNav";
import VoiceAssistantButton from "../components/VoiceAssistantButton";
import { motion, AnimatePresence } from "framer-motion";

export default function MarketLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm dark:bg-gray-800/90">
        <Header />
      </header>

      <main className="w-full flex-1">
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
      </main>

      <footer className="w-full border-t bg-white dark:bg-gray-900/90">
        <BottomNav />
      </footer>

      <VoiceAssistantButton />
    </div>
  );
}
