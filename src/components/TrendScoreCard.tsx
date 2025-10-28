type Props = {
    data: {
        nickname: string;
        email: string;
        month: string;
        score: number;
        uid?: string;
    };
    rank?: number;
};

export default function TrendScoreCard({ data, rank }: Props) {
    // 랭킹 뱃지
    const getRankBadge = (rank?: number) => {
        if (!rank || rank > 3) return "";
        const badges = ["🥇", "🥈", "🥉"];
        return badges[rank - 1];
    };

    // 랭킹에 따른 배경 색상 및 테두리
    const getRankStyle = (rank?: number) => {
        if (rank === 1) {
            return "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-2 border-yellow-400 dark:border-yellow-500 shadow-lg";
        }
        if (rank === 2) {
            return "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-2 border-gray-400 dark:border-gray-500 shadow-md";
        }
        if (rank === 3) {
            return "bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-400 dark:border-orange-500 shadow-md";
        }
        return "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm";
    };

    // 점수에 따른 색상 분류
    const getScoreColor = (score: number) => {
        if (score >= 90) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        if (score >= 80) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
        if (score >= 70) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    };

    // 점수에 따른 레벨 표시
    const getScoreLevel = (score: number) => {
        if (score >= 90) return "🟢 우수";
        if (score >= 80) return "🔵 양호";
        if (score >= 70) return "🟡 보통";
        return "🔴 개선 필요";
    };

    const badge = getRankBadge(rank);
    const rankStyle = getRankStyle(rank);

    return (
        <div
            className={`rounded-2xl p-4 hover:shadow-lg transition-all ${rankStyle} ${rank && rank <= 3 ? "scale-105" : ""
                }`}
        >
            <div className="flex justify-between items-center mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        {badge && <span className="text-2xl">{badge}</span>}
                        <span>{data.nickname || "이름 없음"}</span>
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                        {data.email || "이메일 없음"}
                    </p>
                </div>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${getScoreColor(data.score)}`}>
                    {data.score}점
                </span>
            </div>
            <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">월: {data.month}</p>
                <p className="text-xs font-medium">{getScoreLevel(data.score)}</p>
            </div>
        </div>
    );
}

