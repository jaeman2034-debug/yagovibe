/**
 * BuilderContext
 * YAGO Builder 상태 관리 Context
 */

import { createContext, useContext, useState, ReactNode } from "react";

export interface BuilderFormData {
  organizationType: "federation" | "academy" | "club" | "";
  name: string;
  region: string;
  sport: string;
  audience: string;
  heroImageUrl: string;
  templateId: string;
  adminEmails: string[];
}

interface BuilderContextType {
  step: number;
  values: BuilderFormData;
  setValues: (values: BuilderFormData | ((prev: BuilderFormData) => BuilderFormData)) => void;
  next: () => void;
  back: () => void;
  setStep: (step: number) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  createdAssociationId: string | null;
  setCreatedAssociationId: (id: string | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

interface BuilderProviderProps {
  children: ReactNode;
}

export function BuilderProvider({ children }: BuilderProviderProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createdAssociationId, setCreatedAssociationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [values, setValues] = useState<BuilderFormData>({
    organizationType: "",
    name: "",
    region: "",
    sport: "",
    audience: "",
    heroImageUrl: "",
    templateId: "nowon-football-template",
    adminEmails: [],
  });

  const next = () => {
    setStep((s) => Math.min(s + 1, 6)); // 최대 Step 6
  };

  const back = () => {
    setStep((s) => Math.max(s - 1, 0)); // 최소 Step 0
    setError(null); // 뒤로 가면 에러 초기화
  };

  return (
    <BuilderContext.Provider
      value={{
        step,
        values,
        setValues,
        next,
        back,
        setStep,
        loading,
        setLoading,
        createdAssociationId,
        setCreatedAssociationId,
        error,
        setError,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (context === undefined) {
    throw new Error("useBuilder must be used within a BuilderProvider");
  }
  return context;
}
