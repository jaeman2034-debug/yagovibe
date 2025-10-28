import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function EventList() {
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "events"), (snap) =>
            setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
        );
        return () => unsub();
    }, []);

    return (
        <div className="p-5 space-y-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📅 전체 이벤트</h1>

            {events.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">등록된 이벤트가 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((e) => (
                        <div
                            key={e.id}
                            className="border rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition"
                        >
                            <h3 className="font-semibold text-gray-800 dark:text-gray-100">{e.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {e.createdAt?.seconds
                                    ? new Date(e.createdAt.seconds * 1000).toLocaleString()
                                    : "날짜 미지정"
                                }
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

