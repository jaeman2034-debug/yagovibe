import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import AssociationForm from "@/components/association/AssociationForm";
import { getAssociationById, type AssociationDoc } from "@/services/associationService";
import { useAuth } from "@/context/AuthProvider";
import { canEditAssociation } from "@/utils/permission";

export default function AssociationEdit() {
  const navigate = useNavigate();
  const { associationId } = useParams<{ associationId: string }>();
  const { user } = useAuth();
  const [data, setData] = useState<AssociationDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      if (!associationId) {
        setLoading(false);
        return;
      }
      try {
        const association = await getAssociationById(associationId);
        setData(association);
      } catch (error) {
        console.error("[AssociationEdit] 협회 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [associationId]);

  if (!associationId) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">로딩 중...</div>;
  }

  if (!canEditAssociation(user?.uid, data)) {
    return <Navigate to={`/association/${associationId}`} replace />;
  }

  if (!data) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">협회 정보를 찾을 수 없습니다.</div>;
  }

  if (data.deleted) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-3 py-2 rounded-md border bg-white"
          >
            뒤로가기
          </button>
          <h1 className="text-xl font-bold text-gray-900">협회 수정</h1>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <AssociationForm initialData={data} mode="edit" />
        </div>
      </div>
    </div>
  );
}

