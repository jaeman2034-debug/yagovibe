import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { db } from "../../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function FacilityDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [facility, setFacility] = useState<any>(null);

    useEffect(() => {
        if (!id) return;
        getDoc(doc(db, "facilities", id)).then((snap) => {
            if (snap.exists()) {
                setFacility(snap.data());
            }
        });
    }, [id]);

    if (!facility) return <div className="p-6 text-center">Loading...</div>;

    return (
        <div className="p-5 space-y-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg max-w-2xl mx-auto">
            <img
                src={facility.image || "/facility_default.jpg"}
                className="w-full rounded-xl"
                alt={facility.name}
            />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{facility.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{facility.address}</p>
            <p className="text-blue-600 dark:text-blue-400 font-semibold">📞 {facility.tel || "연락처 없음"}</p>

            {facility.category && (
                <div className="flex items-center space-x-2">
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                        📦 {facility.category}
                    </span>
                </div>
            )}

            <Link
                to={`/facility/${id}/booking`}
                className="block w-full py-3 bg-blue-600 text-white text-center rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
                📅 예약하기
            </Link>

            <button
                onClick={() => navigate(-1)}
                className="block w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                뒤로가기
            </button>
        </div>
    );
}

