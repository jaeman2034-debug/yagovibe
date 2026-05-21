import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthProvider';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import Logo from "@/components/common/Logo";
import { Users, MapPin, Calendar } from 'lucide-react';

/**
 * 🔹 2단계: 팀 미리보기 화면
 * 
 * 플로우:
 * - 로그인 안 되어 있으면 → 회원가입으로
 * - 로그인 되어 있으면 → 팀 합류 확인
 */
export default function QRTeamPreviewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const inviteId = searchParams.get('invite'); // 🔥 v1 LOCK: inviteId만 사용

  useEffect(() => {
    const fetchTeam = async () => {
      if (!inviteId) {
        setError('초대 코드가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // 🔥 v1 LOCK: verifyInvite 호출
        const verifyInvite = httpsCallable(functions, 'verifyInvite');
        const result = await verifyInvite({ inviteId });
        const data = result.data as any;

        if (data.valid) {
          setTeam({
            id: data.teamId,
            name: data.teamName,
            region: data.teamRegion,
            sportType: data.teamSportType,
            memberCount: 0, // TODO: 실제 멤버 수 조회
            logo: null,
            description: '',
            coachName: data.coachName,
            role: data.role, // 초대 역할 저장
          });
          setLoading(false);
        } else {
          // 에러 코드를 사용자 친화적 메시지로 변환
          const errorMessages: Record<string, string> = {
            INVITE_NOT_FOUND: '초대코드가 유효하지 않아요',
            INVITE_EXPIRED: '초대가 만료됐어요. 새 QR을 받아주세요',
            INVITE_USED_UP: '이미 사용된 초대코드예요',
            INVITE_REVOKED: '초대가 취소되었어요',
            TEAM_NOT_FOUND: '팀을 찾을 수 없습니다',
            TEAM_INACTIVE: '비활성화된 팀입니다',
          };
          setError(errorMessages[data.error] || data.error || '유효하지 않은 초대입니다.');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('팀 정보 조회 실패:', err);
        setError(err.message || '팀 정보를 불러올 수 없습니다.');
        setLoading(false);
      }
    };

    fetchTeam();
  }, [inviteId]);

  const handleJoin = () => {
    if (!user) {
      // 비로그인 → 회원가입으로 (inviteId 유지)
      navigate('/qr/signup', {
        state: {
          inviteId, // 🔥 v1 LOCK: inviteId만 전달
          teamName: team?.name,
        },
      });
    } else {
      // 로그인됨 → 팀 합류 처리
      navigate('/qr/complete', {
        state: {
          inviteId, // 🔥 v1 LOCK: inviteId만 전달
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">팀 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <p className="text-red-600 mb-4">{error || '팀 정보를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/qr')}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            다시 스캔하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-none md:max-w-3xl">
        {/* 로고 */}
        <div className="flex justify-center mb-6">
          <Logo size={64} className="mb-4" />
        </div>

        {/* 메시지 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {team.name}이(가) 당신을 초대했습니다
          </h1>
          <p className="text-sm text-gray-500">
            지금 합류하시겠습니까?
          </p>
        </div>

        {/* 팀 정보 카드 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          {/* 팀 로고/아이콘 */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
              <p className="text-sm text-gray-500">{team.sportType}</p>
            </div>
          </div>

          {/* 팀 정보 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{team.region}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>멤버 {team.memberCount}명</span>
            </div>
            {team.coachName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>코치: {team.coachName}</span>
              </div>
            )}
          </div>

          {/* 팀 설명 */}
          {team.description && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600">{team.description}</p>
            </div>
          )}
        </div>

        {/* 합류 버튼 */}
        <button
          onClick={handleJoin}
          className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg mb-4"
        >
          {user ? '팀에 합류하기' : '가입하고 합류하기'}
        </button>

        {/* 취소 */}
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
        >
          나중에 하기
        </button>
      </div>
    </div>
  );
}

