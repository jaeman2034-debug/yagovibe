import FacilityMap from "../components/FacilityMap";
import CenterLayout from "@/layouts/CenterLayout";

export default function Facility() {
    return (
        <CenterLayout>
            <section className="space-y-6">
                <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white shadow-lg">
                    <h1 className="mb-3 text-4xl font-bold">🏟️ 체육시설 탐색</h1>
                    <p className="text-lg opacity-90">주변 경기장, 체육공원, 구장 예약 현황을 확인하세요.</p>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-md">
                    <h2 className="mb-4 text-2xl font-bold text-gray-800">📍 주변 체육시설</h2>
                    <FacilityMap />
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    <div className="rounded-xl bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
                        <div className="mb-3 text-3xl">⚽</div>
                        <h3 className="mb-2 text-lg font-bold">축구장</h3>
                        <p className="text-sm text-gray-600">주변 축구장 위치와 예약 현황</p>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
                        <div className="mb-3 text-3xl">🏀</div>
                        <h3 className="mb-2 text-lg font-bold">농구장</h3>
                        <p className="text-sm text-gray-600">농구 코트와 체육관 정보</p>
                    </div>

                    <div className="rounded-xl bg-white p-6 shadow-md transition-shadow hover:shadow-lg">
                        <div className="mb-3 text-3xl">🏃</div>
                        <h3 className="mb-2 text-lg font-bold">운동 공원</h3>
                        <p className="text-sm text-gray-600">러닝 트랙과 운동 시설</p>
                    </div>
                </div>

                <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
                    <h3 className="mb-3 text-lg font-bold text-blue-800">🎙️ 음성으로 빠르게 찾기</h3>
                    <p className="text-gray-700">"축구장 찾아줘", "근처 농구장 보여줘"라고 말씀하시면 즉시 검색됩니다!</p>
                </div>
            </section>
        </CenterLayout>
    );
}
