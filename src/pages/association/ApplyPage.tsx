/**
 * 참가 신청 페이지 (Public)
 * /association/:associationId/apply?noticeId=...
 * 
 * 역할:
 * - 공지 기반 참가 신청 접수
 * - 로그인 불필요 (아직 팀장/팀원 아님)
 * - 신청 후 관리자 승인 대기
 * 
 * 플로우:
 * 신청 접수 → 관리자 승인 → 팀 생성 + 팀장 초대 링크 발송
 */

import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notice } from "@/types/notice";

type Application = {
  id: string;
  noticeId: string;
  teamName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  memo?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: Timestamp;
  approvedAt?: Timestamp;
};

export default function ApplyPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const noticeId = searchParams.get("noticeId");

  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 폼 데이터
  const [teamName, setTeamName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [memo, setMemo] = useState("");

  // 공지 조회
  useEffect(() => {
    if (!associationId || !noticeId) {
      setLoading(false);
      return;
    }

    const fetchNotice = async () => {
      try {
        setLoading(true);
        const noticeRef = doc(db, `associations/${associationId}/notices/${noticeId}`);
        const noticeSnap = await getDoc(noticeRef);

        if (!noticeSnap.exists()) {
          setLoading(false);
          return;
        }

        const data = noticeSnap.data();
        
        // published 상태만 허용
        if (data.status !== "published") {
          setLoading(false);
          return;
        }

        setNotice({
          id: noticeSnap.id,
          ...data,
        } as Notice);
      } catch (error: any) {
        console.error("[참가 신청] 공지 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, [associationId, noticeId]);

  // 신청 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!associationId || !noticeId || !teamName.trim() || !contactName.trim() || !contactPhone.trim() || !contactEmail.trim()) {
      alert("필수 항목을 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const applicationsRef = collection(db, "associations", associationId, "Applications");
      
      await addDoc(applicationsRef, {
        noticeId,
        teamName: teamName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        memo: memo.trim() || undefined,
        status: "PENDING",
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (error: any) {
      console.error("[참가 신청] 제출 오류:", error);
      alert("신청 제출에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-4">공지를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-6">유효하지 않은 공지이거나 게시되지 않은 공지입니다.</p>
          <Link
            to={`/association/${associationId}/notices`}
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
          >
            공지 목록으로 이동
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">참가 신청 접수 완료</h1>
          <p className="text-gray-600 mb-6">
            참가 신청이 접수되었습니다.
            <br />
            협회 승인 후 팀장 초대 링크가 발송됩니다.
          </p>
          <Link
            to={`/association/${associationId}/notices/${noticeId}`}
            className="inline-block px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-semibold"
          >
            공지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 space-y-6">
          {/* 헤더 */}
          <div>
            <Link
              to={`/association/${associationId}/notices/${noticeId}`}
              className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
            >
              ← 공지로 돌아가기
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">⚽ 대회 참가 신청</h1>
            <p className="text-sm text-gray-600 mt-1">{notice.title}</p>
          </div>

          {/* 안내 문구 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>안내:</strong> 신청 제출 후 협회 승인을 거쳐 팀장 초대 링크가 발송됩니다.
              <br />
              팀원 등록은 팀장 초대 링크를 통해 진행됩니다.
            </p>
          </div>

          {/* 신청 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 팀명 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                팀명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="팀명을 입력하세요"
              />
            </div>

            {/* 대표자 이름 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                대표자 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="대표자 이름을 입력하세요"
              />
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                연락처 (휴대폰) <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="010-0000-0000"
              />
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@email.com"
              />
            </div>

            {/* 팀 소개 (선택) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                팀 소개 (선택)
              </label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="팀 소개를 간단히 입력하세요"
              />
            </div>

            {/* 제출 버튼 */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {submitting ? "제출 중..." : "참가 신청 제출"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


