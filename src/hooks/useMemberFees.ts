/**
 * 회원 회비 조회 Hook
 */

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MembershipFee } from "@/types/fee";
import { useAuth } from "@/context/AuthProvider";

export function useMemberFees(associationId?: string) {
  const { user } = useAuth();
  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId || !user) {
      setLoading(false);
      return;
    }

    const fetchFees = async () => {
      try {
        const feesRef = collection(db, `associations/${associationId}/membership_fees`);
        const q = query(feesRef, where("memberId", "==", user.uid));
        const snapshot = await getDocs(q);

        const feesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MembershipFee[];

        setFees(feesData);
      } catch (error) {
        console.error("회비 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, [associationId, user]);

  const hasUnpaidRequiredFee = fees.some(
    (fee) => fee.status === "unpaid" && (fee.type === "annual" || fee.type === "monthly")
  );

  return {
    fees,
    loading,
    hasUnpaidRequiredFee,
  };
}

