import { Link } from "react-router-dom";
import type { User as FirebaseUser } from "firebase/auth";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import { MeIdentityHeader } from "@/components/me/MeIdentityHeader";
import GuardianHomePanel from "@/features/guardian/GuardianHomePanel";

type Props = {
  user: FirebaseUser;
  stats: { teamCount: number; tournamentCount: number; recordCount: number };
  onSettings: () => void;
  onLogout: () => void;
};

/**
 * S3 — /me for parent persona: guardian summary only (no player onboarding / intelligence).
 */
export function GuardianMeShell({ user, stats, onSettings, onLogout }: Props) {
  return (
    <HubLayout
      header={
        <MeIdentityHeader
          user={user}
          persona="P2"
          accountTypeLabel="보호자"
          stats={stats}
          onSettings={onSettings}
          onLogout={onLogout}
        />
      }
      persona={null}
      children={
        <section className="px-4 pb-8">
          <p className="mb-4 text-sm text-gray-600">
            연결된 자녀의 회비·출석·팀 공지는 아래에서 조회할 수 있습니다.
          </p>
          <GuardianHomePanel />
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/home/parent"
              className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-center text-sm font-semibold text-indigo-900"
            >
              보호자 홈으로
            </Link>
            <button
              type="button"
              onClick={onSettings}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900"
            >
              계정 설정
            </button>
          </div>
        </section>
      }
    />
  );
}
