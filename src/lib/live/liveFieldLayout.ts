/** 플레이 필드 레이아웃 — 호스트 meta.fieldLayoutMode 로 세션 전체 동기화 */

export type FieldLayoutMode = "landscape" | "portrait";

export type LiveFieldLayout = {
  mode: FieldLayoutMode;
  w: number;
  h: number;
  margin: number;
  goalDepth: number;
  goalMouth: number;
};

export type PortraitGoalLayout = {
  topLineY: number;
  bottomLineY: number;
  centerX: number;
  halfMouth: number;
  depth: number;
};

export type LandscapeGoalLayout = {
  leftLineX: number;
  rightLineX: number;
  centerY: number;
  halfMouth: number;
  depth: number;
};

const LANDSCAPE: LiveFieldLayout = {
  mode: "landscape",
  w: 1200,
  h: 800,
  margin: 48,
  goalDepth: 36,
  goalMouth: 200,
};

/** 세로 모바일 — margin=골라인(40), 스폰 y=120 / h-120 */
const PORTRAIT: LiveFieldLayout = {
  mode: "portrait",
  w: 400,
  h: 720,
  margin: 40,
  goalDepth: 36,
  goalMouth: 180,
};

export function getLiveFieldLayout(mode: FieldLayoutMode): LiveFieldLayout {
  return mode === "portrait" ? PORTRAIT : LANDSCAPE;
}

/** 세로 모바일(또는 좁은 뷰) → portrait 필드 */
export function detectFieldLayoutMode(viewW = window.innerWidth, viewH = window.innerHeight): FieldLayoutMode {
  const w = Math.max(1, viewW);
  const h = Math.max(1, viewH);
  if (w < 768 || h > w * 1.05) return "portrait";
  return "landscape";
}

export function getPortraitGoals(layout: LiveFieldLayout): PortraitGoalLayout {
  const { w, h, margin, goalMouth, goalDepth } = layout;
  return {
    topLineY: margin,
    bottomLineY: h - margin,
    centerX: w / 2,
    halfMouth: goalMouth / 2,
    depth: goalDepth,
  };
}

export function getLandscapeGoals(layout: LiveFieldLayout): LandscapeGoalLayout {
  const { w, h, margin, goalMouth, goalDepth } = layout;
  return {
    leftLineX: margin,
    rightLineX: w - margin,
    centerY: h / 2,
    halfMouth: goalMouth / 2,
    depth: goalDepth,
  };
}

/** portrait — HUD 패딩 vs Phaser zoom inset 분리 (하단 dead space 줄이기) */
export const PORTRAIT_CAMERA = {
  top: 70,
  /** DOM 오버레이(스코어·컨트롤) 예약 */
  hudBottom: 120,
  /** Phaser zoom만 — 필드가 컨트롤 아래까지 더 내려오게 (HUD보다 작게) */
  zoomBottom: 58,
  /** 엄지 존: 뷰포트 하단에서 px */
  controlBottom: 110,
  centerBiasY: 22,
} as const;

export function getCameraViewInsets(layout: LiveFieldLayout): {
  top: number;
  bottom: number;
  centerBiasY: number;
} {
  if (layout.mode !== "portrait") return { top: 0, bottom: 0, centerBiasY: 0 };
  return {
    top: PORTRAIT_CAMERA.top,
    bottom: PORTRAIT_CAMERA.zoomBottom,
    centerBiasY: PORTRAIT_CAMERA.centerBiasY,
  };
}

export function getPortraitHudPadding(): { top: number; bottom: number } {
  return { top: PORTRAIT_CAMERA.top, bottom: PORTRAIT_CAMERA.hudBottom };
}

export function isPortraitViewport(viewW = window.innerWidth, viewH = window.innerHeight): boolean {
  return viewH > viewW * 1.02;
}

export function shouldShowRotateOverlay(viewW = window.innerWidth, viewH = window.innerHeight): boolean {
  return viewW < 768 && !isPortraitViewport(viewW, viewH);
}

export function spawnForPlayerIndex(layout: LiveFieldLayout, index: 0 | 1): { x: number; y: number } {
  const { w, h } = layout;
  if (layout.mode === "portrait") {
    const x = w / 2;
    return index === 0 ? { x, y: h - 120 } : { x, y: 120 };
  }
  const y = h / 2;
  const { margin } = layout;
  return index === 0 ? { x: margin + 120, y } : { x: w - margin - 120, y };
}

export function defaultBallPosition(layout: LiveFieldLayout): { x: number; y: number } {
  return { x: layout.w / 2, y: layout.h / 2 };
}

const BALL_PLAY_PAD = 12;

/** 플레이 에어리어(margin 안) 안에 있는지 — 코너 (20,20) 등 잘못된 RTDB 좌표 걸러냄 */
export function isBallInPlayArea(
  ball: { x: number; y: number },
  layout: LiveFieldLayout,
): boolean {
  const { w, h, margin } = layout;
  return (
    Number.isFinite(ball.x) &&
    Number.isFinite(ball.y) &&
    ball.x >= margin + BALL_PLAY_PAD &&
    ball.x <= w - margin - BALL_PLAY_PAD &&
    ball.y >= margin + BALL_PLAY_PAD &&
    ball.y <= h - margin - BALL_PLAY_PAD
  );
}

export function sanitizeBallCoords(
  ball: { x: number; y: number; vx?: number; vy?: number },
  layout: LiveFieldLayout,
): { x: number; y: number; vx: number; vy: number } {
  if (isBallInPlayArea(ball, layout)) {
    return {
      x: ball.x,
      y: ball.y,
      vx: Number.isFinite(ball.vx) ? ball.vx! : 0,
      vy: Number.isFinite(ball.vy) ? ball.vy! : 0,
    };
  }
  const c = defaultBallPosition(layout);
  return { x: c.x, y: c.y, vx: 0, vy: 0 };
}

/** 호스트 Arcade — 사이드라인 밖이면 위치·속도 보정 (골라인 직전까지, 골망 깊이는 허용) */
export function clampBallInPlayArea(
  ball: { x: number; y: number; vx: number; vy: number },
  layout: LiveFieldLayout,
  ballRadius = 11,
  bounce = 0.82,
): { x: number; y: number; vx: number; vy: number; clamped: boolean } {
  const pad = ballRadius + 2;
  const minX = layout.margin + pad;
  const maxX = layout.w - layout.margin - pad;
  const minY = layout.margin + pad;
  const maxY = layout.h - layout.margin - pad;
  let { x, y, vx, vy } = ball;
  let clamped = false;
  if (x < minX) {
    x = minX;
    vx = Math.abs(vx) * bounce;
    clamped = true;
  } else if (x > maxX) {
    x = maxX;
    vx = -Math.abs(vx) * bounce;
    clamped = true;
  }
  if (y < minY) {
    y = minY;
    vy = Math.abs(vy) * bounce;
    clamped = true;
  } else if (y > maxY) {
    y = maxY;
    vy = -Math.abs(vy) * bounce;
    clamped = true;
  }
  return { x, y, vx, vy, clamped };
}
