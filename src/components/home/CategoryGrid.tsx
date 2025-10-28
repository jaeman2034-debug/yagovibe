import { Link } from "react-router-dom";
import { ShoppingBag, Users, CalendarDays, MapPin, BarChart3 } from "lucide-react";

const categories = [
    { label: "마켓", path: "/market", icon: ShoppingBag },
    { label: "팀", path: "/team", icon: Users },
    { label: "이벤트", path: "/event", icon: CalendarDays },
    { label: "시설", path: "/facility", icon: MapPin },
    { label: "관리", path: "/admin", icon: BarChart3 },
];

export default function CategoryGrid() {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 w-full max-w-4xl">
            {categories.map((c) => {
                const Icon = c.icon;
                return (
                    <Link
                        key={c.label}
                        to={c.path}
                        className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl py-4 shadow-sm hover:shadow-md transition-all"
                    >
                        <Icon size={28} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium mt-1 text-gray-700 dark:text-gray-300">{c.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}

