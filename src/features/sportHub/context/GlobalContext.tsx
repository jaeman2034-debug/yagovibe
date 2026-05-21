/**
 * 🔥 Global Context - 글로벌 컨텍스트
 * 
 * 국가, 언어, 통화 관리
 */

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import type { Country, Lang } from "../domain/global.types";
import { detectLanguage, setLanguage } from "../domain/global.i18n";
import { COUNTRY_LANG, getDefaultLanguage } from "../domain/global.country";

const GlobalContext = createContext<{
  country: Country;
  lang: Lang;
  setLang: (lang: Lang) => void;
} | null>(null);

interface GlobalProviderProps {
  children: ReactNode;
  country?: Country;
  lang?: Lang;
}

/**
 * Global Provider
 */
export function GlobalProvider({ children, country = "KR", lang }: GlobalProviderProps) {
  const [currentLang, setCurrentLang] = useState<Lang>(
    lang || detectLanguage() || getDefaultLanguage(country)
  );

  useEffect(() => {
    // 언어 변경 시 저장
    setLanguage(currentLang);
  }, [currentLang]);

  return (
    <GlobalContext.Provider
      value={{
        country,
        lang: currentLang,
        setLang: setCurrentLang,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

/**
 * Global Hook
 */
export function useGlobal(): {
  country: Country;
  lang: Lang;
  setLang: (lang: Lang) => void;
} {
  const context = useContext(GlobalContext);
  if (!context) {
    // 기본값
    return {
      country: "KR",
      lang: "ko",
      setLang: () => {},
    };
  }
  return context;
}
