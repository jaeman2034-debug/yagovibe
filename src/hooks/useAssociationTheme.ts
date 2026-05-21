/**
 * 협회별 브랜딩 Theme Hook
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AssociationTheme, DEFAULT_THEME } from "@/types/theme";

export function useAssociationTheme(associationId?: string) {
  const [theme, setTheme] = useState<AssociationTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId) {
      setTheme(DEFAULT_THEME);
      setLoading(false);
      return;
    }

    const fetchTheme = async () => {
      try {
        const associationRef = doc(db, `associations/${associationId}`);
        const associationSnap = await getDoc(associationRef);

        if (associationSnap.exists()) {
          const data = associationSnap.data();
          if (data.theme) {
            setTheme({
              associationId,
              ...data.theme,
            } as AssociationTheme);
          } else {
            setTheme(DEFAULT_THEME);
          }
        } else {
          setTheme(DEFAULT_THEME);
        }
      } catch (error) {
        console.error("테마 조회 오류:", error);
        setTheme(DEFAULT_THEME);
      } finally {
        setLoading(false);
      }
    };

    fetchTheme();
  }, [associationId]);

  return { theme, loading };
}

