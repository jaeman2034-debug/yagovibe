import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";

export default function ChatRoom() {
    const { id } = useParams();
    const { user } = useAuth();
    const [msgs, setMsgs] = useState<any[]>([]);
    const [text, setText] = useState("");

    useEffect(() => {
        if (!id) return;
        const q = query(collection(db, `chats/${id}/messages`), orderBy("createdAt", "asc"));
        return onSnapshot(q, (snap) =>
            setMsgs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
        );
    }, [id]);

    const send = async () => {
        if (!text.trim() || !id) return;
        await addDoc(collection(db, `chats/${id}/messages`), {
            uid: user?.uid,
            text,
            createdAt: serverTimestamp(),
        });
        setText("");
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {msgs.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                        <p>아직 메시지가 없습니다.</p>
                        <p className="text-sm mt-2">판매자와의 첫 대화를 시작해보세요!</p>
                    </div>
                ) : (
                    msgs.map((m) => (
                        <div
                            key={m.id}
                            className={`max-w-xs p-3 rounded-lg ${m.uid === user?.uid
                                    ? "ml-auto bg-blue-600 text-white"
                                    : "mr-auto bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                }`}
                        >
                            {m.text}
                        </div>
                    ))
                )}
            </div>
            <div className="p-3 flex gap-2 border-t bg-white dark:bg-gray-800">
                <input
                    className="flex-1 border rounded-lg p-2 dark:bg-gray-700 dark:text-gray-100"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    onKeyPress={(e) => e.key === 'Enter' && send()}
                />
                <button
                    onClick={send}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    전송
                </button>
            </div>
        </div>
    );
}

