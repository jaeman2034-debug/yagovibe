import { Home, ShoppingBag, Users, Map, BarChart3 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const navs = [
    { path: "/home", icon: Home, label: "홈" },
    { path: "/voice-map", icon: Map, label: "지도" },
    { path: "/facility", icon: Map, label: "시설" },
    { path: "/voice-assistant", icon: BarChart3, label: "AI" },
    { path: "/admin", icon: BarChart3, label: "관리" },
];

export default function BottomNav() {
    const location = useLocation();

    return (
        <nav className="flex justify-around items-center h-16 bg-white/90 dark:bg-gray-800/90 shadow-lg backdrop-blur-md sticky bottom-0 z-40 border-t border-gray-200 dark:border-gray-700">
            {navs.map((nav) => {
                const Icon = nav.icon;
                const isActive = location.pathname === nav.path;

                return (
                    <NavLink
                        key={nav.path}
                        to={nav.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center space-y-1 transition-all duration-200 ${isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            }`
                        }
                    >
                        <Icon size={20} className={isActive ? "scale-110" : ""} />
                        <span className="text-xs font-medium">{nav.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
}

