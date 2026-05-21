// src/pages/team/TeamCreate.tsx
// 🔥 팀 생성 라우터 (mode에 따라 화면 분기)
//
// 경로 기반 라우팅:
// - /sports/:sport/team/create → TeamCreateChoice 또는 TeamCreateForm
// - /sports/:sport/team/create/next → TeamCreateStep2 (별도 라우트)
// - /sports/:sport/team/create/complete → TeamCreateStep3 (별도 라우트)
//
// mode 파라미터 (선택 화면 → 폼):
// - 없음: TeamCreateChoice
// - non-member | member-request: TeamCreateForm

import { useSearchParams } from "react-router-dom";
import TeamCreateChoice from "./TeamCreateChoice";
import TeamCreateForm from "./TeamCreateForm";

export default function TeamCreate() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");

  if (!mode) {
    return <TeamCreateChoice />;
  }

  if (mode === "non-member" || mode === "member-request") {
    return <TeamCreateForm mode={mode} />;
  }

  return <TeamCreateChoice />;
}
