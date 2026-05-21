/**
 * StepReview
 * Step 6: 확인 및 생성
 */

import { useNavigate } from "react-router-dom";
import { useBuilder } from "../BuilderContext";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Check, Trophy, Users, Calendar, ArrowRight } from "lucide-react";
import { sports, audiences } from "../data/builderData";

export default function StepReview() {
  const navigate = useNavigate();
  const {
    values,
    setValues,
    setStep,
    loading,
    setLoading,
    createdAssociationId,
    setCreatedAssociationId,
  } = useBuilder();

  // 조직 생성
  const handleCreate = async () => {
    if (
      !values.organizationType ||
      !values.name ||
      !values.region ||
      !values.sport ||
      !values.audience ||
      !values.heroImageUrl
    ) {
      alert("필수 항목을 모두 입력하세요.");
      return;
    }

    setLoading(true);
    try {
      const createAssociationFn = httpsCallable<
        {
          name: string;
          region: string;
          sport: string;
          audience: string;
          heroImageUrl: string;
          templateId: string;
          adminEmails: string[];
        },
        { success: boolean; associationId: string }
      >(functions, "createAssociationFromTemplate");

      const result = await createAssociationFn({
        name: values.name,
        region: values.region,
        sport: values.sport,
        audience: values.audience,
        heroImageUrl: values.heroImageUrl,
        templateId: values.templateId,
        adminEmails: values.adminEmails,
      });

      if (result.data.success) {
        setCreatedAssociationId(result.data.associationId);
      }
    } catch (error: any) {
      console.error("협회 생성 오류:", error);
      alert(`협회 생성 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 생성 완료 화면
  if (createdAssociationId) {
    return (
      <div className="text-center space-y-8 py-8">
        {/* 성공 애니메이션 */}
        <div className="space-y-4">
          <div className="text-6xl animate-bounce">🎉</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              협회 생성 완료
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {values.name}가 성공적으로 생성되었습니다.
            </p>
          </div>
        </div>

        {/* 메인 CTA 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => navigate(`/association/${createdAssociationId}/admin`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            관리자 대시보드 이동
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => navigate(`/association/${createdAssociationId}`)}
            variant="outline"
            className="px-6 py-3 text-base font-medium border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            협회 홈페이지 보기
          </Button>
        </div>

        {/* 다음 행동 안내 */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            다음에 할 수 있는 것
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  리그 생성
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  대회 및 리그를 만들고 관리하세요
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  팀 등록
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  참가 팀을 등록하고 관리하세요
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  경기 일정 관리
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  경기 일정을 만들고 관리하세요
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 확인 화면
  const selectedSport = sports.find((s) => s.id === values.sport);
  const selectedAudience = audiences.find((a) => a.id === values.audience);

  return (
    <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            확인 및 생성
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            입력하신 정보를 확인해주세요
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              조직 유형
            </label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {values.organizationType === "federation"
                ? "협회"
                : values.organizationType === "academy"
                ? "아카데미"
                : "클럽"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {values.organizationType === "federation"
                ? "협회명"
                : values.organizationType === "academy"
                ? "아카데미명"
                : "클럽명"}
            </label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {values.name}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              지역
            </label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {values.region}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              종목
            </label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {selectedSport?.label || values.sport}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              참가 대상
            </label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {selectedAudience?.label || values.audience}
            </p>
          </div>
          {values.adminEmails.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                관리자 이메일
              </label>
              <div className="mt-1 space-y-1">
                {values.adminEmails.map((email, index) => (
                  <p
                    key={index}
                    className="text-sm text-gray-900 dark:text-white"
                  >
                    {email}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ℹ️ 생성 후 바로 운영이 가능합니다. 기본 정책과 시설 설정이 자동으로
            적용됩니다.
          </p>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={back} variant="outline">
            이전
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-2.5 text-base font-medium shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? "생성 중..." : "조직 생성"}
          </Button>
        </div>
      </div>
  );
}
