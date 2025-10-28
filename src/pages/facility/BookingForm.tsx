import { useState } from "react";
import { db } from "../../lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";

export default function BookingForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [note, setNote] = useState("");
    const [loading, setLoading] = useState(false);

    const book = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setLoading(true);
        try {
            await addDoc(collection(db, `facilities/${id}/bookings`), {
                uid: user?.uid,
                date,
                time,
                note,
                createdAt: serverTimestamp(),
            });
            alert("예약이 등록되었습니다 ✅");
            setDate("");
            setTime("");
            setNote("");
            navigate("/facility");
        } catch (error) {
            console.error("예약 오류:", error);
            alert("예약 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-5 space-y-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">📅 예약하기</h1>

            <form onSubmit={book} className="space-y-3">
                <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        예약 날짜
                    </label>
                    <input
                        type="date"
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-gray-100"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        예약 시간
                    </label>
                    <input
                        type="time"
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-gray-100"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        메모 (선택)
                    </label>
                    <textarea
                        placeholder="예: 인원 수, 특이사항 등"
                        className="w-full border rounded-lg p-2 dark:bg-gray-700 dark:text-gray-100"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "예약 중..." : "예약 등록"}
                </button>
            </form>

            <button
                onClick={() => navigate(-1)}
                className="block w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                취소
            </button>
        </div>
    );
}

