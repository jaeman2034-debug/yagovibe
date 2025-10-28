import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import AIWelcomeCard from "../../components/home/AIWelcomeCard";
import CategoryGrid from "../../components/home/CategoryGrid";
import QuickReportCard from "../../components/home/QuickReportCard";
import AdminSummaryChart from "../../components/AdminSummaryChart";
import AIWeeklySummary from "../../components/AIWeeklySummary";
import ReportPDFButton from "../../components/ReportPDFButton";
import WeeklyReportPDFCard from "../../components/WeeklyReportPDFCard";
import { useSpeech } from "../../hooks/useSpeech";
import { useNavigate } from "react-router-dom";

// 최신 월요일 날짜 계산 (YYYY-MM-DD 형식)
const getLatestMondayDate = (): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - daysSinceMonday);

    // 지난주 월요일 계산 (리포트는 지난주 것)
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    return lastMonday.toISOString().split("T")[0];
};

export default function Home() {
    const { user } = useAuth();
    const { speak } = useSpeech();
    const navigate = useNavigate();
    const [userData, setUserData] = useState<any>(null);
    const [weather, setWeather] = useState<string>("불러오는 중...");
    const [recommend, setRecommend] = useState<string>("AI가 분석 중입니다...");
    const [weeklyReport, setWeeklyReport] = useState<string | null>(null);

    // 🌤️ 날씨 API (Open-Meteo, 위치 기반)
    const fetchWeather = async (lat: number, lng: number): Promise<string> => {
        try {
            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=Asia/Seoul`
            );
            const data = await res.json();
            if (data.current_weather) {
                const temp = Math.round(data.current_weather.temperature);
                const weatherCode = data.current_weather.weathercode;
                // WMO Weather interpretation codes (0-9)
                let desc = "맑음";
                if (weatherCode >= 1 && weatherCode <= 3) desc = "맑음";
                else if (weatherCode >= 45 && weatherCode <= 49) desc = "안개";
                else if (weatherCode >= 51 && weatherCode <= 67) desc = "비";
                else if (weatherCode >= 71 && weatherCode <= 77) desc = "눈";
                else if (weatherCode >= 80 && weatherCode <= 86) desc = "소나기";
                else if (weatherCode >= 95 && weatherCode <= 99) desc = "천둥번개";

                return `${desc}, ${temp}°C`;
            }
            return "날씨 정보 없음";
        } catch (error) {
            console.error("날씨 API 오류:", error);
            return "날씨 정보를 불러올 수 없습니다.";
        }
    };

    useEffect(() => {
        const loadUserData = async () => {
            if (user?.uid) {
                try {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserData(data);

                        // 🔥 맞춤형 환영 음성 + 날씨 + 추천 운동
                        const nickname = data.nickname || data.name || "게스트";
                        const favoriteSport = data.favoriteSports?.[0] || "스포츠";

                        // 위치 파싱 및 날씨 가져오기
                        let weatherInfo = "날씨 정보 없음";
                        if (data.location && data.location !== "위치 정보 없음") {
                            try {
                                const [latStr, lngStr] = data.location
                                    .replace("lat:", "")
                                    .replace("lng:", "")
                                    .split(",")
                                    .map((v: string) => v.trim());
                                const lat = parseFloat(latStr);
                                const lng = parseFloat(lngStr);
                                if (!isNaN(lat) && !isNaN(lng)) {
                                    weatherInfo = await fetchWeather(lat, lng);
                                    setWeather(weatherInfo);
                                }
                            } catch (err) {
                                console.error("위치 파싱 오류:", err);
                            }
                        }

                        // 추천 운동 생성
                        const recommendText = `${favoriteSport} 30분 추천드립니다.`;
                        setRecommend(recommendText);

                        // 📊 최신 주간 리포트 확인
                        try {
                            const reportsRef = doc(db, "reports", user.uid, "weekly", getLatestMondayDate());
                            const reportSnap = await getDoc(reportsRef);

                            if (reportSnap.exists()) {
                                const reportData = reportSnap.data();
                                const report = reportData.report || "";

                                // 리포트에서 요약 부분 추출
                                if (report.includes("---")) {
                                    const parts = report.split("---");
                                    if (parts.length >= 2) {
                                        const summary = parts[1].trim();
                                        setWeeklyReport(summary);
                                        // 리포트 내용을 환영 메시지에 포함
                                        const reportMsg = `AI 리포트가 도착했습니다. ${summary}`;
                                        speak(`환영합니다 ${nickname}님. 오늘은 ${weatherInfo}입니다. ${recommendText}. ${reportMsg}`);
                                    }
                                }
                                setWeeklyReport(report);
                            } else {
                                // 리포트가 없으면 기본 환영 메시지
                                speak(`환영합니다 ${nickname}님. 오늘은 ${weatherInfo}입니다. ${recommendText}`);
                            }
                        } catch (reportError) {
                            console.error("리포트 읽기 오류:", reportError);
                            speak(`환영합니다 ${nickname}님. 오늘은 ${weatherInfo}입니다. ${recommendText}`);
                        }
                    } else {
                        speak("환영합니다! 프로필을 설정해주세요.");
                    }
                } catch (error) {
                    console.error("사용자 데이터 로드 실패:", error);
                    speak("환영합니다!");
                }
            }
        };

        loadUserData();
    }, [user, speak]);

    if (!user) return <div className="p-6 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center pt-4 pb-20">
            <AIWelcomeCard user={userData} />

            {/* 📊 AI 코치 추천 위젯 섹션 */}
            {userData && (
                <div className="w-full max-w-4xl px-4 mt-6 grid gap-4 md:grid-cols-3 grid-cols-1">
                    <div className="p-5 rounded-2xl shadow-md bg-gradient-to-r from-sky-50 to-blue-100 dark:from-sky-900 dark:to-blue-900">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">🌤️ 오늘의 날씨</h2>
                        <p className="text-gray-700 dark:text-gray-200">{weather}</p>
                    </div>

                    <div className="p-5 rounded-2xl shadow-md bg-gradient-to-r from-emerald-50 to-green-100 dark:from-emerald-900 dark:to-green-900">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">🏃‍♂️ 추천 운동</h2>
                        <p className="text-gray-700 dark:text-gray-200">{recommend}</p>
                    </div>

                    <div className="p-5 rounded-2xl shadow-md bg-gradient-to-r from-orange-50 to-yellow-100 dark:from-orange-900 dark:to-yellow-900">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">📅 오늘의 일정</h2>
                        <p className="text-gray-700 dark:text-gray-200">오늘은 팀 일정이 없습니다. 여유롭게 운동하세요!</p>
                    </div>

                    {/* 📊 AI 주간 리포트 (있을 경우) */}
                    {weeklyReport && (
                        <div className="md:col-span-3 p-5 rounded-2xl shadow-md bg-gradient-to-r from-purple-50 to-pink-100 dark:from-purple-900 dark:to-pink-900">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">🤖 AI 주간 리포트</h2>
                            <div className="text-gray-700 dark:text-gray-200 whitespace-pre-line text-sm">
                                {weeklyReport.split("---").map((part, idx) => (
                                    part.trim() && <p key={idx} className="mb-2">{part.trim()}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <CategoryGrid />
            <QuickReportCard />

            {/* 📊 AI 주간 리포트 PDF 카드 */}
            <div className="w-full max-w-4xl px-4 mt-6">
                <WeeklyReportPDFCard />
            </div>

            {/* 📊 AI 요약 리포트 섹션 */}
            <div id="report-section" className="w-full max-w-4xl px-4 mt-6 space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <AIWeeklySummary />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                    <AdminSummaryChart />
                </div>

                {/* PDF 다운로드 버튼 */}
                <ReportPDFButton />
            </div>
        </div>
    );
}
