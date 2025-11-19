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
        <section className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
            <h1 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100">👥 팀 목록</h1>

            {teams.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="mb-2 text-4xl">🏃</div>
                    <p className="text-gray-500 dark:text-gray-400">등록된 팀이 없습니다.</p>
                </div>
            ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {teams.map((t) => (
                        <Link
                            key={t.id}
                            to={`/team/${t.id}`}
                                className="rounded-lg bg-white p-4 shadow-md transition hover:shadow-lg dark:bg-gray-800"
                        >
                            <img
                                src={t.logo || "/default_team.png"}
                                alt={t.name}
                                    className="mb-2 aspect-square w-full rounded-lg object-cover"
                            />
                            <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t.name}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t.members?.length ?? 0}명</p>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

