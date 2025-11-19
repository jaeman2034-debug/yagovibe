import { Home, ShoppingBag, Users, Map, MapPin } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const navs = [
    { path: "/home", icon: Home, label: "홈" },
    { path: "/voice-map", icon: Map, label: "지도" },
    { path: "/app/market", icon: ShoppingBag, label: "마켓" },
    { path: "/app/facility", icon: MapPin, label: "시설" },
    { path: "/app/team", icon: Users, label: "팀" },
];

export default function BottomNav() {
    const location = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 w-full z-50 bg-white shadow-md flex justify-around items-center h-16 dark:bg-gray-800/90 border-t border-gray-200 dark:border-gray-700">
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

