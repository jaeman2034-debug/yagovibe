import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";

export default function TeamList() {
    const [teams, setTeams] = useState<any[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "teams"), (snap) =>
            setTeams(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
        );
        return () => unsub();
    }, []);

    return (
        <div className="p-5 space-y-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">👥 팀 목록</h1>

            {teams.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-4xl mb-2">🏃</div>
                    <p className="text-gray-500 dark:text-gray-400">등록된 팀이 없습니다.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {teams.map((t) => (
                        <Link
                            key={t.id}
                            to={`/team/${t.id}`}
                            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition"
                        >
                            <img
                                src={t.logo || "/default_team.png"}
                                alt={t.name}
                                className="w-full aspect-square object-cover rounded-lg mb-2"
                            />
                            <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t.name}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.members?.length ?? 0}명</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

