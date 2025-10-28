import { Card, CardContent } from "@/components/ui/card";

/**
 * 📊 리포트 통계 카드 컴포넌트
 */
export default function ReportStatsCard({
    title,
    value,
    color
}: {
    title: string;
    value: string | number;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        blue: "border-blue-500",
        green: "border-green-500",
        yellow: "border-yellow-500",
        purple: "border-purple-500",
        red: "border-red-500",
    };

    const borderColor = colorClasses[color] || "border-gray-500";

    return (
        <Card className={`p-4 rounded-2xl shadow-md border-l-4 ${borderColor}`}>
            <CardContent className="flex flex-col items-start">
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
            </CardContent>
        </Card>
    );
}

