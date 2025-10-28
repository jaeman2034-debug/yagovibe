import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { Sun, Moon, User } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
    const { user } = useAuth();
    const [dark, setDark] = useState(false);

    useEffect(() => {
        if (dark) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
    }, [dark]);

    return (
        <header className="flex justify-between items-center px-5 py-3 bg-white/80 dark:bg-gray-800/80 shadow-sm backdrop-blur-md sticky top-0 z-50">
            <Link to="/home" className="flex items-center space-x-3 group">
                <span className="text-3xl">⚽</span>
                <h1 className="font-bold text-xl text-blue-600 dark:text-blue-400 group-hover:text-blue-700 transition-colors">
                    YAGO VIBE
                </h1>
            </Link>

            <div className="flex items-center space-x-3">
                <button
                    onClick={() => setDark(!dark)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Toggle dark mode"
                >
                    {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                {user && (
                    <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <User size={20} />
                    </button>
                )}
            </div>
        </header>
    );
}
