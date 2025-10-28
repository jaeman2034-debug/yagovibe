type Props = {
    report: any;
    onView: () => void;
};

export default function MonthlyReportCard({ report, onView }: Props) {
    const { nickname, email, month, report: text, weeklyReportsCount, totalActivities, totalDuration } = report;
    const cleanText = text?.replaceAll("---", "").trim() || "리포트 내용 없음";

    return (
        <div className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-3">
                <div>
                    <h2 className="font-semibold text-gray-900">{nickname || "이름 없음"}</h2>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{email || "이메일 없음"}</p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                    {month}
                </span>
            </div>

            {/* 통계 정보 */}
            {(weeklyReportsCount !== undefined || totalActivities !== undefined) && (
                <div className="flex gap-3 mb-3 text-xs text-gray-600">
                    {weeklyReportsCount !== undefined && (
                        <span>📊 {weeklyReportsCount}주</span>
                    )}
                    {totalActivities !== undefined && (
                        <span>🏃 {totalActivities}회</span>
                    )}
                    {totalDuration !== undefined && (
                        <span>⏱️ {totalDuration}분</span>
                    )}
                </div>
            )}

            <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-line mb-4 min-h-[80px]">
                {cleanText}
            </p>

            <button
                onClick={onView}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full font-semibold"
            >
                📄 PDF 미리보기 / 다운로드
            </button>
        </div>
    );
}

