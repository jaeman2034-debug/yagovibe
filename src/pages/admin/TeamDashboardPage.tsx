import { useParams } from "react-router-dom";
import TeamInsightsDashboard from "@/components/TeamInsightsDashboard";

/**
 * Step 44: 팀 대시보드 페이지
 * /app/admin/team/:teamId
 */
export default function TeamDashboardPage() {
    const { teamId } = useParams<{ teamId: string }>();

    if (!teamId) {
        return (
            <div className="p-6 text-center text-red-600">
                팀 ID가 필요합니다.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
            <div className="container mx-auto py-6">
                <TeamInsightsDashboard teamId={teamId} />
            </div>
        </div>
    );
}

