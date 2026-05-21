/**
 * 선수 명단 관리 헤더
 */

interface RosterHeaderProps {
  roster: {
    applicationId: string;
    playerCount: number;
    maxPlayers: number;
    rosterStatus: "draft" | "submitted" | "locked";
  };
}

export function RosterHeader({ roster }: RosterHeaderProps) {
  return (
    <section className="mb-4">
      <h1 className="text-xl font-semibold mb-1">선수 명단 관리</h1>
      <p className="text-sm text-gray-600">
        현재 등록 인원: {roster.playerCount} / {roster.maxPlayers}명
      </p>
    </section>
  );
}
