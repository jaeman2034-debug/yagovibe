/**
 * 🔥 팀 관리 페이지 (탭 구조)
 * 
 * 경로: /teams/:teamId/manage
 * 
 * 역할:
 * - 로그인 필수
 * - 팀 owner(리더)만 접근 가능
 * - 팀 없거나 권한 없으면 자동 리다이렉트
 * - 탭 구조로 기능 분리
 * - 쿼리 파라미터로 탭 전환 (tab=requests|members|settings|fees|accounting|stats|play)
 * - 탭 없으면 대시보드 표시
 */

import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FirebaseError } from 'firebase/app';
import { db } from '@/lib/firebase';
import { validateTeamFeeAmountInput } from '@/features/fees/utils/validateTeamFeeAmount';
import { useAuth } from '@/context/AuthProvider';
import {
  BulkTeamMemberAddError,
  createDirectTeamMember,
  createDirectTeamMembersBulk,
  formatBulkMemberFailuresLines,
  parseBulkMembers,
} from '@/services/teamMemberService';
import { parseMembersFromPdfFile, pdfParsedRowsToBulkInputs } from '@/lib/team/pdfMemberParser';
import {
  closeTeamFee,
  createTeamFee,
  getTeamFees,
  reopenTeamFee,
} from '@/lib/team/teamFees';
import {
  fetchActiveTeamMembersForFeeRollup,
  fetchTeamPaymentsByFeeId,
} from '@/lib/team/fetchTeamFeeRollupData';
import {
  rollupFeeCollectionForFee,
  type FeeRollupEntry,
  type FeeRollupStatus,
} from '@/features/fees/utils/feeCollectionRollup';
import { fetchTeamFeePolicy } from '@/lib/team/teamFeePolicy';
import type { TeamFee } from '@/types/fee';
import { JoinRequestsTab } from './tabs/JoinRequestsTab';
import { TeamMembersPanel } from '@/components/team/TeamMembersPanel';
import { TeamMemberInviteBar } from '@/components/team/TeamMemberInviteBar';
import { SettingsTab } from './tabs/SettingsTab';
import TeamManageDashboard from './TeamManageDashboard';
import FeeDashboard from '@/features/fees/components/FeeDashboard';
import TeamFeeAccountingSummaryCard from '@/features/fees/components/TeamFeeAccountingSummaryCard';
import TeamFeeHistoryList from '@/features/fees/components/TeamFeeHistoryList';
import TeamFeeCreateSheet from '@/features/fees/components/TeamFeeCreateSheet';
import TeamMonthlyKpiPanel from '@/features/fees/components/TeamMonthlyKpiPanel';
import TeamExperimentsSection from '@/features/fees/components/TeamExperimentsSection';
import TeamAccountingDashboard from '@/features/accounting/components/TeamAccountingDashboard';
import PlayTab from '@/components/team/play/PlayTab';
import { MEMBER_TEMPLATE_COLUMNS, generateTemplateExampleData } from '@/utils/googleSheetsTemplate';

type TeamManageTab =
  | 'requests'
  | 'members'
  | 'settings'
  | 'fees'
  | 'accounting'
  | 'stats'
  | 'play';

const errorMessageOf = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return fallback;
};

type MemberRoleSelectValue =
  | 'member'
  | 'staff'
  | 'manager'
  | 'owner'
  | 'president'
  | 'vice_president';

const mapSelectedRole = (
  selected: MemberRoleSelectValue
): { role: 'owner' | 'manager' | 'staff' | 'member'; roleDetail?: string } => {
  switch (selected) {
    case 'president':
      return { role: 'owner', roleDetail: '회장' };
    case 'vice_president':
      return { role: 'manager', roleDetail: '부회장' };
    default:
      return { role: selected };
  }
};

function canManageTeamByMemberData(data: Record<string, unknown> | undefined): boolean {
  if (!data) return false;
  const role = typeof data.role === "string" ? data.role.toLowerCase() : "";
  const accessLevel =
    typeof data.accessLevel === "string" ? data.accessLevel.toUpperCase() : "";
  return (
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "vice" ||
    role === "부팀장" ||
    accessLevel === "OWNER" ||
    accessLevel === "ADMIN"
  );
}

export default function TeamManagePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tabParam = rawTab as TeamManageTab | null;

  const [loading, setLoading] = useState(true);
  // NOTE: 팀 문서는 필드가 많고 단계적으로 타입을 좁히는 중이라 여기서는 any를 유지합니다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [team, setTeam] = useState<any>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [activeTab, setActiveTab] = useState<TeamManageTab | null>(tabParam);
  const [fees, setFees] = useState<TeamFee[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  /** 회차별 납부 집계(`payments` + 멤버 로스터) — 히스토리 필터·건수 표시 */
  const [feeRollupByFeeId, setFeeRollupByFeeId] = useState<Record<string, FeeRollupEntry>>({});
  /** 회차별 집계 성공/로딩/오류 — 전역 플래그 없이 fee 단위 unknown 처리 */
  const [feeRollupStatusByFeeId, setFeeRollupStatusByFeeId] = useState<Record<string, FeeRollupStatus>>({});
  const [newFeeTitle, setNewFeeTitle] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDueDate, setNewFeeDueDate] = useState('');
  const [autoGenerateFees, setAutoGenerateFees] = useState(false);
  const [autoStartMonth, setAutoStartMonth] = useState('');
  const [autoMonths, setAutoMonths] = useState(12);
  const [savingFee, setSavingFee] = useState(false);
  const [showFeeCreate, setShowFeeCreate] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<MemberRoleSelectValue>('member');
  const [newMemberJersey, setNewMemberJersey] = useState('');
  const [newMemberBirthYear, setNewMemberBirthYear] = useState('');
  const [newMemberUniformSize, setNewMemberUniformSize] = useState('');
  const [newMemberPosition, setNewMemberPosition] = useState('');
  const [newMemberRoleDetail, setNewMemberRoleDetail] = useState('');
  const [newMemberNote, setNewMemberNote] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [addingBulkMembers, setAddingBulkMembers] = useState(false);
  const [ageFilter, setAgeFilter] = useState('전체');
  const [positionFilter, setPositionFilter] = useState('전체');
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfFileInputRef = useRef<HTMLInputElement | null>(null);

  // 디버그: 현재 경로 로깅
  useEffect(() => {
    console.log("[NAV] path =", location.pathname);
  }, [location.pathname]);

  // 쿼리 파라미터 변경 시 탭 업데이트 (모든 조건부 return보다 위에 위치해야 함)
  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  /** 팀 변경 시 금액 칸을 비운 뒤 정책 월액이 있으면 기본값으로 채움 */
  useEffect(() => {
    if (!teamId) return;
    setNewFeeAmount('');
    let cancelled = false;
    fetchTeamFeePolicy(teamId)
      .then((p) => {
        if (cancelled) return;
        const w = Math.floor(p.monthlyAmount);
        if (w >= 1000) setNewFeeAmount(String(w));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const loadFees = async (targetTeamId: string) => {
    try {
      setFeesLoading(true);
      setFeeRollupByFeeId({});
      setFeeRollupStatusByFeeId({});
      const next = await getTeamFees(targetTeamId);
      setFees(next);
      const loadingMap = Object.fromEntries(next.map((f) => [f.id, "loading" as const]));
      setFeeRollupStatusByFeeId(loadingMap);

      let expectedAnnualMonths = 12;
      try {
        const policy = await fetchTeamFeePolicy(targetTeamId);
        expectedAnnualMonths = policy.annual?.months ?? 12;
      } catch {
        // 기본 12개월
      }

      let members: Awaited<ReturnType<typeof fetchActiveTeamMembersForFeeRollup>>;
      let byFee: Awaited<ReturnType<typeof fetchTeamPaymentsByFeeId>>;
      try {
        [members, byFee] = await Promise.all([
          fetchActiveTeamMembersForFeeRollup(targetTeamId),
          fetchTeamPaymentsByFeeId(targetTeamId),
        ]);
      } catch (aggErr) {
        console.error("회비 납부 집계(공통 조회) 실패:", aggErr);
        setFeeRollupByFeeId({});
        setFeeRollupStatusByFeeId(Object.fromEntries(next.map((f) => [f.id, "error" as const])));
        return;
      }

      const roll: Record<string, FeeRollupEntry> = {};
      const status: Record<string, FeeRollupStatus> = { ...loadingMap };
      for (const f of next) {
        try {
          roll[f.id] = rollupFeeCollectionForFee(members, byFee[f.id] ?? [], f, {
            expectedAnnualSplitMonths: expectedAnnualMonths,
          });
          status[f.id] = "success";
        } catch (oneErr) {
          console.error(`회비 집계 실패 feeId=${f.id}`, oneErr);
          status[f.id] = "error";
        }
      }
      setFeeRollupByFeeId(roll);
      setFeeRollupStatusByFeeId(status);
    } catch (error) {
      console.error('회비 목록 조회 실패:', error);
      setFees([]);
      setFeeRollupByFeeId({});
      setFeeRollupStatusByFeeId({});
    } finally {
      setFeesLoading(false);
    }
  };

  useEffect(() => {
    // 로그인 가드: 사용자 없으면 로그인으로 (현재 경로와 다를 때만)
    if (!user) {
      console.log("[NAV] redirect: /login (no user)");
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
      return;
    }
    // teamId 누락 시 마이페이지로 (현재 경로와 다를 때만)
    if (!teamId) {
      console.log("[NAV] redirect: /me (no teamId)");
      if (location.pathname !== '/me') {
        navigate('/me', { replace: true });
      }
      return;
    }

    let alive = true;

    const loadTeam = async () => {
      try {
        const ref = doc(db, 'teams', teamId);
        const snap = await getDoc(ref);
        
        // 🔥 팀장 활동 추적: 팀 관리 페이지 접근 시 lastActiveAt 업데이트
        if (snap.exists() && user?.uid) {
          const teamData = snap.data();
          const isCaptain = teamData.ownerUid === user.uid;
          
          if (isCaptain) {
            // 팀장의 마지막 활동 시각 업데이트
            try {
              const memberRef = doc(db, 'teams', teamId, 'members', user.uid);
              await updateDoc(memberRef, {
                lastActiveAt: serverTimestamp(),
              });
              
              // users 컬렉션에도 업데이트 (전역 활동 추적)
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                lastActiveAt: serverTimestamp(),
              });
            } catch (error) {
              // 권한 규칙상 클라 쓰기가 막힌 환경에서는 정상적으로 실패할 수 있음
              if (error instanceof FirebaseError && error.code === 'permission-denied') {
                // no-op
              } else {
                console.warn('활동 추적 업데이트 실패:', error);
              }
              // 활동 추적 실패는 무시 (비즈니스 로직에 영향 없음)
            }
          }
        }

        if (!snap.exists()) {
          console.log("[NAV] redirect: /me (team not found)");
          if (location.pathname !== '/me') {
            navigate('/me', { replace: true });
          }
          return;
        }

        const data = snap.data();

        // 🔐 리더(오너) 또는 부팀장 권한 체크
        const ownerUid =
          (typeof data.ownerUid === 'string' && data.ownerUid) ||
          (typeof data.ownerUserId === 'string' && data.ownerUserId) ||
          '';
        const userIsLeader = ownerUid === user.uid;
        
        // 부팀장 권한 확인
        let userIsViceCaptain = false;
        if (!userIsLeader && user?.uid) {
          try {
            const memberRef = doc(db, 'teams', teamId, 'members', user.uid);
            const memberSnap = await getDoc(memberRef);
            if (memberSnap.exists()) {
              userIsViceCaptain = canManageTeamByMemberData(
                memberSnap.data() as Record<string, unknown>
              );
            }
          } catch (e) {
            console.warn('부팀장 권한 확인 실패:', e);
          }
        }
        
        if (!userIsLeader && !userIsViceCaptain) {
          const target = `/teams/${encodeURIComponent(teamId)}/play`;
          console.log("[NAV] redirect:", target, "(no permission)");
          if (location.pathname !== target) {
            navigate(target, { replace: true });
          }
          return;
        }

        setTeam({ id: snap.id, ...data });
        setIsLeader(userIsLeader || userIsViceCaptain);
        // 회비 목록은 화면 렌더를 막지 않도록 비동기로 분리
        void loadFees(teamId);
      } catch (e) {
        console.error('팀 정보 조회 실패:', e);
        console.log("[NAV] redirect: /me (error)");
        if (location.pathname !== '/me') {
          navigate('/me', { replace: true });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadTeam();
    return () => {
      alive = false;
    };
  }, [teamId, user, navigate, location.pathname]);

  const refreshTeam = useCallback(async () => {
    if (!teamId || !user?.uid) return;
    try {
      const ref = doc(db, "teams", teamId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      const ownerUid =
        (typeof data.ownerUid === "string" && data.ownerUid) ||
        (typeof data.ownerUserId === "string" && data.ownerUserId) ||
        "";
      const userIsLeader = ownerUid === user.uid;

      let userIsViceCaptain = false;
      if (!userIsLeader) {
        try {
          const memberRef = doc(db, "teams", teamId, "members", user.uid);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            userIsViceCaptain = canManageTeamByMemberData(
              memberSnap.data() as Record<string, unknown>
            );
          }
        } catch {
          // ignore
        }
      }

      if (!userIsLeader && !userIsViceCaptain) return;

      setTeam({ id: snap.id, ...data });
    } catch {
      // 설정 저장 후 best-effort 새로고침
    }
  }, [teamId, user?.uid]);

  const addMonthsKeepingDay = (base: Date, monthOffset: number): Date => {
    const y = base.getFullYear();
    const m = base.getMonth() + monthOffset;
    const d = base.getDate();
    const lastDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(d, lastDay));
  };

  const handleCreateFee = async () => {
    if (!teamId || !user) return;
    if (!newFeeDueDate) {
      toast.error('마감일 기준일을 입력해 주세요.');
      return;
    }
    const amountTrim = String(newFeeAmount ?? '').trim();
    let resolvedAmount: number | undefined;
    if (amountTrim === '') {
      resolvedAmount = undefined;
    } else {
      const v = validateTeamFeeAmountInput(amountTrim);
      if (!v.ok) {
        toast.error(v.message);
        return;
      }
      if (v.needsLowAmountConfirm) {
        const ok = window.confirm(
          `금액이 ${v.amount.toLocaleString('ko-KR')}원입니다. 1만원 미만이면 오타일 수 있어요. 그대로 등록할까요?`
        );
        if (!ok) return;
      }
      if (v.warnThousandUnit) {
        toast.message('일반적인 회비는 1,000원 단위입니다. 금액을 한 번 더 확인해 주세요.');
      }
      resolvedAmount = v.amount;
    }
    try {
      setSavingFee(true);
      if (!autoGenerateFees) {
        if (!newFeeTitle.trim()) {
          toast.error('제목을 입력해 주세요.');
          return;
        }
        await createTeamFee(teamId, {
          title: newFeeTitle,
          amount: resolvedAmount,
          dueDate: new Date(newFeeDueDate),
          createdBy: user.uid,
        });
      } else {
        if (!autoStartMonth) {
          toast.error('시작월을 입력해 주세요.');
          return;
        }
        if (!Number.isFinite(autoMonths) || autoMonths < 1 || autoMonths > 24) {
          toast.error('개월 수는 1~24 범위로 입력해 주세요.');
          return;
        }
        const [yearStr, monthStr] = autoStartMonth.split('-');
        const startYear = Number(yearStr);
        const startMonth = Number(monthStr);
        if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) {
          toast.error('시작월 형식이 올바르지 않습니다.');
          return;
        }
        const dueBase = new Date(newFeeDueDate);
        const jobs: Array<Promise<string>> = [];
        for (let i = 0; i < autoMonths; i += 1) {
          const monthDate = new Date(startYear, startMonth - 1 + i, 1);
          const monthTitle = `${monthDate.getMonth() + 1}월 회비`;
          const dueDate = addMonthsKeepingDay(dueBase, i);
          jobs.push(
            createTeamFee(teamId, {
              title: monthTitle,
              amount: resolvedAmount,
              dueDate,
              createdBy: user.uid,
            })
          );
        }
        await Promise.all(jobs);
      }
      setNewFeeTitle('');
      setNewFeeDueDate('');
      setAutoStartMonth('');
      void fetchTeamFeePolicy(teamId).then((p) => {
        const w = Math.floor(p.monthlyAmount);
        setNewFeeAmount(w >= 1000 ? String(w) : '');
      });
      await loadFees(teamId);
      toast.success(autoGenerateFees ? '회차 자동 생성을 완료했습니다.' : '회비를 등록했습니다.');
    } catch (error) {
      console.error('회비 생성 실패:', error);
      const msg = error instanceof Error ? error.message : '회비 생성에 실패했습니다.';
      const suggestPolicy = typeof msg === 'string' && msg.includes('feePolicies/default');
      if (suggestPolicy && teamId) {
        toast.error(msg, {
          duration: 14_000,
          action: {
            label: '회비 정책 설정',
            onClick: () => navigate(`/teams/${teamId}/manage?tab=settings#fee-policy-settings`),
          },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setSavingFee(false);
    }
  };

  const handleAddMember = async () => {
    if (!teamId || addingMember || !isLeader) return;
    const name = newMemberName.trim();
    if (!name) {
      toast.error('이름을 입력해 주세요.');
      return;
    }

    setAddingMember(true);
    try {
      const { role, roleDetail } = mapSelectedRole(newMemberRole);
      await createDirectTeamMember(teamId, {
        displayName: name,
        phone: newMemberPhone.trim() || undefined,
        role,
        jerseyNumber: newMemberJersey.trim() ? Number(newMemberJersey) : undefined,
        birthYear: newMemberBirthYear.trim() ? Number(newMemberBirthYear) : undefined,
        uniformSize: newMemberUniformSize.trim() || undefined,
        position: newMemberPosition.trim() || undefined,
        roleDetail: newMemberRoleDetail.trim() || roleDetail,
        note: newMemberNote.trim() || undefined,
      });
      setNewMemberName('');
      setNewMemberPhone('');
      setNewMemberJersey('');
      setNewMemberBirthYear('');
      setNewMemberUniformSize('');
      setNewMemberPosition('');
      setNewMemberRoleDetail('');
      setNewMemberNote('');
      toast.success('멤버를 추가했습니다.');
    } catch (error: unknown) {
      console.error('멤버 직접 추가 실패:', error);
      toast.error(errorMessageOf(error, '멤버 추가에 실패했습니다.'));
    } finally {
      setAddingMember(false);
    }
  };

  const handleBulkAddMembers = async () => {
    if (!teamId || addingBulkMembers || !isLeader) return;
    if (!bulkInput.trim()) {
      toast.error('일괄 등록 내용을 입력해 주세요.');
      return;
    }

    setAddingBulkMembers(true);
    try {
      const rows = parseBulkMembers(bulkInput);
      const result = await createDirectTeamMembersBulk(teamId, rows);
      toast.success(`일괄 등록 완료: ${result.successCount}명`);
      setBulkInput('');
    } catch (error: unknown) {
      console.error('멤버 일괄 등록 실패:', error);
      toast.error(errorMessageOf(error, '일괄 등록에 실패했습니다.'));
    } finally {
      setAddingBulkMembers(false);
    }
  };

  const handleCsvUpload = async (file?: File | null) => {
    if (!file || !teamId || !isLeader || addingBulkMembers) return;
    setAddingBulkMembers(true);
    try {
      const text = await file.text();
      const rows = parseBulkMembers(text);
      const result = await createDirectTeamMembersBulk(teamId, rows);
      toast.success(`CSV 등록 완료: ${result.successCount}명`);
    } catch (error: unknown) {
      console.error('CSV 등록 실패:', error);
      if (error instanceof BulkTeamMemberAddError) {
        toast.error(formatBulkMemberFailuresLines(error.failures), { duration: 12_000 });
      } else {
        toast.error(errorMessageOf(error, 'CSV 등록에 실패했습니다.'));
      }
    } finally {
      setAddingBulkMembers(false);
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  const handlePdfUpload = async (file?: File | null) => {
    if (!file || !teamId || !isLeader || addingBulkMembers) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.pdf')) {
      toast.error('PDF 파일(.pdf)만 업로드할 수 있습니다.');
      return;
    }
    setAddingBulkMembers(true);
    try {
      const parsed = await parseMembersFromPdfFile(file);
      const bulkRows = pdfParsedRowsToBulkInputs(parsed);
      const skipped = parsed.length - bulkRows.length;
      if (bulkRows.length === 0) {
        toast.error(
          parsed.length === 0
            ? 'PDF에서 인식된 명단 줄이 없습니다. 텍스트가 선택되는 PDF인지 확인하거나 CSV를 사용해 주세요. (스캔만 된 이미지 PDF는 불가)'
            : `추가할 유효 행이 없습니다. (${parsed.length}블록 파싱, 형식 불일치·중복·전화 오류 등 ${skipped}건 제외)`
        );
        return;
      }
      const result = await createDirectTeamMembersBulk(teamId, bulkRows);
      const dupHint =
        result.skippedDbDuplicateCount > 0
          ? ` · DB 중복 전화 ${result.skippedDbDuplicateCount}건 제외`
          : '';
      toast.success(
        `PDF 명단 등록: ${result.successCount}명${skipped ? ` (파서 스킵 ${skipped}건)` : ''}${dupHint}`
      );
    } catch (error: unknown) {
      console.error('PDF 등록 실패:', error);
      if (error instanceof BulkTeamMemberAddError) {
        toast.error(formatBulkMemberFailuresLines(error.failures), { duration: 14_000 });
      } else {
        toast.error(errorMessageOf(error, 'PDF 명단 등록에 실패했습니다.'));
      }
    } finally {
      setAddingBulkMembers(false);
      if (pdfFileInputRef.current) pdfFileInputRef.current.value = '';
    }
  };

  const handleDownloadCsvSample = () => {
    const header = MEMBER_TEMPLATE_COLUMNS.join(',');
    const rows = generateTemplateExampleData().map((item) =>
      MEMBER_TEMPLATE_COLUMNS.map((k) => String((item as Record<string, unknown>)[k] ?? '')).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'team-members-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseFee = async (feeId: string) => {
    if (!teamId) return;
    try {
      const paySnap = await getDocs(query(collection(db, 'teams', teamId, 'payments'), where('feeId', '==', feeId)));
      let notPaidCount = 0;
      for (const p of paySnap.docs) {
        const status = String((p.data() as Record<string, unknown>).status || '').trim().toLowerCase();
        if (status !== 'paid') notPaidCount += 1;
      }
      if (notPaidCount > 0) {
        throw new Error(`미납/진행/실패 ${notPaidCount}건이 있어 마감할 수 없습니다. 납부 완료 건만 마감 가능합니다.`);
      }
      await closeTeamFee(teamId, feeId);
      await loadFees(teamId);
      toast.success('회비를 마감했습니다.');
    } catch (error) {
      console.error('회비 마감 실패:', error);
      toast.error(errorMessageOf(error, '회비 마감에 실패했습니다.'));
    }
  };

  const handleCloseManyFees = async (feeIds: string[]) => {
    if (!teamId || feeIds.length === 0) return;
    for (const feeId of feeIds) {
      await handleCloseFee(feeId);
    }
  };

  const handleReopenFee = async (fee: TeamFee) => {
    if (!teamId) return;
    try {
      const closedAt = fee.closedAt?.toDate?.() ?? fee.updatedAt?.toDate?.();
      if (!closedAt) throw new Error('마감 시각을 확인할 수 없어 취소할 수 없습니다.');
      const limitMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - closedAt.getTime() > limitMs) {
        throw new Error('마감 취소 가능 기간(7일)을 초과했습니다.');
      }
      await reopenTeamFee(teamId, fee.id);
      await loadFees(teamId);
      toast.success('마감을 취소했습니다.');
    } catch (error) {
      console.error('회비 마감 취소 실패:', error);
      toast.error(errorMessageOf(error, '회비 마감 취소에 실패했습니다.'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <p className="text-gray-700 font-medium mb-2">
            팀 정보를 불러올 수 없습니다.
          </p>
          <button
            onClick={() => navigate('/me')}
            className="mt-3 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
          >
            마이 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  if (!isLeader) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
          <p className="text-gray-700 font-medium mb-2">
            이 페이지는 팀장 또는 부팀장만 접근할 수 있어요.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            마이 페이지로 이동합니다.
          </p>
          <button
            onClick={() => navigate('/me')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            마이 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  // 탭이 없으면 대시보드 표시
  if (!activeTab) {
    return <TeamManageDashboard />;
  }

  // 탭이 있으면 기존 탭 구조 표시
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none md:mx-auto md:max-w-5xl py-6 md:p-6">
        <div className="mb-6">
          <button
            onClick={() => navigate(`/teams/${teamId}/manage`)}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            ← 대시보드로 돌아가기
          </button>
          <h1 className="text-2xl font-bold mb-2">팀 관리</h1>
        </div>

        {/* 탭 네비게이션 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex flex-wrap gap-x-6 gap-y-1">
            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=requests`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              가입 요청
            </button>
            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=members`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              팀원 관리
            </button>
            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=settings`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              설정
            </button>
            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=fees`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'fees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              회비 관리
            </button>
            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=accounting`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'accounting'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              회계
            </button>
            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=stats`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              회비 KPI
            </button>
            <button
              onClick={() => navigate(`/teams/${teamId}/manage?tab=play`)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'play'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              플레이
            </button>
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div>
          {activeTab === 'requests' && (
            <JoinRequestsTab teamId={teamId!} teamName={String(team?.name ?? "").trim() || "팀"} />
          )}
          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">라인업</p>
                    <p className="mt-1 text-xs text-gray-600">
                      현재 팀: {team?.name || '팀'} · 팀 ID: {teamId}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      멤버 확인 후 적절 라인업을 만들거나 목록을 엽니다.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      to={`/teams/${teamId}/lineups`}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      라인업 관리 ({team?.name || '팀'})
                    </Link>
                    <Link
                      to={`/teams/${teamId}/lineup`}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      라인업 만들기 ({team?.name || '팀'})
                    </Link>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <h3 className="text-base font-semibold text-gray-900">멤버 직접 추가</h3>
                <div className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-3">
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as MemberRoleSelectValue)}
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm"
                  >
                    <option value="member">직위 선택 (기본: 회원)</option>
                    <option value="president">회장</option>
                    <option value="vice_president">부회장</option>
                    <option value="owner">팀장</option>
                    <option value="manager">총무</option>
                    <option value="staff">코치/스태프</option>
                  </select>
                  <input
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="이름 (필수)"
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm"
                  />
                  <input
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    placeholder="전화번호 (선택)"
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm"
                  />
                  <input
                    value={newMemberJersey}
                    onChange={(e) => setNewMemberJersey(e.target.value)}
                    placeholder="배번 (선택)"
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm"
                  />
                  <input
                    value={newMemberBirthYear}
                    onChange={(e) => setNewMemberBirthYear(e.target.value)}
                    placeholder="생년 (예: 1965)"
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm"
                  />
                  <div className="h-9 rounded-md border border-gray-300 px-2 text-sm flex items-center gap-1">
                    {['S', 'M', 'L', 'XL', '2XL'].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setNewMemberUniformSize(newMemberUniformSize === size ? '' : size)}
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          newMemberUniformSize === size
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-600'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <div className="h-9 rounded-md border border-gray-300 px-2 text-sm flex items-center gap-1">
                    {['GK', 'DF', 'MF', 'FW'].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setNewMemberPosition(newMemberPosition === pos ? '' : pos)}
                        className={`rounded-full border px-2 py-0.5 text-xs ${
                          newMemberPosition === pos
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 text-gray-600'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                  <input
                    value={newMemberRoleDetail}
                    onChange={(e) => setNewMemberRoleDetail(e.target.value)}
                    placeholder="직위상세 (예: 주장, 부주장)"
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm"
                  />
                  <input
                    value={newMemberNote}
                    onChange={(e) => setNewMemberNote(e.target.value)}
                    placeholder="비고 (선택)"
                    className="h-9 rounded-md border border-gray-300 px-3 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!isLeader || addingMember}
                  className="mt-2 h-9 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  title={isLeader ? '' : '팀장만 가능합니다'}
                >
                  {addingMember ? '추가 중...' : '멤버 직접 추가'}
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <h4 className="text-sm font-semibold text-gray-900">일괄 등록</h4>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder={'홍길동\n김철수\nmember,이영희,01055557777,7,M'}
                  className="mt-2 h-24 w-full rounded-md border border-gray-300 p-2 text-sm"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => void handleCsvUpload(e.target.files?.[0] || null)}
                  />
                  <input
                    ref={pdfFileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => void handlePdfUpload(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={handleDownloadCsvSample}
                    className="h-8 rounded-md border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    CSV 샘플 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={() => csvFileInputRef.current?.click()}
                    className="h-8 rounded-md border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    CSV 파일 업로드
                  </button>
                  <button
                    type="button"
                    disabled={!isLeader || addingBulkMembers}
                    onClick={() => pdfFileInputRef.current?.click()}
                    className="h-8 rounded-md border border-gray-300 px-3 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title={isLeader ? '텍스트 레이어가 있는 PDF (스캔 이미지 전용 PDF는 불가)' : '팀장만 가능합니다'}
                  >
                    {addingBulkMembers ? 'PDF 처리 중…' : 'PDF 명단 업로드'}
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkAddMembers}
                    disabled={!isLeader || addingBulkMembers}
                    className="h-8 rounded-md bg-gray-900 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    title={isLeader ? '' : '팀장만 가능합니다'}
                  >
                    {addingBulkMembers ? '처리 중...' : '일괄 추가'}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">연령대 필터</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-medium text-gray-600">{ageFilter}</span>
                    {" / "}
                    <span className="font-medium text-gray-600">{positionFilter}</span>
                    <span> · 아래 멤버 목록에만 적용</span>
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['전체', '10대', '20대', '30대', '40대', '50대', '60대', '70대'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAgeFilter(v)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        ageFilter === v
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['전체', 'GK', 'DF', 'MF', 'FW'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPositionFilter(v)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        positionFilter === v
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 text-gray-700'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <TeamMembersPanel
                teamId={teamId!}
                isOwner={isLeader}
                ageFilter={ageFilter}
                positionFilter={positionFilter}
              />
              <div className="rounded-lg border border-violet-100 bg-violet-50/40 p-3">
                <p className="text-sm font-semibold text-gray-900">초대 링크 (보조 기능)</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  직접 추가/일괄 추가가 기본입니다. 초대 링크가 필요할 때만 아래 기능을 사용하세요.
                </p>
                <div className="mt-2">
                  <TeamMemberInviteBar teamId={teamId!} />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <SettingsTab teamId={teamId!} team={team} onTeamUpdated={refreshTeam} />
          )}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <TeamMonthlyKpiPanel teamId={teamId!} />
              </div>
              <TeamExperimentsSection teamId={teamId!} />
            </div>
          )}

          {activeTab === 'fees' && (
            <div className="space-y-8">
              <TeamFeeAccountingSummaryCard teamId={teamId!} />
              <FeeDashboard teamId={teamId!} canRecordManualPayments={isLeader} />

              <TeamFeeHistoryList
                fees={fees}
                feeRollupByFeeId={feeRollupByFeeId}
                feeRollupStatusByFeeId={feeRollupStatusByFeeId}
                loading={feesLoading}
                onCloseFee={handleCloseFee}
                onCloseManyFees={handleCloseManyFees}
                onReopenFee={handleReopenFee}
              />

              <TeamFeeCreateSheet
                open={showFeeCreate}
                onToggle={() => setShowFeeCreate((v) => !v)}
                title={newFeeTitle}
                amount={newFeeAmount}
                dueDate={newFeeDueDate}
                autoGenerate={autoGenerateFees}
                autoStartMonth={autoStartMonth}
                autoMonths={autoMonths}
                onTitleChange={setNewFeeTitle}
                onAmountChange={setNewFeeAmount}
                onDueDateChange={setNewFeeDueDate}
                onAutoGenerateChange={setAutoGenerateFees}
                onAutoStartMonthChange={setAutoStartMonth}
                onAutoMonthsChange={setAutoMonths}
                saving={savingFee}
                onSubmit={handleCreateFee}
              />
            </div>
          )}

          {activeTab === 'accounting' && (
            <div className="space-y-6">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-4 text-sm text-emerald-950">
                <p className="font-semibold">팀 현금 출납부</p>
                <p className="mt-1 text-xs text-emerald-900/90">
                  <code className="rounded bg-white/80 px-1">teams/…/cashBook</code> 원장과 요약 잔액입니다. 회비는{" "}
                  <code className="rounded bg-white/80 px-1">payments</code>가 납부 완료되면 서버에서 회비 수입
                  행이 자동으로 쌓입니다. 그 외 수입·지출은 여기서 직접 추가하세요.
                </p>
              </div>
              <TeamAccountingDashboard teamId={teamId!} teamName={String(team?.name ?? "").trim() || "팀"} />
            </div>
          )}

          {activeTab === 'play' && (
            <PlayTab
              teamId={teamId!}
              authUid={user?.uid ?? undefined}
              teamName={String(team?.name ?? "").trim() || "우리 팀"}
              playEntrySource="tab_click"
            />
          )}
        </div>
      </div>
    </div>
  );
}
