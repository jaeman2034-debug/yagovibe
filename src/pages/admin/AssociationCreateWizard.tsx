/**
 * AssociationCreateWizard
 * 조직 생성 마법사 (Builder 스타일)
 * 
 * 협회/아카데미/클럽 생성
 * 3분 안에 조직 홈페이지 생성 목표
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, ArrowLeft, Check, Building2, MapPin, Settings, Trophy, GraduationCap, Users, Image as ImageIcon } from "lucide-react";

interface WizardStep {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const STEPS: WizardStep[] = [
  { id: "type", title: "조직 유형", icon: <Building2 className="w-5 h-5" /> },
  { id: "basic", title: "기본 정보", icon: <Building2 className="w-5 h-5" /> },
  { id: "sport", title: "종목 선택", icon: <Trophy className="w-5 h-5" /> },
  { id: "audience", title: "참가 대상", icon: <Users className="w-5 h-5" /> },
  { id: "hero", title: "Hero 이미지", icon: <ImageIcon className="w-5 h-5" /> },
  { id: "template", title: "템플릿 선택", icon: <Settings className="w-5 h-5" /> },
  { id: "review", title: "확인 및 생성", icon: <Check className="w-5 h-5" /> },
];

interface AssociationFormData {
  organizationType: "federation" | "academy" | "club" | "";
  name: string;
  region: string;
  sport: string; // 종목 선택
  audience: string; // 참가 대상
  heroImageUrl: string; // Hero 이미지 URL
  templateId: string;
  adminEmails: string[];
}

// URL slug 생성 함수
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function AssociationCreateWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AssociationFormData>({
    organizationType: "",
    name: "",
    region: "",
    sport: "",
    audience: "",
    heroImageUrl: "",
    templateId: "nowon-football-template",
    adminEmails: [],
  });
  const [newEmail, setNewEmail] = useState("");
  const [createdAssociationId, setCreatedAssociationId] = useState<string | null>(null);

  // URL Preview 생성
  const urlPreview = useMemo(() => {
    if (!formData.name.trim()) return "";
    const slug = generateSlug(formData.name);
    return `yago.io/${slug}`;
  }, [formData.name]);

  // 단계 이동
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 이메일 추가
  const handleAddEmail = () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      alert("올바른 이메일 주소를 입력하세요.");
      return;
    }

    if (formData.adminEmails.includes(trimmedEmail)) {
      alert("이미 등록된 이메일 주소입니다.");
      return;
    }

    setFormData({
      ...formData,
      adminEmails: [...formData.adminEmails, trimmedEmail],
    });
    setNewEmail("");
  };

  // 이메일 삭제
  const handleRemoveEmail = (index: number) => {
    setFormData({
      ...formData,
      adminEmails: formData.adminEmails.filter((_, i) => i !== index),
    });
  };

  // 조직 생성
  const handleCreate = async () => {
    if (!formData.organizationType || !formData.name || !formData.region || !formData.sport || !formData.audience || !formData.heroImageUrl) {
      alert("필수 항목을 모두 입력하세요.");
      return;
    }

    setLoading(true);
    try {
      const createAssociationFn = httpsCallable<
        {
          name: string;
          region: string;
          templateId: string;
          adminEmails: string[];
        },
        { success: boolean; associationId: string }
      >(functions, "createAssociationFromTemplate");

      const result = await createAssociationFn({
        name: formData.name,
        region: formData.region,
        templateId: formData.templateId,
        adminEmails: formData.adminEmails,
      });

      if (result.data.success) {
        setCreatedAssociationId(result.data.associationId);
        setCurrentStep(STEPS.length - 1); // 완료 화면으로
      }
    } catch (error: any) {
      console.error("협회 생성 오류:", error);
      alert(`협회 생성 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 단계별 렌더링
  const renderStep = () => {
    switch (currentStep) {
      case 0: // 조직 유형 선택
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                어떤 조직을 만드시나요?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                조직 유형에 따라 다른 템플릿이 제공됩니다
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 협회 */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, organizationType: "federation" })}
                className={`
                  p-6 border-2 rounded-xl text-left transition-all hover:shadow-md
                  ${formData.organizationType === "federation"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`
                    w-14 h-14 rounded-xl flex items-center justify-center transition-all
                    ${formData.organizationType === "federation"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                    }
                  `}>
                    <Trophy className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                      협회
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Federation
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  리그 및 대회 운영
                </p>
              </button>

              {/* 아카데미 */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, organizationType: "academy" })}
                className={`
                  p-6 border-2 rounded-xl text-left transition-all hover:shadow-md
                  ${formData.organizationType === "academy"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`
                    w-14 h-14 rounded-xl flex items-center justify-center transition-all
                    ${formData.organizationType === "academy"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                    }
                  `}>
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                      아카데미
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Academy
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  훈련 프로그램 운영
                </p>
              </button>

              {/* 클럽 */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, organizationType: "club" })}
                className={`
                  p-6 border-2 rounded-xl text-left transition-all hover:shadow-md
                  ${formData.organizationType === "club"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`
                    w-14 h-14 rounded-xl flex items-center justify-center transition-all
                    ${formData.organizationType === "club"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600"
                    }
                  `}>
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                      클럽
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Club
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  팀 중심 활동
                </p>
              </button>
            </div>
          </div>
        );

      case 1: // 기본 정보
        return (
          <div className="space-y-8">
            {/* 헤더 */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {formData.organizationType === "federation" ? "협회 생성" :
                 formData.organizationType === "academy" ? "아카데미 생성" : "클럽 생성"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                3분 안에 조직 홈페이지를 만들 수 있습니다
              </p>
            </div>

            {/* 입력 폼 */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {formData.organizationType === "federation" ? "협회명" : 
                   formData.organizationType === "academy" ? "아카데미명" : "클럽명"} *
                </label>
                <Input
                  type="text"
                  placeholder={formData.organizationType === "federation" ? "예: 노원구 축구협회" :
                               formData.organizationType === "academy" ? "예: 서울 유소년 아카데미" :
                               "예: 강남 FC"}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-base h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                {/* URL Preview */}
                {urlPreview && (
                  <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-medium uppercase tracking-wide">
                      생성 URL
                    </div>
                    <div className="text-sm font-mono text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-2">
                      <span className="text-gray-400">https://</span>
                      {urlPreview}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  지역 *
                </label>
                <Input
                  type="text"
                  placeholder="예: 서울특별시 노원구"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full text-base h-12 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                  시/구/군 단위로 입력하세요
                </p>
              </div>
            </div>

            {/* 자동 생성 안내 */}
            <div className="pt-8 mt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">
                생성 시 자동으로 만들어집니다
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">조직 홈페이지</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">관리자 대시보드</span>
                </div>
                <div className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">기본 메뉴 및 기능</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // 종목 선택
        const sports = [
          { id: "football", label: "축구", icon: "⚽" },
          { id: "basketball", label: "농구", icon: "🏀" },
          { id: "baseball", label: "야구", icon: "⚾" },
          { id: "volleyball", label: "배구", icon: "🏐" },
          { id: "badminton", label: "배드민턴", icon: "🏸" },
        ];

        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                어떤 종목 협회를 만드시나요?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                종목에 따라 맞춤형 템플릿이 제공됩니다
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, sport: sport.id })}
                  className={`
                    cursor-pointer border-2 rounded-lg p-6 flex flex-col items-center justify-center text-lg font-medium transition-all hover:shadow-md
                    ${formData.sport === sport.id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }
                  `}
                >
                  <span className="text-4xl mb-2">{sport.icon}</span>
                  <span className="text-gray-900 dark:text-white">{sport.label}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 3: // 참가 대상 선택
        const audiences = [
          { id: "youth", label: "유소년", description: "초등/중학생 대상" },
          { id: "teen", label: "청소년", description: "고등학생 대상" },
          { id: "adult", label: "성인", description: "성인 대상" },
          { id: "mixed", label: "혼합", description: "모든 연령대" },
        ];

        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                참가 대상을 선택하세요
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                참가 대상에 따라 맞춤형 서비스가 제공됩니다
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {audiences.map((audience) => (
                <button
                  key={audience.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, audience: audience.id })}
                  className={`
                    p-6 border-2 rounded-xl text-left transition-all hover:shadow-md
                    ${formData.audience === audience.id
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    }
                  `}
                >
                  <div className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                    {audience.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {audience.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 4: // Hero 이미지 선택
        const heroImages = [
          {
            id: "sports-field",
            label: "운동장",
            url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=400&fit=crop",
          },
          {
            id: "stadium",
            label: "경기장",
            url: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=800&h=400&fit=crop",
          },
          {
            id: "team-huddle",
            label: "팀 단합",
            url: "https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&h=400&fit=crop",
          },
          {
            id: "trophy",
            label: "트로피",
            url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=400&fit=crop",
          },
        ];

        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Hero 이미지를 선택하세요
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                협회 홈페이지 상단에 표시될 이미지입니다
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {heroImages.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, heroImageUrl: image.url })}
                  className={`
                    relative overflow-hidden rounded-xl border-2 transition-all hover:shadow-lg
                    ${formData.heroImageUrl === image.url
                      ? "border-blue-600 ring-4 ring-blue-200 dark:ring-blue-800"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    }
                  `}
                >
                  <div className="aspect-video relative">
                    <img
                      src={image.url}
                      alt={image.label}
                      className="w-full h-full object-cover"
                    />
                    {formData.heroImageUrl === image.url && (
                      <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                        <Check className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800">
                    <div className="font-medium text-gray-900 dark:text-white text-center">
                      {image.label}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 5: // 템플릿 선택
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  id="nowon-template"
                  name="template"
                  value="nowon-football-template"
                  checked={formData.templateId === "nowon-football-template"}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                  className="mt-1"
                />
                <label htmlFor="nowon-template" className="flex-1 cursor-pointer">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    노원구 축구협회 템플릿 (표준)
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    • 회원/비회원/아카데미 팀 구분
                    <br />
                    • 우선 대관 시설 정책
                    <br />
                    • 월간 운영 리포트 자동화
                    <br />
                    • 이메일 자동 발송
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                관리자 이메일 (선택)
              </label>
              <p className="text-xs text-gray-500">
                리포트 수신자로 자동 등록됩니다
              </p>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="admin@association.kr"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddEmail();
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handleAddEmail} variant="outline">
                  추가
                </Button>
              </div>

              {formData.adminEmails.length > 0 && (
                <div className="space-y-2">
                  {formData.adminEmails.map((email, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">{email}</span>
                      <button
                        onClick={() => handleRemoveEmail(index)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 6: // 확인 및 생성
        if (createdAssociationId) {
          // 생성 완료
          return (
            <div className="text-center space-y-6 py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  협회가 생성되었습니다!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {formData.name}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => navigate(`/association/${createdAssociationId}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  협회 홈으로 이동
                </Button>
                <Button
                  onClick={() => {
                    setFormData({ 
                      organizationType: "",
                      name: "", 
                      region: "", 
                      sport: "",
                      audience: "",
                      heroImageUrl: "",
                      templateId: "nowon-football-template", 
                      adminEmails: [] 
                    });
                    setCreatedAssociationId(null);
                    setCurrentStep(0);
                  }}
                  variant="outline"
                >
                  새 협회 생성
                </Button>
              </div>
            </div>
          );
        }

        // 확인 화면
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">협회명</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {formData.name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">지역</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {formData.region}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">종목</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {formData.sport === "football" ? "축구" :
                   formData.sport === "basketball" ? "농구" :
                   formData.sport === "baseball" ? "야구" :
                   formData.sport === "volleyball" ? "배구" :
                   formData.sport === "badminton" ? "배드민턴" : formData.sport}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">참가 대상</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {formData.audience === "youth" ? "유소년" :
                   formData.audience === "teen" ? "청소년" :
                   formData.audience === "adult" ? "성인" :
                   formData.audience === "mixed" ? "혼합" : formData.audience}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">템플릿</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  노원구 축구협회 템플릿 (표준)
                </p>
              </div>
              {formData.adminEmails.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">관리자 이메일</label>
                  <div className="mt-1 space-y-1">
                    {formData.adminEmails.map((email, index) => (
                      <p key={index} className="text-sm text-gray-900 dark:text-white">
                        {email}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ℹ️ 생성 후 바로 운영이 가능합니다. 기본 정책과 시설 설정이 자동으로 적용됩니다.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // 유효성 검사
  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.organizationType !== "";
      case 1:
        return formData.name.trim() !== "" && formData.region.trim() !== "";
      case 2:
        return formData.sport !== "";
      case 3:
        return formData.audience !== "";
      case 4:
        return formData.heroImageUrl !== "";
      case 5:
        return true;
      case 6:
        return !createdAssociationId; // 생성 전에만 생성 버튼 표시
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-start justify-center pt-16 pb-12">
      <div className="container mx-auto px-4 w-full max-w-2xl">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <button
            onClick={() => navigate("/admin")}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            관리자 콘솔로 돌아가기
          </button>
          {(currentStep === 0 || currentStep === 1) && (
            <>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {currentStep === 0 ? "조직 생성" :
                 formData.organizationType === "federation" ? "협회 생성" :
                 formData.organizationType === "academy" ? "아카데미 생성" : "클럽 생성"}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                3분 안에 조직 홈페이지를 만들 수 있습니다
              </p>
            </>
          )}
        </div>

        {/* 진행 단계 표시 */}
        {currentStep > 0 && (
          <div className="mb-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Step {currentStep + 1} / {STEPS.length}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`
                      w-2 h-2 rounded-full transition-all
                      ${index < currentStep
                        ? "bg-blue-600 w-8"
                        : index === currentStep
                        ? "bg-blue-600 w-3 h-3"
                        : "bg-gray-300 dark:bg-gray-600"
                      }
                    `}
                  />
                  {index < STEPS.length - 1 && (
                    <div
                      className={`
                        h-0.5 w-8 transition-all
                        ${index < currentStep
                          ? "bg-blue-600"
                          : "bg-gray-300 dark:bg-gray-600"
                        }
                      `}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 단계별 콘텐츠 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 md:p-10 mb-6">
          {renderStep()}
        </div>

        {/* 네비게이션 버튼 */}
        {!createdAssociationId && (
          <div className="flex justify-between items-center">
            <Button
              onClick={prevStep}
              disabled={currentStep === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              이전
            </Button>

            {currentStep === STEPS.length - 1 ? (
              <Button
                onClick={handleCreate}
                disabled={!canProceed() || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-2.5 text-base font-medium shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? "생성 중..." : "조직 생성"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-6 py-2.5 text-base font-medium shadow-lg hover:shadow-xl transition-all"
              >
                다음 단계
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

