import { useParams } from "react-router-dom";
import Step42_AIInsightsDashboard from "@/components/Step42_AIInsightsDashboard";

/**
 * Step 42: AI Insights Dashboard 페이지
 * /admin/ai-insights/:reportId
 */
export default function AIInsightsPage() {
    const { reportId } = useParams<{ reportId: string }>();

    if (!reportId) {
        return (
            <div className="p-6 text-center text-red-600">
                리포트 ID가 필요합니다.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
            <div className="container mx-auto py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        🧠 AI Insights Dashboard
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        리포트 ID: {reportId}
                    </p>
                </div>
                <Step42_AIInsightsDashboard reportId={reportId} />
            </div>
        </div>
    );
}

