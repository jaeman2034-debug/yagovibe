// src/pages/team/TeamNotificationPage.tsx
// 🔥 통지 레이어: 알림 발송 관리 (회장/총무용)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTeam } from "@/context/TeamContext";
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { type NotificationLog, type NotificationQueueJob, processNotificationQueue } from "@/utils/notificationService";

export default function TeamNotificationPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { myTeam, role } = useTeam();
  const [notificationLogs, setNotificationLogs] = useState<NotificationLogWithPreview[]>([]);
  const [queueJobs, setQueueJobs] = useState<NotificationQueueJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<"logs" | "queue">("logs");

  // 알림 로그 조회
  useEffect(() => {
    if (!myTeam?.id || activeTab !== "logs") return;

    const fetchLogs = async () => {
      setLoading(true);
      try {
        const logsQuery = query(
          collection(db, "teams", myTeam.id, "notificationLogs"),
          orderBy("sentAt", "desc")
        );
        const snapshot = await getDocs(logsQuery);
        const logsList: NotificationLogWithPreview[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          logsList.push({
            id: doc.id,
            jobId: data.jobId || "",
            teamId: myTeam.id,
            type: data.type,
            toMemberId: data.toMemberId,
            channel: data.channel || "kakao",
            providerMessageId: data.providerMessageId,
            sentAt: data.sentAt?.toDate() || new Date(),
            result: data.result || "failed",
            snapshotPayload: data.snapshotPayload || {},
            error: data.error,
            testMode: data.testMode || false,
            previewMessage: data.previewMessage,
          });
        });
        setNotificationLogs(logsList);
      } catch (error) {
        console.error("알림 로그 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [myTeam?.id, activeTab]);

  // 큐 조회
  useEffect(() => {
    if (!myTeam?.id || activeTab !== "queue") return;

    const fetchQueue = async () => {
      setLoading(true);
      try {
        const queueQuery = query(
          collection(db, "teams", myTeam.id, "notificationQueue"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(queueQuery);
        const jobsList: NotificationQueueJob[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          jobsList.push({
            id: doc.id,
            teamId: myTeam.id,
            type: data.type,
            toMemberId: data.toMemberId,
            toPhoneLast4: data.toPhoneLast4,
            payload: data.payload || {},
            status: data.status || "queued",
            idempotencyKey: data.idempotencyKey || "",
            scheduledAt: data.scheduledAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            error: data.error,
            retryCount: data.retryCount || 0,
          });
        });
        setQueueJobs(jobsList);
      } catch (error) {
        console.error("큐 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
  }, [myTeam?.id, activeTab]);

  // 큐 처리 (수동 실행)
  const handleProcessQueue = async () => {
    if (!myTeam?.id) return;
    
    setProcessing(true);
    try {
      const result = await processNotificationQueue(myTeam.id, 10);
      alert(`처리 완료: ${result.processed}개 처리, ${result.succeeded}개 성공, ${result.failed}개 실패`);
      // 큐 새로고침
      if (activeTab === "queue") {
        window.location.reload();
      }
    } catch (error) {
      console.error("큐 처리 실패:", error);
      alert("큐 처리에 실패했습니다.");
    } finally {
      setProcessing(false);
    }
  };

  // 실패한 job 재시도
  const handleRetryJob = async (jobId: string) => {
    if (!myTeam?.id) return;
    
    try {
      const jobRef = doc(db, "teams", myTeam.id, "notificationQueue", jobId);
      await updateDoc(jobRef, {
        status: "queued",
        scheduledAt: Timestamp.now(),
        error: null,
      });
      alert("재시도 예약되었습니다.");
      // 큐 새로고침
      if (activeTab === "queue") {
        window.location.reload();
      }
    } catch (error) {
      console.error("재시도 실패:", error);
      alert("재시도에 실패했습니다.");
    }
  };

  // 회장/총무만 접근 가능
  if (role !== "회장" && role !== "총무" && role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <p className="text-xl font-semibold text-red-600 mb-4">접근 권한 없음</p>
          <p className="text-gray-700">알림 관리는 회장/총무만 접근할 수 있습니다.</p>
          <button
            onClick={() => navigate(`/sports/${type}/team`)}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            팀 대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-4xl py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button
                onClick={() => navigate(`/sports/${type}/team`)}
                className="text-blue-600 hover:text-blue-700 mb-2"
              >
                ← 뒤로
              </button>
              <h1 className="text-2xl font-bold text-gray-900">알림 발송 관리</h1>
              <p className="text-sm text-gray-500 mt-1">
                알림 발송 내역 및 큐 상태 관리
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/sports/${type}/team/notifications/settings`)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
              >
                설정
              </button>
              {activeTab === "queue" && (
                <button
                  onClick={handleProcessQueue}
                  disabled={processing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {processing ? "처리 중..." : "큐 처리 실행"}
                </button>
              )}
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-2 font-medium ${
                activeTab === "logs"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              발송 로그
            </button>
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-4 py-2 font-medium ${
                activeTab === "queue"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              발송 큐 ({queueJobs.filter(j => j.status === "queued" || j.status === "sending").length})
            </button>
          </div>
        </div>

        {/* 알림 로그 탭 */}
        {activeTab === "logs" && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">알림 발송 내역</h2>
            {loading ? (
              <p className="text-gray-500 text-center py-8">로딩 중...</p>
            ) : notificationLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">발송된 알림이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {notificationLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">{log.snapshotPayload.memberName || "알 수 없음"}</span>
                        <span className="ml-2 text-sm text-gray-500">({log.type})</span>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          log.result === "sent"
                            ? "bg-green-100 text-green-700"
                            : log.result === "preview"
                            ? "bg-blue-100 text-blue-700"
                            : log.result === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {log.result === "sent" ? "발송 완료" : log.result === "preview" ? "🔒 미리보기" : log.result === "failed" ? "발송 실패" : "스킵"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {log.snapshotPayload.yyyymm && `${log.snapshotPayload.yyyymm} `}
                      {log.snapshotPayload.unpaidMonths && `미납 ${log.snapshotPayload.unpaidMonths}개월`}
                      {log.snapshotPayload.collected && `수납 ${log.snapshotPayload.collected.toLocaleString()}원`}
                    </p>
                    {log.previewMessage && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="font-semibold text-blue-800 mb-1">🔒 미리보기 메시지:</p>
                        <p className="text-blue-700 whitespace-pre-wrap">{log.previewMessage}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400">
                      {log.sentAt.toLocaleString("ko-KR")} | {log.channel}
                      {log.providerMessageId && ` | ID: ${log.providerMessageId}`}
                      {log.testMode && " | 🔒 테스트 모드"}
                    </p>
                    {log.error && (
                      <p className="text-xs text-red-600 mt-1">오류: {log.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 발송 큐 탭 */}
        {activeTab === "queue" && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">발송 큐</h2>
            {loading ? (
              <p className="text-gray-500 text-center py-8">로딩 중...</p>
            ) : queueJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">큐에 대기 중인 작업이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {queueJobs.map((job) => (
                  <div
                    key={job.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">{job.payload.memberName || "알 수 없음"}</span>
                        <span className="ml-2 text-sm text-gray-500">({job.type})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            job.status === "sent"
                              ? "bg-green-100 text-green-700"
                              : job.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : job.status === "sending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {job.status === "sent" ? "발송 완료" : job.status === "failed" ? "실패" : job.status === "sending" ? "발송 중" : "대기 중"}
                        </span>
                        {job.status === "failed" && (
                          <button
                            onClick={() => job.id && handleRetryJob(job.id)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            재시도
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      {job.payload.yyyymm && `${job.payload.yyyymm} `}
                      {job.payload.unpaidMonths && `미납 ${job.payload.unpaidMonths}개월`}
                      {job.payload.collected && `수납 ${job.payload.collected.toLocaleString()}원`}
                    </p>
                    <p className="text-xs text-gray-400">
                      예약: {job.scheduledAt.toLocaleString("ko-KR")} | 
                      생성: {job.createdAt.toLocaleString("ko-KR")}
                      {job.retryCount && job.retryCount > 0 && ` | 재시도 ${job.retryCount}회`}
                    </p>
                    {job.error && (
                      <p className="text-xs text-red-600 mt-1">오류: {job.error}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Key: {job.idempotencyKey}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

