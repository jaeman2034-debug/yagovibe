import { Link, useLocation } from "react-router-dom";

const DOCS: Record<
  string,
  { title: string; summary: string }
> = {
  privacy: {
    title: "개인정보 처리방침",
    summary:
      "YAGO는 회원·팀·아카데미 서비스 제공을 위해 필요한 범위에서 개인정보를 수집·이용합니다. 정식 문안은 법무 검토 후 이 페이지에 게시됩니다.",
  },
  terms: {
    title: "이용약관",
    summary:
      "YAGO 스포츠 플랫폼 이용 조건, 회원의 권리·의무, 서비스 변경·중단에 관한 내용이 포함됩니다. 정식 문안은 법무 검토 후 이 페이지에 게시됩니다.",
  },
  "video-analysis-policy": {
    title: "영상 분석 정책",
    summary:
      "업로드 영상의 AI 분석, 성장 리포트 생성, 보관 기간, 미성년자 법정대리인 동의, 삭제 요청 절차에 관한 정책입니다. 정식 문안은 법무 검토 후 이 페이지에 게시됩니다.",
  },
};

const PATH_TO_DOC: Record<string, string> = {
  "/privacy": "privacy",
  "/terms": "terms",
  "/video-analysis-policy": "video-analysis-policy",
};

export default function LegalDocumentPage() {
  const { pathname } = useLocation();
  const docId = PATH_TO_DOC[pathname];
  const doc = docId ? DOCS[docId] : undefined;

  if (!doc) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-gray-600">
        <p>요청하신 문서를 찾을 수 없습니다.</p>
        <Link to="/hub" className="mt-4 inline-block text-blue-600 underline">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-amber-700">준비 중</p>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{doc.title}</h1>
      <p className="mt-4 text-sm leading-relaxed text-gray-700">{doc.summary}</p>
      <p className="mt-6 text-xs text-gray-500">
        운영 서비스 전 정식 약관·처리방침이 확정되면 본 페이지 내용이 교체됩니다.
      </p>
      <Link to="/hub" className="mt-8 inline-block text-sm text-blue-600 underline">
        돌아가기
      </Link>
    </div>
  );
}
