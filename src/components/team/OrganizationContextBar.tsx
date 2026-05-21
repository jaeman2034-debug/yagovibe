/**
 * OrganizationContextBar
 * 조직 컨텍스트 바 (협회 소속 여부 표시)
 *
 * 사용자가 현재 어느 협회에 소속되어 있는지, 또는 미소속인지 표시
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Building2 } from "lucide-react";
import { mobileFullWidthContainerClassName } from "@/components/layout/MobileFullWidthContainer";
import { cn } from "@/lib/utils";

interface OrganizationContextBarProps {
  teamId?: string;
  teamAssociationId?: string;
}

export default function OrganizationContextBar({
  teamId: _teamId,
  teamAssociationId,
}: OrganizationContextBarProps) {
  const [associationName, setAssociationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssociation = async () => {
      if (!teamAssociationId) {
        setLoading(false);
        return;
      }

      try {
        const associationDoc = await getDoc(doc(db, "associations", teamAssociationId));
        if (associationDoc.exists()) {
          const data = associationDoc.data();
          setAssociationName(data.name || null);
        }
      } catch (error) {
        console.error("협회 정보 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchAssociation();
  }, [teamAssociationId]);

  const innerClass = cn(mobileFullWidthContainerClassName, "flex items-center gap-2 py-0");

  if (loading) {
    return (
      <div className="border-b border-blue-200 bg-blue-50 py-3 dark:border-blue-800 dark:bg-blue-900/20">
        <div className={innerClass}>
          <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (associationName) {
    return (
      <div className="border-b border-blue-200 bg-blue-50 py-3 dark:border-blue-800 dark:bg-blue-900/20">
        <div className={innerClass}>
          <Building2 className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {associationName}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div className={innerClass}>
        <Building2 className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          현재 협회에 소속되지 않은 상태입니다
        </span>
      </div>
    </div>
  );
}
