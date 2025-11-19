import { Link } from "react-router-dom";
import { ShoppingBag, MapPin, Users, BarChart3, CalendarDays } from "lucide-react";

export default function CategoryGrid() {
    return (
        <div className="mt-8 w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 text-center">
                {/* 🛍️ 마켓 */}
                <Link
                    to="/app/market"
                    className="flex flex-col items-center space-y-2 transition-transform hover:scale-105"
                    aria-label="마켓 페이지로 이동"
                >
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full shadow-sm hover:shadow-md transition">
                        <ShoppingBag className="text-blue-600 dark:text-blue-400 w-7 h-7" />
                    </div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">마켓</span>
                </Link>

                {/* 📍 시설 */}
                <Link
                    to="/app/facility"
                    className="flex flex-col items-center space-y-2 transition-transform hover:scale-105"
                    aria-label="시설 페이지로 이동"
                >
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full shadow-sm hover:shadow-md transition">
                        <MapPin className="text-blue-600 dark:text-blue-400 w-7 h-7" />
                    </div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">시설</span>
                </Link>

                {/* 👥 팀 */}
                <Link
                    to="/app/team"
                    className="flex flex-col items-center space-y-2 transition-transform hover:scale-105"
                    aria-label="팀 페이지로 이동"
                >
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full shadow-sm hover:shadow-md transition">
                        <Users className="text-blue-600 dark:text-blue-400 w-7 h-7" />
                    </div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">팀</span>
                </Link>

                {/* 📊 관리 */}
                <Link
                    to="/app/admin"
                    className="flex flex-col items-center space-y-2 transition-transform hover:scale-105"
                    aria-label="관리 페이지로 이동"
                >
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full shadow-sm hover:shadow-md transition">
                        <BarChart3 className="text-blue-600 dark:text-blue-400 w-7 h-7" />
                    </div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">관리</span>
                </Link>

                {/* 📅 이벤트 */}
                <Link
                    to="/app/event"
                    className="flex flex-col items-center space-y-2 transition-transform hover:scale-105"
                    aria-label="이벤트 페이지로 이동"
                >
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-full shadow-sm hover:shadow-md transition">
                        <CalendarDays className="text-blue-600 dark:text-blue-400 w-7 h-7" />
                    </div>
                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">이벤트</span>
                </Link>
            </div>
        </div>
    );
}

