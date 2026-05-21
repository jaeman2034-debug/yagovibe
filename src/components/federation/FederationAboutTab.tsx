/**
 * 협회소개 탭 — AI 생성 구조화 콘텐츠 + 관리자 수정
 * 순서: 협회장 인사말 → 연혁 → 비전 → 주요 활동 → 조직 구성
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  getFederationVersions,
  publishFederationDraft,
  rollbackFederationVersion,
  saveFederationOrganization,
  updateFederationDraftAbout,
  sanitizeFederationDraftSections,
  sanitizeImageContentSelections,
  fetchFederationImageContentPackage,
  formatAiFinalAppliedPlacement,
  logFederationAiGenerationEvent,
  logFederationBatchAutoBuild,
} from "@/services/federationService";
import type { FederationImageContentSelectionRow } from "@/types/federation";
import { computeFederationImageVariantApply } from "@/utils/federationImageContentApply";
import {
  buildAutoContentPlan,
  collectFederationMultiImageItems,
  composeFederationMultiImagePageStructure,
  computeMultiImageComposeDraftPatch,
  FEDERATION_AUTO_CONTENT_CONFIDENCE_THRESHOLD,
  formatAutoContentImpactLines,
  formatAutoContentPlanPreview,
  formatAutoPageStructurePreviewLines,
  parseFederationPageTemplate,
  type ComposePageStructureResult,
  type FederationPageTemplate,
} from "@/utils/federationMultiImagePage";
import {
  buildFederationAutoBatchFingerprint,
  FEDERATION_AUTO_BATCH_COOLDOWN_MS,
  listHttpsImageSectionKeys,
  runFederationBatchOneShot,
  shouldAutoRunFederationBatch,
} from "@/services/federationBatchAutoBuild";
import { useFederationBatchAutoBuild } from "@/hooks/useFederationBatchAutoBuild";
import BatchAutoBuildProgress from "@/components/federation/BatchAutoBuildProgress";
import type {
  ContentTone,
  GeneratedContentVariant,
  ImageContentPackage,
  RecommendedUse,
} from "@/types/imageContentPackage";

const TONE_LABELS: Record<ContentTone, string> = {
  official: "공식·신뢰형",
  community: "친근·커뮤니티형",
  marketing: "홍보·활기형",
};

const RECOMMENDED_USE_LABELS: Record<RecommendedUse, string> = {
  hero_banner: "히어로 배너",
  intro_section: "소개 섹션",
  activity_section: "활동 섹션",
  market_post: "마켓 글",
  general_post: "일반 게시",
};

const FED_PAGE_TEMPLATE_OPTIONS: Array<{
  value: FederationPageTemplate;
  label: string;
  hint: string;
}> = [
  { value: "balanced", label: "균형형", hint: "히어로 → 소개 → 활동 최대 3" },
  {
    value: "activity_focus",
    label: "활동 강조형",
    hint: "히어로 → 활동 최대 4(부족 시 일반 이미지) → 소개",
  },
  { value: "intro_focus", label: "소개 강조형", hint: "소개 슬롯 우선·활동 최대 2" },
];

function fedPageTemplateLabel(t: FederationPageTemplate): string {
  return FED_PAGE_TEMPLATE_OPTIONS.find((o) => o.value === t)?.label ?? t;
}
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { FederationPresident } from "@/types/federation";
import { HistoryEditModal } from "@/components/federation/HistoryEditModal";
import FederationAutoGeneratePanel from "@/components/federation/FederationAutoGeneratePanel";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import SectionEditor from "@/components/SectionEditor";
import SectionRenderer from "@/components/SectionRenderer";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function cloneJson<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function parseTagsCsv(csv: string): string[] {
  return csv
    .split(/[,，、]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 14);
}

export type FederationAboutTabFederation = {
  name?: string;
  sport?: string;
  region?: string;
  audience?: string;
  introMessage?: string;
  history?: string;
  vision?: string;
  activities?: string[];
  chairpersonPhotoUrl?: string;
  sectionOrder?: Array<"intro" | "history" | "vision" | "activities" | "organization">;
  sections?: Record<
    string,
    {
      type: "text" | "image" | "gallery";
      content: string;
      draft?: string | null;
      image?: string;
      aiTitle?: string;
      aiSummary?: string;
      aiTags?: string[];
    }
  >;
  president?: FederationPresident | null;
  presidentName?: string;
  organization?: { summary?: string } | null;
};

type EditModal =
  | null
  | "president"
  | "history"
  | "vision"
  | "activities"
  | "executives";

type Position = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getContainBaseSize(params: {
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
}) {
  const { imageWidth, imageHeight, containerWidth, containerHeight } = params;
  const width = Math.max(1, imageWidth);
  const height = Math.max(1, imageHeight);
  const scale = Math.min(containerWidth / width, containerHeight / height);
  return {
    width: width * scale,
    height: height * scale,
  };
}

function getRotatedBoundingSize(params: {
  width: number;
  height: number;
  rotation: number;
  zoom: number;
}) {
  const { width, height, rotation, zoom } = params;
  const normalized = ((rotation % 360) + 360) % 360;
  const isQuarterTurn = normalized === 90 || normalized === 270;
  return {
    width: (isQuarterTurn ? height : width) * zoom,
    height: (isQuarterTurn ? width : height) * zoom,
  };
}

function getClampedPosition(params: {
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
  rotation?: number;
  position: Position;
}): Position {
  const { imageWidth, imageHeight, containerWidth, containerHeight, zoom, position, rotation = 0 } = params;
  const base = getContainBaseSize({ imageWidth, imageHeight, containerWidth, containerHeight });
  const rotated = getRotatedBoundingSize({
    width: base.width,
    height: base.height,
    rotation,
    zoom,
  });
  const scaledWidth = rotated.width;
  const scaledHeight = rotated.height;

  // translate()는 중앙 기준이므로 허용 이동 범위를 절반 차이로 제한
  const halfOverflowX = Math.max(0, (scaledWidth - containerWidth) / 2);
  const halfOverflowY = Math.max(0, (scaledHeight - containerHeight) / 2);

  return {
    x: clamp(position.x, -halfOverflowX, halfOverflowX),
    y: clamp(position.y, -halfOverflowY, halfOverflowY),
  };
}

/**
 * 편집기 슬라이더 최소 zoom: 전체 사진이 프레임 안에 다 보이도록 (contain, 여백 허용).
 * zoom 1 = object-contain 기준 맞춤; 90°/270° 등으로 bbox가 커지면 1보다 작아질 수 있음.
 */
function getContainMinZoom(params: {
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  rotation: number;
}): number {
  const cw = Math.max(1, params.containerWidth);
  const ch = Math.max(1, params.containerHeight);
  const base = getContainBaseSize({
    imageWidth: params.imageWidth,
    imageHeight: params.imageHeight,
    containerWidth: cw,
    containerHeight: ch,
  });
  const rotated = getRotatedBoundingSize({
    width: base.width,
    height: base.height,
    rotation: params.rotation,
    zoom: 1,
  });
  const zx = cw / Math.max(0.0001, rotated.width);
  const zy = ch / Math.max(0.0001, rotated.height);
  return clamp(Math.min(1, zx, zy), 0.05, 1);
}

/**
 * 세로 비율이 큰 인물 사진은 얼굴이 위쪽인 경우가 많아, 최소 줌에서 +y 패닝으로 상단을 프레임 중심 쪽으로 살짝 당긴다.
 * (translate +y = 이미지가 아래로 이동 → 프레임에 사진 상단이 더 들어옴)
 */
function getChairInitialPanForPortrait(params: {
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
  rotation: number;
}): Position {
  const { imageWidth, imageHeight, containerWidth, containerHeight, zoom, rotation } = params;
  const cw = Math.max(1, containerWidth);
  const ch = Math.max(1, containerHeight);
  const ratio = imageHeight / Math.max(1, imageWidth);
  if (ratio <= 1.2) return { x: 0, y: 0 };
  const norm = ((rotation % 360) + 360) % 360;
  if (norm !== 0 && norm !== 180) return { x: 0, y: 0 };
  const base = getContainBaseSize({
    imageWidth,
    imageHeight,
    containerWidth: cw,
    containerHeight: ch,
  });
  const displayedH = base.height * zoom;
  return { x: 0, y: displayedH * 0.15 };
}

function getTouchDistance(t1: Touch, t2: Touch) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getPinchZoomPosition(params: {
  containerWidth: number;
  containerHeight: number;
  touchX: number;
  touchY: number;
  prevZoom: number;
  nextZoom: number;
  position: Position;
}) {
  const { containerWidth, containerHeight, touchX, touchY, prevZoom, nextZoom, position } = params;
  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;
  const dx = touchX - centerX;
  const dy = touchY - centerY;
  const zoomRatio = nextZoom / Math.max(0.0001, prevZoom);
  return {
    x: position.x - dx * (zoomRatio - 1),
    y: position.y - dy * (zoomRatio - 1),
  };
}

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
};

async function loadNormalizedImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // fallback below
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function SectionCard({
  title,
  canEdit,
  onEdit,
  secondaryActions,
  children,
}: {
  title: string;
  canEdit: boolean;
  onEdit: () => void;
  /** AI 다시 생성 등 — 수정 버튼 왼쪽에 배치 */
  secondaryActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {canEdit && (
          <div
            className="flex flex-wrap gap-2 justify-end shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {secondaryActions}
            <Button type="button" variant="outline" size="sm" onClick={onEdit}>
              수정
            </Button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

function OverlayModal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** 넓은 다이얼로그 (AI 패키지 선택 등) */
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl ${
          wide ? "max-w-2xl" : "max-w-lg"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {children}
        <div className="mt-6 flex justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

export function FederationAboutTab({
  federationSlug,
  federation,
  canEdit,
  inlineEditMode = false,
  canPublish = canEdit,
  onUpdated,
}: {
  federationSlug: string;
  federation: FederationAboutTabFederation | null;
  canEdit: boolean;
  inlineEditMode?: boolean;
  canPublish?: boolean;
  onUpdated?: () => void | Promise<void>;
}) {
  const debugForce =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("devEdit") === "1";
  const canEditUI = canEdit || debugForce;

  type Executive = { name: string; role: string };
  type DynamicSectionType = "text" | "image" | "gallery";
  type DynamicSection = {
    type: DynamicSectionType;
    content: string;
    draft?: string | null;
    image?: string;
    aiTitle?: string;
    aiSummary?: string;
    aiTags?: string[];
  };
  type SectionState<T> = { content: T; draft: T | null };
  type SectionsState = {
    intro: { content: string; draft: string | null; image: string };
    history: SectionState<string>;
    vision: SectionState<string>;
    activities: SectionState<string[]>;
    organization: {
      content: { summary: string; executives: Executive[] };
      draft: { summary: string; executives: Executive[] } | null;
    };
  };

  const [executives, setExecutives] = useState<Executive[]>([]);
  const [sections, setSections] = useState<SectionsState>({
    intro: { content: "", draft: null, image: "" },
    history: { content: "", draft: null },
    vision: { content: "", draft: null },
    activities: { content: [], draft: null },
    organization: { content: { summary: "", executives: [] }, draft: null },
  });
  const [modal, setModal] = useState<EditModal>(null);
  const [saving, setSaving] = useState(false);
  const [openAutoPanel, setOpenAutoPanel] = useState(false);
  const [openAddSection, setOpenAddSection] = useState(false);
  const [regenLoading, setRegenLoading] = useState<null | "intro" | "history" | "vision" | "activities" | "organization">(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [inlineIntroEditing, setInlineIntroEditing] = useState(false);
  const [inlineIntro, setInlineIntro] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineSaveStatus, setInlineSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const inlineDebounceRef = useRef<number | null>(null);
  const [pendingChairFile, setPendingChairFile] = useState<File | null>(null);
  const [pendingChairPreviewUrl, setPendingChairPreviewUrl] = useState<string | null>(null);
  const [pendingChairPosition, setPendingChairPosition] = useState({ x: 0, y: 0 });
  const [pendingChairZoom, setPendingChairZoom] = useState(1);
  const [pendingChairRotation, setPendingChairRotation] = useState(0);
  const [pendingChairCropShape, setPendingChairCropShape] = useState<"rect" | "circle">("rect");
  const [pendingChairNaturalSize, setPendingChairNaturalSize] = useState({ width: 1, height: 1 });
  const pendingChairContainerRef = useRef<HTMLDivElement | null>(null);
  /** ref 대신 state로 두면 첫 렌더 이후 minZoom이 실제 컨테이너 크기와 맞춰진다 */
  const [pendingChairViewport, setPendingChairViewport] = useState<{ w: number; h: number } | null>(null);
  /** 업로드할 때마다 증가. 같은 세션에서는 첫 레이아웃 sync만 zoom=min으로 스냅(Strict/RO 중복에도 이후는 clamp만) */
  const pendingChairUploadSessionRef = useRef(0);
  const pendingChairSnappedSessionRef = useRef<number | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    velocityX: number;
    velocityY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
  });
  const touchDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    velocityX: number;
    velocityY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
  });
  const pinchRef = useRef<{ initialDistance: number; initialZoom: number } | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const lastTapRef = useRef(0);
  const defaultOrder: Array<"intro" | "history" | "vision" | "activities" | "organization"> = [
    "intro",
    "history",
    "vision",
    "activities",
    "organization",
  ];
  const [sectionOrder, setSectionOrder] = useState(defaultOrder);
  const [dynamicSections, setDynamicSections] = useState<Record<string, DynamicSection>>({});
  const [imageContentSelections, setImageContentSelections] = useState<
    Record<string, FederationImageContentSelectionRow>
  >({});
  /** 동적 섹션(text/image/gallery) 편집 UI 열림 — 수정 클릭 시에만 true */
  const [editingDynamicSectionId, setEditingDynamicSectionId] = useState<string | null>(null);
  /** 동적 섹션 업로드/저장 중 — 해당 섹션 버튼 비활성화 (동시에 하나만) */
  const [dynamicSectionPending, setDynamicSectionPending] = useState<
    null | { key: string; kind: "upload" | "save" | "ai_image" }
  >(null);
  const [publishing, setPublishing] = useState(false);
  const [previewMode, setPreviewMode] = useState<"draft" | "published">(canEditUI ? "draft" : "published");
  const isDraftEditMode = canEditUI && previewMode === "draft";
  const [aiPackageSaving, setAiPackageSaving] = useState(false);
  const [aiApplyDraft, setAiApplyDraft] = useState({
    title: "",
    summary: "",
    content: "",
    tagsCsv: "",
  });
  useEffect(() => {
    if (!isDraftEditMode) {
      setEditingDynamicSectionId(null);
      setDynamicSectionPending(null);
    }
  }, [isDraftEditMode]);
  const [versions, setVersions] = useState<Array<{ id: string; versionName?: string; createdAt?: any; [k: string]: any }>>([]);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);

  type AiPackageModalState = {
    imageSectionKey: string;
    nextTextKey: string;
    imageUrl: string;
    busy: boolean;
    pkg: ImageContentPackage | null;
    selectedVariantIndex: number;
    error: string | null;
  };
  const [aiPackageModal, setAiPackageModal] = useState<AiPackageModalState | null>(null);
  const [multiImageAutoModal, setMultiImageAutoModal] = useState<ComposePageStructureResult | null>(null);
  const [multiImageApplying, setMultiImageApplying] = useState(false);
  /** false면 sectionOrder만 반영 (기존 동작) */
  const [multiImageApplyContent, setMultiImageApplyContent] = useState(true);
  /** 툴바 템플릿 라디오 변경 시: 적용 전 확인 */
  const [templateToolbarFollowUp, setTemplateToolbarFollowUp] = useState<null | {
    proposed: FederationPageTemplate;
  }>(null);
  const {
    progress: batchBuildProgress,
    onEngineProgress: onBatchBuildEngineProgress,
    markDone: markBatchBuildDone,
    markError: markBatchBuildError,
    markIdle: markBatchBuildIdle,
  } = useFederationBatchAutoBuild();

  /** 섹션 정렬 DnD가 자식 버튼·크롭 UI의 클릭을 가로채지 않도록 활성화 거리 부여 */
  const sectionReorderSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const { minZoom: pendingChairMinZoom, maxZoom: pendingChairMaxZoom } = useMemo(() => {
    if (!pendingChairViewport || !pendingChairPreviewUrl) {
      return { minZoom: 1, maxZoom: 8 };
    }
    const min = getContainMinZoom({
      imageWidth: pendingChairNaturalSize.width,
      imageHeight: pendingChairNaturalSize.height,
      containerWidth: pendingChairViewport.w,
      containerHeight: pendingChairViewport.h,
      rotation: pendingChairRotation,
    });
    return { minZoom: min, maxZoom: Math.max(8, min * 8) };
  }, [
    pendingChairViewport,
    pendingChairPreviewUrl,
    pendingChairNaturalSize.width,
    pendingChairNaturalSize.height,
    pendingChairRotation,
  ]);

  const fedName = federation?.name || "협회";
  const draftRoot = (federation as any)?.draft && typeof (federation as any).draft === "object" ? (federation as any).draft : null;
  const publishedRoot =
    (federation as any)?.published && typeof (federation as any).published === "object"
      ? (federation as any).published
      : ((federation as any)?.live && typeof (federation as any).live === "object" ? (federation as any).live : null);
  const sourceRoot = canEditUI
    ? (previewMode === "draft" ? (draftRoot || publishedRoot || federation || {}) : (publishedRoot || federation || {}))
    : (publishedRoot || federation || {});

  /** introMessage가 협회장 인사말 본문의 단일 소스 (없으면 president.message) */
  const presidentName =
    sourceRoot?.president?.name?.trim?.() ||
    sourceRoot?.presidentName?.trim?.() ||
    "협회장";
  const persistedIntro =
    sourceRoot?.introMessage?.trim?.() ||
    sourceRoot?.president?.message?.trim?.() ||
    `${fedName} 공식 홈페이지를 방문해 주셔서 감사합니다.`;
  const persistedHistory = sourceRoot?.history || `${fedName}의 연혁 정보가 곧 추가됩니다.`;
  const persistedVision = sourceRoot?.vision || `${fedName}의 비전·목표 정보가 곧 추가됩니다.`;
  const persistedActivities =
    Array.isArray(sourceRoot?.activities) && sourceRoot.activities.length > 0
      ? sourceRoot.activities
      : ["리그 운영", "교육 프로그램", "지역 활동"];
  const persistedIntroImage =
    sourceRoot?.chairpersonPhotoUrl?.trim?.() ||
    sourceRoot?.president?.photoUrl?.trim?.() ||
    "";
  const persistedOrgSummary = sourceRoot?.organization?.summary?.trim?.() || "";

  // Draft에 저장된 이미지 AI 선택 메타 (새로고침 후 복원·모달 초기값)
  useEffect(() => {
    if (!canEditUI || previewMode !== "draft") return;
    const raw = draftRoot?.imageContentSelections;
    setImageContentSelections(sanitizeImageContentSelections(raw as Record<string, unknown> | undefined));
  }, [canEditUI, previewMode, federationSlug, draftRoot?.imageContentSelections]);

  // federation 변경 시 content 리셋(섹션 draft는 유지: 사용자가 생성해둔 draft를 날리지 않음)
  useEffect(() => {
    setSections((prev) => ({
      ...prev,
      intro: { ...prev.intro, content: persistedIntro, image: persistedIntroImage },
      history: { ...prev.history, content: persistedHistory },
      vision: { ...prev.vision, content: persistedVision },
      activities: { ...prev.activities, content: persistedActivities },
      organization: {
        ...prev.organization,
        content: { ...prev.organization.content, summary: persistedOrgSummary },
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [federationSlug, sourceRoot?.introMessage, sourceRoot?.history, sourceRoot?.vision, sourceRoot?.chairpersonPhotoUrl, sourceRoot?.president?.photoUrl, sourceRoot?.organization?.summary, sourceRoot?.activities?.length]);

  // federation의 저장된 sectionOrder 로드(모르는 키는 유지: 동적 섹션)
  useEffect(() => {
    const incoming = Array.isArray(sourceRoot?.sectionOrder) ? (sourceRoot.sectionOrder as string[]) : null;
    if (!incoming) return;
    const cleaned = incoming.filter((k) => typeof k === "string" && k.length > 0);
    const missing = defaultOrder.filter((k) => !cleaned.includes(k));
    const merged = [...cleaned, ...missing];
    setSectionOrder(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [federationSlug, sourceRoot?.sectionOrder?.join?.("|")]);

  // federation.sections 로드 (동적 섹션)
  useEffect(() => {
    const incoming = sourceRoot?.sections;
    if (!incoming || typeof incoming !== "object") return;
    const next: Record<string, DynamicSection> = {};
    for (const [k, v] of Object.entries(incoming)) {
      if (!k.startsWith("section_")) continue;
      const t = (v as any)?.type;
      if (t !== "text" && t !== "image" && t !== "gallery") continue;
      const base: DynamicSection = {
        type: t,
        content: String((v as any)?.content || ""),
        draft: (v as any)?.draft ? String((v as any).draft) : null,
        image: (v as any)?.image ? String((v as any).image) : "",
      };
      const aiTitle = String((v as any)?.aiTitle ?? "").trim();
      if (aiTitle) base.aiTitle = aiTitle;
      const aiSummary = String((v as any)?.aiSummary ?? "").trim();
      if (aiSummary) base.aiSummary = aiSummary;
      if (Array.isArray((v as any)?.aiTags) && (v as any).aiTags.length > 0) {
        const tags = (v as any).aiTags
          .map((x: unknown) => String(x || "").trim())
          .filter(Boolean);
        if (tags.length) base.aiTags = tags;
      }
      next[k] = base;
    }
    setDynamicSections(next);
  }, [federationSlug, sourceRoot?.sections]);

  const presidentBlock: FederationPresident = {
    name: presidentName,
    message: sections.intro.content,
    ...(sections.intro.image ? { photoUrl: sections.intro.image } : {}),
  };

  const dynamicSectionsRef = useRef(dynamicSections);
  dynamicSectionsRef.current = dynamicSections;
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const sectionOrderRef = useRef(sectionOrder);
  sectionOrderRef.current = sectionOrder;
  const imageContentSelectionsRef = useRef(imageContentSelections);
  imageContentSelectionsRef.current = imageContentSelections;
  const presidentNameRef = useRef(presidentName);
  presidentNameRef.current = presidentName;
  const aiFlowInFlightRef = useRef<Record<string, boolean>>({});
  /** 원샷 배치 실행 중 — 단일 이미지 AI와 동시에 돌리지 않음 */
  const batchOneShotInFlightRef = useRef(false);
  /** Progress UI 「중단」 → 엔진 shouldAbort */
  const batchCancelRef = useRef(false);

  const BATCH_AUTO_UPLOAD_STORAGE_KEY = "yago-fed-about-auto-batch-v1";
  const BATCH_AUTO_LAST_RUN_KEY = "yago-fed-about-auto-batch-last-run";
  const BATCH_AUTO_LAST_FP_KEY = "yago-fed-about-auto-batch-last-key";
  const [autoBatchAfterUpload, setAutoBatchAfterUpload] = useState<boolean>(() => {
    try {
      return (
        typeof window !== "undefined" &&
        window.localStorage.getItem(BATCH_AUTO_UPLOAD_STORAGE_KEY) === "1"
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(
        BATCH_AUTO_UPLOAD_STORAGE_KEY,
        autoBatchAfterUpload ? "1" : "0"
      );
    } catch {
      /* ignore */
    }
  }, [autoBatchAfterUpload]);

  const PAGE_TEMPLATE_LS_PREFIX = "yago-fed-page-template-v1:";
  const [pageComposeTemplate, setPageComposeTemplate] = useState<FederationPageTemplate>("balanced");
  useEffect(() => {
    if (!federationSlug) return;
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem(`${PAGE_TEMPLATE_LS_PREFIX}${federationSlug}`)
          : null;
      setPageComposeTemplate(parseFederationPageTemplate(raw));
    } catch {
      setPageComposeTemplate("balanced");
    }
  }, [federationSlug]);
  useEffect(() => {
    if (!federationSlug) return;
    try {
      window.localStorage.setItem(
        `${PAGE_TEMPLATE_LS_PREFIX}${federationSlug}`,
        pageComposeTemplate
      );
    } catch {
      /* ignore */
    }
  }, [federationSlug, pageComposeTemplate]);
  const pageComposeTemplateRef = useRef(pageComposeTemplate);
  pageComposeTemplateRef.current = pageComposeTemplate;

  /** 이미지 섹션별 「다시 생성」 누적 횟수(서버 variation·temperature에 전달) */
  const aiRegenerateCountBySectionRef = useRef<Record<string, number>>({});

  const history = sections.history.content;
  const vision = sections.vision.content;
  const activities = sections.activities.content;
  const orgSummaryText = sections.organization.content.summary;

  const multiImageHttpsCount = useMemo(() => {
    let n = 0;
    for (const key of sectionOrder) {
      const sec = dynamicSections[key];
      if (sec?.type === "image" && String(sec.image || "").trim().startsWith("https://")) n++;
    }
    return n;
  }, [sectionOrder, dynamicSections]);

  const batchOneShotUiBusy = useMemo(
    () =>
      batchBuildProgress.phase === "generating" ||
      batchBuildProgress.phase === "composing" ||
      batchBuildProgress.phase === "saving",
    [batchBuildProgress.phase]
  );

  const multiImageContentPlan = useMemo(() => {
    if (!multiImageAutoModal) return null;
    return buildAutoContentPlan(multiImageAutoModal, imageContentSelections);
  }, [multiImageAutoModal, imageContentSelections]);

  const multiImageImpactLines = useMemo(() => {
    if (!multiImageContentPlan) return [];
    return formatAutoContentImpactLines(multiImageContentPlan, {
      introBody: sections.intro.content,
      chairPhotoUrl: sections.intro.image,
      activitiesLines: sections.activities.content,
      dynamicSections,
    });
  }, [
    multiImageContentPlan,
    sections.intro.content,
    sections.intro.image,
    sections.activities.content,
    dynamicSections,
  ]);

  useEffect(() => {
    setInlineIntro(sections.intro.content || "");
  }, [sections.intro.content]);

  useEffect(() => {
    if (!inlineEditMode) {
      setInlineIntroEditing(false);
      setInlineIntro(sections.intro.content || "");
    }
  }, [inlineEditMode, sections.intro.content]);

  useEffect(() => {
    return () => {
      if (inlineDebounceRef.current) {
        window.clearTimeout(inlineDebounceRef.current);
      }
      if (pendingChairPreviewUrl) {
        URL.revokeObjectURL(pendingChairPreviewUrl);
      }
    };
  }, [pendingChairPreviewUrl]);

  useEffect(() => {
    if (!isDraftEditMode) {
      setExecutives([]);
      return;
    }
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, "federations", federationSlug, "executives"));
        setExecutives(snap.docs.map((d) => ({ name: d.data().name || "", role: d.data().role || "" })));
      } catch {
        setExecutives([]);
      }
    };
    load();
  }, [federationSlug, isDraftEditMode]);

  // executives 변경 시 organization.content에 동기화 (content 단일 소스)
  useEffect(() => {
    setSections((prev) => ({
      ...prev,
      organization: {
        ...prev.organization,
        content: { ...prev.organization.content, executives },
      },
    }));
  }, [executives]);

  const refreshLocal = async () => {
    try {
      const snap = await getDocs(collection(db, "federations", federationSlug, "executives"));
      setExecutives(snap.docs.map((d) => ({ name: d.data().name || "", role: d.data().role || "" })));
    } catch {
      /* ignore */
    }
    await onUpdated?.();
  };

  const applyAllDrafts = async () => {
    const hasAnyDraft =
      !!sections.intro.draft ||
      !!sections.history.draft ||
      !!sections.vision.draft ||
      (Array.isArray(sections.activities.draft) && sections.activities.draft.length > 0) ||
      !!sections.organization.draft;
    if (!hasAnyDraft) return;
    setSaving(true);
    try {
      // intro/history/vision/activities 저장
      const patch: any = {};
      if (sections.intro.draft) {
        patch.introMessage = sections.intro.draft;
        patch.president = { ...presidentBlock, name: presidentName, message: sections.intro.draft };
      }
      if (sections.history.draft) patch.history = sections.history.draft;
      if (sections.vision.draft) patch.vision = sections.vision.draft;
      if (Array.isArray(sections.activities.draft) && sections.activities.draft.length > 0) patch.activities = sections.activities.draft;
      if (Object.keys(patch).length > 0) {
        await updateFederationDraftAbout(federationSlug, patch);
      }

      // organization 저장 (summary + executives 서브컬렉션)
      if (sections.organization.draft) {
        await saveFederationOrganization(federationSlug, {
          summary: String(sections.organization.draft.summary || "").trim(),
          executives: Array.isArray(sections.organization.draft.executives) ? sections.organization.draft.executives : [],
        });
      }

      toast.success("Draft를 적용해 저장했습니다.");
      setSections((prev) => ({
        ...prev,
        intro: { ...prev.intro, content: prev.intro.draft ?? prev.intro.content, draft: null },
        history: { ...prev.history, content: prev.history.draft ?? prev.history.content, draft: null },
        vision: { ...prev.vision, content: prev.vision.draft ?? prev.vision.content, draft: null },
        activities: {
          ...prev.activities,
          content: (prev.activities.draft && prev.activities.draft.length > 0) ? prev.activities.draft : prev.activities.content,
          draft: null,
        },
        organization: prev.organization.draft
          ? { content: prev.organization.draft, draft: null }
          : prev.organization,
      }));
      await refreshLocal();
    } catch (e) {
      console.error(e);
      toast.error("Draft 적용(저장)에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const applySectionDraft = async (key: keyof SectionsState) => {
    setSaving(true);
    try {
      if (key === "intro") {
        if (!sections.intro.draft) return;
        await updateFederationDraftAbout(federationSlug, {
          introMessage: sections.intro.draft,
          president: { ...presidentBlock, message: sections.intro.draft },
        });
        setSections((prev) => ({ ...prev, intro: { ...prev.intro, content: prev.intro.draft ?? prev.intro.content, draft: null } }));
      } else if (key === "history") {
        if (!sections.history.draft) return;
        await updateFederationDraftAbout(federationSlug, { history: sections.history.draft });
        setSections((prev) => ({ ...prev, history: { content: prev.history.draft ?? prev.history.content, draft: null } }));
      } else if (key === "vision") {
        if (!sections.vision.draft) return;
        await updateFederationDraftAbout(federationSlug, { vision: sections.vision.draft });
        setSections((prev) => ({ ...prev, vision: { content: prev.vision.draft ?? prev.vision.content, draft: null } }));
      } else if (key === "activities") {
        if (!sections.activities.draft || sections.activities.draft.length === 0) return;
        await updateFederationDraftAbout(federationSlug, { activities: sections.activities.draft });
        setSections((prev) => ({
          ...prev,
          activities: { content: (prev.activities.draft && prev.activities.draft.length > 0) ? prev.activities.draft : prev.activities.content, draft: null },
        }));
      } else if (key === "organization") {
        if (!sections.organization.draft) return;
        await saveFederationOrganization(federationSlug, {
          summary: String(sections.organization.draft.summary || "").trim(),
          executives: sections.organization.draft.executives || [],
        });
        setSections((prev) => ({
          ...prev,
          organization: { content: prev.organization.draft ?? prev.organization.content, draft: null },
        }));
      }
      toast.success("섹션 Draft를 적용했습니다.");
      await refreshLocal();
    } catch (e) {
      console.error(e);
      toast.error("섹션 적용에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  function SortableItem({
    id,
    children,
  }: {
    id: string;
    children: React.ReactNode;
  }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.85 : 1,
    };
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`flex gap-0 items-start rounded-xl transition-shadow ${
          isDragging ? "ring-2 ring-blue-400 ring-offset-2 shadow-lg z-[5] relative bg-white" : ""
        }`}
      >
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sectionOrder.indexOf(String(active.id));
    const newIndex = sectionOrder.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const prevOrder = [...sectionOrder];
    const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
    setSectionOrder(newOrder);
    try {
      await updateFederationDraftAbout(federationSlug, { sectionOrder: newOrder as any, sections: dynamicSections });
    } catch (e) {
      console.error(e);
      setSectionOrder(prevOrder);
      toast.error("섹션 순서 저장에 실패했습니다. 순서를 되돌렸습니다.");
    }
  };

  const persistDynamicSections = async (nextSections: Record<string, DynamicSection>, nextOrder: string[]) => {
    const safe = sanitizeFederationDraftSections(nextSections);
    if (import.meta.env.DEV) {
      const summary = Object.fromEntries(
        Object.entries(safe).map(([k, v]) => [
          k,
          {
            type: v.type,
            contentLen: v.content.length,
            draft: v.draft === null ? null : `${String(v.draft).length} chars`,
            imageLen: v.image.length,
          },
        ])
      );
      console.debug("[FederationAboutTab] 저장 직전 dynamicSections (요약)", summary);
    }
    await updateFederationDraftAbout(federationSlug, {
      sections: safe as any,
      sectionOrder: nextOrder as any,
    });
  };

  const addSection = async (type: DynamicSectionType) => {
    const id = `section_${Date.now()}`;
    const prevSections = { ...dynamicSections };
    const prevOrder = [...sectionOrder];
    const nextSections: Record<string, DynamicSection> = {
      ...dynamicSections,
      [id]: { type, content: "", draft: null, image: "" },
    };
    const nextOrder = [...sectionOrder, id];
    setDynamicSections(nextSections);
    setSectionOrder(nextOrder);
    setOpenAddSection(false);
    try {
      await persistDynamicSections(nextSections, nextOrder);
      toast.success("섹션을 추가했습니다.");
    } catch (e) {
      console.error(e);
      setDynamicSections(prevSections);
      setSectionOrder(prevOrder);
      toast.error("섹션 추가 저장에 실패했습니다. 변경을 되돌렸습니다.");
    }
  };

  const removeSection = async (key: string) => {
    if (!confirm("이 섹션을 삭제할까요?")) return;
    if (editingDynamicSectionId === key) setEditingDynamicSectionId(null);
    const prevSections = { ...dynamicSections };
    const prevOrder = [...sectionOrder];
    const nextSections = { ...dynamicSections };
    delete nextSections[key];
    const nextOrder = sectionOrder.filter((k) => k !== key);
    setDynamicSections(nextSections);
    setSectionOrder(nextOrder);
    try {
      await persistDynamicSections(nextSections, nextOrder);
      toast.success("섹션을 삭제했습니다.");
    } catch (e) {
      console.error(e);
      setDynamicSections(prevSections);
      setSectionOrder(prevOrder);
      toast.error("섹션 삭제 저장에 실패했습니다. 변경을 되돌렸습니다.");
    }
  };

  const uploadDynamicSectionImage = async (sectionKey: string, file: File) => {
    if (!storage) throw new Error("Storage not initialized");
    const uid = getAuth().currentUser?.uid;
    if (!uid) throw new Error("로그인이 필요합니다.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `federations/${federationSlug}/dynamic/${sectionKey}_${Date.now()}_${safeName}`;
    const r = ref(storage, path);
    await uploadBytes(r, file, { contentType: file.type || "image/jpeg" });
    return getDownloadURL(r);
  };

  const persistVariantFromPackage = useCallback(
    async (
      pkg: ImageContentPackage,
      variantIndex: number,
      imageSectionKey: string,
      imageUrl: string,
      dynOverride?: Record<string, DynamicSection>,
      applyOpts?: {
        contentOverrides?: Partial<
          Pick<GeneratedContentVariant, "title" | "summary" | "content" | "tags">
        >;
        markUserEdited?: boolean;
      }
    ): Promise<{
      ok: boolean;
      placement?: { appliedTo: string; targetSectionKey: string | null };
    }> => {
      const v = pkg.variants[variantIndex];
      if (!v) return { ok: false };

      const dyn = dynOverride ?? dynamicSectionsRef.current;
      const result = computeFederationImageVariantApply({
        variant: v,
        variantIndex,
        pkg,
        imageSectionKey,
        imageUrl,
        federationSlug,
        sectionOrder: sectionOrderRef.current,
        dynamicSections: dyn,
        intro: sectionsRef.current.intro,
        activitiesLines: sectionsRef.current.activities.content,
        presidentName: presidentNameRef.current,
        prevSelections: imageContentSelectionsRef.current,
        contentOverrides: applyOpts?.contentOverrides,
        markUserEdited: applyOpts?.markUserEdited === true,
      });

      if (!result) {
        toast.error("본문이 비어 있어 적용할 수 없습니다.");
        return { ok: false };
      }

      const rollbackDynamic = cloneJson(dynamicSectionsRef.current);
      const rollbackSections = cloneJson(sectionsRef.current);
      const rollbackSelections = cloneJson(imageContentSelectionsRef.current);

      setDynamicSections(result.nextDynamic as Record<string, DynamicSection>);
      setSections((prev) => ({
        ...prev,
        intro: result.nextIntro,
        activities: { ...prev.activities, content: result.nextActivities },
      }));
      setImageContentSelections(result.nextSelections);

      try {
        await updateFederationDraftAbout(federationSlug, result.firestorePatch);
        return { ok: true, placement: result.placement };
      } catch (e) {
        console.error(e);
        setDynamicSections(rollbackDynamic);
        setSections(rollbackSections);
        setImageContentSelections(rollbackSelections);
        toast.error("Draft 저장에 실패했습니다. 화면 변경을 되돌렸습니다. 다시 시도해 주세요.");
        return { ok: false };
      }
    },
    [federationSlug]
  );

  /** 동적 텍스트 섹션 저장 시 연결된 imageContentSelections 에 사용자 수정 반영 */
  const syncSelectionFromDynamicTextSave = useCallback(
    async (textKey: string, latestSections: Record<string, DynamicSection>) => {
      const selections = imageContentSelectionsRef.current;
      let imgKey: string | null = null;
      let row: FederationImageContentSelectionRow | undefined;
      for (const [ik, r] of Object.entries(selections)) {
        if (r.appliedTo === "dynamic_section" && r.targetSectionKey === textKey) {
          imgKey = ik;
          row = r;
          break;
        }
      }
      if (!imgKey || !row) return;
      const sec = latestSections[textKey];
      if (!sec || sec.type !== "text") return;
      const content = String(sec.content || "").trim();
      const title = String(sec.aiTitle ?? "").trim() || row.title;
      const summary = String(sec.aiSummary ?? "").trim() || row.summary;
      const tags =
        Array.isArray(sec.aiTags) && sec.aiTags.length > 0
          ? sec.aiTags.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 14)
          : row.tags;
      const same =
        content === String(row.content || "").trim() &&
        title === String(row.title || "").trim() &&
        summary === String(row.summary || "").trim() &&
        JSON.stringify(tags) === JSON.stringify(row.tags);
      if (same) return;
      const nextRow: FederationImageContentSelectionRow = {
        ...row,
        content: content.slice(0, 900_000),
        title: title.slice(0, 200),
        summary: summary.slice(0, 400),
        tags,
        isUserEdited: true,
        editedAt: new Date().toISOString(),
      };
      const nextSelections = { ...selections, [imgKey]: nextRow };
      setImageContentSelections(nextSelections);
      try {
        await updateFederationDraftAbout(federationSlug, {
          imageContentSelections: nextSelections,
        });
        void logFederationAiGenerationEvent({
          federationSlug,
          event: "user_edit_saved",
          imageId: nextRow.imageId,
          imageSectionKey: imgKey,
          selectedVariantIndex: nextRow.selectedVariantIndex,
          selectedTone: String(nextRow.selectedTone || ""),
          recommendedUse: String(nextRow.recommendedUse || ""),
          finalAppliedUse: formatAiFinalAppliedPlacement(String(nextRow.recommendedUse || ""), {
            appliedTo: nextRow.appliedTo,
            targetSectionKey: nextRow.targetSectionKey ?? null,
          }),
          isUserEdited: true,
          regenerateCount: aiRegenerateCountBySectionRef.current[imgKey] ?? 0,
          appliedTo: nextRow.appliedTo,
          targetSectionKey: nextRow.targetSectionKey ?? null,
        });
      } catch (e) {
        console.error(e);
        toast.error("AI 선택 메타 동기화에 실패했습니다.");
      }
    },
    [federationSlug]
  );

  /**
   * 이미지(+협회 맥락) → AI 패키지.
   * `sectionsOverride`: 업로드 직후 최신 맵.
   * `autoApplyBest`: true면 생성 직후 bestVariant를 recommendedUse 기준 위치에 적용·Draft 저장(모달 없음).
   * `forceRegenerate`: true면 같은 이미지 URL이라도 자동 적용 경로에서 AI를 다시 호출합니다(「다시 생성」).
   */
  const openAiPackageFlow = useCallback(
    async (
      imageSectionKey: string,
      imageUrlArg?: string,
      sectionsOverride?: Record<string, DynamicSection>,
      options?: { autoApplyBest?: boolean; forceRegenerate?: boolean }
    ) => {
      const autoApply = options?.autoApplyBest === true;
      const forceRegenerate = options?.forceRegenerate === true;
      const sections = sectionsOverride ?? dynamicSectionsRef.current;
      const img = sections[imageSectionKey];
      if (!img || img.type !== "image") return;
      const url = String(imageUrlArg ?? img.image ?? "").trim();
      if (!url.startsWith("https://")) {
        toast.error(
          "먼저 이 섹션에 이미지를 업로드해 주세요. (공개 HTTPS 주소만 AI에 전달됩니다.)"
        );
        return;
      }
      if (batchOneShotInFlightRef.current) {
        toast.info("원샷 일괄 생성이 진행 중입니다. 잠시만 기다려 주세요.");
        return;
      }
      if (aiFlowInFlightRef.current[imageSectionKey]) {
        toast.info("이미 이 섹션에서 AI 생성이 진행 중입니다.");
        return;
      }
      if (autoApply && !forceRegenerate) {
        const existing = imageContentSelectionsRef.current[imageSectionKey];
        if (existing?.isUserEdited === true && existing.imageUrl === url) {
          toast.info(
            "이 이미지는 사용자가 다듬은 초안이 있어 자동 덮어쓰기를 건너뜁니다. 다시 만들려면 「✨ AI 콘텐츠」→「다시 생성」을 눌러 주세요."
          );
          return;
        }
        if (
          existing &&
          existing.imageUrl === url &&
          String(existing.content || "").trim().length > 0 &&
          !existing.isUserEdited
        ) {
          toast.info(
            "같은 이미지에 이미 AI 초안이 저장되어 있습니다. 다른 문안이 필요하면 「다시 생성」을 눌러 주세요."
          );
          return;
        }
      }

      let regenerateCount = 0;
      if (autoApply) {
        aiRegenerateCountBySectionRef.current[imageSectionKey] = 0;
      } else if (forceRegenerate) {
        const prev = aiRegenerateCountBySectionRef.current[imageSectionKey] ?? 0;
        regenerateCount = prev + 1;
        aiRegenerateCountBySectionRef.current[imageSectionKey] = regenerateCount;
      } else {
        aiRegenerateCountBySectionRef.current[imageSectionKey] = 0;
      }
      const variationSeed = regenerateCount > 0 ? Date.now() : undefined;

      const order = sectionOrderRef.current;
      const idx = order.indexOf(imageSectionKey);
      const nextKey =
        idx >= 0 && idx < order.length - 1 ? String(order[idx + 1] || "") : "";
      const nextSec = nextKey ? sections[nextKey] : null;
      const nextTextKey = nextSec?.type === "text" ? nextKey : "";

      aiFlowInFlightRef.current[imageSectionKey] = true;
      setDynamicSectionPending({ key: imageSectionKey, kind: "ai_image" });
      if (autoApply) {
        setAiPackageModal(null);
      } else {
        setAiPackageModal({
          imageSectionKey,
          nextTextKey,
          imageUrl: url,
          busy: true,
          pkg: null,
          selectedVariantIndex: 0,
          error: null,
        });
      }

      try {
        const pkg = await fetchFederationImageContentPackage({
          imageUrl: url,
          federationSlug,
          imageId: `${federationSlug}__${imageSectionKey}`,
          context: {
            federationName: federation?.name,
            sport: federation?.sport,
            region: federation?.region,
          },
          regenerateCount,
          ...(variationSeed !== undefined ? { variationSeed } : {}),
          ...(forceRegenerate && regenerateCount > 0 ? { forceRegenerate: true } : {}),
        });
        const maxIdx = Math.max(0, pkg.variants.length - 1);
        const sel = Math.min(Math.max(0, pkg.bestVariantIndex), maxIdx);
        const savedSel = imageContentSelectionsRef.current[imageSectionKey];
        let modalInitialIndex = sel;
        if (
          !autoApply &&
          savedSel &&
          savedSel.imageUrl === url &&
          savedSel.selectedVariantIndex >= 0 &&
          savedSel.selectedVariantIndex <= maxIdx
        ) {
          modalInitialIndex = savedSel.selectedVariantIndex;
        }

        const bestV = pkg.variants[sel];
        const genV = pkg.variants[modalInitialIndex] ?? bestV;
        const imageIdForLog = String(pkg.imageId || `${federationSlug}__${imageSectionKey}`);

        void logFederationAiGenerationEvent({
          federationSlug,
          event: "generation_complete",
          imageId: imageIdForLog,
          imageSectionKey,
          selectedVariantIndex: modalInitialIndex,
          selectedTone: String(genV?.tone || ""),
          recommendedUse: String(genV?.recommendedUse || pkg.variants[0]?.recommendedUse || ""),
          finalAppliedUse: "",
          isUserEdited: false,
          regenerateCount,
          placementReason: pkg.placementReason,
          usedFallback: pkg.usedFallback,
        });

        if (autoApply) {
          const { ok, placement } = await persistVariantFromPackage(pkg, sel, imageSectionKey, url, sections);
          if (ok) {
            void logFederationAiGenerationEvent({
              federationSlug,
              event: "content_applied",
              imageId: imageIdForLog,
              imageSectionKey,
              selectedVariantIndex: sel,
              selectedTone: String(bestV?.tone || ""),
              recommendedUse: String(bestV?.recommendedUse || ""),
              finalAppliedUse: formatAiFinalAppliedPlacement(String(bestV?.recommendedUse || ""), placement),
              isUserEdited: false,
              regenerateCount,
              placementReason: pkg.placementReason,
              usedFallback: pkg.usedFallback,
              appliedTo: placement?.appliedTo,
              targetSectionKey: placement?.targetSectionKey ?? null,
            });
            toast.success(
              pkg.usedFallback
                ? "추천 초안을 반영해 Draft에 저장했습니다. (폴백 파이프라인)"
                : "추천 초안을 반영해 Draft에 저장했습니다. 바로 수정할 수 있어요."
            );
          }
        } else {
          setAiPackageModal((m) =>
            m && m.imageSectionKey === imageSectionKey
              ? { ...m, busy: false, pkg, selectedVariantIndex: modalInitialIndex, error: null }
              : m
          );
          if (pkg.usedFallback) {
            toast.info(
              "AI 초안을 생성했습니다. 필요하면 수정해 사용하세요. (서버 패키지 미배포·오류 시 단일 파이프라인 폴백)"
            );
          }
        }
      } catch (err) {
        console.error("[FederationAboutTab] AI 콘텐츠 패키지 실패", err);
        if (!autoApply) {
          setAiPackageModal((m) =>
            m && m.imageSectionKey === imageSectionKey
              ? {
                  ...m,
                  busy: false,
                  error: err instanceof Error ? err.message : "AI 생성에 실패했습니다.",
                }
              : m
          );
        } else {
          toast.error(err instanceof Error ? err.message : "AI 생성에 실패했습니다.");
        }
      } finally {
        delete aiFlowInFlightRef.current[imageSectionKey];
        setDynamicSectionPending(null);
      }
    },
    [federationSlug, federation, persistVariantFromPackage]
  );

  const handleAiFillTextBelowImage = useCallback(
    (imageSectionKey: string) => {
      void openAiPackageFlow(imageSectionKey, undefined, undefined, { autoApplyBest: false });
    },
    [openAiPackageFlow]
  );

  useEffect(() => {
    if (!aiPackageModal?.pkg || aiPackageModal.busy || aiPackageModal.error) return;
    const v = aiPackageModal.pkg.variants[aiPackageModal.selectedVariantIndex];
    if (!v) return;
    setAiApplyDraft({
      title: v.title || "",
      summary: v.summary || "",
      content: v.content || "",
      tagsCsv: (v.tags || []).join(", "),
    });
  }, [
    aiPackageModal?.pkg,
    aiPackageModal?.selectedVariantIndex,
    aiPackageModal?.busy,
    aiPackageModal?.error,
  ]);

  const applyAiPackageSelection = async () => {
    if (!aiPackageModal?.pkg) return;
    const { imageSectionKey, imageUrl, pkg, selectedVariantIndex } = aiPackageModal;
    const v = pkg.variants[selectedVariantIndex];
    if (!v) return;
    const tags = parseTagsCsv(aiApplyDraft.tagsCsv);
    const content = aiApplyDraft.content.trim();
    if (!content) {
      toast.error("본문을 입력해 주세요.");
      return;
    }
    const normTags = (arr: string[]) =>
      JSON.stringify(
        [...arr].map((x) => String(x || "").trim()).filter(Boolean)
      );
    const dirty =
      content !== String(v.content || "").trim() ||
      aiApplyDraft.title.trim() !== String(v.title || "").trim() ||
      aiApplyDraft.summary.trim() !== String(v.summary || "").trim() ||
      normTags(tags) !== normTags(v.tags || []);

    setAiPackageSaving(true);
    try {
      const { ok, placement } = await persistVariantFromPackage(
        pkg,
        selectedVariantIndex,
        imageSectionKey,
        imageUrl,
        undefined,
        {
          contentOverrides: {
            title: aiApplyDraft.title.trim(),
            summary: aiApplyDraft.summary.trim(),
            content,
            tags,
          },
          markUserEdited: dirty,
        }
      );
      if (!ok) return;
      const regen = aiRegenerateCountBySectionRef.current[imageSectionKey] ?? 0;
      void logFederationAiGenerationEvent({
        federationSlug,
        event: "content_applied",
        imageId: String(pkg.imageId || `${federationSlug}__${imageSectionKey}`),
        imageSectionKey,
        selectedVariantIndex,
        selectedTone: String(v.tone || ""),
        recommendedUse: String(v.recommendedUse || ""),
        finalAppliedUse: formatAiFinalAppliedPlacement(String(v.recommendedUse || ""), placement),
        isUserEdited: dirty,
        regenerateCount: regen,
        placementReason: pkg.placementReason,
        usedFallback: pkg.usedFallback,
        appliedTo: placement?.appliedTo,
        targetSectionKey: placement?.targetSectionKey ?? null,
      });
      setAiPackageModal(null);
      if (placement?.appliedTo === "dynamic_section" && placement.targetSectionKey) {
        setEditingDynamicSectionId(placement.targetSectionKey);
      } else {
        setEditingDynamicSectionId(null);
      }
      toast.success(
        dirty
          ? "다듬은 내용을 Draft에 저장했습니다. 같은 이미지에 자동 AI가 덮어쓰지 않습니다."
          : "선택한 후보를 Draft에 저장했습니다. 필요하면 이어서 수정하세요."
      );
    } finally {
      setAiPackageSaving(false);
    }
  };

  const runMultiImageAutoComposePreview = useCallback((templateOverride?: FederationPageTemplate) => {
    const tpl = templateOverride ?? pageComposeTemplateRef.current;
    const items = collectFederationMultiImageItems(
      sectionOrderRef.current,
      dynamicSectionsRef.current,
      imageContentSelectionsRef.current
    );
    if (items.length < 2) {
      toast.info("HTTPS 이미지 섹션이 2개 이상일 때 사용할 수 있습니다.");
      return;
    }
    const structure = composeFederationMultiImagePageStructure(items, {
      template: tpl,
    });
    const plan = buildAutoContentPlan(structure, imageContentSelectionsRef.current);
    const avg = plan.avgConfidenceForAppliedContent;
    setMultiImageApplyContent(
      avg === undefined || avg >= FEDERATION_AUTO_CONTENT_CONFIDENCE_THRESHOLD
    );
    setMultiImageAutoModal(structure);
  }, []);

  /** 템플릿 확정 + 열린 미리보기 모달이 있으면 구조 동기화 (원샷·ref는 즉시 tpl 반영 필요 시 ref도 갱신) */
  const commitPageComposeTemplate = useCallback((t: FederationPageTemplate) => {
    setPageComposeTemplate(t);
    pageComposeTemplateRef.current = t;
    setMultiImageAutoModal((prev) => {
      if (!prev) return prev;
      const items = collectFederationMultiImageItems(
        sectionOrderRef.current,
        dynamicSectionsRef.current,
        imageContentSelectionsRef.current
      );
      if (items.length < 2) return prev;
      const structure = composeFederationMultiImagePageStructure(items, { template: t });
      const plan = buildAutoContentPlan(structure, imageContentSelectionsRef.current);
      const avg = plan.avgConfidenceForAppliedContent;
      setMultiImageApplyContent(
        avg === undefined || avg >= FEDERATION_AUTO_CONTENT_CONFIDENCE_THRESHOLD
      );
      return structure;
    });
  }, []);

  const applyMultiImageCompose = async () => {
    if (!multiImageAutoModal || !federationSlug) return;
    const applyContent = multiImageApplyContent;
    const plan = buildAutoContentPlan(multiImageAutoModal, imageContentSelectionsRef.current);
    const snapshot = {
      sectionOrder: cloneJson(sectionOrderRef.current) as string[],
      dynamicSections: cloneJson(dynamicSectionsRef.current),
      intro: cloneJson(sectionsRef.current.intro),
      activities: cloneJson(sectionsRef.current.activities),
    };

    const composed = computeMultiImageComposeDraftPatch({
      sectionOrder: sectionOrderRef.current,
      dynamicSections: dynamicSectionsRef.current as Record<string, unknown>,
      intro: {
        content: sectionsRef.current.intro.content,
        image: sectionsRef.current.intro.image,
      },
      activitiesLines: sectionsRef.current.activities.content,
      presidentName: presidentNameRef.current,
      structure: multiImageAutoModal,
      plan,
      applyContent,
    });

    setMultiImageApplying(true);
    setSectionOrder(composed.nextOrder as typeof sectionOrder);
    if (applyContent) {
      setDynamicSections(composed.nextDynamic as Record<string, DynamicSection>);
      setSections((prev) => ({
        ...prev,
        intro: {
          ...prev.intro,
          content: composed.nextIntro.content,
          image: composed.nextIntro.image,
        },
        activities: {
          ...prev.activities,
          content: composed.nextActivitiesLines,
          draft: null,
        },
      }));
    }

    try {
      await updateFederationDraftAbout(federationSlug, composed.draftPatch as any);
      toast.success(
        applyContent
          ? "페이지 초안(순서·콘텐츠)을 Draft에 반영했습니다."
          : "이미지 섹션 순서만 Draft에 반영했습니다."
      );
      setMultiImageAutoModal(null);
      await refreshLocal();
    } catch (e) {
      console.error(e);
      setSectionOrder(snapshot.sectionOrder as typeof sectionOrder);
      setDynamicSections(snapshot.dynamicSections);
      setSections((prev) => ({
        ...prev,
        intro: snapshot.intro,
        activities: snapshot.activities,
      }));
      toast.error("저장에 실패했습니다. 변경을 되돌렸습니다.");
    } finally {
      setMultiImageApplying(false);
    }
  };

  const performBatchOneShot = useCallback(
    async (opts: {
      trigger: "manual" | "auto";
      skipUserEditedConfirm?: boolean;
      dynamicSectionsSnapshot?: Record<string, DynamicSection>;
    }) => {
      if (!federationSlug) return;
      if (batchOneShotInFlightRef.current) return;

      const dyn =
        opts.dynamicSectionsSnapshot ?? (dynamicSectionsRef.current as Record<string, DynamicSection>);
      const order = sectionOrderRef.current;
      const httpsN = listHttpsImageSectionKeys(order, dyn).length;

      if (opts.trigger === "manual" && httpsN < 2) {
        toast.info("HTTPS 이미지 섹션이 2개 이상일 때 사용할 수 있습니다.");
        return;
      }

      if (opts.trigger === "manual" && !opts.skipUserEditedConfirm) {
        const hasUserEdited = Object.values(imageContentSelectionsRef.current).some(
          (r) => r.isUserEdited === true
        );
        if (
          hasUserEdited &&
          !confirm(
            "일부 이미지 메타가 사용자 수정본입니다. 원샷에서는 해당 이미지는 AI 재생성을 건너뜁니다. 계속할까요?"
          )
        ) {
          return;
        }
      }

      batchCancelRef.current = false;
      const autoFingerprint =
        opts.trigger === "auto"
          ? buildFederationAutoBatchFingerprint(order, dyn)
          : null;
      const snapshot = {
        sectionOrder: cloneJson(order) as string[],
        dynamicSections: cloneJson(dyn),
        intro: cloneJson(sectionsRef.current.intro),
        activities: cloneJson(sectionsRef.current.activities),
        imageContentSelections: cloneJson(imageContentSelectionsRef.current),
      };

      batchOneShotInFlightRef.current = true;

      try {
        const res = await runFederationBatchOneShot({
          federationSlug,
          sectionOrder: order,
          dynamicSections: dyn,
          intro: {
            content: sectionsRef.current.intro.content,
            image: sectionsRef.current.intro.image,
          },
          activitiesLines: sectionsRef.current.activities.content,
          presidentName: presidentNameRef.current,
          prevSelections: imageContentSelectionsRef.current,
          pageTemplate: pageComposeTemplateRef.current,
          context: {
            federationName: federation?.name,
            sport: federation?.sport,
            region: federation?.region,
          },
          onProgress: onBatchBuildEngineProgress,
          shouldAbort: () => batchCancelRef.current,
          onImageGenerated: ({ key, pkg, variantIndex }) => {
            const genV = pkg.variants[variantIndex];
            const imageIdForLog = String(pkg.imageId || `${federationSlug}__${key}`);
            void logFederationAiGenerationEvent({
              federationSlug,
              event: "generation_complete",
              imageId: imageIdForLog,
              imageSectionKey: key,
              selectedVariantIndex: variantIndex,
              selectedTone: String(genV?.tone || ""),
              recommendedUse: String(
                genV?.recommendedUse || pkg.variants[0]?.recommendedUse || ""
              ),
              finalAppliedUse: "",
              isUserEdited: false,
              regenerateCount: 0,
              placementReason: pkg.placementReason,
              usedFallback: pkg.usedFallback,
            });
          },
        });

        if (!res.ok) {
          const skippedN = res.skipped?.length ?? 0;
          if (res.cancelled) {
            toast.info("원샷을 중단했습니다.");
            markBatchBuildIdle();
            void logFederationBatchAutoBuild({
              federationSlug,
              trigger: opts.trigger,
              httpsImageCount: httpsN,
              packageAttemptCount: 0,
              packageSuccessCount: 0,
              skippedCount: skippedN,
              draftSaved: false,
              cancelled: true,
              errorMessage: res.error,
              pageTemplate: pageComposeTemplateRef.current,
            });
            return;
          }
          toast.error(res.error);
          markBatchBuildError(res.error);
          void logFederationBatchAutoBuild({
            federationSlug,
            trigger: opts.trigger,
            httpsImageCount: httpsN,
            packageAttemptCount: 0,
            packageSuccessCount: 0,
            skippedCount: skippedN,
            draftSaved: false,
            errorMessage: res.error,
            pageTemplate: pageComposeTemplateRef.current,
          });
          return;
        }

        setSectionOrder(res.nextOrder as typeof sectionOrder);
        setImageContentSelections(res.nextSelections);
        if (res.applyContent) {
          setDynamicSections(res.nextDynamic as Record<string, DynamicSection>);
          setSections((prev) => ({
            ...prev,
            intro: {
              ...prev.intro,
              content: res.nextIntro.content,
              image: res.nextIntro.image,
            },
            activities: { ...prev.activities, content: res.nextActivitiesLines, draft: null },
          }));
        }

        try {
          await updateFederationDraftAbout(federationSlug, res.draftPatch as any);
          const parts: string[] = [];
          if (res.fetchAttemptCount > 0 && res.fetchSuccessCount < res.fetchAttemptCount) {
            parts.push(
              `⚡ ${res.fetchSuccessCount}/${res.fetchAttemptCount}장 AI 패키지 생성 성공 (나머지 실패)`
            );
          }
          if (res.failures.length) parts.push(`API 실패 ${res.failures.length}건`);
          if (res.skipped.length) parts.push(`건너뜀 ${res.skipped.length}건`);
          if (!res.applyContent) {
            parts.push("신뢰도 60% 미만으로 본문·활동 자동 반영 생략(순서·메타만)");
          }
          if (opts.trigger === "auto" && autoFingerprint) {
            try {
              window.localStorage.setItem(BATCH_AUTO_LAST_RUN_KEY, String(Date.now()));
              window.localStorage.setItem(BATCH_AUTO_LAST_FP_KEY, autoFingerprint);
            } catch {
              /* ignore */
            }
          }
          toast.success(
            opts.trigger === "auto"
              ? parts.length
                ? `업로드 후 자동 원샷을 저장했습니다. (${parts.join(" · ")})`
                : "업로드 후 자동 원샷을 저장했습니다."
              : parts.length
                ? `원샷 초안을 Draft에 저장했습니다. (${parts.join(" · ")})`
                : "원샷 초안을 Draft에 저장했습니다."
          );
          await refreshLocal();
          markBatchBuildDone();
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          void logFederationBatchAutoBuild({
            federationSlug,
            trigger: opts.trigger,
            httpsImageCount: httpsN,
            packageAttemptCount: res.fetchAttemptCount,
            packageSuccessCount: res.fetchSuccessCount,
            skippedCount: res.skipped.length,
            draftSaved: true,
            applyContent: res.applyContent,
            pageTemplate: pageComposeTemplateRef.current,
          });
        } catch (e) {
          console.error(e);
          setSectionOrder(snapshot.sectionOrder as typeof sectionOrder);
          setDynamicSections(snapshot.dynamicSections);
          setSections((prev) => ({
            ...prev,
            intro: snapshot.intro,
            activities: snapshot.activities,
          }));
          setImageContentSelections(snapshot.imageContentSelections);
          toast.error("저장에 실패했습니다. 변경을 되돌렸습니다.");
          markBatchBuildIdle();
          void logFederationBatchAutoBuild({
            federationSlug,
            trigger: opts.trigger,
            httpsImageCount: httpsN,
            packageAttemptCount: res.fetchAttemptCount,
            packageSuccessCount: res.fetchSuccessCount,
            skippedCount: res.skipped.length,
            draftSaved: false,
            errorMessage: e instanceof Error ? e.message : String(e),
            pageTemplate: pageComposeTemplateRef.current,
          });
        }
      } catch (e) {
        console.error(e);
        const msg = e instanceof Error ? e.message : "원샷 생성 중 오류가 났습니다.";
        toast.error(msg);
        markBatchBuildError(msg);
        void logFederationBatchAutoBuild({
          federationSlug,
          trigger: opts.trigger,
          httpsImageCount: listHttpsImageSectionKeys(
            sectionOrderRef.current,
            dynamicSectionsRef.current as Record<string, DynamicSection>
          ).length,
          packageAttemptCount: 0,
          packageSuccessCount: 0,
          skippedCount: 0,
          draftSaved: false,
          errorMessage: msg,
          pageTemplate: pageComposeTemplateRef.current,
        });
      } finally {
        batchOneShotInFlightRef.current = false;
      }
    },
    [
      federationSlug,
      federation?.name,
      federation?.sport,
      federation?.region,
      refreshLocal,
      onBatchBuildEngineProgress,
      markBatchBuildDone,
      markBatchBuildError,
      markBatchBuildIdle,
    ]
  );

  const runBatchOneShot = useCallback(() => {
    void performBatchOneShot({ trigger: "manual" });
  }, [performBatchOneShot]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await publishFederationDraft(federationSlug);
      toast.success("Publish 완료: Live 페이지에 반영되었습니다.");
      setPreviewMode("published");
      await onUpdated?.();
      await loadVersions();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Publish에 실패했습니다.");
    } finally {
      setPublishing(false);
    }
  };

  const loadVersions = async () => {
    if (!canEdit) return;
    try {
      const rows = await getFederationVersions(federationSlug);
      setVersions(rows);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    void loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [federationSlug, canEdit]);

  const handleRollback = async (v: { id: string; [k: string]: any }) => {
    setRollingBackId(v.id);
    try {
      await rollbackFederationVersion(federationSlug, v);
      toast.success("선택한 버전으로 Live를 되돌렸습니다.");
      setPreviewMode("published");
      await onUpdated?.();
      await loadVersions();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "롤백에 실패했습니다.");
    } finally {
      setRollingBackId(null);
    }
  };

  const previewToggle = canEdit ? (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={previewMode === "draft" ? "default" : "outline"}
          size="sm"
          onClick={() => setPreviewMode("draft")}
        >
          Draft 보기
        </Button>
        <Button
          type="button"
          variant={previewMode === "published" ? "default" : "outline"}
          size="sm"
          onClick={() => setPreviewMode("published")}
        >
          Published 보기
        </Button>
      </div>
      <div className="text-xs text-gray-500 mt-2">현재 모드: {previewMode.toUpperCase()}</div>
    </div>
  ) : null;

  const handlePresidentPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      inputEl.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingChairFile(file);
    setPendingChairPreviewUrl(previewUrl);
    let normalized: LoadedImage;
    try {
      normalized = await loadNormalizedImage(file);
    } catch (error) {
      console.error(error);
      toast.error("이미지 로드에 실패했습니다. 다른 파일로 다시 시도해주세요.");
      setPendingChairPreviewUrl(null);
      setPendingChairFile(null);
      inputEl.value = "";
      return;
    }
    const nextNatural = {
      width: Math.max(1, normalized.width || 1),
      height: Math.max(1, normalized.height || 1),
    };
    setPendingChairNaturalSize({
      width: nextNatural.width,
      height: nextNatural.height,
    });
    stopInertia();
    setPendingChairRotation(0);
    setPendingChairCropShape("rect");
    pendingChairUploadSessionRef.current += 1;
    setPendingChairPosition({ x: 0, y: 0 });
    toast.success("미리보기가 준비되었습니다. 드래그로 위치를 조정한 뒤 저장하세요.");
    inputEl.value = "";
  };

  const clearPendingChairPreview = () => {
    pendingChairSnappedSessionRef.current = null;
    setPendingChairPreviewUrl(null);
    setPendingChairFile(null);
    setPendingChairViewport(null);
    setPendingChairPosition({ x: 0, y: 0 });
    setPendingChairZoom(1);
    setPendingChairRotation(0);
    setPendingChairCropShape("rect");
    setPendingChairNaturalSize({ width: 1, height: 1 });
  };

  const updatePendingChairPosition = (next: Position) => {
    const container = pendingChairContainerRef.current;
    if (!container) return;
    const clamped = getClampedPosition({
      imageWidth: pendingChairNaturalSize.width,
      imageHeight: pendingChairNaturalSize.height,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
      zoom: pendingChairZoom,
      rotation: pendingChairRotation,
      position: next,
    });
    setPendingChairPosition(clamped);
  };

  const updatePendingChairZoom = (nextZoom: number, nextPosition?: Position) => {
    const container = pendingChairContainerRef.current;
    if (!container) {
      setPendingChairZoom(clamp(nextZoom, pendingChairMinZoom, pendingChairMaxZoom));
      if (nextPosition) setPendingChairPosition(nextPosition);
      return;
    }
    const safeZoom = clamp(nextZoom, pendingChairMinZoom, pendingChairMaxZoom);
    const clamped = getClampedPosition({
      imageWidth: pendingChairNaturalSize.width,
      imageHeight: pendingChairNaturalSize.height,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
      zoom: safeZoom,
      rotation: pendingChairRotation,
      position: nextPosition ?? pendingChairPosition,
    });
    setPendingChairZoom(safeZoom);
    setPendingChairPosition(clamped);
  };

  const stopInertia = () => {
    if (inertiaFrameRef.current !== null) {
      window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
    }
  };

  const startInertia = (initialVx: number, initialVy: number) => {
    stopInertia();
    let vx = initialVx;
    let vy = initialVy;

    const step = () => {
      vx *= 0.94;
      vy *= 0.94;
      if (Math.abs(vx) < 0.1 && Math.abs(vy) < 0.1) {
        inertiaFrameRef.current = null;
        return;
      }

      const container = pendingChairContainerRef.current;
      if (!container) {
        inertiaFrameRef.current = null;
        return;
      }

      setPendingChairPosition((prev) =>
        getClampedPosition({
          imageWidth: pendingChairNaturalSize.width,
          imageHeight: pendingChairNaturalSize.height,
          containerWidth: container.clientWidth,
          containerHeight: container.clientHeight,
          zoom: pendingChairZoom,
          rotation: pendingChairRotation,
          position: { x: prev.x + vx, y: prev.y + vy },
        })
      );

      inertiaFrameRef.current = window.requestAnimationFrame(step);
    };

    inertiaFrameRef.current = window.requestAnimationFrame(step);
  };

  const handleDoubleTapZoom = (clientX: number, clientY: number) => {
    const container = pendingChairContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const nextZoom =
      pendingChairZoom < pendingChairMinZoom * 1.8
        ? Math.min(pendingChairMaxZoom, pendingChairMinZoom * 2)
        : pendingChairMinZoom;
    const nextPosition = getPinchZoomPosition({
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
      touchX: localX,
      touchY: localY,
      prevZoom: pendingChairZoom,
      nextZoom,
      position: pendingChairPosition,
    });
    updatePendingChairZoom(nextZoom, nextPosition);
  };

  const rotatePendingChair = (delta: -90 | 90) => {
    const container = pendingChairContainerRef.current;
    if (!container) return;
    const nextRotation = (pendingChairRotation + delta + 360) % 360;
    const nextMinZoom = getContainMinZoom({
      imageWidth: pendingChairNaturalSize.width,
      imageHeight: pendingChairNaturalSize.height,
      containerWidth: Math.max(1, container.clientWidth),
      containerHeight: Math.max(1, container.clientHeight),
      rotation: nextRotation,
    });
    const nextMaxZoom = Math.max(8, nextMinZoom * 8);
    const atDefaultZoom = Math.abs(pendingChairZoom - 1) < 1e-3;
    const nextZoom =
      atDefaultZoom && nextMinZoom < 1 - 1e-6
        ? nextMinZoom
        : clamp(pendingChairZoom, nextMinZoom, nextMaxZoom);
    const rawPan = atDefaultZoom
      ? getChairInitialPanForPortrait({
          imageWidth: pendingChairNaturalSize.width,
          imageHeight: pendingChairNaturalSize.height,
          containerWidth: container.clientWidth,
          containerHeight: container.clientHeight,
          zoom: nextZoom,
          rotation: nextRotation,
        })
      : pendingChairPosition;
    const nextPosition = getClampedPosition({
      imageWidth: pendingChairNaturalSize.width,
      imageHeight: pendingChairNaturalSize.height,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight,
      zoom: nextZoom,
      rotation: nextRotation,
      position: rawPan,
    });
    setPendingChairRotation(nextRotation);
    setPendingChairZoom(nextZoom);
    setPendingChairPosition(nextPosition);
  };

  useEffect(
    () => () => {
      stopInertia();
    },
    []
  );

  // 포인터가 컨테이너 밖에서 종료되어도 드래그 상태가 남지 않도록 전역에서 정리
  useEffect(() => {
    const clearDragState = () => {
      dragRef.current.active = false;
      touchDragRef.current.active = false;
      pinchRef.current = null;
    };
    window.addEventListener("pointerup", clearDragState);
    window.addEventListener("pointercancel", clearDragState);
    window.addEventListener("blur", clearDragState);
    return () => {
      window.removeEventListener("pointerup", clearDragState);
      window.removeEventListener("pointercancel", clearDragState);
      window.removeEventListener("blur", clearDragState);
    };
  }, []);

  /** 컨테이너가 레이아웃에 붙은 뒤 측정 + 리사이즈 대응 (ref는 useMemo 시점에 비어 있을 수 있어 layout + RO로만 동기화) */
  useLayoutEffect(() => {
    if (!pendingChairPreviewUrl) {
      return;
    }
    const container = pendingChairContainerRef.current;
    if (!container) return;

    const syncFromContainerSize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      setPendingChairViewport({ w, h });
      const nextMinZoom = getContainMinZoom({
        imageWidth: pendingChairNaturalSize.width,
        imageHeight: pendingChairNaturalSize.height,
        containerWidth: w,
        containerHeight: h,
        rotation: pendingChairRotation,
      });
      const nextMaxZoom = Math.max(8, nextMinZoom * 8);
      const session = pendingChairUploadSessionRef.current;
      const needSnapToContainMin = pendingChairSnappedSessionRef.current !== session;
      if (needSnapToContainMin) {
        pendingChairSnappedSessionRef.current = session;
        const z0 = nextMinZoom;
        const rawPan = getChairInitialPanForPortrait({
          imageWidth: pendingChairNaturalSize.width,
          imageHeight: pendingChairNaturalSize.height,
          containerWidth: w,
          containerHeight: h,
          zoom: z0,
          rotation: pendingChairRotation,
        });
        const p0 = getClampedPosition({
          imageWidth: pendingChairNaturalSize.width,
          imageHeight: pendingChairNaturalSize.height,
          containerWidth: w,
          containerHeight: h,
          zoom: z0,
          rotation: pendingChairRotation,
          position: rawPan,
        });
        setPendingChairZoom(z0);
        setPendingChairPosition(p0);
        return;
      }
      setPendingChairZoom((prevZoom) => {
        const safeZoom = clamp(prevZoom, nextMinZoom, nextMaxZoom);
        setPendingChairPosition((prevPosition) =>
          getClampedPosition({
            imageWidth: pendingChairNaturalSize.width,
            imageHeight: pendingChairNaturalSize.height,
            containerWidth: w,
            containerHeight: h,
            zoom: safeZoom,
            rotation: pendingChairRotation,
            position: prevPosition,
          })
        );
        return safeZoom;
      });
    };

    syncFromContainerSize();
    const observer = new ResizeObserver(() => syncFromContainerSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [pendingChairPreviewUrl, pendingChairNaturalSize.width, pendingChairNaturalSize.height, pendingChairRotation]);

  /**
   * WYSIWYG: 아래 식은 미리보기 `<img>`와 동일 전제다.
   * - contain 스케일: min(cw/iw, ch/ih) → baseW/baseH
   * - draw 크기: base * zoom (export 시 scaleX/Y로 컨테이너→캔버스 확대)
   * - 변환: 원점 (cw/2+px, ch/2+py)에서 rotate 후 이미지 중심 정렬 draw
   * - position/zoom/rotation 은 getClampedPosition 과 같은 컨테이너 px 단위
   */
  async function generateCroppedImage(params: {
    imageFile: File;
    zoom: number;
    position: { x: number; y: number };
    rotation: number;
    containerWidth: number;
    containerHeight: number;
    cropShape?: "rect" | "circle";
    outputSize?: { width: number; height: number };
  }): Promise<Blob> {
    const {
      imageFile,
      zoom,
      position,
      rotation,
      containerWidth,
      containerHeight,
      cropShape = "rect",
      outputSize,
    } = params;
    const loaded = await loadNormalizedImage(imageFile);
    const exportWidth = outputSize?.width ?? containerWidth;
    const exportHeight = outputSize?.height ?? containerHeight;
    const scaleX = exportWidth / Math.max(1, containerWidth);
    const scaleY = exportHeight / Math.max(1, containerHeight);

    const baseScale = Math.min(containerWidth / loaded.width, containerHeight / loaded.height);
    const baseW = loaded.width * baseScale;
    const baseH = loaded.height * baseScale;
    const drawWidth = baseW * zoom * scaleX;
    const drawHeight = baseH * zoom * scaleY;

    const centerX = exportWidth / 2 + position.x * scaleX;
    const centerY = exportHeight / 2 + position.y * scaleY;

    const canvas = document.createElement("canvas");
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스 컨텍스트를 생성할 수 없습니다.");

    if (cropShape === "circle") {
      const radius = Math.min(exportWidth, exportHeight) / 2;
      ctx.beginPath();
      ctx.arc(exportWidth / 2, exportHeight / 2, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
    } else {
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(loaded.source, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지 변환에 실패했습니다."))), "image/png", 0.95);
    });
  }

  const savePendingChairPhoto = async () => {
    if (!pendingChairFile) {
      toast.error("저장할 이미지 파일이 없습니다. 사진을 다시 선택해 주세요.");
      return;
    }
    try {
      if (!storage) throw new Error("Storage not initialized");
      const uid = getAuth().currentUser?.uid;
      if (!uid) {
        toast.error("로그인 후 사진을 저장할 수 있습니다.");
        return;
      }
      if (!canEdit) {
        toast.error("협회 수정 권한이 없습니다. 관리자/편집자 권한을 확인해주세요.");
        return;
      }
      const container = pendingChairContainerRef.current;
      if (!container) throw new Error("미리보기 컨테이너를 찾을 수 없습니다.");
      const containerWidth = Math.max(1, Math.floor(container.clientWidth));
      const containerHeight = Math.max(1, Math.floor(container.clientHeight));
      const safePosition = getClampedPosition({
        imageWidth: pendingChairNaturalSize.width,
        imageHeight: pendingChairNaturalSize.height,
        containerWidth,
        containerHeight,
        zoom: pendingChairZoom,
        rotation: pendingChairRotation,
        position: pendingChairPosition,
      });
      const blob = await generateCroppedImage({
        imageFile: pendingChairFile,
        zoom: pendingChairZoom,
        position: safePosition,
        rotation: pendingChairRotation,
        containerWidth,
        containerHeight,
        outputSize:
          pendingChairCropShape === "circle"
            ? { width: 1024, height: 1024 }
            : { width: containerWidth * 2, height: containerHeight * 2 },
        cropShape: pendingChairCropShape,
      });
      const croppedFile = new File([blob], "chairperson-cropped.png", { type: "image/png" });

      const path = `federations/${federationSlug}/chairperson.png`;
      const r = ref(storage, path);
      await uploadBytes(r, croppedFile, { contentType: croppedFile.type });
      const url = await getDownloadURL(r);

      await updateFederationDraftAbout(federationSlug, {
        chairpersonPhotoUrl: url,
        // 호환성: 기존 president.photoUrl도 같이 유지
        president: { ...presidentBlock, photoUrl: url },
      });
      setSections((prev) => ({
        ...prev,
        intro: {
          ...prev.intro,
          image: url,
        },
      }));
      toast.success(
        "협회장 사진을 저장했습니다. 편집 화면이 닫힌 것은 정상입니다. 다시 바꾸려면 아래 '이미지 수정'을 눌러 주세요."
      );
      clearPendingChairPreview();
      await refreshLocal();
    } catch (err) {
      console.error(err);
      if (err instanceof FirebaseError) {
        if (err.code === "permission-denied") {
          toast.error("권한 오류: Firebase 규칙 또는 협회 관리자 권한을 확인해주세요.");
          return;
        }
        if (err.code === "unauthenticated") {
          toast.error("인증 오류: 로그인 상태를 확인해주세요.");
          return;
        }
      }
      toast.error("사진 업로드에 실패했습니다.");
    }
  };

  const saveInlineIntro = async (nextText: string, silent = false) => {
    const next = nextText.trim();
    if (!next) {
      if (!silent) toast.error("인사말을 입력해주세요.");
      return;
    }
    setInlineSaving(true);
    setInlineSaveStatus("saving");
    try {
      await updateFederationDraftAbout(federationSlug, {
        introMessage: next,
        president: { ...presidentBlock, message: next },
      });
      setSections((prev) => ({
        ...prev,
        intro: { ...prev.intro, content: next },
      }));
      if (!silent) setInlineIntroEditing(false);
      setInlineSaveStatus("saved");
      if (!silent) toast.success("Draft 인사말을 저장했습니다. Publish 후 사용자에게 반영됩니다.");
      await onUpdated?.();
    } catch (e) {
      console.error(e);
      setInlineSaveStatus("error");
      if (!silent) toast.error("인사말 저장에 실패했습니다.");
    } finally {
      setInlineSaving(false);
    }
  };

  const handleInlineIntroSave = async () => {
    await saveInlineIntro(inlineIntro, false);
  };

  const inlineDirty = inlineIntro.trim() !== (sections.intro.content || "").trim();

  useEffect(() => {
    if (!inlineEditMode || !inlineIntroEditing) return;
    if (!inlineDirty) {
      setInlineSaveStatus("saved");
      return;
    }
    if (inlineDebounceRef.current) {
      window.clearTimeout(inlineDebounceRef.current);
    }
    inlineDebounceRef.current = window.setTimeout(() => {
      void saveInlineIntro(inlineIntro, true);
    }, 800);
  }, [inlineIntro, inlineDirty, inlineEditMode, inlineIntroEditing]);

  const regenerateSection = async (section: "intro" | "history" | "vision" | "activities" | "organization") => {
    setRegenLoading(section);
    try {
      const fn = httpsCallable(functions, "generateFederationSection");
      const sourceText =
        section === "intro"
          ? sections.intro.content
          : section === "history"
          ? history
          : section === "vision"
          ? vision
          : section === "activities"
          ? activities.join("\n")
          : `${orgSummaryText || ""}\n` + executives.map((e) => `${e.role} ${e.name}`.trim()).join("\n");

      // Draft 모드: 섹션별 재생성은 저장하지 않고 Draft에 병합만 함
      const res: any = await fn({ federationSlug, section, sourceText, dryRun: true });
      const data = (res?.data && typeof res.data === "object") ? res.data : {};
      if (data.ok === false) {
        throw new Error(String(data.error || "섹션 재생성 실패"));
      }
      // 섹션별 결과를 Draft에만 병합
      setSections((prev) => {
        const next = { ...prev };
        if (section === "intro" && typeof (data as any).introMessage === "string") {
          next.intro = { ...next.intro, draft: String((data as any).introMessage) };
        }
        if (section === "history" && typeof (data as any).history === "string") {
          next.history = { ...next.history, draft: String((data as any).history) };
        }
        if (section === "vision" && typeof (data as any).vision === "string") {
          next.vision = { ...next.vision, draft: String((data as any).vision) };
        }
        if (section === "activities" && Array.isArray((data as any).activities)) {
          next.activities = { ...next.activities, draft: (data as any).activities as string[] };
        }
        if (section === "organization") {
          const summary = String((data as any)?.organization?.summary || "");
          const ex = Array.isArray((data as any).executives) ? ((data as any).executives as any[]) : [];
          next.organization = {
            ...next.organization,
            draft: {
              summary,
              executives: ex.map((e) => ({ name: String(e?.name || ""), role: String(e?.role || "") })),
            },
          };
        }
        return next;
      });
      toast.success("Draft에 섹션 결과를 반영했습니다. 적용을 누르면 저장됩니다.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "AI 다시 생성에 실패했습니다.");
    } finally {
      setRegenLoading(null);
    }
  };

  const getRenderSection = (key: string) => {
    if (key === "intro") {
      return {
        type: "intro" as const,
        title: "협회장 인사말",
        content: sections.intro.content,
        image: sections.intro.image,
        presidentName,
      };
    }
    if (key === "history") {
      return { type: "history" as const, title: "협회 연혁", content: sections.history.content };
    }
    if (key === "vision") {
      return { type: "vision" as const, title: "협회 비전", content: sections.vision.content };
    }
    if (key === "activities") {
      return { type: "activities" as const, title: "주요 활동", items: sections.activities.content };
    }
    if (key === "organization") {
      return {
        type: "organization" as const,
        title: "조직 구성",
        summary: sections.organization.content.summary,
        executives: isDraftEditMode
          ? executives
          : (Array.isArray(sourceRoot?.organization?.executives) ? sourceRoot.organization.executives : []),
      };
    }
    const dyn = dynamicSections[key];
    if (!dyn) return null;
    if (dyn.type === "text") {
      return { type: "text" as const, title: "텍스트 섹션", content: dyn.content };
    }
    if (dyn.type === "image") {
      return { type: "image" as const, title: "이미지 섹션", image: dyn.image, content: dyn.content };
    }
    const galleryLines = String(dyn.content || "")
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      type: "gallery" as const,
      title: "갤러리 섹션",
      images: galleryLines.length > 0 ? galleryLines : dyn.image ? [dyn.image] : [],
    };
  };

  // Viewer 모드: 저장된 섹션 순서/데이터만 렌더 (Editor UI 분리)
  if (!canEditUI || previewMode === "published") {
    return (
      <div className="max-w-5xl mx-auto py-2 space-y-8">
        {previewToggle}
        {canEditUI && previewMode === "published" ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            Published 보기 전용입니다. 수정은 Draft 모드에서만 가능합니다.
          </div>
        ) : null}
        {sectionOrder.map((key) => {
          const section = getRenderSection(key);
          if (!section) return null;
          return (
            <div key={key} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <SectionRenderer section={section} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {previewToggle}
      {canEditUI ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">버전 히스토리</h3>
          {versions.length === 0 ? (
            <p className="text-sm text-gray-500">저장된 버전이 아직 없습니다. (첫 Publish 이후 생성)</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div key={v.id} className="flex items-center justify-between border rounded-lg p-2">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium mr-2">{v.versionName || "version"}</span>
                    <span className="text-gray-500">
                      {v.createdAt?.toDate?.()?.toLocaleString?.() || "-"}
                    </span>
                  </div>
              <Button
                type="button"
                    variant="outline"
                size="sm"
                    onClick={() => void handleRollback(v)}
                    disabled={rollingBackId === v.id}
              >
                    {rollingBackId === v.id ? "되돌리는 중..." : "되돌리기"}
              </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
      {isDraftEditMode ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
              페이지 템플릿 (자동 구성·원샷)
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {FED_PAGE_TEMPLATE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none"
                >
                  <input
                    type="radio"
                    name={`fed-page-template-${federationSlug || "x"}`}
                    className="shrink-0 rounded-full border-gray-300"
                    checked={pageComposeTemplate === opt.value}
                    disabled={batchOneShotUiBusy || multiImageApplying}
                    onChange={() => {
                      if (batchOneShotUiBusy || multiImageApplying) return;
                      if (templateToolbarFollowUp) {
                        setTemplateToolbarFollowUp({ proposed: opt.value });
                        return;
                      }
                      if (opt.value === pageComposeTemplate) return;
                      setTemplateToolbarFollowUp({ proposed: opt.value });
                    }}
                  />
                  <span title={opt.hint}>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setOpenAddSection((v) => !v)}>
              + 섹션 추가
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                multiImageHttpsCount < 2 || batchOneShotUiBusy || multiImageApplying
              }
              title={
                multiImageHttpsCount < 2
                  ? "HTTPS 이미지 섹션을 2개 이상 만든 뒤 사용하세요."
                  : "이미지 순서·역할과, AI 메타가 있으면 인사말·활동·캡션까지 Draft 초안에 반영합니다."
              }
              onClick={() => runMultiImageAutoComposePreview()}
            >
              페이지 자동 구성 (AI)
            </Button>
            <Button
              type="button"
              disabled={
                multiImageHttpsCount < 2 || batchOneShotUiBusy || multiImageApplying
              }
              title={
                multiImageHttpsCount < 2
                  ? "HTTPS 이미지 섹션을 2개 이상 만든 뒤 사용하세요."
                  : "각 이미지 AI 생성(병렬) → 페이지 자동 배치·콘텐츠 → Draft 한 번에 저장. 일부 실패해도 나머지로 진행합니다."
              }
              onClick={() => void runBatchOneShot()}
            >
              {batchOneShotUiBusy ? "원샷 진행 중…" : "빠른 생성 (원샷)"}
            </Button>
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none max-w-[220px]">
              <input
                type="checkbox"
                className="shrink-0 rounded border-gray-300"
                checked={autoBatchAfterUpload}
                disabled={batchOneShotUiBusy}
                onChange={(e) => setAutoBatchAfterUpload(e.target.checked)}
              />
              <span>
                업로드 후 자동 원샷 (이미지 3장+·조건 충족 시, 30초 쿨다운·동일 URL 조합은 스킵)
              </span>
            </label>
            {canPublish ? (
              <Button type="button" onClick={() => void handlePublish()} disabled={publishing}>
                {publishing ? "Publish 중..." : "Publish"}
              </Button>
            ) : null}
          </div>
          {openAddSection ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => void addSection("text")}>
                텍스트 섹션
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => void addSection("image")}>
                이미지 섹션
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => void addSection("gallery")}>
                갤러리 섹션
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePresidentPhotoUpload}
      />

      <DndContext
        sensors={sectionReorderSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {sectionOrder.map((key) => (
              <SortableItem key={key} id={key}>
                {key === "intro" ? (
                  <>
                    <SectionEditor
                      sectionKey="intro"
                      title="협회장 인사말"
                      section={{
                        content: sections.intro.content,
                        draft: sections.intro.draft,
                        image: sections.intro.image,
                      }}
                      canEdit={isDraftEditMode}
                      onRegenerate={() => void regenerateSection("intro")}
                      onApply={() => void applySectionDraft("intro")}
                      onUploadImage={() => photoInputRef.current?.click()}
                      introImageReplaceSessionOpen={!!pendingChairPreviewUrl}
                      headerExtra={
                        <label className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 bg-white">
                          <input
                            type="checkbox"
                            checked={openAutoPanel}
                            onPointerDown={(e) => e.stopPropagation()}
                            onChange={(ev) => setOpenAutoPanel(ev.target.checked)}
                          />
                          협회 자동 생성 (MVP)
                        </label>
                      }
                    />
                    {pendingChairPreviewUrl ? (
                      <div
                        className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 relative z-10"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <div className="relative z-20 space-y-1">
                          <p className="text-sm text-blue-900 font-semibold">편집 중 (저장 전)</p>
                          <p className="text-xs text-blue-800/90 leading-snug">
                            바깥이 어둡게 보이는 부분은 저장되지 않습니다. 안쪽 프레임만 잘려 올라갑니다. 세로로 긴 사진은 처음에 얼굴이 잘 보이도록 위쪽을 살짝 당겨 둡니다. 슬라이더·드래그로 미세 조정하면 됩니다.
                          </p>
                          <p className="text-xs text-blue-800 font-medium pt-0.5">드래그 이동 · 슬라이더로 확대/축소</p>
                        </div>
                        <div className="relative z-20 flex flex-wrap items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => rotatePendingChair(-90)}>
                            좌회전
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => rotatePendingChair(90)}>
                            우회전
                          </Button>
                          <Button
                            type="button"
                            variant={pendingChairCropShape === "rect" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPendingChairCropShape("rect")}
                          >
                            사각형
                          </Button>
                          <Button
                            type="button"
                            variant={pendingChairCropShape === "circle" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPendingChairCropShape("circle")}
                          >
                            원형
                          </Button>
                        </div>
                        <div
                          className={`relative w-full ${
                            pendingChairCropShape === "circle" ? "mx-auto max-w-[320px]" : ""
                          }`}
                        >
                          <div
                            ref={pendingChairContainerRef}
                            style={{ touchAction: "pan-y" }}
                            className={`relative h-[320px] w-full overflow-hidden bg-gray-100 border cursor-move select-none ${
                              pendingChairCropShape === "circle" ? "rounded-full" : "rounded-xl"
                            }`}
                            onPointerDown={(e) => {
                            if (e.pointerType === "touch") return;
                            if (pendingChairZoom <= pendingChairMinZoom + 0.012) return;
                            stopInertia();
                            const now = performance.now();
                            dragRef.current = {
                              active: true,
                              startX: e.clientX,
                              startY: e.clientY,
                              originX: pendingChairPosition.x,
                              originY: pendingChairPosition.y,
                              lastX: e.clientX,
                              lastY: e.clientY,
                              lastTime: now,
                              velocityX: 0,
                              velocityY: 0,
                            };
                            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                          }}
                          onPointerMove={(e) => {
                            if (e.pointerType === "touch") return;
                            if (!dragRef.current.active) return;
                            // 마우스 버튼이 눌린 상태에서만 드래그 이동 허용
                            if ((e.buttons & 1) !== 1) {
                              dragRef.current.active = false;
                              return;
                            }
                            const container = pendingChairContainerRef.current;
                            if (!container) return;
                            const dx = e.clientX - dragRef.current.startX;
                            const dy = e.clientY - dragRef.current.startY;
                            const now = performance.now();
                            const dt = Math.max(now - dragRef.current.lastTime, 1);
                            dragRef.current.velocityX = ((e.clientX - dragRef.current.lastX) / dt) * 16;
                            dragRef.current.velocityY = ((e.clientY - dragRef.current.lastY) / dt) * 16;
                            dragRef.current.lastX = e.clientX;
                            dragRef.current.lastY = e.clientY;
                            dragRef.current.lastTime = now;
                            setPendingChairPosition((prev) =>
                              getClampedPosition({
                                imageWidth: pendingChairNaturalSize.width,
                                imageHeight: pendingChairNaturalSize.height,
                                containerWidth: container.clientWidth,
                                containerHeight: container.clientHeight,
                                zoom: pendingChairZoom,
                                rotation: pendingChairRotation,
                                position: {
                                  x: dragRef.current.originX + dx,
                                  y: dragRef.current.originY + dy,
                                },
                              })
                            );
                          }}
                          onPointerUp={() => {
                            const vx = dragRef.current.velocityX;
                            const vy = dragRef.current.velocityY;
                            dragRef.current.active = false;
                            if (Math.abs(vx) > 0.2 || Math.abs(vy) > 0.2) {
                              startInertia(vx, vy);
                            }
                          }}
                          onPointerCancel={() => {
                            dragRef.current.active = false;
                          }}
                          onTouchStart={(e) => {
                            const now = Date.now();
                            const minZ = pendingChairMinZoom;
                            const atContainMin = pendingChairZoom <= minZ + 0.012;
                            if (e.touches.length === 1) {
                              const t = e.touches[0];
                              if (now - lastTapRef.current < 280) {
                                handleDoubleTapZoom(t.clientX, t.clientY);
                                lastTapRef.current = 0;
                                touchDragRef.current.active = false;
                                pinchRef.current = null;
                                return;
                              }
                              lastTapRef.current = now;
                              if (atContainMin) {
                                touchDragRef.current.active = false;
                                return;
                              }
                              stopInertia();
                              const timeNow = performance.now();
                              touchDragRef.current = {
                                active: true,
                                startX: t.clientX,
                                startY: t.clientY,
                                originX: pendingChairPosition.x,
                                originY: pendingChairPosition.y,
                                lastX: t.clientX,
                                lastY: t.clientY,
                                lastTime: timeNow,
                                velocityX: 0,
                                velocityY: 0,
                              };
                              pinchRef.current = null;
                              return;
                            }
                            if (e.touches.length === 2) {
                              touchDragRef.current.active = false;
                              pinchRef.current = {
                                initialDistance: getTouchDistance(e.touches[0], e.touches[1]),
                                initialZoom: pendingChairZoom,
                              };
                            }
                          }}
                          onTouchMove={(e) => {
                            const container = pendingChairContainerRef.current;
                            if (!container) return;

                            if (e.touches.length === 2 && pinchRef.current) {
                              e.preventDefault();
                              const distance = getTouchDistance(e.touches[0], e.touches[1]);
                              const scale = distance / Math.max(1, pinchRef.current.initialDistance);
                              const nextZoom = clamp(
                                pinchRef.current.initialZoom * scale,
                                pendingChairMinZoom,
                                pendingChairMaxZoom
                              );
                              const rect = container.getBoundingClientRect();
                              const touchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                              const touchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
                              const nextPosition = getPinchZoomPosition({
                                containerWidth: container.clientWidth,
                                containerHeight: container.clientHeight,
                                touchX: touchCenterX,
                                touchY: touchCenterY,
                                prevZoom: pendingChairZoom,
                                nextZoom,
                                position: pendingChairPosition,
                              });
                              updatePendingChairZoom(nextZoom, nextPosition);
                              return;
                            }

                            if (e.touches.length === 1 && touchDragRef.current.active) {
                              if (pendingChairZoom <= pendingChairMinZoom + 0.012) {
                                touchDragRef.current.active = false;
                                return;
                              }
                              const t = e.touches[0];
                              const dx = t.clientX - touchDragRef.current.startX;
                              const dy = t.clientY - touchDragRef.current.startY;
                              const now = performance.now();
                              const dt = Math.max(now - touchDragRef.current.lastTime, 1);
                              touchDragRef.current.velocityX = ((t.clientX - touchDragRef.current.lastX) / dt) * 16;
                              touchDragRef.current.velocityY = ((t.clientY - touchDragRef.current.lastY) / dt) * 16;
                              touchDragRef.current.lastX = t.clientX;
                              touchDragRef.current.lastY = t.clientY;
                              touchDragRef.current.lastTime = now;
                              updatePendingChairPosition({
                                x: touchDragRef.current.originX + dx,
                                y: touchDragRef.current.originY + dy,
                              });
                            }
                          }}
                          onTouchEnd={() => {
                            const vx = touchDragRef.current.velocityX;
                            const vy = touchDragRef.current.velocityY;
                            touchDragRef.current.active = false;
                            const wasPinch = !!pinchRef.current;
                            pinchRef.current = null;
                            if (!wasPinch && (Math.abs(vx) > 0.2 || Math.abs(vy) > 0.2)) {
                              startInertia(vx, vy);
                            }
                          }}
                          onTouchCancel={() => {
                            touchDragRef.current.active = false;
                            pinchRef.current = null;
                          }}
                          >
                            <img
                              src={pendingChairPreviewUrl}
                              alt="협회장 사진 미리보기"
                              className="absolute inset-0 z-0 w-full h-full object-contain pointer-events-none"
                              style={{
                                transform: `translate(${pendingChairPosition.x}px, ${pendingChairPosition.y}px) scale(${pendingChairZoom}) rotate(${pendingChairRotation}deg)`,
                                transformOrigin: "center center",
                              }}
                            />
                          </div>
                          <div
                            className="pointer-events-none absolute left-0 top-0 z-[5] h-[320px] w-full"
                            aria-hidden
                          >
                            <div
                              className={
                                pendingChairCropShape === "circle"
                                  ? "h-full w-full rounded-full border-2 border-white/90"
                                  : "h-full w-full rounded-xl border-2 border-white/90"
                              }
                              style={{
                                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
                              }}
                            />
                          </div>
                        </div>
                        <p className="relative z-10 text-xs text-gray-600 px-0.5 -mt-0.5">
                          ※ 보이는 프레임 안만 저장됩니다. (바깥 어두운 영역 제외)
                        </p>
                        <div className="relative z-10 flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-9 shrink-0">줌</span>
                          <input
                            type="range"
                            min={pendingChairMinZoom}
                            max={pendingChairMaxZoom}
                            step={0.01}
                            value={pendingChairZoom}
                            onChange={(e) => updatePendingChairZoom(Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-xs text-gray-600 w-10 text-right">{pendingChairZoom.toFixed(1)}x</span>
                        </div>
                        <div className="relative z-10 flex items-center justify-end gap-2">
                          <Button type="button" variant="outline" onClick={clearPendingChairPreview}>
                            취소
                          </Button>
                          <Button type="button" onClick={() => void savePendingChairPhoto()}>
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : key === "history" ? (
                  <SectionEditor
                    sectionKey="history"
        title="협회 연혁"
                    section={{ content: sections.history.content, draft: sections.history.draft }}
                    canEdit={isDraftEditMode}
                    onRegenerate={() => void regenerateSection("history")}
                    onApply={() => void applySectionDraft("history")}
                  />
                ) : key === "vision" ? (
                  <SectionEditor
                    sectionKey="vision"
                    title="협회 비전"
                    section={{ content: sections.vision.content, draft: sections.vision.draft }}
                    canEdit={isDraftEditMode}
                    onRegenerate={() => void regenerateSection("vision")}
                    onApply={() => void applySectionDraft("vision")}
                  />
                ) : key === "activities" ? (
                  <SectionCard
                    title="주요 활동"
                    canEdit={isDraftEditMode}
                    onEdit={() => setModal("activities")}
        secondaryActions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
                        onClick={() => void regenerateSection("activities")}
                        disabled={regenLoading !== null}
          >
                        {regenLoading === "activities" ? "생성 중…" : "AI 다시 생성"}
          </Button>
        }
      >
                    <ul className="space-y-1 text-gray-600">
          {activities.map((a, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-gray-400">•</span>
                          <span>{a}</span>
                        </li>
          ))}
        </ul>
      </SectionCard>
                ) : (
                  (() => {
                    const dyn = dynamicSections[key];
                    if (dyn) {
                      const isDynEditing = editingDynamicSectionId === key;
                      const isDynBusy = dynamicSectionPending?.key === key;
                      const busyHint =
                        isDynBusy && dynamicSectionPending?.kind === "upload"
                          ? "업로드 중…"
                          : isDynBusy && dynamicSectionPending?.kind === "save"
                            ? "저장 중…"
                            : isDynBusy && dynamicSectionPending?.kind === "ai_image"
                              ? "AI 생성 중…"
                              : null;
                      const safeToggleDynEdit = () => {
                        if (isDynBusy) return;
                        setEditingDynamicSectionId((cur) => (cur === key ? null : key));
                      };
                      const galleryUrls = String(dyn.content || "")
                        .split(/\n+/)
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const linkedAiRow = Object.values(imageContentSelections).find(
                        (r) =>
                          r.appliedTo === "dynamic_section" && r.targetSectionKey === key
                      );
                      const showAiMetaFields =
                        linkedAiRow != null ||
                        !!String(dyn.aiTitle || "").trim() ||
                        !!String(dyn.aiSummary || "").trim() ||
                        (Array.isArray(dyn.aiTags) && dyn.aiTags.length > 0);
                      return (
                        <SectionCard
                          title={
                            dyn.type === "text"
                              ? String(dyn.aiTitle || "").trim() || "텍스트 섹션"
                              : dyn.type === "image"
                                ? "이미지 섹션"
                                : "갤러리 섹션"
                          }
                          canEdit={isDraftEditMode}
                          onEdit={safeToggleDynEdit}
                          secondaryActions={
                            isDraftEditMode ? (
                              <>
                                {dyn.type === "image" ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                      isDynBusy ||
                                      !String(dyn.image || "")
                                        .trim()
                                        .startsWith("https://")
                                    }
                                    onClick={() => handleAiFillTextBelowImage(key)}
                                  >
                                    ✨ AI 콘텐츠
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isDynBusy}
                                  onClick={() => void removeSection(key)}
                                >
                                  삭제
                                </Button>
                              </>
                            ) : null
                          }
                        >
                          {dyn.type === "text" ? (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-500">동적 텍스트 블록</p>
                              {linkedAiRow?.isUserEdited ? (
                                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                                  사용자가 다듬은 AI 초안이 연결되어 있습니다. 자동 AI가 이 블록을 덮어쓰지 않습니다.
                                </p>
                              ) : null}
                              {String(dyn.aiSummary || "").trim() ? (
                                <p className="text-sm text-gray-600 italic border-l-2 border-blue-200 pl-3">
                                  {dyn.aiSummary}
                                </p>
                              ) : null}
                              {Array.isArray(dyn.aiTags) && dyn.aiTags.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {dyn.aiTags.map((t, ti) => (
                                    <span
                                      key={`${t}-${ti}`}
                                      className="text-xs rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              {isDraftEditMode && isDynEditing ? (
                                <>
                                  {busyHint ? (
                                    <p className="text-sm text-blue-600 font-medium">{busyHint}</p>
                                  ) : null}
                                  <textarea
                                    className="w-full min-h-[120px] rounded-lg border p-3 text-sm disabled:opacity-60"
                                    value={dyn.content}
                                    disabled={isDynBusy}
                                    onChange={(e) =>
                                      setDynamicSections((prev) => ({
                                        ...prev,
                                        [key]: { ...prev[key], content: e.target.value },
                                      }))
                                    }
                                  />
                                  {showAiMetaFields ? (
                                    <div className="space-y-2 border-t border-slate-100 pt-3 mt-2">
                                      <p className="text-xs font-medium text-gray-600">
                                        AI 메타 (표시·검색용, 선택)
                                      </p>
                                      <div className="space-y-1">
                                        <Label className="text-xs text-gray-600">제목</Label>
                                        <Input
                                          className="text-sm"
                                          value={String(dyn.aiTitle ?? "")}
                                          disabled={isDynBusy}
                                          onChange={(e) =>
                                            setDynamicSections((prev) => ({
                                              ...prev,
                                              [key]: { ...prev[key], aiTitle: e.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs text-gray-600">한 줄 요약</Label>
                                        <Input
                                          className="text-sm"
                                          value={String(dyn.aiSummary ?? "")}
                                          disabled={isDynBusy}
                                          onChange={(e) =>
                                            setDynamicSections((prev) => ({
                                              ...prev,
                                              [key]: { ...prev[key], aiSummary: e.target.value },
                                            }))
                                          }
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs text-gray-600">
                                          태그 (쉼표로 구분)
                                        </Label>
                                        <Input
                                          className="text-sm font-mono"
                                          value={(dyn.aiTags || []).join(", ")}
                                          disabled={isDynBusy}
                                          onChange={(e) =>
                                            setDynamicSections((prev) => ({
                                              ...prev,
                                              [key]: {
                                                ...prev[key],
                                                aiTags: parseTagsCsv(e.target.value),
                                              },
                                            }))
                                          }
                                        />
                                      </div>
                                    </div>
                                  ) : null}
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isDynBusy}
                                      onClick={async () => {
                                        setDynamicSectionPending({ key, kind: "save" });
                                        try {
                                          const latest = dynamicSectionsRef.current;
                                          const ord = sectionOrderRef.current;
                                          await persistDynamicSections(latest, ord);
                                          await syncSelectionFromDynamicTextSave(key, latest);
                                          toast.success("섹션 내용을 저장했습니다.");
                                          setEditingDynamicSectionId(null);
                                        } catch (e) {
                                          console.error(e);
                                          toast.error("섹션 저장에 실패했습니다.");
                                        } finally {
                                          setDynamicSectionPending(null);
                                        }
                                      }}
                                    >
                                      저장
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={isDynBusy}
                                      onClick={() => setEditingDynamicSectionId(null)}
                                    >
                                      취소
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <p className="text-gray-700 whitespace-pre-wrap">
                                  {dyn.content || "내용이 없습니다."}
                                </p>
                              )}
                              {isDraftEditMode && !isDynEditing ? (
                                <p className="text-xs text-gray-400">「수정」을 누르면 편집할 수 있습니다.</p>
                              ) : null}
                            </div>
                          ) : dyn.type === "image" ? (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-500">이미지 섹션</p>
                              {isDraftEditMode && busyHint ? (
                                <p className="text-sm text-blue-600 font-medium">{busyHint}</p>
                              ) : null}
                              {dyn.image ? (
                                <img
                                  src={dyn.image}
                                  alt=""
                                  className="w-full max-h-[520px] object-contain rounded-lg border bg-gray-50"
                                />
                              ) : (
                                <div className="w-full aspect-[16/9] rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
                                  등록된 이미지가 없습니다.
                                </div>
                              )}
                              {isDraftEditMode && isDynEditing ? (
                                <div className="space-y-2">
                                  {busyHint ? (
                                    <p className="text-sm text-blue-600 font-medium">{busyHint}</p>
                                  ) : null}
                                  <label className="block">
                                    <span className="text-sm font-medium text-gray-700">이미지 파일</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={isDynBusy}
                                      className="mt-1 block w-full text-sm text-gray-600 disabled:opacity-50"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = "";
                                        if (!file || !file.type.startsWith("image/")) {
                                          toast.error("이미지 파일을 선택해 주세요.");
                                          return;
                                        }
                                        setDynamicSectionPending({ key, kind: "upload" });
                                        try {
                                          const url = await uploadDynamicSectionImage(key, file);
                                          const nextSections = {
                                            ...dynamicSections,
                                            [key]: { ...dynamicSections[key], image: url },
                                          };
                                          setDynamicSections(nextSections);
                                          await persistDynamicSections(nextSections, sectionOrder);
                                          toast.success("이미지를 저장했습니다.");
                                          setEditingDynamicSectionId(null);
                                          let lastRunTs = 0;
                                          let lastFpStored = "";
                                          try {
                                            lastRunTs =
                                              parseInt(
                                                window.localStorage.getItem(
                                                  BATCH_AUTO_LAST_RUN_KEY
                                                ) || "0",
                                                10
                                              ) || 0;
                                            lastFpStored =
                                              window.localStorage.getItem(
                                                BATCH_AUTO_LAST_FP_KEY
                                              ) || "";
                                          } catch {
                                            /* ignore */
                                          }
                                          const uploadFp = buildFederationAutoBatchFingerprint(
                                            sectionOrder,
                                            nextSections
                                          );
                                          const autoCooldownOk =
                                            Date.now() - lastRunTs >=
                                            FEDERATION_AUTO_BATCH_COOLDOWN_MS;
                                          const autoFpOk = uploadFp !== lastFpStored;
                                          const shouldAutoBase = shouldAutoRunFederationBatch({
                                            sectionOrder,
                                            dynamicSections: nextSections,
                                            selections: imageContentSelectionsRef.current,
                                          });
                                          if (import.meta.env.DEV) {
                                            console.debug("[BatchFingerprint]", {
                                              current: uploadFp,
                                              last: lastFpStored,
                                              matched: uploadFp === lastFpStored,
                                              lastRunTs,
                                              cooldownOk: autoCooldownOk,
                                              cooldownRemainingMs: Math.max(
                                                0,
                                                FEDERATION_AUTO_BATCH_COOLDOWN_MS -
                                                  (Date.now() - lastRunTs)
                                              ),
                                            });
                                          }
                                          const runAutoBatch =
                                            autoBatchAfterUpload &&
                                            !batchOneShotInFlightRef.current &&
                                            !batchOneShotUiBusy &&
                                            autoCooldownOk &&
                                            autoFpOk &&
                                            shouldAutoBase;
                                          if (runAutoBatch) {
                                            void performBatchOneShot({
                                              trigger: "auto",
                                              skipUserEditedConfirm: true,
                                              dynamicSectionsSnapshot: nextSections,
                                            });
                                          } else {
                                            if (
                                              autoBatchAfterUpload &&
                                              !batchOneShotInFlightRef.current &&
                                              !batchOneShotUiBusy &&
                                              shouldAutoBase
                                            ) {
                                              if (!autoCooldownOk) {
                                                toast.info(
                                                  "30초 쿨다운 중이라 자동 원샷은 건너뜁니다. 잠시 후 다시 가능하며, 지금은 이 이미지에 AI만 적용합니다."
                                                );
                                              } else if (!autoFpOk) {
                                                toast.info(
                                                  "이미지 URL 구성이 직전 자동 원샷과 같아 배치를 건너뜁니다. 단일 이미지 AI만 실행합니다."
                                                );
                                              }
                                            }
                                            void openAiPackageFlow(key, url, nextSections, {
                                              autoApplyBest: true,
                                            });
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          toast.error("이미지 업로드에 실패했습니다.");
                                        } finally {
                                          setDynamicSectionPending(null);
                                        }
                                      }}
                                    />
                                  </label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={isDynBusy}
                                    onClick={() => setEditingDynamicSectionId(null)}
                                  >
                                    닫기
                                  </Button>
                                </div>
                              ) : isDraftEditMode ? (
                                <p className="text-xs text-gray-400">「수정」을 누르면 이미지를 올릴 수 있습니다.</p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-500">갤러리 섹션 (이미지 URL 또는 파일 추가)</p>
                              {galleryUrls.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {galleryUrls.map((src, i) => (
                                    <div
                                      key={`${src.slice(0, 48)}-${i}`}
                                      className="aspect-square rounded-lg overflow-hidden border bg-gray-50"
                                    >
                                      <img src={src} alt="" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">등록된 이미지가 없습니다.</p>
                              )}
                              {isDraftEditMode && isDynEditing ? (
                                <div className="space-y-2">
                                  {busyHint ? (
                                    <p className="text-sm text-blue-600 font-medium">{busyHint}</p>
                                  ) : null}
                                  <label className="block text-sm font-medium text-gray-700">
                                    이미지 URL (줄바꿈으로 여러 장)
                                  </label>
                                  <textarea
                                    className="w-full min-h-[100px] rounded-lg border p-3 text-sm font-mono disabled:opacity-60"
                                    placeholder="https://..."
                                    value={dyn.content}
                                    disabled={isDynBusy}
                                    onChange={(e) =>
                                      setDynamicSections((prev) => ({
                                        ...prev,
                                        [key]: { ...prev[key], content: e.target.value },
                                      }))
                                    }
                                  />
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isDynBusy}
                                      onClick={async () => {
                                        setDynamicSectionPending({ key, kind: "save" });
                                        try {
                                          await persistDynamicSections(dynamicSections, sectionOrder);
                                          toast.success("갤러리를 저장했습니다.");
                                          setEditingDynamicSectionId(null);
                                        } catch (err) {
                                          console.error(err);
                                          toast.error("저장에 실패했습니다.");
                                        } finally {
                                          setDynamicSectionPending(null);
                                        }
                                      }}
                                    >
                                      저장
                                    </Button>
                                    <input
                                      id={`fed-gallery-file-${key}`}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={isDynBusy}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = "";
                                        if (!file?.type.startsWith("image/")) return;
                                        setDynamicSectionPending({ key, kind: "upload" });
                                        try {
                                          const url = await uploadDynamicSectionImage(`${key}_g`, file);
                                          const prev = String(dynamicSections[key]?.content || "").trim();
                                          const nextContent = prev ? `${prev}\n${url}` : url;
                                          const nextSections = {
                                            ...dynamicSections,
                                            [key]: { ...dynamicSections[key], content: nextContent },
                                          };
                                          setDynamicSections(nextSections);
                                          await persistDynamicSections(nextSections, sectionOrder);
                                          toast.success("이미지 URL을 추가했습니다.");
                                        } catch (err) {
                                          console.error(err);
                                          toast.error("업로드에 실패했습니다.");
                                        } finally {
                                          setDynamicSectionPending(null);
                                        }
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={isDynBusy}
                                      onClick={() =>
                                        document.getElementById(`fed-gallery-file-${key}`)?.click()
                                      }
                                    >
                                      파일에서 추가
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={isDynBusy}
                                      onClick={() => setEditingDynamicSectionId(null)}
                                    >
                                      취소
                                    </Button>
                                  </div>
                                </div>
                              ) : isDraftEditMode ? (
                                <p className="text-xs text-gray-400">「수정」을 눌러 URL을 편집하거나 파일을 추가하세요.</p>
                              ) : null}
                            </div>
                          )}
                        </SectionCard>
                      );
                    }
                    return (
      <SectionCard
        title="조직 구성"
                        canEdit={isDraftEditMode}
        onEdit={() => setModal("executives")}
        secondaryActions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
                            onClick={() => void regenerateSection("organization")}
                            disabled={regenLoading !== null}
          >
                            {regenLoading === "organization" ? "생성 중…" : "AI 다시 생성"}
          </Button>
        }
      >
                        <div className="space-y-3">
        {orgSummaryText ? (
                            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{orgSummaryText}</p>
        ) : (
                            <p className="text-gray-500">조직 운영 개요가 아직 없습니다.</p>
        )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {executives.length > 0 ? (
                              executives.map((e, i) => (
                                <div key={i} className="border rounded-xl p-4 bg-gray-50">
                                  <p className="font-semibold text-gray-900">{e.name || "이름 미정"}</p>
                                  <p className="text-sm text-gray-600">{e.role || "직책"}</p>
              </div>
                              ))
        ) : (
                              <p className="text-gray-500">임원 정보가 아직 없습니다.</p>
        )}
                          </div>
                        </div>
      </SectionCard>
                    );
                  })()
                )}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <OverlayModal
        open={aiPackageModal !== null}
        wide
        onClose={() => {
          if (aiPackageModal?.busy || aiPackageSaving) return;
          setAiPackageModal(null);
        }}
        title="AI 콘텐츠 패키지"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={aiPackageModal?.busy || aiPackageSaving}
              onClick={() => setAiPackageModal(null)}
            >
              닫기
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                !aiPackageModal || aiPackageModal.busy || aiPackageSaving || !aiPackageModal.imageUrl
              }
              onClick={() => {
                if (!aiPackageModal) return;
                void openAiPackageFlow(
                  aiPackageModal.imageSectionKey,
                  aiPackageModal.imageUrl,
                  undefined,
                  { autoApplyBest: false, forceRegenerate: true }
                );
              }}
            >
              다시 생성
            </Button>
            <Button
              type="button"
              disabled={!aiPackageModal?.pkg || aiPackageModal.busy || aiPackageSaving}
              onClick={() => void applyAiPackageSelection()}
            >
              {aiPackageSaving ? "저장 중…" : "이 후보 적용"}
            </Button>
          </>
        }
      >
        {!aiPackageModal ? null : aiPackageModal.busy ? (
          <p className="text-sm text-gray-600">이미지 분석·문안 생성 중입니다…</p>
        ) : aiPackageModal.error ? (
          <p className="text-sm text-red-600">{aiPackageModal.error}</p>
        ) : aiPackageModal.pkg ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              AI가 초안을 생성했습니다. 필요하면 수정해서 바로 사용하세요.
            </p>
            {(() => {
              const pv = aiPackageModal.pkg.variants[aiPackageModal.selectedVariantIndex];
              const useKey = (pv?.recommendedUse ?? "general_post") as RecommendedUse;
              const useLabel = RECOMMENDED_USE_LABELS[useKey] ?? String(pv?.recommendedUse ?? "");
              const reason = aiPackageModal.pkg.placementReason?.trim();
              if (!useLabel && !reason) return null;
              return (
                <div className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-sm space-y-1">
                  {useLabel ? (
                    <p className="text-amber-950">
                      <span className="font-semibold">추천 위치</span>
                      <span className="text-amber-900">: {useLabel}</span>
                    </p>
                  ) : null}
                  {reason ? (
                    <p className="text-xs text-amber-900 leading-relaxed">
                      <span className="font-semibold">이유</span>: {reason}
                    </p>
                  ) : null}
                </div>
              );
            })()}
            {aiPackageModal.pkg.variants.length === 0 ? (
              <p className="text-sm text-amber-700">생성된 후보가 없습니다. 다시 생성을 눌러 주세요.</p>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">후보 선택 (3톤)</p>
                <div className="space-y-3">
                  {aiPackageModal.pkg.variants.map((v, idx) => {
                    const selected = aiPackageModal.selectedVariantIndex === idx;
                    const useLabel =
                      RECOMMENDED_USE_LABELS[v.recommendedUse] ?? String(v.recommendedUse);
                    const conf = Math.round(Math.min(1, Math.max(0, v.confidence)) * 100);
                    return (
                      <label
                        key={`variant-${idx}`}
                        className={`flex gap-3 rounded-lg border p-3 cursor-pointer ${
                          selected ? "border-blue-500 bg-blue-50/60" : "border-gray-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="ai-variant"
                          className="mt-1 shrink-0"
                          checked={selected}
                          onChange={() =>
                            setAiPackageModal((m) =>
                              m ? { ...m, selectedVariantIndex: idx } : m
                            )
                          }
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {TONE_LABELS[v.tone] ?? v.tone}
                            </span>
                            <span className="text-xs text-gray-500">· {useLabel}</span>
                            <span className="text-xs text-gray-400">신뢰도 {conf}%</span>
                            {idx === aiPackageModal.pkg?.bestVariantIndex ? (
                              <span className="text-xs rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5">
                                추천
                              </span>
                            ) : null}
                          </div>
                          {v.title ? (
                            <p className="text-sm font-semibold text-gray-800">{v.title}</p>
                          ) : null}
                          {v.summary ? (
                            <p className="text-xs text-gray-600">{v.summary}</p>
                          ) : null}
                          {(v.tags || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(v.tags || []).map((t, ti) => (
                                <span
                                  key={`${t}-${ti}`}
                                  className="text-[11px] rounded-full bg-slate-100 text-slate-600 px-2 py-0.5"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{v.content}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-3 space-y-3 mt-4">
                  <p className="text-xs font-medium text-gray-700">적용 전 다듬기 (선택)</p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    제목·요약·본문·태그를 바꾼 뒤 「이 후보 적용」하면 사용자 수정본으로 저장됩니다. 같은 이미지 URL로는 자동
                    AI가 이 초안을 덮어쓰지 않습니다.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">제목</Label>
                    <Input
                      className="text-sm"
                      value={aiApplyDraft.title}
                      disabled={aiPackageSaving}
                      onChange={(e) =>
                        setAiApplyDraft((d) => ({ ...d, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">한 줄 요약</Label>
                    <Input
                      className="text-sm"
                      value={aiApplyDraft.summary}
                      disabled={aiPackageSaving}
                      onChange={(e) =>
                        setAiApplyDraft((d) => ({ ...d, summary: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">본문</Label>
                    <textarea
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                      value={aiApplyDraft.content}
                      disabled={aiPackageSaving}
                      onChange={(e) =>
                        setAiApplyDraft((d) => ({ ...d, content: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">태그 (쉼표로 구분)</Label>
                    <Input
                      className="text-sm font-mono"
                      value={aiApplyDraft.tagsCsv}
                      disabled={aiPackageSaving}
                      onChange={(e) =>
                        setAiApplyDraft((d) => ({ ...d, tagsCsv: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">응답을 불러오지 못했습니다.</p>
        )}
      </OverlayModal>

      <OverlayModal
        open={templateToolbarFollowUp !== null}
        onClose={() => setTemplateToolbarFollowUp(null)}
        title="페이지 템플릿 변경"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setTemplateToolbarFollowUp(null)}>
              취소
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const proposed = templateToolbarFollowUp?.proposed;
                if (!proposed) return;
                commitPageComposeTemplate(proposed);
                setTemplateToolbarFollowUp(null);
                toast.info(
                  "템플릿만 저장했습니다. Draft 레이아웃을 바꾸려면 「페이지 자동 구성」 또는 「빠른 생성(원샷)」을 실행하세요."
                );
              }}
            >
              설정만 저장
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={multiImageHttpsCount < 2 || batchOneShotUiBusy || multiImageApplying}
              onClick={() => {
                const proposed = templateToolbarFollowUp?.proposed;
                if (!proposed) return;
                commitPageComposeTemplate(proposed);
                setTemplateToolbarFollowUp(null);
                runMultiImageAutoComposePreview(proposed);
              }}
            >
              미리보기 열기
            </Button>
            <Button
              type="button"
              disabled={multiImageHttpsCount < 2 || batchOneShotUiBusy || multiImageApplying}
              onClick={() => {
                const proposed = templateToolbarFollowUp?.proposed;
                if (!proposed) return;
                commitPageComposeTemplate(proposed);
                setTemplateToolbarFollowUp(null);
                void performBatchOneShot({ trigger: "manual" });
              }}
            >
              빠른 생성 (원샷)
            </Button>
          </>
        }
      >
        {templateToolbarFollowUp ? (
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-medium text-gray-900">
                {fedPageTemplateLabel(pageComposeTemplate)}
              </span>
              <span className="text-gray-500"> → </span>
              <span className="font-medium text-gray-900">
                {fedPageTemplateLabel(templateToolbarFollowUp.proposed)}
              </span>
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              이 템플릿으로 설정만 바꿀지, 곧바로 미리보기·원샷까지 실행할지 선택하세요. 원샷은 이미지 AI를 다시 돌린 뒤 Draft에 한 번에 반영합니다.
            </p>
          </div>
        ) : null}
      </OverlayModal>

      <OverlayModal
        open={multiImageAutoModal !== null}
        onClose={() => {
          if (multiImageApplying) return;
          setMultiImageAutoModal(null);
        }}
        title="페이지 자동 구성 (AI · 초안)"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={multiImageApplying}
              onClick={() => setMultiImageAutoModal(null)}
            >
              닫기
            </Button>
            <Button
              type="button"
              disabled={multiImageApplying || !multiImageAutoModal}
              onClick={() => void applyMultiImageCompose()}
            >
              {multiImageApplying ? "저장 중…" : "Draft에 반영"}
            </Button>
          </>
        }
      >
        {multiImageAutoModal ? (
          <div className="space-y-3 text-sm text-gray-700">
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
              항상 <span className="font-medium">섹션 순서</span>는 반영합니다. 아래 옵션을 켜면{" "}
              <span className="font-medium">인사말·협회장 사진·주요 활동·이미지 캡션/메타</span>까지 Draft에 채웁니다.
              사용자가 수정한 이미지 메타(<span className="font-medium">isUserEdited</span>)는 덮어쓰지 않습니다. 저장
              실패 시 이 화면에서 바꾼 값은 되돌립니다.
            </p>
            <fieldset className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
              <legend className="px-1 text-xs font-medium text-gray-600">레이아웃 템플릿</legend>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {FED_PAGE_TEMPLATE_OPTIONS.map((opt) => (
                  <label
                    key={`modal-${opt.value}`}
                    className="flex cursor-pointer select-none items-start gap-2 text-sm text-gray-800"
                  >
                    <input
                      type="radio"
                      name={`fed-page-template-modal-${federationSlug || "x"}`}
                      className="mt-1 shrink-0"
                      checked={pageComposeTemplate === opt.value}
                      disabled={multiImageApplying}
                      onChange={() => commitPageComposeTemplate(opt.value)}
                    />
                    <span>
                      <span className="font-medium">{opt.label}</span>
                      <span className="mt-0.5 block text-xs font-normal text-gray-500">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-0.5 shrink-0"
                checked={multiImageApplyContent}
                disabled={multiImageApplying}
                onChange={(e) => setMultiImageApplyContent(e.target.checked)}
              />
              <span className="text-gray-800 leading-snug">
                콘텐츠도 함께 반영 (끄면 <span className="font-medium">위치·순서만</span>)
              </span>
            </label>
            {multiImageContentPlan?.avgConfidenceForAppliedContent !== undefined &&
            multiImageContentPlan.avgConfidenceForAppliedContent <
              FEDERATION_AUTO_CONTENT_CONFIDENCE_THRESHOLD ? (
              <p className="text-xs text-amber-900 bg-amber-100/90 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                반영 대상 문안·메타의 <span className="font-medium">평균 신뢰도(휴리스틱)가 60% 미만</span>이라, 기본값으로
                「콘텐츠도 함께 반영」을 껐습니다. 그대로 두면 순서만 저장되고, 문안까지 쓰려면 체크를 켜 주세요.
              </p>
            ) : null}
            {multiImageImpactLines.length > 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 space-y-2">
                <p className="text-xs font-semibold text-emerald-950">변경 예정 (현재 초안 대비)</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-emerald-950/90 leading-relaxed">
                  {multiImageImpactLines.map((line, i) => (
                    <li key={`impact-${i}`}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {multiImageContentPlan ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <p className="text-xs font-medium text-gray-700">자동 반영 콘텐츠 미리보기</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-gray-700 leading-relaxed">
                  {formatAutoContentPlanPreview(multiImageContentPlan).map((line, i) => (
                    <li key={`content-preview-${i}`}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">역할 배정</p>
              <ul className="list-disc pl-5 space-y-1">
                {formatAutoPageStructurePreviewLines(multiImageAutoModal).map((line, i) => (
                  <li key={`auto-line-${i}`} className="text-sm">
                    {line.replace(/^·\s*/, "")}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">제안 섹션 순서 (이미지 키)</p>
              <p className="text-xs font-mono text-gray-800 break-all">
                {multiImageAutoModal.proposedImageSectionOrder.join(" → ")}
              </p>
            </div>
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer text-gray-600">추적 맵 (섹션 키 → 역할)</summary>
              <ul className="mt-2 space-y-0.5 font-mono pl-1">
                {Object.entries(multiImageAutoModal.trace).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v.role} (추천 {v.fromRecommended})
                  </li>
                ))}
              </ul>
            </details>
          </div>
        ) : null}
      </OverlayModal>

      <PresidentEditModal
        open={modal === "president"}
        onClose={() => setModal(null)}
        initial={presidentBlock}
        saving={saving}
        onSave={async (next) => {
          setSaving(true);
          try {
            await updateFederationDraftAbout(federationSlug, {
              president: next,
              introMessage: next.message,
            });
            toast.success("저장했습니다.");
            setModal(null);
            await refreshLocal();
          } catch (e) {
            console.error(e);
            toast.error("저장에 실패했습니다.");
          } finally {
            setSaving(false);
          }
        }}
      />

      <FederationAutoGeneratePanel
        federationSlug={federationSlug}
        open={openAutoPanel}
        onClose={() => setOpenAutoPanel(false)}
        onGenerated={(data) => {
          // 전체 생성 결과도 Draft에만 병합 (sections별로)
          setSections((prev) => ({
            ...prev,
            intro: {
              ...prev.intro,
              draft: typeof (data as any)?.introMessage === "string" ? String((data as any).introMessage) : prev.intro.draft,
            },
            history: {
              ...prev.history,
              draft: typeof (data as any)?.history === "string" ? String((data as any).history) : prev.history.draft,
            },
            vision: {
              ...prev.vision,
              draft: typeof (data as any)?.vision === "string" ? String((data as any).vision) : prev.vision.draft,
            },
            activities: {
              ...prev.activities,
              draft: Array.isArray((data as any)?.activities) ? ((data as any).activities as string[]) : prev.activities.draft,
            },
            organization: {
              ...prev.organization,
              draft:
                (data as any)?.organization?.summary || Array.isArray((data as any)?.executives)
                  ? {
                      summary: String((data as any)?.organization?.summary || ""),
                      executives: Array.isArray((data as any)?.executives)
                        ? ((data as any).executives as any[]).map((e) => ({
                            name: String(e?.name || ""),
                            role: String(e?.role || ""),
                          }))
                        : prev.organization.content.executives,
                    }
                  : prev.organization.draft,
            },
          }));
        }}
        onCompleted={refreshLocal}
      />

      {/* Draft 미리보기 + 적용/버리기 */}
      {(
        sections.intro.draft ||
        sections.history.draft ||
        sections.vision.draft ||
        (Array.isArray(sections.activities.draft) && sections.activities.draft.length > 0) ||
        sections.organization.draft
      ) ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="font-bold text-gray-900">AI 생성 미리보기 (Draft)</div>
              <div className="text-xs text-gray-600">적용을 눌러야 실제로 저장/반영됩니다.</div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSections((prev) => ({
                    ...prev,
                    intro: { ...prev.intro, draft: null },
                    history: { ...prev.history, draft: null },
                    vision: { ...prev.vision, draft: null },
                    activities: { ...prev.activities, draft: null },
                    organization: { ...prev.organization, draft: null },
                  }))
                }
                disabled={saving}
              >
                버리기
              </Button>
              <Button type="button" onClick={() => void applyAllDrafts()} disabled={saving}>
                {saving ? "적용 중…" : "전체 적용"}
              </Button>
            </div>
          </div>

          {sections.intro.draft ? (
            <div className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800">협회장 인사말</div>
                <Button type="button" size="sm" variant="secondary" onClick={() => void applySectionDraft("intro")} disabled={saving}>
                  이 섹션만 적용
                </Button>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{sections.intro.draft}</div>
            </div>
          ) : null}
          {sections.history.draft ? (
            <div className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800">협회 연혁</div>
                <Button type="button" size="sm" variant="secondary" onClick={() => void applySectionDraft("history")} disabled={saving}>
                  이 섹션만 적용
                </Button>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{sections.history.draft}</div>
            </div>
          ) : null}
          {sections.vision.draft ? (
            <div className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800">협회 비전</div>
                <Button type="button" size="sm" variant="secondary" onClick={() => void applySectionDraft("vision")} disabled={saving}>
                  이 섹션만 적용
                </Button>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{sections.vision.draft}</div>
            </div>
          ) : null}
          {Array.isArray(sections.activities.draft) && sections.activities.draft.length > 0 ? (
            <div className="mb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800">주요 활동</div>
                <Button type="button" size="sm" variant="secondary" onClick={() => void applySectionDraft("activities")} disabled={saving}>
                  이 섹션만 적용
                </Button>
              </div>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {sections.activities.draft.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {sections.organization.draft?.summary ? (
            <div className="mb-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800">조직 운영 개요</div>
                <Button type="button" size="sm" variant="secondary" onClick={() => void applySectionDraft("organization")} disabled={saving}>
                  이 섹션만 적용
                </Button>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{sections.organization.draft.summary}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <HistoryEditModal
        open={modal === "history"}
        onClose={() => setModal(null)}
        federationSlug={federationSlug}
        initial={history}
        saving={saving}
        onSave={async (text) => {
          setSaving(true);
          try {
            await updateFederationDraftAbout(federationSlug, { history: text });
            toast.success("저장했습니다.");
            setModal(null);
            await refreshLocal();
          } catch (e) {
            console.error(e);
            toast.error("저장에 실패했습니다.");
          } finally {
            setSaving(false);
          }
        }}
      />

      <TextEditModal
        open={modal === "vision"}
        onClose={() => setModal(null)}
        title="협회 비전 수정"
        label="비전·목표"
        initial={vision}
        saving={saving}
        onSave={async (text) => {
          setSaving(true);
          try {
            await updateFederationDraftAbout(federationSlug, { vision: text });
            toast.success("저장했습니다.");
            setModal(null);
            await refreshLocal();
          } catch (e) {
            console.error(e);
            toast.error("저장에 실패했습니다.");
          } finally {
            setSaving(false);
          }
        }}
      />

      <ActivitiesEditModal
        open={modal === "activities"}
        onClose={() => setModal(null)}
        initial={activities}
        saving={saving}
        onSave={async (lines) => {
          setSaving(true);
          try {
            await updateFederationDraftAbout(federationSlug, { activities: lines });
            toast.success("저장했습니다.");
            setModal(null);
            await refreshLocal();
          } catch (e) {
            console.error(e);
            toast.error("저장에 실패했습니다.");
          } finally {
            setSaving(false);
          }
        }}
      />

      <ExecutivesEditModal
        open={modal === "executives"}
        onClose={() => setModal(null)}
        initial={executives}
        initialOrgSummary={federation?.organization?.summary || ""}
        saving={saving}
        onSave={async (payload) => {
          setSaving(true);
          try {
            await saveFederationOrganization(federationSlug, {
              summary: payload.organizationSummary,
              executives: payload.executives,
            });
            toast.success("조직 구성을 저장했습니다.");
            setModal(null);
            await refreshLocal();
          } catch (e) {
            console.error(e);
            toast.error("저장에 실패했습니다.");
          } finally {
            setSaving(false);
          }
        }}
      />

      <BatchAutoBuildProgress
        progress={batchBuildProgress}
        onDismissError={() => markBatchBuildIdle()}
        onCancel={() => {
          batchCancelRef.current = true;
        }}
      />
    </div>
  );
}

function PresidentEditModal({
  open,
  onClose,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: FederationPresident;
  saving: boolean;
  onSave: (v: FederationPresident) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name);
  const [message, setMessage] = useState(initial.message);
  useEffect(() => {
    if (open) {
      setName(initial.name);
      setMessage(initial.message);
    }
  }, [open, initial.name, initial.message]);

  return (
    <OverlayModal
      open={open}
      onClose={onClose}
      title="협회장 인사말 수정"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button
            type="button"
            onClick={() => onSave({ name: name.trim() || "협회장", message: message.trim() })}
            disabled={saving}
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">협회장 이름</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">인사말</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[140px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>
    </OverlayModal>
  );
}

function TextEditModal({
  open,
  onClose,
  title,
  label,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initial: string;
  saving: boolean;
  onSave: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    if (open) setText(initial);
  }, [open, initial]);

  return (
    <OverlayModal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="button" onClick={() => onSave(text.trim())} disabled={saving}>
            {saving ? "저장 중…" : "저장"}
          </Button>
        </>
      }
    >
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[160px]"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </OverlayModal>
  );
}

function ActivitiesEditModal({
  open,
  onClose,
  initial,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: string[];
  saving: boolean;
  onSave: (lines: string[]) => Promise<void>;
}) {
  const [raw, setRaw] = useState(initial.join("\n"));
  useEffect(() => {
    if (open) setRaw(initial.join("\n"));
  }, [open, initial]);

  return (
    <OverlayModal
      open={open}
      onClose={onClose}
      title="주요 활동 수정"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button
            type="button"
            onClick={() => {
              const lines = raw
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean);
              onSave(lines.length ? lines : ["주요 활동"]);
            }}
            disabled={saving}
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-500 mb-2">한 줄에 하나씩 입력하세요.</p>
      <textarea
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[160px] font-mono"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
      />
    </OverlayModal>
  );
}

function ExecutivesEditModal({
  open,
  onClose,
  initial,
  initialOrgSummary,
  saving,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: { name: string; role: string }[];
  initialOrgSummary: string;
  saving: boolean;
  onSave: (payload: {
    executives: { name: string; role: string }[];
    organizationSummary: string;
  }) => Promise<void>;
}) {
  const [rows, setRows] = useState(initial);
  const [orgSummary, setOrgSummary] = useState(initialOrgSummary);
  useEffect(() => {
    if (open) {
      setRows(initial.length ? initial : [{ name: "", role: "" }]);
      setOrgSummary(initialOrgSummary);
    }
  }, [open, initial, initialOrgSummary]);

  return (
    <OverlayModal
      open={open}
      onClose={onClose}
      title="조직 구성 수정"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSave({
                executives: rows,
                organizationSummary: orgSummary.trim(),
              })
            }
            disabled={saving}
          >
            {saving ? "저장 중…" : "저장"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">조직 운영 개요 (organization.summary)</label>
          <textarea
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
            placeholder="사무국·분과 역할 등 한두 문단으로 작성"
            value={orgSummary}
            onChange={(e) => setOrgSummary(e.target.value)}
          />
        </div>
        <p className="text-xs text-gray-500">임원 명단 (역할 · 이름)</p>
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 flex-wrap">
            <input
              placeholder="역할 (예: 사무국장)"
              className="flex-1 min-w-[120px] rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={row.role}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], role: e.target.value };
                setRows(next);
              }}
            />
            <input
              placeholder="이름"
              className="flex-1 min-w-[120px] rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              value={row.name}
              onChange={(e) => {
                const next = [...rows];
                next[i] = { ...next[i], name: e.target.value };
                setRows(next);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
            >
              삭제
            </Button>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={() => setRows([...rows, { name: "", role: "" }])}>
          행 추가
        </Button>
      </div>
    </OverlayModal>
  );
}
