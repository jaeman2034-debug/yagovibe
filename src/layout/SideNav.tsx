import { Link, useLocation } from "react-router-dom";

const navItems = [
    { path: "/start", icon: "🎙️", label: "음성 가입" },
    { path: "/home", icon: "🏠", label: "홈" },
    { path: "/voice-map", icon: "🗺️", label: "지도" },
    { path: "/facility", icon: "🏟️", label: "체육시설" },
    { path: "/voice-assistant", icon: "🤖", label: "AI 어시스턴트" },
    { path: "/admin", icon: "📊", label: "관리자" },
];

export default function SideNav() {
    const location = useLocation();

    return (
        <aside className="w-64 bg-white shadow-md">
            <nav className="p-4 space-y-2">
                <div className="mb-6 px-4">
                    <h2 className="font-bold text-lg text-gray-800">메뉴</h2>
                </div>

                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                    ? "bg-blue-100 text-blue-700 font-semibold"
                                    : "text-gray-700 hover:bg-gray-100 hover:text-blue-600"
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}

                <div className="mt-8 p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg">
                    <p className="text-sm font-semibold mb-2">💡 음성 명령</p>
                    <p className="text-xs opacity-90">
                        "마이크"를 눌러 음성으로 빠르게 이동하세요!
                    </p>
                </div>
            </nav>
        </aside>
    );
}
