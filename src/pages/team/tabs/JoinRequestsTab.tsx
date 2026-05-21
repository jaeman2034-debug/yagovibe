/**
 * 🔥 가입 요청 탭
 * 
 * 역할:
 * - teamJoinRequests 쿼리 (pending 상태만)
 * - 승인/거절 버튼
 * - 실시간 업데이트
 * - Optimistic update
 */

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDoc,
  doc,
  onSnapshot,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { approveTeamJoinRequest, rejectTeamJoinRequest } from '@/lib/team/teamJoinRequest';
import { Check, X, User } from 'lucide-react';
import { toast } from 'sonner';

/** 초대 랜딩 【포지션】/【한마디】 형식이면 분리, 아니면 자유 메시지 */
function parseJoinRequestExtras(message: string | undefined): {
  position?: string;
  note?: string;
  freeform?: string;
} {
  if (!message?.trim()) return {};
  const text = message.trim();
  const posLine = text.split('\n').find((l) => l.trim().startsWith('【포지션】'));
  const position = posLine
    ? posLine.trim().replace(/^【포지션】\s*/, '').trim() || undefined
    : undefined;
  const hi = text.indexOf('【한마디】');
  const note =
    hi >= 0 ? text.slice(hi).replace(/^【한마디】\s*/, '').trim() || undefined : undefined;
  if (position || (note && note.length > 0)) {
    return { position, note };
  }
  return { freeform: text };
}

interface JoinRequest {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  /** 신청자 선택 입력 — 이 탭(팀 관리)에서만 표시 */
  contactPhone?: string;
  userPhotoURL?: string;
  message?: string;
  createdAt: any;
}

interface JoinRequestsTabProps {
  teamId: string;
  teamName: string;
}

function isAlreadyTeamMemberApproveError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    message.includes('이미 팀원으로 등록') ||
    m.includes('already-exists') ||
    m.includes('already exists')
  );
}

export function JoinRequestsTab({ teamId, teamName }: JoinRequestsTabProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [optimisticRemoved, setOptimisticRemoved] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(false);
  const [fading, setFading] = useState<Set<string>>(new Set());

  // 포커스 요청: ?focus=1로 들어오면 스크롤/하이라이트
  useEffect(() => {
    if (searchParams.get('focus') === '1') {
      setTimeout(() => {
        document.getElementById('requests-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlight(true);
        setTimeout(() => setHighlight(false), 1200);
      }, 120);
    }
  }, [searchParams]);

  // 실시간 가입 요청 구독 + 사용자 정보 조회
  useEffect(() => {
    if (!teamId) return;

    const q = query(
      collection(db, 'teamJoinRequests'),
      where('teamId', '==', teamId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const requests = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const userId = data.userId;

          // 사용자 정보 조회
          let userName = data.userName;
          let userEmail = data.userEmail;
          let userPhotoURL = data.userPhotoURL;

          if (!userName && userId) {
            try {
              const userRef = doc(db, 'users', userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const userData = userSnap.data();
                userName = userData.displayName || userData.name || userData.email?.split('@')[0] || userId;
                userEmail = userData.email;
                userPhotoURL = userData.photoURL || userData.avatar;
              } else {
                userName = userId;
              }
            } catch (e) {
              console.error('사용자 정보 조회 실패:', e);
              userName = userId;
            }
          }

          return {
            id: d.id,
            userId,
            userName,
            userEmail,
            contactPhone:
              typeof data.contactPhone === "string" && data.contactPhone.trim()
                ? data.contactPhone.trim()
                : undefined,
            userPhotoURL,
            message: data.message,
            createdAt: data.createdAt,
          } as JoinRequest;
        })
      );

      // Optimistic update로 제거된 항목 필터링
      const filtered = requests.filter(req => !optimisticRemoved.has(req.id));
      setJoinRequests(filtered);
      setLoading(false);
    }, (error) => {
      console.error('가입 요청 구독 실패:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [teamId, optimisticRemoved]);

  const handleApprove = async (requestId: string, userId: string, userName?: string) => {
    if (!user?.uid || processing) return;

    // 🔥 Optimistic: 우선 페이드아웃 → 잠깐 뒤 리스트 제거
    setFading(prev => new Set(prev).add(requestId));
    setTimeout(() => {
      setOptimisticRemoved(prev => new Set(prev).add(requestId));
    }, 180);
    setProcessing(requestId);

    try {
      await approveTeamJoinRequest(
        requestId,
        teamId,
        userId,
        user.uid,
        teamName
      );

      // 성공: optimistic update가 이미 적용됨
      // 실시간 구독이 자동으로 최신 상태 반영
      
      // 🔥 성공 피드백: 사용자 이름 포함
      const displayName = userName || '팀원';
      toast.success(`${displayName}님이 팀에 합류했어요! 🎉`, {
        duration: 3000,
      });

      // 🔥 남은 요청이 없으면 자동으로 팀장 페이지로 복귀
      const remainingRequests = joinRequests.filter(req => req.id !== requestId);
      if (remainingRequests.length === 0) {
        setTimeout(() => {
          navigate(`/teams/${teamId}/manage`);
        }, 1500); // 토스트 메시지를 보여준 후 복귀
      }
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '');
      if (isAlreadyTeamMemberApproveError(msg)) {
        toast.info(
          `${userName ? `${userName}님은` : '이 사용자는'} 이미 팀에 등록되어 있어요. 목록에서 정리해 두었어요 🙂`,
          { duration: 4000 }
        );
        setOptimisticRemoved((prev) => new Set(prev).add(requestId));
        setFading((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
      } else {
        console.error('승인 실패:', e);
        setOptimisticRemoved((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
        setFading((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
        toast.error(msg || '승인에 실패했습니다.');
      }
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string, userId: string) => {
    if (!user?.uid || processing) return;

    if (!confirm('가입 요청을 거절할까요?')) return;

    // 🔥 Optimistic: 페이드아웃 → 제거
    setFading(prev => new Set(prev).add(requestId));
    setTimeout(() => {
      setOptimisticRemoved(prev => new Set(prev).add(requestId));
    }, 180);
    setProcessing(requestId);

    try {
      await rejectTeamJoinRequest(
        requestId,
        userId,
        teamName,
        user.uid
      );

      // 성공: optimistic update가 이미 적용됨
    } catch (e: any) {
      console.error('거절 실패:', e);
      
      // 🔥 실패 시 롤백: optimistic update 취소
      setOptimisticRemoved(prev => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      
      toast.error(e.message ?? '거절에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  };

  // 다중 선택 토글
  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    if (selected.length === joinRequests.length) setSelected([]);
    else setSelected(joinRequests.map((r) => r.id));
  };

  const approveMany = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`${ids.length}명을 승인하시겠어요?\n승인 후 되돌릴 수 없습니다.`)) return;
    for (const id of ids) {
      const req = joinRequests.find(r => r.id === id);
      if (!req) continue;
      // eslint-disable-next-line no-await-in-loop
      await handleApprove(req.id, req.userId, req.userName);
    }
    const first = joinRequests.find(r => ids.includes(r.id));
    if (first) {
      const others = ids.length - 1;
      toast.success(others > 0 ? `${first.userName || '팀원'} 외 ${others}명 승인 완료 🎉` : `${first.userName || '팀원'} 승인 완료 🎉`);
    } else {
      toast.success(`${ids.length}명 승인 완료 🎉`);
    }
    setSelected([]);
  };

  const rejectMany = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`${ids.length}건을 거절할까요?\n처리 후 되돌릴 수 없습니다.`)) return;
    for (const id of ids) {
      const req = joinRequests.find(r => r.id === id);
      if (!req) continue;
      // eslint-disable-next-line no-await-in-loop
      await handleReject(req.id, req.userId);
    }
    toast.success(`${ids.length}건 거절 처리 완료`);
    setSelected([]);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-500">요청 불러오는 중...</p>
      </div>
    );
  }

  if (joinRequests.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-sm font-medium text-gray-700 mb-1">
          아직 가입 요청이 없어요 🙂
        </p>
        <p className="text-xs text-gray-500 mb-4">
          팀원을 초대해보세요. 초대하면 여기에서 승인할 수 있어요.
        </p>
        <button
          onClick={() => navigate(`/teams/${teamId}/invite`)}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black active:scale-[0.98] transition"
        >
          팀원 초대하기
        </button>
      </div>
    );
  }

  return (
    <div id="requests-section" className={`space-y-3 ${highlight ? 'bg-yellow-50 rounded-lg p-2 transition' : ''}`}>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            가입 요청 ({joinRequests.length})
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            초대 링크로 신청한 대기 건이에요. 승인하면 팀원으로 등록되고, 거절하면 요청이 종료돼요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700 flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={selected.length === joinRequests.length}
              onChange={toggleAll}
            />
            전체 선택
          </label>
          <button
            onClick={approveMany}
            disabled={!selected.length}
            className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {selected.length}명 승인
          </button>
          <button
            onClick={rejectMany}
            disabled={!selected.length}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-200 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {selected.length}명 거절
          </button>
        </div>
      </div>

      {joinRequests.map(req => {
        const isProcessing = processing === req.id;
        const isDisabled = !!processing;

        return (
          <div
            key={req.id}
            className={`flex items-center justify-between border-2 rounded-lg p-4 bg-white transition-all duration-200 ${
              isProcessing
                ? 'opacity-60 pointer-events-none border-gray-200'
                : 'hover:shadow-lg hover:border-blue-400 border-gray-200'
            } ${fading.has(req.id) ? 'opacity-0' : 'opacity-100'}`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="accent-blue-600 mt-1"
                  checked={selected.includes(req.id)}
                  onChange={() => toggle(req.id)}
                />
                {/* 프로필 이미지 또는 아바타 */}
                {req.userPhotoURL ? (
                  <img
                    src={req.userPhotoURL}
                    alt={req.userName || '사용자'}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0 border-2 border-gray-200">
                    {req.userName ? (
                      <span className="text-blue-700 font-bold text-lg">
                        {req.userName[0]?.toUpperCase() || 'U'}
                      </span>
                    ) : (
                      <User className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {req.userName || '사용자'}
                  </p>
                  {req.userEmail && (
                    <p className="text-xs text-gray-500 truncate">
                      {req.userEmail}
                    </p>
                  )}
                  {req.contactPhone ? (
                    <p className="text-xs text-gray-700 mt-1 font-mono tracking-tight">
                      연락처 (신청 시): <span className="select-all">{req.contactPhone}</span>
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-400 mt-1">
                    요청일:{' '}
                    {req.createdAt instanceof Timestamp
                      ? req.createdAt.toDate().toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : req.createdAt
                      ? new Date(req.createdAt).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </p>
                  {req.message ? (() => {
                    const { position, note, freeform } = parseJoinRequestExtras(req.message);
                    if (position || note) {
                      return (
                        <div className="mt-2 space-y-2">
                          {position ? (
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-blue-100">
                              포지션 · {position}
                            </span>
                          ) : null}
                          {note ? (
                            <p className="text-sm text-gray-700 p-2 bg-gray-50 rounded-md border border-gray-100 leading-relaxed whitespace-pre-wrap">
                              {note}
                            </p>
                          ) : null}
                        </div>
                      );
                    }
                    return (
                      <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap leading-relaxed">
                        「{freeform}」
                      </p>
                    );
                  })() : null}
                </div>
              </div>
            </div>

            <div className="flex gap-2 ml-4 flex-shrink-0">
              <button
                onClick={() => handleApprove(req.id, req.userId, req.userName)}
                disabled={isDisabled}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300 font-medium flex items-center gap-2 shadow-sm"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>처리 중...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>승인</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleReject(req.id, req.userId)}
                disabled={isDisabled}
                className="px-4 py-2 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-200 font-medium flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>거절</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
