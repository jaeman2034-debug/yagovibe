import FacilityMap from "../components/FacilityMap";

export default function Facility() {
    return (
        <section className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-2xl shadow-lg">
                <h1 className="text-4xl font-bold mb-3">🏟️ 체육시설 탐색</h1>
                <p className="text-lg opacity-90">
                    주변 경기장, 체육공원, 구장 예약 현황을 확인하세요.
                </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">📍 주변 체육시설</h2>
                <FacilityMap />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="text-3xl mb-3">⚽</div>
                    <h3 className="font-bold text-lg mb-2">축구장</h3>
                    <p className="text-gray-600 text-sm">
                        주변 축구장 위치와 예약 현황
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="text-3xl mb-3">🏀</div>
                    <h3 className="font-bold text-lg mb-2">농구장</h3>
                    <p className="text-gray-600 text-sm">
                        농구 코트와 체육관 정보
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                    <div className="text-3xl mb-3">🏃</div>
                    <h3 className="font-bold text-lg mb-2">운동 공원</h3>
                    <p className="text-gray-600 text-sm">
                        러닝 트랙과 운동 시설
                    </p>
                </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
                <h3 className="font-bold text-lg mb-3 text-blue-800">🎙️ 음성으로 빠르게 찾기</h3>
                <p className="text-gray-700">
                    "축구장 찾아줘", "근처 농구장 보여줘"라고 말씀하시면 즉시 검색됩니다!
                </p>
            </div>
        </section>
    );
}
