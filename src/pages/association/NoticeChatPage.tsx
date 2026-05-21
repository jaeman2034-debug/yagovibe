/**
 * 🔥 공지 기반 대화 화면
 * Step 5: 대화 UI 컴포넌트 (실전 구현)
 * 
 * 경로: /association/:associationId/notices/:noticeId/chat
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { SectionLayout } from "@/components/association/SectionLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, ArrowLeft, User, Shield, Bot } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import {
  subscribeNoticeChat,
  sendNoticeMessage,
} from "@/lib/notice/noticeConversationRepository";
import { generateNoticeAIDraft } from "@/lib/notice/noticeAiRepository";
import {
  pinNoticeFaq,
  getNoticeFaqs,
  findSimilarFaqs,
  type NoticeFaq,
} from "@/lib/notice/noticeFaqRepository";
import type { ConversationMessage } from "@/types/noticeConversation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notice } from "@/types/notice";
import { formatDate } from "@/utils/dateUtils";
import { Sparkles, Loader2, Pin, CheckCircle2 } from "lucide-react";

export default function NoticeChatPage() {
  const { associationId, noticeId } = useParams<{
    associationId: string;
    noticeId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAssociationAdmin(associationId);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<NoticeFaq[]>([]);
  const [similarFaqs, setSimilarFaqs] = useState<NoticeFaq[]>([]);
  const [pinning, setPinning] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 스크롤을 맨 아래로
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 공지 정보 및 FAQ 로드
  useEffect(() => {
    if (!associationId || !noticeId) return;

    const loadNotice = async () => {
      try {
        const noticeRef = doc(
          db,
          `associations/${associationId}/notices/${noticeId}`
        );
        const noticeSnap = await getDoc(noticeRef);

        if (noticeSnap.exists()) {
          setNotice({
            id: noticeSnap.id,
            ...noticeSnap.data(),
          } as Notice);
        }

        // FAQ 목록 로드
        const faqList = await getNoticeFaqs(associationId, noticeId);
        setFaqs(faqList);
      } catch (error) {
        console.error("공지/FAQ 로드 오류:", error);
      }
    };

    loadNotice();
  }, [associationId, noticeId]);

  // 🔥 실시간 메시지 구독
  useEffect(() => {
    if (!associationId || !noticeId) return;

    setLoading(true);

    // 실시간 구독 시작
    const unsubscribe = subscribeNoticeChat(
      associationId,
      noticeId,
      (msgs) => {
        setMessages(msgs);
        // 메시지가 있으면 로딩 완료 (Functions가 시스템 메시지를 생성했음)
        if (msgs.length > 0) {
          setLoading(false);
        } else {
          // 메시지가 없으면 Functions 트리거 대기 (최대 5초)
          setTimeout(() => {
            if (msgs.length === 0) {
              setLoading(false);
            }
          }, 5000);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [associationId, noticeId]);

  const handleSend = async () => {
    if (!text.trim() || !user || !associationId || !noticeId) return;

    setSending(true);
    try {
      await sendNoticeMessage({
        associationId,
        noticeId,
        senderType: isAdmin ? "ADMIN" : "USER",
        senderId: user.uid,
        senderName: user.displayName || user.email || "사용자",
        content: text.trim(),
      });

      setText("");
      setSelectedQuestion(null);
    } catch (error) {
      console.error("메시지 전송 오류:", error);
      alert("메시지 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  };

  // 🔥 AI 초안 생성 (FAQ 포함)
  const handleGenerateAIDraft = async (userQuestion: string) => {
    if (!notice || !user || !isAdmin) return;

    setAiGenerating(true);
    setSelectedQuestion(userQuestion);
    try {
      // FAQ를 AI 프롬프트에 포함
      const faqList = faqs.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
      }));

      const draft = await generateNoticeAIDraft({
        noticeTitle: notice.title,
        noticeContent: notice.content || "",
        userQuestion,
        faqs: faqList,
        feePolicy: notice.feePolicy || undefined,
      });

      // AI 초안을 입력 필드에 자동 입력
      setText(draft);
    } catch (error: any) {
      console.error("AI 초안 생성 오류:", error);
      alert(
        error.message === "AI_DRAFT_FAILED"
          ? "AI 초안 생성에 실패했습니다."
          : "오류가 발생했습니다."
      );
    } finally {
      setAiGenerating(false);
    }
  };

  // 🔥 FAQ로 고정
  const handlePinFaq = async (
    messageId: string,
    question: string,
    answer: string
  ) => {
    if (!associationId || !noticeId || !user || !isAdmin) return;

    setPinning(messageId);
    try {
      await pinNoticeFaq({
        associationId,
        noticeId,
        faqId: messageId,
        question,
        answer,
        adminId: user.uid,
      });

      // FAQ 목록 새로고침
      const faqList = await getNoticeFaqs(associationId, noticeId);
      setFaqs(faqList);

      alert("FAQ로 고정되었습니다.");
    } catch (error) {
      console.error("FAQ 고정 오류:", error);
      alert("FAQ 고정에 실패했습니다.");
    } finally {
      setPinning(null);
    }
  };

  // 🔥 사용자 질문 입력 시 유사 FAQ 자동 제시
  useEffect(() => {
    if (!text.trim() || text.length < 3 || !isAdmin) {
      setSimilarFaqs([]);
      return;
    }

    // 사용자 질문으로 보이는 경우에만 (USER 메시지가 아닐 때)
    const similar = findSimilarFaqs(text, faqs, 0.2);
    setSimilarFaqs(similar.slice(0, 3)); // 최대 3개
  }, [text, faqs, isAdmin]);

  if (loading && messages.length === 0) {
    return (
      <SectionLayout title="공지 문의" associationId={associationId}>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500">대화를 불러오는 중...</p>
        </div>
      </SectionLayout>
    );
  }

  if (!notice) {
    return (
      <SectionLayout title="공지 문의" associationId={associationId}>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">공지를 찾을 수 없습니다.</p>
          <Button
            onClick={() =>
              navigate(`/association/${associationId}/notices/${noticeId}`)
            }
          >
            공지로 돌아가기
          </Button>
        </div>
      </SectionLayout>
    );
  }

  return (
    <SectionLayout title="공지 문의" associationId={associationId}>
      <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px] bg-white rounded-lg shadow-md overflow-hidden">
        {/* 상단 헤더 */}
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                navigate(`/association/${associationId}/notices/${noticeId}`)
              }
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              공지로
            </Button>
            <div>
              <div className="text-sm font-semibold">{notice.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  공식 공지 기준 대화
                </Badge>
                {isClosed && (
                  <Badge variant="secondary" className="text-xs">
                    🔒 공지 종료됨
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-gray-50">
          {isClosed && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-1">
                🔒 이 공지는 종료되었습니다.
              </p>
              <p className="text-xs text-yellow-700">
                공식 기준 답변은 아래 FAQ를 참고해 주세요.
              </p>
            </div>
          )}
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p className="text-sm">대화를 불러오는 중...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSystem = msg.senderType === "SYSTEM";
              const isAdminMsg = msg.senderType === "ADMIN";
              const isUserMsg = msg.senderType === "USER";
              const isMyMessage =
                msg.senderType !== "SYSTEM" && msg.senderId === user?.uid;

              return (
                <div key={msg.id} className="space-y-2">
                  <div
                    className={`flex ${
                      isMyMessage ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg p-3 ${
                        isSystem
                          ? "bg-gray-100 text-gray-700 border border-gray-200"
                          : isAdminMsg
                          ? "bg-blue-50 text-blue-900 border border-blue-200"
                          : isMyMessage
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-900 border border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {isSystem ? (
                          <Bot className="w-3 h-3" />
                        ) : isAdminMsg ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        <span className="text-xs font-medium">
                          {isSystem
                            ? "시스템"
                            : isAdminMsg
                            ? "관리자"
                            : msg.senderName || "사용자"}
                        </span>
                        {msg.createdAt?.toDate && (
                          <span className="text-xs opacity-70">
                            {formatDate(msg.createdAt.toDate(), {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  </div>

                  {/* 🔥 관리자용 AI 초안 생성 버튼 (USER 질문 아래에만 표시) */}
                  {isAdmin &&
                    isUserMsg &&
                    !isMyMessage &&
                    selectedQuestion !== msg.content && (
                      <div className="flex justify-start pl-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleGenerateAIDraft(msg.content)}
                          disabled={aiGenerating}
                          className="text-xs"
                        >
                          {aiGenerating ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              생성 중...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI 답변 초안 생성
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        {isClosed ? (
          <div className="p-4 border-t bg-gray-50">
            <div className="text-center text-sm text-gray-500">
              <p>이 공지는 종료되어 새로운 질문을 받지 않습니다.</p>
              <p className="text-xs mt-1">기존 FAQ를 참고해 주세요.</p>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t bg-white space-y-2">
            {/* 🔥 유사 FAQ 자동 제시 (사용자 질문 입력 시) */}
            {similarFaqs.length > 0 && !isAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <Pin className="w-4 h-4" />
                자주 묻는 질문
              </div>
              {similarFaqs.map((faq) => (
                <div key={faq.id} className="text-sm">
                  <div className="font-medium text-blue-800 mb-1">
                    Q. {faq.question}
                  </div>
                  <div className="text-blue-700 whitespace-pre-wrap">
                    A. {faq.answer}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // FAQ 답변을 입력 필드에 자동 입력
                  if (similarFaqs[0]) {
                    setText(similarFaqs[0].answer);
                  }
                }}
                className="w-full text-xs"
              >
                이 답변 사용하기
              </Button>
            </div>
          )}

          <Textarea
            placeholder={
              isAdmin
                ? "공지 내용을 기준으로 답변을 입력하세요..."
                : "공지 내용을 기준으로 문의해 주세요"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={sending || !user}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <div>
              {!user && (
                <p className="text-xs text-gray-500">
                  로그인이 필요합니다.
                </p>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || !text.trim() || !user}
              size="sm"
            >
              <Send className="w-4 h-4 mr-1" />
              {isAdmin ? "답변 보내기" : "문의 보내기"}
            </Button>
          </div>
          </div>
        )}
      </div>
    </SectionLayout>
  );
}
