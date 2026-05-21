/**
 * Facility 상세 페이지 (Public + Admin)
 * /association/:associationId/facilities/:facilityId
 * 
 * 원칙 (Tournament 패턴 기반):
 * - published 상태만 노출 (일반 사용자)
 * - 관리자는 draft 포함 조회 가능
 * - 본문(content) 표시
 * - 관리자 수정 버튼 (공지 패턴과 동일)
 * - 공식 기준 배지 필수
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Facility } from "@/types/facility";
import { SectionLayout } from "@/components/association/SectionLayout";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { formatDate, safeToDate } from "@/utils/dateUtils";

export default function FacilityDetailPage() {
  const { associationId, facilityId } = useParams<{
    associationId: string;
    facilityId: string;
  }>();
  const navigate = useNavigate();
  const { isAdmin } = useIsAssociationAdmin(associationId);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!associationId || !facilityId) return;

    const fetchFacility = async () => {
      try {
        const facilityRef = doc(db, `associations/${associationId}/facilities/${facilityId}`);
        const facilitySnap = await getDoc(facilityRef);

        if (!facilitySnap.exists()) {
          console.error("[FacilityDetailPage] 시설 문서가 존재하지 않음:", { facilityId });
          setNotFound(true);
          return;
        }

        const data = facilitySnap.data();
        
        // ✅ adminStatus 체크 (공지 패턴과 동일)
        const adminStatus = data.adminStatus || data.status;
        
        // 일반 사용자는 published만 노출
        if (!isAdmin && adminStatus !== "published") {
          console.log("[FacilityDetailPage] published 상태가 아님:", { adminStatus });
          setNotFound(true);
          return;
        }

        const facilityData = {
          id: facilitySnap.id,
          ...data,
        } as Facility;

        setFacility(facilityData);
      } catch (error) {
        console.error("시설 조회 오류:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchFacility();
  }, [associationId, facilityId, isAdmin]);

  if (loading) {
    return (
      <SectionLayout title="시설 정보" associationId={associationId}>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      </SectionLayout>
    );
  }

  if (notFound || !facility) {
    return (
      <SectionLayout title="시설 정보" associationId={associationId}>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">시설을 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate(`/association/${associationId}/facilities`)}
            className="text-blue-600 hover:text-blue-800"
          >
            시설 목록으로 돌아가기
          </button>
        </div>
      </SectionLayout>
    );
  }

  return (
    <SectionLayout
      title="시설 정보"
      associationId={associationId}
      description="본 시설 정보는 협회 공식 시스템에 등록된 내용을 따릅니다."
    >
      {/* 시설 내용 */}
      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Header: 시설명 + 공식 배지 */}
        <header className="border-b border-gray-200 pb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex-1">
              {facility.title}
            </h2>
            <div className="flex items-center gap-2 flex-shrink-0">
              {facility.isPinned && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                  ⭐ 고정
                </span>
              )}
              {(facility.isOfficial !== false) && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  공식
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    // 시설 목록 페이지로 이동하여 Drawer로 수정
                    navigate(`/association/${associationId}/facilities?edit=${facilityId}`);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1"
                >
                  수정
                </button>
              )}
            </div>
          </div>

          {/* Meta: 운영 시간 / 주소 */}
          <div className="space-y-2 text-sm text-gray-600">
            {facility.openTime && facility.closeTime && (
              <div>
                <span className="font-medium">운영 시간:</span>{" "}
                {facility.openTime} ~ {facility.closeTime}
              </div>
            )}
            {facility.address && (
              <div>
                <span className="font-medium">주소:</span> {facility.address}
              </div>
            )}
            {facility.createdAt && (
              <div>
                <span className="font-medium">등록일:</span>{" "}
                {formatDate(safeToDate(facility.createdAt))}
              </div>
            )}
          </div>
        </header>

        {/* 본문 (공지 패턴과 동일) */}
        {facility.content?.trim() ? (
          <div className="prose max-w-none py-6 border-b border-gray-200">
            <div className="whitespace-pre-wrap text-gray-700">
              {facility.content}
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8 border-b border-gray-200">
            본문 내용이 없습니다.
          </div>
        )}
      </div>

      {/* 하단 공식 기준 문구 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          본 시설 정보는 협회 공식 시스템에 등록된 내용을 따릅니다.
        </p>
      </div>
    </SectionLayout>
  );
}

