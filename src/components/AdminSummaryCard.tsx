import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface Props {
    title: string;
    value: string | number;
    icon?: string;
    trend?: string;
    highlight?: boolean;
}

export default function AdminSummaryCard({
    title,
    value,
    icon = "📊",
    trend,
    highlight = false,
}: Props) {
    return (
        <Card
            className={`p-4 shadow-md rounded-2xl transition-all ${highlight ? "bg-blue-50 border-blue-400 border" : "bg-white"
                }`}
        >
            <CardContent className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-2xl">{icon}</span>
                    <BarChart3 className="w-5 h-5 text-gray-500" />
                </div>
                <h2 className="font-semibold text-gray-700">{title}</h2>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {trend && (
                    <p
                        className={`text-sm ${trend.includes("+") ? "text-green-600" : "text-red-600"
                            }`}
                    >
                        {trend}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
