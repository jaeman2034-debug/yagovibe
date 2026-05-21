/**
 * 선수 명단 상태 배너
 */

import { Card, CardContent } from "@/components/ui/card";

interface RosterStatusBannerProps {
  rosterStatus: "draft" | "submitted" | "locked";
}

export function RosterStatusBanner({ rosterStatus }: RosterStatusBannerProps) {
  if (rosterStatus === "draft") {
    return (
      <Card className="mb-4 border-amber-200 bg-amber-50">
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⏳</span>
            <p className="text-sm font-medium">선수 명단을 입력 중입니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rosterStatus === "submitted") {
    return (
      <Card className="mb-4 border-green-200 bg-green-50">
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <p className="text-sm font-medium">선수 명단 제출이 완료되었습니다.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
