import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { useParams } from "react-router-dom";
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
// import { useAuth } from "../../context/AuthProvider";

export default function TeamDetail() {
    const { id } = useParams();
    // const { user } = useAuth();
    const [team, setTeam] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [newEvent, setNewEvent] = useState("");

    useEffect(() => {
        if (!id) return;

        getDoc(doc(db, "teams", id)).then((snap) => setTeam(snap.data()));

        const q = collection(db, `teams/${id}/events`);
        const unsub = onSnapshot(q, (snap) =>
            setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
        );

        return () => unsub();
    }, [id]);

    const addEvent = async () => {
        if (!newEvent.trim() || !id) return;
        await addDoc(collection(db, `teams/${id}/events`), {
            title: newEvent,
            createdAt: serverTimestamp(),
        });
        setNewEvent("");
    };

    if (!team) return <div className="p-6 text-center">Loading...</div>;

    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center space-x-3">
                <img
                    src={team.logo}
                    alt={team.name}
                    className="w-16 h-16 rounded-full border-2 border-gray-300 dark:border-gray-700"
                />
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{team.name}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{team.members?.length ?? 0} 명</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
                <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">📅 팀 이벤트</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {events.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">등록된 일정이 없습니다.</p>
                    ) : (
                        events.map((e) => (
                            <div
                                key={e.id}
                                className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex justify-between items-center"
                            >
                                <p className="text-sm text-gray-800 dark:text-gray-100">{e.title}</p>
                                <p className="text-xs text-gray-400">
                                    {e.createdAt?.seconds
                                        ? new Date(e.createdAt.seconds * 1000).toLocaleDateString()
                                        : "날짜 미지정"
                                    }
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex gap-2">
                <input
                    value={newEvent}
                    onChange={(e) => setNewEvent(e.target.value)}
                    placeholder="새 일정 입력"
                    className="flex-1 border rounded-lg p-2 dark:bg-gray-700 dark:text-gray-100"
                    onKeyPress={(e) => e.key === 'Enter' && addEvent()}
                />
                <button
                    onClick={addEvent}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    추가
                </button>
            </div>
        </div>
    );
}

