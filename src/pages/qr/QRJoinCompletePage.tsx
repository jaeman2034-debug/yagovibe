import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import Logo from "@/components/common/Logo";
import { CheckCircle, Users, Calendar, Bell } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

/**
 * 🔹 4단계: 합류 완료 화면
 * 
 * 플로우:
 * - 팀 합류 처리 (joinTeam Cloud Function 호출)
 * - 환영 메시지
 * - 팀 피드 첫 화면으로 이동
 */
export default function QRJoinCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamInfo = location.state as {
    inviteId?: string; // 🔥 v1 LOCK: inviteId만 사용
    teamName?: string;
    sportType?: string;
  } | null;

  useEffect(() => {
    const joinTeam = async () => {
      if (!user) {
        setError('로그인이 필요합니다.');
        setJoining(false);
        return;
      }

      if (!teamInfo?.inviteId) {
        setError('초대 코드가 없습니다.');
        setJoining(false);
        return;
      }

      try {
        // 🔥 v1 LOCK: joinTeam에 inviteId만 전달
        const joinTeamFn = httpsCallable(functions, 'joinTeam');
        const result = await joinTeamFn({
          inviteId: teamInfo.inviteId,
        }) as any;

        // 에러 코드를 사용자 친화적 메시지로 변환
        const errorMessages: Record<string, string> = {
          INVITE_NOT_FOUND: '초대코드가 유효하지 않아요',
          INVITE_EXPIRED: '초대가 만료됐어요. 새 QR을 받아주세요',
          INVITE_USED_UP: '이미 사용된 초대코드예요',
          INVITE_REVOKED: '초대가 취소되었어요',
          AUTH_REQUIRED: '로그인 후 다시 시도해주세요',
          TEAM_NOT_FOUND: '팀을 찾을 수 없습니다',
          TEAM_INACTIVE: '비활성화된 팀입니다',
        };

        if (result.data?.ok) {
          setJoining(false);
          // 3초 후 팀 대시보드로 이동
          setTimeout(() => {
            navigate(`/sports/${teamInfo?.sportType || 'football'}/team`);
          }, 3000);
        } else {
          throw new Error(result.data?.error || '팀 합류에 실패했습니다.');
        }
      } catch (err: any) {
        console.error('팀 합류 오류:', err);
        
        // 에러 코드 매핑
        const errorMessages: Record<string, string> = {
          INVITE_NOT_FOUND: '초대코드가 유효하지 않아요',
          INVITE_EXPIRED: '초대가 만료됐어요. 새 QR을 받아주세요',
          INVITE_USED_UP: '이미 사용된 초대코드예요',
          INVITE_REVOKED: '초대가 취소되었어요',
          AUTH_REQUIRED: '로그인 후 다시 시도해주세요',
          TEAM_NOT_FOUND: '팀을 찾을 수 없습니다',
          TEAM_INACTIVE: '비활성화된 팀입니다',
        };

        const errorCode = err.code || err.message;
        setError(errorMessages[errorCode] || err.message || '팀 합류에 실패했습니다.');
        setJoining(false);
      }
    };

    joinTeam();
  }, [user, teamInfo, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-none md:max-w-3xl text-center">
        {/* 로고 */}
        <div className="flex justify-center mb-6">
          <Logo size={64} className="mb-4" />
        </div>

        {/* 성공 아이콘 */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* 환영 메시지 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {teamInfo?.teamName}에 합류했습니다!
        </h1>
        <p className="text-gray-600 mb-8">
          환영합니다. 이제 팀의 일원이 되었습니다.
        </p>

        {/* 다음 단계 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            다음 단계
          </h2>
          <div className="space-y-3 text-left">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">팀 피드 확인</p>
                <p className="text-xs text-gray-600">팀원들과 소통하세요</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">다음 훈련 일정</p>
                <p className="text-xs text-gray-600">팀 일정을 확인하세요</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">팀 공지 1건</p>
                <p className="text-xs text-gray-600">새로운 공지를 확인하세요</p>
              </div>
            </div>
          </div>
        </div>

        {/* 로딩 상태 */}
        {joining && (
          <div className="mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="text-sm text-gray-500 mt-2">팀에 합류하는 중...</p>
          </div>
        )}

        {/* 자동 이동 안내 */}
        {!joining && (
          <p className="text-sm text-gray-500">
            잠시 후 팀 대시보드로 이동합니다...
          </p>
        )}
      </div>
    </div>
  );
}

