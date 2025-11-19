import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

export default function QuickReportCard() {
    const [report, setReport] = useState({
        summary: "이번 주 신규가입자 +23%, 경기북부 활동 증가",
        action: "UX 개선 캠페인 제안",
    });

    useEffect(() => {
        // 나중에 Firestore reports 컬렉션과 연결
    }, []);

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center space-x-3 mb-2">
                <BarChart3 size={22} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">AI 요약 리포트</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">{report.summary}</p>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                추천 액션: {report.action}
            </p>
        </div>
    );
}

