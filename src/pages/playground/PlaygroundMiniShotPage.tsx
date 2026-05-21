import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { getShotGrade, getXpByGrade, type ShotGrade } from "@/lib/team/miniShotShotGrade";
import { db } from "@/lib/firebase";
import {
  FIELD,
  type GoalZoneKey,
  getBottomGoal,
  getBottomGoalMouth,
  getBottomPenaltyBox,
  getBottomSixYardBox,
  getTopGoal,
  getTopGoalMouth,
  getTopGoalZones,
  getTopPenaltyBox,
  getTopSixYardBox,
} from "@/lib/field";

type PlaygroundZone = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  path: string;
  enabled: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  markerClass: string;
};

const ZONES: PlaygroundZone[] = [
  {
    id: "training",
    title: "훈련존",
    subtitle: "미니슛 플레이 + XP 획득",
    emoji: "🏃",
    path: "/play",
    enabled: true,
    x: 42,
    y: 18,
    w: 16,
    h: 12,
    markerClass: "animate-[pulse_1.2s_ease-in-out_infinite]",
  },
  {
    id: "team",
    title: "팀존",
    subtitle: "팀 가입 / 포지션 설정",
    emoji: "👥",
    path: "/teams",
    enabled: true,
    x: 18,
    y: 50,
    w: 18,
    h: 14,
    markerClass: "animate-[bounce_1.8s_ease-in-out_infinite]",
  },
  {
    id: "matchmaking",
    title: "매칭존",
    subtitle: "5대5 경기 준비",
    emoji: "⚔️",
    path: "/matchmaking",
    enabled: true,
    x: 64,
    y: 50,
    w: 18,
    h: 14,
    markerClass: "animate-[pulse_0.9s_ease-in-out_infinite]",
  },
  {
    id: "leaderboards",
    title: "랭킹존",
    subtitle: "주간 랭킹 확인",
    emoji: "🏆",
    path: "/leaderboards",
    enabled: true,
    x: 74,
    y: 10,
    w: 16,
    h: 12,
    markerClass: "animate-[ping_1.8s_ease-in-out_infinite]",
  },
  {
    id: "rewards",
    title: "보상존",
    subtitle: "시즌 보상 수령",
    emoji: "🎁",
    path: "/rewards",
    enabled: true,
    x: 70,
    y: 74,
    w: 16,
    h: 12,
    markerClass: "animate-[bounce_1.1s_ease-in-out_infinite]",
  },
];

const TOP_GOAL = getTopGoal();
const BOTTOM_GOAL = getBottomGoal();
const TOP_GOAL_MOUTH = getTopGoalMouth();
const BOTTOM_GOAL_MOUTH = getBottomGoalMouth();
const TOP_SIX_YARD = getTopSixYardBox();
const BOTTOM_SIX_YARD = getBottomSixYardBox();
const TOP_PENALTY = getTopPenaltyBox();
const BOTTOM_PENALTY = getBottomPenaltyBox();
const TOP_GOAL_ZONES = getTopGoalZones();
const PENALTY_SPOT_Y = FIELD.TOP_GOAL_LINE_Y + FIELD.PENALTY_SPOT_OFFSET;
const KEEPER_Y = FIELD.TOP_GOAL_LINE_Y + FIELD.GK_OFFSET;
const KEEPER_X_INITIAL = 50;
const KEEPER_MOVE_PADDING = 1.6;
type GkLevel = "easy" | "normal" | "hard";
const GK_LEVEL_DEFAULT: GkLevel = "normal";
const GK_LEVEL_CONFIG = {
  easy: { reactSpeed: 0.05, saveRange: 4.5, reactionDelayMs: 300, patrolSpeed: 0.05 },
  normal: { reactSpeed: 0.08, saveRange: 3.8, reactionDelayMs: 180, patrolSpeed: 0.075 },
  hard: { reactSpeed: 0.12, saveRange: 3.2, reactionDelayMs: 80, patrolSpeed: 0.095 },
} as const;
const PLAYER_START = { ...FIELD.PLAYER_START };
const HUD_SAFE_TOP_PX = 120;
const VISUAL_GOAL_WIDTH = 22;
const VISUAL_GOAL_HEIGHT = 12;
const FIELD_LINE_PX = 2;
const PENALTY_ARC_RADIUS = 12;
const MAX_SHOTS = 10;
const HIGH_SCORE_KEY = "yago_mini_shot_high_score";
const SCORE_HISTORY_KEY = "yago_mini_shot_history";
const MINI_SHOT_LEADERBOARD_COLLECTION = "miniShotGlobalLeaderboard";
const MINI_SHOT_PLAYER_ID_KEY = "yago_mini_shot_player_id";
const MINI_SHOT_PLAYER_NAME_KEY = "yago_mini_shot_player_name";

type ScoreHistoryEntry = {
  score: number;
  bestCombo: number;
  createdAt: number;
};

type LeaderboardEntry = {
  userId: string;
  name: string;
  score: number;
  bestCombo: number;
};

function clampPercent(v: number): number {
  return Math.max(2, Math.min(98, v));
}

/**
 * 플레이어 마커는 이모지+YOU 묶음 중심이라 순수 “아래(+y)”만 두면 YOU 라벨과 겹친다.
 * 발 앞·앞발 쪽: 오른쪽(+x) + 앵커에 가깝게(작은 +y), 슛 준비는 골 쪽으로 살짝 더 당김.
 */
const BALL_DRIBBLE_OFFSET_X = 2.7;
const BALL_DRIBBLE_Y_BELOW_ANCHOR = 1;
const BALL_KICK_PREP_OFFSET_X = 3.1;
const BALL_KICK_PREP_Y_BELOW_ANCHOR = 0.35;

function ballAtFeet(player: { x: number; y: number }): { x: number; y: number } {
  return {
    x: clampPercent(player.x + BALL_DRIBBLE_OFFSET_X),
    y: clampPercent(player.y + BALL_DRIBBLE_Y_BELOW_ANCHOR),
  };
}

function ballAtKickPrep(player: { x: number; y: number }): { x: number; y: number } {
  return {
    x: clampPercent(player.x + BALL_KICK_PREP_OFFSET_X),
    y: clampPercent(player.y + BALL_KICK_PREP_Y_BELOW_ANCHOR),
  };
}

/** 퍼센트 필드에서 점 ↔ 축정렬 사각형 최단 거리 (Near Miss 판정용) */
function distancePointToRectPct(
  px: number,
  py: number,
  rect: { left: number; top: number; width: number; height: number }
): number {
  const cx = Math.max(rect.left, Math.min(px, rect.left + rect.width));
  const cy = Math.max(rect.top, Math.min(py, rect.top + rect.height));
  return Math.hypot(px - cx, py - cy);
}

const NEAR_MISS_GOAL_DIST = 7.4;

function getPowerColorByDistance(distance: number): string {
  if (distance < 10) return "#22c55e";
  if (distance < 20) return "#eab308";
  return "#ef4444";
}

function getComboMultiplier(perfectCombo: number): number {
  if (perfectCombo >= 4) return 2.0;
  if (perfectCombo === 3) return 1.5;
  if (perfectCombo === 2) return 1.2;
  return 1.0;
}

function getShareText(score: number, bestCombo: number, isNewBest: boolean): string {
  return `⚽ YAGO 슛 챌린지\n${isNewBest ? "🆕 NEW BEST!\n" : ""}🔥 ${score}점 달성!\n💥 콤보 x${bestCombo}\n\n너도 도전해봐!`;
}

function playTone(
  ctx: AudioContext,
  {
    freq,
    duration,
    type = "sine",
    gain = 0.05,
    endFreq,
  }: { freq: number; duration: number; type?: OscillatorType; gain?: number; endFreq?: number }
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
  }
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export default function PlaygroundMiniShotPage() {
  const navigate = useNavigate();
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [enteringZoneId, setEnteringZoneId] = useState<string | null>(null);
  const [playerPos, setPlayerPos] = useState(PLAYER_START);
  const [playerTargetPos, setPlayerTargetPos] = useState(PLAYER_START);
  const playerPosRef = useRef(PLAYER_START);
  playerPosRef.current = playerPos;
  const [ballPos, setBallPos] = useState(() => ballAtFeet(PLAYER_START));
  const [ballVel, setBallVel] = useState({ x: 0, y: 0 });
  const [xp, setXp] = useState(0);
  const [lastGrade, setLastGrade] = useState<ShotGrade | null>(null);
  const [lastGoalZone, setLastGoalZone] = useState<GoalZoneKey | null>(null);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [comboTime, setComboTime] = useState(100);
  const [shotsLeft, setShotsLeft] = useState(MAX_SHOTS);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [history, setHistory] = useState<ScoreHistoryEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [timeScale, setTimeScale] = useState(1);
  const [screenPulse, setScreenPulse] = useState(false);
  const [perfectFx, setPerfectFx] = useState(false);
  /** 킥 순간 공 스케일 (타격감) */
  const [ballKickScale, setBallKickScale] = useState(1);
  /** 킥 순간 플레이어 위로 살짝 반동 (px) */
  const [playerKickNudgePx, setPlayerKickNudgePx] = useState(0);
  /** 공 비행 궤적 잔상 (퍼센트 좌표) */
  const [ballTrail, setBallTrail] = useState<Array<{ x: number; y: number }>>([]);
  /** PERFECT 짧은 화면 흔들림 */
  const [screenShake, setScreenShake] = useState<{ x: number; y: number } | null>(null);
  /** 골포스트 충돌 스파크 */
  const [postSparks, setPostSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);
  /** 골인 순간 골망 반응 */
  const [goalNetFx, setGoalNetFx] = useState(false);
  /** 세이브 순간 GK 살짝 확대 */
  const [keeperImpactScale, setKeeperImpactScale] = useState(1);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragNow, setDragNow] = useState<{ x: number; y: number } | null>(null);
  /** true면 공이 플레이어 발 앞에 붙음; 드래그 시작 시 false → 슛 후 다시 true */
  const [isDribbling, setIsDribbling] = useState(true);
  const isDribblingRef = useRef(true);
  const dragActiveRef = useRef(false);
  const [keeperX, setKeeperX] = useState(KEEPER_X_INITIAL);
  const keeperPrevXRef = useRef(keeperX);
  const [gkKeeperSliding, setGkKeeperSliding] = useState(false);
  const [keeperState, setKeeperState] = useState<"idle" | "diveLeft" | "diveRight">("idle");
  const [level, setLevel] = useState<GkLevel>(GK_LEVEL_DEFAULT);
  const [soundOn, setSoundOn] = useState(true);
  const navigationLockRef = useRef(false);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const shotActiveRef = useRef(false);
  const keeperDirectionRef = useRef<1 | -1>(1);
  const shotStartedAtRef = useRef(0);
  const keeperRecoverTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playerIdRef = useRef<string>("");
  const ballPosRef = useRef(ballPos);
  const ballVelRef = useRef(ballVel);
  const timeScaleRef = useRef(timeScale);
  const soundOnRef = useRef(soundOn);
  const lastPostClangMsRef = useRef(0);
  const sparkSeqRef = useRef(0);
  const saveHitstopTimerRef = useRef<number | null>(null);
  const metalClangRef = useRef<() => void>(() => {});
  ballPosRef.current = ballPos;
  ballVelRef.current = ballVel;
  timeScaleRef.current = timeScale;
  soundOnRef.current = soundOn;
  dragActiveRef.current = dragStart !== null;

  const activeZone = useMemo(() => ZONES.find((zone) => zone.id === activeZoneId) ?? null, [activeZoneId]);
  const gkConfig = useMemo(() => GK_LEVEL_CONFIG[level], [level]);
  const score = useMemo(() => xp + bestCombo * 30, [xp, bestCombo]);
  const isMyEntry = (entryUserId: string) => playerId.length > 0 && entryUserId === playerId;

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setPlayerPos((prev) => {
        const nx = prev.x + (playerTargetPos.x - prev.x) * 0.18;
        const ny = prev.y + (playerTargetPos.y - prev.y) * 0.18;
        if (Math.hypot(playerTargetPos.x - nx, playerTargetPos.y - ny) < 0.08) {
          return playerTargetPos;
        }
        return { x: nx, y: ny };
      });
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [playerTargetPos.x, playerTargetPos.y]);

  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const ts = timeScaleRef.current;

      if (isDribblingRef.current) {
        shotActiveRef.current = false;
        const next = ballAtFeet(playerPosRef.current);
        ballVelRef.current = { x: 0, y: 0 };
        const ox = ballPosRef.current.x;
        const oy = ballPosRef.current.y;
        if (Math.abs(ox - next.x) > 0.012 || Math.abs(oy - next.y) > 0.012) {
          ballPosRef.current = next;
          setBallPos(next);
          setBallVel({ x: 0, y: 0 });
        }
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      let vx = ballVelRef.current.x;
      let vy = ballVelRef.current.y;
      const px = ballPosRef.current.x;
      const py = ballPosRef.current.y;
      const speed = Math.hypot(vx, vy);

      if (speed < 0.03) {
        /* 슛 준비 중(드래그)에는 공을 발밑으로 스냅하지 않음 */
        if (dragActiveRef.current) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }
        shotActiveRef.current = false;
        isDribblingRef.current = true;
        setIsDribbling(true);
        const feet = ballAtFeet(playerPosRef.current);
        ballVelRef.current = { x: 0, y: 0 };
        ballPosRef.current = feet;
        setBallPos(feet);
        setBallVel({ x: 0, y: 0 });
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      let nx = px + vx * ts;
      let ny = py + vy * ts;

      if (nx <= 2 || nx >= 98) {
        vx = -vx * 0.72;
        nx = clampPercent(nx);
      }
      if (ny >= 98) {
        vx *= 0.88;
        vy = -Math.abs(vy) * 0.58;
        ny = 98;
      }

      const mouth = TOP_GOAL_MOUTH;
      const gTop = mouth.top;
      const gBot = mouth.top + mouth.height;
      const gLeft = mouth.left;
      const gRight = mouth.left + mouth.width;

      if (shotActiveRef.current) {
        const yBand = ny >= gTop - 0.55 && ny <= gBot + 0.55;
        if (yBand) {
          if (px >= gLeft && nx < gLeft - 0.06) {
            nx = gLeft + 0.48;
            vx = Math.abs(vx) * 0.62 + 0.018;
            vy *= 0.78;
            const now = Date.now();
            if (now - lastPostClangMsRef.current > 88 && soundOnRef.current) {
              lastPostClangMsRef.current = now;
              metalClangRef.current();
            }
            const sid = ++sparkSeqRef.current;
            setPostSparks((s) => [...s.slice(-10), { id: sid, x: nx, y: ny }]);
            window.setTimeout(() => setPostSparks((s) => s.filter((p) => p.id !== sid)), 420);
          } else if (px <= gRight && nx > gRight + 0.06) {
            nx = gRight - 0.48;
            vx = -Math.abs(vx) * 0.62 - 0.018;
            vy *= 0.78;
            const now = Date.now();
            if (now - lastPostClangMsRef.current > 88 && soundOnRef.current) {
              lastPostClangMsRef.current = now;
              metalClangRef.current();
            }
            const sid = ++sparkSeqRef.current;
            setPostSparks((s) => [...s.slice(-10), { id: sid, x: nx, y: ny }]);
            window.setTimeout(() => setPostSparks((s) => s.filter((p) => p.id !== sid)), 420);
          }
        }
        if (vy < 0 && py > gBot + 0.15 && ny <= gBot + 0.35 && (nx < gLeft || nx > gRight)) {
          ny = gBot + 0.48;
          vx *= 0.62;
          vy = Math.abs(vy) * 0.55;
          const now = Date.now();
          if (now - lastPostClangMsRef.current > 88 && soundOnRef.current) {
            lastPostClangMsRef.current = now;
            metalClangRef.current();
          }
          const sid = ++sparkSeqRef.current;
          setPostSparks((s) => [...s.slice(-10), { id: sid, x: nx, y: ny }]);
          window.setTimeout(() => setPostSparks((s) => s.filter((p) => p.id !== sid)), 420);
        }
      }

      vx *= 1 - 0.012 * ts;
      vy = vy * (1 - 0.014 * ts) + 0.0036 * ts;

      ballVelRef.current = { x: vx, y: vy };
      ballPosRef.current = { x: clampPercent(nx), y: clampPercent(ny) };
      setBallPos(ballPosRef.current);
      setBallVel(ballVelRef.current);

      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const speed = Math.hypot(ballVel.x, ballVel.y);
    if (speed < 0.035) {
      setBallTrail([]);
      return;
    }
    setBallTrail((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.hypot(last.x - ballPos.x, last.y - ballPos.y) < 0.28) {
        return prev;
      }
      const next = [...prev, { x: ballPos.x, y: ballPos.y }];
      return next.length > 14 ? next.slice(-14) : next;
    });
  }, [ballPos.x, ballPos.y, ballVel.x, ballVel.y]);

  useEffect(() => {
    const minX = TOP_GOAL_MOUTH.left + KEEPER_MOVE_PADDING;
    const maxX = TOP_GOAL_MOUTH.left + TOP_GOAL_MOUTH.width - KEEPER_MOVE_PADDING;
    let rafId = 0;
    const tick = () => {
      setKeeperX((prev) => {
        const isShotActive = shotActiveRef.current;
        if (isShotActive && Date.now() - shotStartedAtRef.current >= gkConfig.reactionDelayMs) {
          const predictedX = clampPercent(ballPos.x + ballVel.x * 8);
          const targetX = Math.max(minX, Math.min(maxX, predictedX));
          const diff = targetX - prev;
          if (Math.abs(diff) < gkConfig.reactSpeed) return targetX;
          return prev + Math.sign(diff) * gkConfig.reactSpeed;
        }

        let next = prev + keeperDirectionRef.current * gkConfig.patrolSpeed;
        if (next <= minX || next >= maxX) {
          keeperDirectionRef.current = next <= minX ? 1 : -1;
          next = Math.max(minX, Math.min(maxX, next));
        }
        return next;
      });
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [ballPos.x, ballVel.x, gkConfig.patrolSpeed, gkConfig.reactSpeed, gkConfig.reactionDelayMs]);

  useEffect(() => {
    const prev = keeperPrevXRef.current;
    keeperPrevXRef.current = keeperX;
    const delta = Math.abs(keeperX - prev);
    setGkKeeperSliding(delta > 0.012);
  }, [keeperX]);

  useEffect(() => {
    setKeeperState("idle");
    shotStartedAtRef.current = 0;
    setFeedbackText(`🎚️ ${level.toUpperCase()} MODE`);
    const timer = window.setTimeout(() => setFeedbackText(null), 650);
    return () => window.clearTimeout(timer);
  }, [level]);

  useEffect(() => {
    return () => {
      if (keeperRecoverTimerRef.current) {
        window.clearTimeout(keeperRecoverTimerRef.current);
      }
      if (saveHitstopTimerRef.current) {
        window.clearTimeout(saveHitstopTimerRef.current);
      }
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(HIGH_SCORE_KEY);
    if (!saved) return;
    const parsed = Number(saved);
    if (Number.isFinite(parsed) && parsed > 0) {
      setHighScore(parsed);
    }
  }, []);

  useEffect(() => {
    let playerId = window.localStorage.getItem(MINI_SHOT_PLAYER_ID_KEY) ?? "";
    if (!playerId) {
      const rnd = Math.random().toString(36).slice(2, 8);
      playerId = `guest_${rnd}`;
      window.localStorage.setItem(MINI_SHOT_PLAYER_ID_KEY, playerId);
    }
    playerIdRef.current = playerId;
    setPlayerId(playerId);
    const savedName = window.localStorage.getItem(MINI_SHOT_PLAYER_NAME_KEY) ?? "";
    setPlayerName(savedName || playerId);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(SCORE_HISTORY_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as ScoreHistoryEntry[];
      if (Array.isArray(parsed)) {
        setHistory(parsed.slice(0, 5));
      }
    } catch {
      // ignore broken history payload
    }
  }, []);

  useEffect(() => {
    if (score <= highScore) return;
    setHighScore(score);
    setIsNewBest(true);
    window.localStorage.setItem(HIGH_SCORE_KEY, String(score));
  }, [highScore, score]);

  useEffect(() => {
    if (!gameOver) return;
    const entry: ScoreHistoryEntry = {
      score,
      bestCombo,
      createdAt: Date.now(),
    };
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 5);
      window.localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, [bestCombo, gameOver, score]);

  useEffect(() => {
    if (!gameOver) return;
    const uid = playerIdRef.current;
    if (!uid) return;

    const computeRank = async () => {
      try {
        const col = collection(db, MINI_SHOT_LEADERBOARD_COLLECTION);
        const strictlyHigherQ = query(col, where("score", ">", score));
        const sameScoreBetterComboQ = query(
          col,
          where("score", "==", score),
          where("bestCombo", ">", bestCombo)
        );

        const [strictlyHigherAgg, sameScoreBetterComboAgg] = await Promise.all([
          getCountFromServer(strictlyHigherQ),
          getCountFromServer(sameScoreBetterComboQ),
        ]);
        const exactRank = strictlyHigherAgg.data().count + sameScoreBetterComboAgg.data().count + 1;
        setMyRank(exactRank);
      } catch (error) {
        // Fallback: only with loaded top10 entries
        const higherCount = leaderboard.filter(
          (entry) => entry.score > score || (entry.score === score && entry.bestCombo > bestCombo)
        ).length;
        setMyRank(higherCount + 1);
        console.error("my rank count failed", error);
      }
    };

    void computeRank();
  }, [bestCombo, gameOver, leaderboard, score]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const q = query(
          collection(db, MINI_SHOT_LEADERBOARD_COLLECTION),
          orderBy("score", "desc"),
          orderBy("bestCombo", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        const rows: LeaderboardEntry[] = snap.docs.map((d) => {
          const data = d.data() as Partial<LeaderboardEntry>;
          return {
            userId: d.id,
            name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : d.id,
            score: typeof data.score === "number" ? data.score : 0,
            bestCombo: typeof data.bestCombo === "number" ? data.bestCombo : 0,
          };
        });
        setLeaderboard(rows);
      } catch (error) {
        console.error("leaderboard load failed", error);
      }
    };
    void loadLeaderboard();
  }, [gameOver]);

  useEffect(() => {
    if (!gameOver) return;
    const playerId = playerIdRef.current;
    if (!playerId) return;
    const pushScore = async () => {
      try {
        await setDoc(
          doc(db, MINI_SHOT_LEADERBOARD_COLLECTION, playerId),
          {
            name: playerName.trim() || playerId,
            score,
            bestCombo,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        const q = query(
          collection(db, MINI_SHOT_LEADERBOARD_COLLECTION),
          orderBy("score", "desc"),
          orderBy("bestCombo", "desc"),
          limit(10)
        );
        const snap = await getDocs(q);
        const rows: LeaderboardEntry[] = snap.docs.map((d) => {
          const data = d.data() as Partial<LeaderboardEntry>;
          return {
            userId: d.id,
            name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : d.id,
            score: typeof data.score === "number" ? data.score : 0,
            bestCombo: typeof data.bestCombo === "number" ? data.bestCombo : 0,
          };
        });
        setLeaderboard(rows);
      } catch (error) {
        console.error("leaderboard save failed", error);
      }
    };
    void pushScore();
  }, [bestCombo, gameOver, playerName, score]);

  const ensureAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new window.AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  metalClangRef.current = () => {
    if (!soundOnRef.current) return;
    const ctx = ensureAudioContext();
    playTone(ctx, { freq: 960, endFreq: 180, duration: 0.072, type: "square", gain: 0.052 });
  };

  const playKickSound = () => {
    if (!soundOn) return;
    const ctx = ensureAudioContext();
    playTone(ctx, { freq: 220, endFreq: 120, duration: 0.08, type: "triangle", gain: 0.06 });
  };

  const playSaveSound = () => {
    if (!soundOn) return;
    const ctx = ensureAudioContext();
    playTone(ctx, { freq: 520, endFreq: 200, duration: 0.12, type: "square", gain: 0.05 });
  };

  const playGoalSound = (isPerfect: boolean) => {
    if (!soundOn) return;
    const ctx = ensureAudioContext();
    if (isPerfect) {
      playTone(ctx, { freq: 440, endFreq: 700, duration: 0.12, type: "sawtooth", gain: 0.06 });
      window.setTimeout(
        () => playTone(ctx, { freq: 660, endFreq: 920, duration: 0.14, type: "sawtooth", gain: 0.055 }),
        70
      );
      return;
    }
    playTone(ctx, { freq: 360, endFreq: 520, duration: 0.11, type: "triangle", gain: 0.045 });
  };

  useEffect(() => {
    if (combo <= 0) {
      setComboTime(100);
      return;
    }
    const timer = window.setInterval(() => {
      setComboTime((prev) => {
        if (prev <= 2) {
          setCombo(0);
          return 100;
        }
        return prev - 2;
      });
    }, 80);
    return () => window.clearInterval(timer);
  }, [combo]);

  useEffect(() => {
    const miss =
      shotActiveRef.current &&
      (ballPos.y <= 2 || (Math.hypot(ballVel.x, ballVel.y) < 0.05 && ballPos.y < TOP_GOAL_MOUTH.top + 10));
    if (!miss) return;
    setLastGrade("MISS");
    setCombo(0);
    setComboTime(100);
    const closeDist = distancePointToRectPct(ballPos.x, ballPos.y, TOP_GOAL_MOUTH);
    const isNearMiss = closeDist < NEAR_MISS_GOAL_DIST;
    if (isNearMiss) {
      setFeedbackText("😱 CLOSE! 한 끗 차이");
      setScreenShake({
        x: (Math.random() - 0.5) * 5,
        y: (Math.random() - 0.5) * 4,
      });
      window.setTimeout(() => setScreenShake(null), 165);
      if (soundOnRef.current) {
        const ctx = ensureAudioContext();
        playTone(ctx, { freq: 200, endFreq: 95, duration: 0.09, type: "sine", gain: 0.038 });
      }
      window.setTimeout(() => setFeedbackText(null), 820);
    } else {
      setFeedbackText("❌ MISS +0 XP");
      window.setTimeout(() => setFeedbackText(null), 650);
    }
    shotActiveRef.current = false;
  }, [ballPos.x, ballPos.y, ballVel.x, ballVel.y]);

  /** 마지막 슛(남은 1발) — 낮은 심박 비트 */
  useEffect(() => {
    if (shotsLeft !== 1 || gameOver) return;
    const id = window.setInterval(() => {
      if (!soundOnRef.current) return;
      const ctx = ensureAudioContext();
      playTone(ctx, { freq: 56, duration: 0.052, type: "sine", gain: 0.024 });
    }, 760);
    return () => window.clearInterval(id);
  }, [shotsLeft, gameOver]);

  useEffect(() => {
    if (!shotActiveRef.current) return;
    const inGoal =
      ballPos.x >= TOP_GOAL_MOUTH.left &&
      ballPos.x <= TOP_GOAL_MOUTH.left + TOP_GOAL_MOUTH.width &&
      ballPos.y >= TOP_GOAL_MOUTH.top &&
      ballPos.y <= TOP_GOAL_MOUTH.top + TOP_GOAL_MOUTH.height;
    if (!inGoal) return;
    const centerX = TOP_GOAL_MOUTH.left + TOP_GOAL_MOUTH.width / 2;
    const centerY = TOP_GOAL_MOUTH.top + TOP_GOAL_MOUTH.height / 2;
    const distance = Math.hypot(ballPos.x - centerX, ballPos.y - centerY) * 5.5;
    const hitZone =
      TOP_GOAL_ZONES.find(
        (zone) =>
          ballPos.x >= zone.left &&
          ballPos.x <= zone.left + zone.width &&
          ballPos.y >= zone.top &&
          ballPos.y <= zone.top + zone.height
      )?.key ?? "CENTER";
    const savedByKeeper =
      Math.abs(ballPos.x - keeperX) <= gkConfig.saveRange && ballPos.y <= TOP_SIX_YARD.top + TOP_SIX_YARD.height;
    if (savedByKeeper) {
      playSaveSound();
      setKeeperState(ballPos.x < keeperX ? "diveLeft" : "diveRight");
      setKeeperImpactScale(1.16);
      window.setTimeout(() => setKeeperImpactScale(1), 120);
      setTimeScale(0.2);
      if (saveHitstopTimerRef.current) window.clearTimeout(saveHitstopTimerRef.current);
      saveHitstopTimerRef.current = window.setTimeout(() => {
        setTimeScale(1);
        saveHitstopTimerRef.current = null;
      }, 60);
      if (keeperRecoverTimerRef.current) {
        window.clearTimeout(keeperRecoverTimerRef.current);
      }
      keeperRecoverTimerRef.current = window.setTimeout(() => setKeeperState("idle"), 220);
      setLastGrade("MISS");
      setLastGoalZone(null);
      setCombo(0);
      setComboTime(100);
      setFeedbackText("🧤 SAVE!");
      window.setTimeout(() => setFeedbackText(null), 700);
      setBallVel({ x: 0, y: 0 });
      isDribblingRef.current = true;
      setIsDribbling(true);
      setBallPos(ballAtFeet(playerPosRef.current));
      shotActiveRef.current = false;
      ballVelRef.current = { x: 0, y: 0 };
      ballPosRef.current = ballAtFeet(playerPosRef.current);
      return;
    }
    const grade = getShotGrade(distance);
    setGoalNetFx(true);
    window.setTimeout(() => setGoalNetFx(false), 420);
    playGoalSound(grade === "PERFECT");
    const nextCombo = grade === "PERFECT" ? combo + 1 : 0;
    const comboMultiplier = getComboMultiplier(nextCombo);
    const zoneBonus = hitZone === "CENTER" ? 0 : 5;
    const gainXp = Math.round((getXpByGrade(grade) + zoneBonus) * comboMultiplier);
    setLastGrade(grade);
    setLastGoalZone(hitZone);
    setXp((prev) => prev + gainXp);
    setCombo(nextCombo);
    setBestCombo((prev) => Math.max(prev, nextCombo));
    setComboTime(100);
    if (grade === "PERFECT") {
      setTimeScale(0.3);
      setScreenPulse(true);
      setPerfectFx(true);
      setScreenShake({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 6,
      });
      window.setTimeout(() => setTimeScale(1), 180);
      window.setTimeout(() => setScreenPulse(false), 210);
      window.setTimeout(() => setPerfectFx(false), 240);
      window.setTimeout(() => setScreenShake(null), 220);
    }
    setFeedbackText(
      grade === "PERFECT"
        ? `🔥 PERFECT${nextCombo > 1 ? ` x${nextCombo}` : ""} +${gainXp} XP`
        : grade === "GOOD"
          ? `👍 GOOD +${gainXp} XP`
          : `🙂 OK +${gainXp} XP`
    );
    window.setTimeout(() => setFeedbackText(null), 700);
    isDribblingRef.current = true;
    setIsDribbling(true);
    setBallVel({ x: 0, y: 0 });
    setBallPos(ballAtFeet(playerPosRef.current));
    shotActiveRef.current = false;
    ballVelRef.current = { x: 0, y: 0 };
    ballPosRef.current = ballAtFeet(playerPosRef.current);
  }, [ballPos.x, ballPos.y, combo, keeperX, gkConfig.saveRange, soundOn]);

  const toFieldPoint = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: clampPercent(x), y: clampPercent(y) };
  };

  const handleFieldPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameOver) return;
    const p = toFieldPoint(e.clientX, e.clientY);
    if (!p) return;
    const bp = ballPosRef.current;
    const nearBall = Math.hypot(p.x - bp.x, p.y - bp.y) < 8;
    if (!nearBall) return;
    dragActiveRef.current = true;
    isDribblingRef.current = false;
    setIsDribbling(false);
    const prep = ballAtKickPrep(playerPosRef.current);
    ballVelRef.current = { x: 0, y: 0 };
    ballPosRef.current = prep;
    setBallVel({ x: 0, y: 0 });
    setBallPos(prep);
    setDragStart(p);
    setDragNow(p);
  };

  const handleFieldPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameOver) return;
    if (!dragStart) return;
    const p = toFieldPoint(e.clientX, e.clientY);
    if (!p) return;
    setDragNow(p);
  };

  const handleFieldPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameOver) return;
    if (!dragStart) return;
    dragActiveRef.current = false;
    const p = toFieldPoint(e.clientX, e.clientY);
    if (!p) {
      setDragStart(null);
      setDragNow(null);
      isDribblingRef.current = true;
      setIsDribbling(true);
      const feet = ballAtFeet(playerPosRef.current);
      ballVelRef.current = { x: 0, y: 0 };
      ballPosRef.current = feet;
      setBallVel({ x: 0, y: 0 });
      setBallPos(feet);
      return;
    }
    const dx = dragStart.x - p.x;
    const dy = dragStart.y - p.y;
    const dragLen = Math.hypot(dx, dy);
    if (dragLen < 1.5) {
      setDragStart(null);
      setDragNow(null);
      isDribblingRef.current = true;
      setIsDribbling(true);
      const feet = ballAtFeet(playerPosRef.current);
      ballVelRef.current = { x: 0, y: 0 };
      ballPosRef.current = feet;
      setBallVel({ x: 0, y: 0 });
      setBallPos(feet);
      return;
    }
    const dirX = dx / dragLen;
    const dirY = dy / dragLen;
    const normPower = Math.min(1, dragLen / 22);
    const easedPower = 0.28 + Math.pow(normPower, 0.82) * 1.62;
    const jitter = 0.02;
    const vx = dirX * easedPower + (Math.random() * 2 - 1) * jitter;
    const vy = dirY * easedPower + (Math.random() * 2 - 1) * jitter * 0.8;
    playKickSound();
    setBallKickScale(1.2);
    window.setTimeout(() => setBallKickScale(1), 80);
    setPlayerKickNudgePx(-6);
    window.setTimeout(() => setPlayerKickNudgePx(0), 100);
    setShotsLeft((prev) => {
      const next = Math.max(0, prev - 1);
      if (next <= 0) {
        setGameOver(true);
      }
      return next;
    });
    setBallVel({ x: vx, y: vy });
    ballVelRef.current = { x: vx, y: vy };
    shotActiveRef.current = true;
    shotStartedAtRef.current = Date.now();
    setFeedbackText(null);
    setDragStart(null);
    setDragNow(null);
  };

  const isInProximity = useMemo(() => {
    if (!activeZone) return false;
    const centerX = activeZone.x + activeZone.w / 2;
    const centerY = activeZone.y + activeZone.h / 2;
    return Math.hypot(playerPos.x - centerX, playerPos.y - centerY) < 2.8;
  }, [activeZone, playerPos.x, playerPos.y]);

  useEffect(() => {
    if (!activeZone || !isInProximity) {
      setEnteringZoneId(null);
      return;
    }
    setEnteringZoneId(activeZone.id);
    const timer = window.setTimeout(() => {
      if (navigationLockRef.current) return;
      navigationLockRef.current = true;
      navigate(activeZone.path);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [activeZone, isInProximity, navigate]);

  const handleZoneFocus = (zone: PlaygroundZone) => {
    setActiveZoneId(zone.id);
    setPlayerTargetPos({ x: zone.x + zone.w / 2, y: zone.y + zone.h / 2 });
  };
  const penaltyArcLineY = TOP_PENALTY.top + TOP_PENALTY.height;
  const penaltyArcDy = penaltyArcLineY - PENALTY_SPOT_Y;
  const penaltyArcHalfChord = Math.sqrt(Math.max(0, PENALTY_ARC_RADIUS ** 2 - penaltyArcDy ** 2));
  const penaltyArcHeight = PENALTY_SPOT_Y + PENALTY_ARC_RADIUS - penaltyArcLineY;
  const dragDistance = dragStart && dragNow ? Math.hypot(dragNow.x - dragStart.x, dragNow.y - dragStart.y) : 0;
  const dragPowerRatio = Math.min(1, dragDistance / 22);
  const dragPowerPercent = Math.round(dragPowerRatio * 100);
  const dragPowerColor = getPowerColorByDistance(dragDistance);
  const isPlayerDragging = Boolean(dragStart && dragNow);
  const playerAimDx =
    dragStart && dragNow ? dragStart.x - dragNow.x : 0;
  const playerFaceScaleX = playerAimDx < 0 ? -1 : 1;
  const resetGame = () => {
    setXp(0);
    setCombo(0);
    setBestCombo(0);
    setComboTime(100);
    setShotsLeft(MAX_SHOTS);
    setGameOver(false);
    setMyRank(null);
    setIsNewBest(false);
    setLastGrade(null);
    setLastGoalZone(null);
    isDribblingRef.current = true;
    setIsDribbling(true);
    setBallVel({ x: 0, y: 0 });
    setBallPos(ballAtFeet(playerPosRef.current));
    ballVelRef.current = { x: 0, y: 0 };
    ballPosRef.current = ballAtFeet(playerPosRef.current);
    setFeedbackText("🔁 RETRY!");
    window.setTimeout(() => setFeedbackText(null), 550);
  };
  const handleShare = async () => {
    const text = getShareText(score, bestCombo, isNewBest);
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "YAGO 슛 게임",
          text,
          url: shareUrl,
        });
        return;
      }

      const copyPayload = `${text}\n${shareUrl}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyPayload);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = copyPayload;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setFeedbackText("📋 공유 문구가 복사됐어요!");
      window.setTimeout(() => setFeedbackText(null), 900);
    } catch (error) {
      setFeedbackText("⚠️ 공유에 실패했어요");
      window.setTimeout(() => setFeedbackText(null), 900);
      console.error("share failed", error);
    }
  };

  const miniFieldShellClass = `absolute bottom-0 left-0 right-0 mx-auto w-full max-w-md duration-200 ${
    perfectFx ? "scale-[1.02]" : "scale-100"
  } ${screenShake ? "" : "transition-transform"}`;
  const miniFieldShellStyle = {
    top: HUD_SAFE_TOP_PX,
    transform: screenShake
      ? `translate(${screenShake.x}px, ${screenShake.y}px) scale(${perfectFx ? 1.02 : 1})`
      : undefined,
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#0f2f19]">
      <style>{`
        @keyframes miniCornerWave {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes miniNetRipple {
          0% { transform: perspective(200px) rotateX(55deg) scale(1); opacity: 1; }
          35% { transform: perspective(200px) rotateX(52deg) scale(1.06); opacity: 0.92; }
          70% { transform: perspective(200px) rotateX(56deg) scale(0.98); opacity: 1; }
          100% { transform: perspective(200px) rotateX(55deg) scale(1); opacity: 1; }
        }
        @keyframes miniGkArmUpDown {
          0% { transform: translateY(-2px); }
          50% { transform: translateY(4px); }
          100% { transform: translateY(-2px); }
        }
        .mini-gk {
          position: relative;
          display: inline-block;
          filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
        }
        .mini-gk-body {
          display: block;
          font-size: 30px;
          line-height: 1;
          user-select: none;
          text-align: center;
        }
        .mini-gk-arm {
          position: absolute;
          top: 12px;
          width: 4px;
          height: 10px;
          border-radius: 2px;
          background: #fff;
          pointer-events: none;
          opacity: 1;
          transition: opacity 0.15s ease-out;
        }
        .mini-gk--moving .mini-gk-arm {
          opacity: 0.5;
        }
        .mini-gk-arm-left {
          left: -6px;
          animation: miniGkArmUpDown 0.6s ease-in-out infinite;
        }
        .mini-gk-arm-right {
          right: -6px;
          animation: miniGkArmUpDown 0.6s ease-in-out infinite reverse;
        }
        .mini-gk--diveLeft .mini-gk-arm,
        .mini-gk--diveRight .mini-gk-arm {
          animation: none;
        }
        .mini-gk--diveLeft .mini-gk-arm-left {
          transform: translateY(-6px);
        }
        .mini-gk--diveRight .mini-gk-arm-right {
          transform: translateY(-6px);
        }
        @keyframes miniPlayerRun {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0px); }
        }
        .mini-player-emoji {
          display: inline-block;
          font-size: 36px;
          line-height: 1;
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.7));
          animation: miniPlayerRun 0.6s ease-in-out infinite;
        }
        .mini-player-emoji--no-anim {
          animation: none;
        }
      `}</style>
      <section
        ref={fieldRef}
        className={`${miniFieldShellClass} touch-none z-0`}
        style={miniFieldShellStyle}
        data-mini-shot-dribbling={isDribbling ? "1" : "0"}
        onPointerDown={handleFieldPointerDown}
        onPointerMove={handleFieldPointerMove}
        onPointerUp={handleFieldPointerUp}
        onPointerCancel={() => {
          dragActiveRef.current = false;
          setDragStart(null);
          setDragNow(null);
          isDribblingRef.current = true;
          setIsDribbling(true);
          const feet = ballAtFeet(playerPosRef.current);
          ballVelRef.current = { x: 0, y: 0 };
          ballPosRef.current = feet;
          setBallVel({ x: 0, y: 0 });
          setBallPos(feet);
        }}
      >
        <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,#2e7d32_0%,#1b5e20_100%)]" />
        {screenPulse ? (
          <div className="pointer-events-none absolute inset-0 z-40 animate-[ping_0.22s_ease-out_1] bg-white/20" />
        ) : null}
        {perfectFx ? (
          <div className="pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(circle_at_50%_45%,rgba(253,224,71,0.35),rgba(255,255,255,0.06)_36%,transparent_70%)]" />
        ) : null}
        {shotsLeft === 1 && !gameOver ? (
          <div
            className="pointer-events-none absolute inset-0 z-[12] mix-blend-multiply"
            style={{
              background:
                "radial-gradient(ellipse 85% 55% at 50% 22%, rgba(120,20,20,0.28), rgba(50,0,0,0.1) 42%, transparent 68%)",
            }}
            aria-hidden
          />
        ) : null}
        {/* 필드 외곽 라인 */}
        <div
          className="pointer-events-none absolute left-0 top-0 z-[4] h-full w-[2px]"
          style={{ background: "rgba(255,255,255,0.35)", boxShadow: "0 0 4px rgba(255,255,255,0.2)" }}
        />
        <div
          className="pointer-events-none absolute right-0 top-0 z-[4] h-full w-[2px]"
          style={{ background: "rgba(255,255,255,0.35)", boxShadow: "0 0 4px rgba(255,255,255,0.2)" }}
        />
        <div
          className="pointer-events-none absolute left-0 top-0 z-[4] h-[2px] w-full"
          style={{ background: "rgba(255,255,255,0.35)", boxShadow: "0 0 4px rgba(255,255,255,0.2)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 z-[4] h-[2px] w-full"
          style={{ background: "rgba(255,255,255,0.35)", boxShadow: "0 0 4px rgba(255,255,255,0.2)" }}
        />
        {/* 상단 코너 깃발 */}
        <div
          className="pointer-events-none absolute z-[25]"
          style={{
            top: `-${FIELD_LINE_PX}px`,
            left: `-${FIELD_LINE_PX}px`,
            transform: "translate(0, 0)",
          }}
          aria-hidden
        >
          <div
            style={{
              position: "absolute",
              width: "2px",
              height: "14px",
              background: "white",
              top: "0",
              left: "0",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "10px",
              height: "6px",
              background: "#ff4d4d",
              top: "0",
              left: "2px",
              clipPath: "polygon(0 0, 100% 50%, 0 100%)",
              transformOrigin: "left center",
              animation: "miniCornerWave 1.2s infinite ease-in-out",
            }}
          />
        </div>
        <div
          className="pointer-events-none absolute z-[25]"
          style={{
            top: `-${FIELD_LINE_PX}px`,
            right: `-${FIELD_LINE_PX}px`,
            transform: "translate(0, 0)",
          }}
          aria-hidden
        >
          <div
            style={{
              position: "absolute",
              width: "2px",
              height: "14px",
              background: "white",
              top: "0",
              right: "0",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "10px",
              height: "6px",
              background: "#ff4d4d",
              top: "0",
              right: "2px",
              clipPath: "polygon(100% 0, 0 50%, 100% 100%)",
              transformOrigin: "right center",
              animation: "miniCornerWave 1.2s infinite ease-in-out",
            }}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 z-[1] opacity-20 [background-size:40px_40px] [background-image:repeating-linear-gradient(to_bottom,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_2px,transparent_2px,transparent_40px)]" />
        <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.12),transparent_38%)]" />
        <div
          className="pointer-events-none absolute left-0 z-[5] h-[2px] w-full bg-white/35"
          style={{ top: `${FIELD.LOWER_THIRD_Y}%` }}
        />
        <div
          className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30"
          style={{
            left: "50%",
            top: `${FIELD.LOWER_THIRD_Y}%`,
            width: "34%",
            aspectRatio: "1 / 1",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute z-[6] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70"
          style={{ left: "50%", top: `${FIELD.LOWER_THIRD_Y}%` }}
        />
        {/* 🥅 상단 3D 골대 오브젝트 */}
        <div
          className="pointer-events-none absolute z-20"
          style={{
            top: `${FIELD.TOP_GOAL_LINE_Y}%`,
            left: "50%",
            transform: "translate(-50%, -100%)",
            width: `${VISUAL_GOAL_WIDTH}%`,
            height: `${VISUAL_GOAL_HEIGHT}%`,
            overflow: "visible",
          }}
          aria-hidden
        >
          {/* 골망 컨테이너 (사선 입체) — 골인 시 흔들림 */}
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "10%",
              width: "80%",
              height: "70%",
              borderRadius: "4px",
              transform: "perspective(200px) rotateX(55deg)",
              transformOrigin: "bottom",
              animation: goalNetFx ? "miniNetRipple 0.45s ease-out 1" : undefined,
            }}
          >
            {/* 뒤 면 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "4px",
              }}
            />
            {/* 그물 */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)",
                backgroundSize: "8px 8px",
                borderRadius: "4px",
                opacity: goalNetFx ? 0.88 : 1,
                transition: "opacity 0.2s ease",
              }}
            />
            {/* 좌측 사선 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "2px",
                height: "100%",
                background: "rgba(255,255,255,0.25)",
                transform: "skewY(20deg)",
                transformOrigin: "top",
              }}
            />
            {/* 우측 사선 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "2px",
                height: "100%",
                background: "rgba(255,255,255,0.25)",
                transform: "skewY(-20deg)",
                transformOrigin: "top",
              }}
            />
          </div>

          {/* 앞 프레임 (골라인) */}
          <div
            style={{
              position: "absolute",
              bottom: "0%",
              left: "0%",
              width: "100%",
              height: "55%",
              border: "2px solid rgba(255,255,255,0.9)",
              borderRadius: "4px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
          />

          {/* 좌측 깊이 연결 */}
          <div
            style={{
              position: "absolute",
              bottom: "0%",
              left: "0%",
              width: "10%",
              height: "55%",
              borderLeft: "2px solid rgba(255,255,255,0.5)",
              borderTop: "2px solid rgba(255,255,255,0.5)",
            }}
          />

          {/* 우측 깊이 연결 */}
          <div
            style={{
              position: "absolute",
              bottom: "0%",
              right: "0%",
              width: "10%",
              height: "55%",
              borderRight: "2px solid rgba(255,255,255,0.5)",
              borderTop: "2px solid rgba(255,255,255,0.5)",
            }}
          />
        </div>
        {/* 상단 골대 3분할 타겟존 (시각 가이드) */}
        {TOP_GOAL_ZONES.map((zone) => (
          <div
            key={`target-zone-${zone.key}`}
            className="pointer-events-none absolute z-[18]"
            style={{
              left: `${zone.left}%`,
              top: `${zone.top}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`,
              border: "1px dashed rgba(255,255,255,0.32)",
              background: "rgba(255,255,255,0.03)",
            }}
            aria-hidden
          />
        ))}
        {/* 상단 골대 기준 박스 라인 */}
        <div
          className="pointer-events-none absolute z-[8]"
          style={{
            left: `${TOP_PENALTY.left}%`,
            top: `${TOP_PENALTY.top}%`,
            width: `${TOP_PENALTY.width}%`,
            height: `${TOP_PENALTY.height}%`,
            border: "2px solid rgba(255,255,255,0.34)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute z-[9]"
          style={{
            left: `${TOP_SIX_YARD.left}%`,
            top: `${TOP_SIX_YARD.top}%`,
            width: `${TOP_SIX_YARD.width}%`,
            height: `${TOP_SIX_YARD.height}%`,
            border: "2px solid rgba(255,255,255,0.5)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute z-[10] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85"
          style={{ left: "50%", top: `${PENALTY_SPOT_Y}%` }}
          aria-hidden
        />
        {penaltyArcHalfChord > 0 && penaltyArcHeight > 0 ? (
          <svg
            className="pointer-events-none absolute z-[8]"
            style={{
              left: `${50 - penaltyArcHalfChord}%`,
              top: `${penaltyArcLineY}%`,
              width: `${penaltyArcHalfChord * 2}%`,
              height: `${penaltyArcHeight}%`,
            }}
            viewBox={`0 0 ${penaltyArcHalfChord * 2} ${penaltyArcHeight}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d={`M 0 0 A ${PENALTY_ARC_RADIUS} ${PENALTY_ARC_RADIUS} 0 0 0 ${penaltyArcHalfChord * 2} 0`}
              fill="none"
              stroke="rgba(255,255,255,0.34)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : null}
        <div
          className="pointer-events-none absolute z-[25] transition-all duration-150"
          style={{
            left: `${keeperX}%`,
            top: `${KEEPER_Y}%`,
            transform:
              keeperState === "diveLeft"
                ? `translate(-65%, -50%) scale(${1.08 * keeperImpactScale}) rotate(-8deg)`
                : keeperState === "diveRight"
                  ? `translate(-35%, -50%) scale(${1.08 * keeperImpactScale}) rotate(8deg)`
                  : `translate(-50%, -50%) scale(${keeperImpactScale})`,
          }}
          aria-hidden
          title="골키퍼"
        >
          <div
            className={`mini-gk mini-gk--${keeperState}${
              keeperState === "idle" && gkKeeperSliding ? " mini-gk--moving" : ""
            }`}
          >
            <div className="mini-gk-body">🧍</div>
            <div className="mini-gk-arm mini-gk-arm-left" aria-hidden />
            <div className="mini-gk-arm mini-gk-arm-right" aria-hidden />
          </div>
        </div>

        {ZONES.map((zone) => (
          <button
            key={zone.id}
            type="button"
            disabled={!zone.enabled}
            onMouseEnter={() => handleZoneFocus(zone)}
            onFocus={() => handleZoneFocus(zone)}
            onClick={() => {
              if (!navigationLockRef.current) {
                navigationLockRef.current = true;
                navigate(zone.path);
              }
            }}
            className={`absolute z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[32px] shadow-none transition ${
              activeZoneId === zone.id
                ? "scale-110 border-transparent bg-white/5 ring-0"
                : "border-transparent bg-transparent hover:scale-105"
            } disabled:cursor-not-allowed disabled:opacity-60`}
            style={{
              left: `${zone.x + zone.w / 2}%`,
              top: `${zone.y + zone.h / 2}%`,
            }}
            aria-label={`${zone.title} 진입`}
          >
            <span
              aria-hidden
              className={
                activeZoneId === zone.id && isInProximity
                  ? "animate-[bounce_0.6s_ease-in-out_infinite] opacity-100 [filter:drop-shadow(0_0_8px_rgba(255,255,255,0.5))]"
                  : `${zone.markerClass} opacity-70 [filter:drop-shadow(0_0_6px_rgba(255,255,255,0.28))]`
              }
            >
              {zone.emoji}
            </span>
          </button>
        ))}

        <div
          className="pointer-events-none absolute z-[20] flex flex-col items-center"
          style={{
            left: `${playerPos.x}%`,
            top: `${playerPos.y}%`,
            transform: `translate(-50%, calc(-50% + ${playerKickNudgePx}px))`,
            transition: "transform 85ms ease-out",
          }}
        >
          <div
            className="inline-flex items-center justify-center"
            style={{ transform: `scaleX(${playerFaceScaleX})` }}
            aria-hidden
          >
            <span className="inline-block origin-center" style={{ transform: "rotate(45deg)" }}>
              <span
                className={`mini-player-emoji${isPlayerDragging ? " mini-player-emoji--no-anim" : ""}`}
              >
                🏃
              </span>
            </span>
          </div>
          <span className="mt-[18px] select-none text-[10px] font-black uppercase tracking-[0.5px] text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
            YOU
          </span>
        </div>
        {postSparks.map((s) => (
          <div
            key={s.id}
            className="pointer-events-none absolute z-[19] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(253,224,71,0.55) 42%, transparent 72%)",
              boxShadow: "0 0 12px rgba(253,224,71,0.75)",
              opacity: 0.9,
            }}
            aria-hidden
          />
        ))}
        {ballTrail.length > 1 ? (
          <svg className="pointer-events-none absolute inset-0 z-[19] h-full w-full overflow-visible">
            <defs>
              <filter id="miniShotTrailBlur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" />
              </filter>
            </defs>
            {ballTrail.slice(0, -1).map((p, i, arr) => {
              const t = arr.length > 1 ? i / (arr.length - 1) : 1;
              const opacity = 0.12 + t * 0.38;
              return (
                <circle
                  key={`${p.x.toFixed(2)}-${p.y.toFixed(2)}-${i}`}
                  cx={`${p.x}%`}
                  cy={`${p.y}%`}
                  r={5 + t * 2.5}
                  fill="rgba(255,255,255,0.35)"
                  fillOpacity={opacity}
                  filter="url(#miniShotTrailBlur)"
                />
              );
            })}
          </svg>
        ) : null}
        {dragStart && dragNow ? (
          <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full">
            <line
              x1={`${playerPos.x}%`}
              y1={`${playerPos.y}%`}
              x2={`${ballPos.x}%`}
              y2={`${ballPos.y}%`}
              stroke="rgba(255,255,255,0.42)"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <line
              x1={`${dragStart.x}%`}
              y1={`${dragStart.y}%`}
              x2={`${dragNow.x}%`}
              y2={`${dragNow.y}%`}
              stroke={dragPowerColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="6 4"
            />
            <circle cx={`${dragNow.x}%`} cy={`${dragNow.y}%`} r="5" fill={dragPowerColor} fillOpacity="0.95" />
          </svg>
        ) : null}
        {dragStart && dragNow ? (
          <div
            className="pointer-events-none absolute z-20 w-20 -translate-x-1/2 rounded-md border border-white/25 bg-black/55 p-1.5"
            style={{ left: `${dragStart.x}%`, top: `${dragStart.y + 4.5}%` }}
          >
            <div className="h-1.5 w-full overflow-hidden rounded bg-white/20">
              <div
                className="h-full rounded transition-[width] duration-75"
                style={{ width: `${dragPowerPercent}%`, backgroundColor: dragPowerColor }}
              />
            </div>
            <p className="mt-1 text-center text-[10px] font-black text-white">{dragPowerPercent}%</p>
          </div>
        ) : null}

        {enteringZoneId && isInProximity ? (
          <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-900/85 px-4 py-1 text-xs font-bold text-white">
            {ZONES.find((z) => z.id === enteringZoneId)?.title} 근접 진입 중...
          </p>
        ) : null}
        {combo > 0 ? (
          <div className="pointer-events-none absolute left-1/2 top-[118px] z-30 w-44 -translate-x-1/2">
            <p className="text-center text-xs font-black text-orange-300">🔥 COMBO x{combo}</p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-orange-400 transition-[width] duration-75"
                style={{ width: `${comboTime}%` }}
              />
            </div>
          </div>
        ) : null}
        {activeZone ? (
          <div className="pointer-events-none absolute left-1/2 top-[76px] z-20 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-center text-white backdrop-blur-sm">
            <p className="text-sm font-black">
              {activeZone.emoji} {activeZone.title}
            </p>
            <p className="text-xs text-white/85">{activeZone.subtitle}</p>
          </div>
        ) : null}
        {feedbackText ? (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
            <p
              className={`rounded-xl border bg-black/70 px-5 py-2 font-black shadow-xl ${
                feedbackText.includes("PERFECT")
                  ? "animate-[pulse_0.22s_ease-in-out_3] border-yellow-200/85 text-2xl text-yellow-200"
                  : "animate-[bounce_0.35s_ease-in-out_2] border-amber-200/70 text-lg text-amber-100"
              }`}
            >
              {feedbackText}
            </p>
          </div>
        ) : null}
      </section>

      <header className="absolute left-0 right-0 top-0 z-[120] bg-gradient-to-b from-black/55 to-transparent px-3 pb-2 pt-3">
        <div className="flex items-center justify-between rounded-xl border border-white/15 bg-black/20 px-3 py-2 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"
        >
          ← 뒤로
        </button>
        <h1 className="text-sm font-black text-white">⚽ YAGO 운동장</h1>
        <div className="text-[11px] font-bold text-emerald-100">
          SCORE {score} · XP {xp} · COMBO {combo}
        </div>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1 px-1 text-[11px] font-bold text-yellow-100">
          <span>
            🏆 BEST {highScore} · SHOTS {shotsLeft}
          </span>
          {shotsLeft === 1 && !gameOver ? (
            <span className="font-black text-red-300 [text-shadow:0_0_12px_rgba(220,50,50,0.6)] animate-pulse">
              마지막 슛!
            </span>
          ) : null}
        </p>
        <div className="mt-1 flex items-center justify-end gap-1.5 px-1">
          {(["easy", "normal", "hard"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLevel(option)}
              className={`rounded-md px-2 py-1 text-[10px] font-black tracking-wide transition ${
                level === option ? "bg-white text-slate-900" : "bg-white/20 text-white/90 hover:bg-white/30"
              }`}
            >
              {option[0].toUpperCase()}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setFeedbackText(next ? "🔊 SOUND ON" : "🔇 SOUND OFF");
              window.setTimeout(() => setFeedbackText(null), 650);
            }}
            className="rounded-md bg-white/20 px-2 py-1 text-[10px] font-black text-white/90 transition hover:bg-white/30"
            aria-label={soundOn ? "사운드 끄기" : "사운드 켜기"}
            title={soundOn ? "사운드 끄기" : "사운드 켜기"}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
        </div>
        <p className="mt-1 px-1 text-[11px] font-semibold text-emerald-100/95">
          연습 모드 ON · 공을 드래그해서 슛 · 존 포커스로 이동/근접 진입
        </p>
        {lastGoalZone ? (
          <p className="mt-0.5 px-1 text-[11px] font-bold text-cyan-100">
            TARGET ZONE: {lastGoalZone}
          </p>
        ) : null}
      </header>
      {lastGrade ? (
        <section className="absolute left-3 right-3 top-[86px] z-[120] rounded-lg border border-white/15 bg-black/20 px-3 py-1.5 backdrop-blur-sm">
          <p className="text-[11px] font-black text-amber-100">
            {lastGrade === "PERFECT" && "🔥 PERFECT +30XP"}
            {lastGrade === "GOOD" && "👍 GOOD +20XP"}
            {lastGrade === "OK" && "🙂 OK +10XP"}
            {lastGrade === "MISS" && "❌ MISS +0XP"}
          </p>
        </section>
      ) : null}
      {gameOver ? (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-xs rounded-2xl border border-white/20 bg-slate-950/90 p-5 text-center text-white shadow-2xl">
            <p className="text-2xl font-black">GAME OVER</p>
            {isNewBest ? <p className="mt-1 text-sm font-black text-yellow-300 animate-pulse">🆕 NEW BEST!</p> : null}
            <p className="mt-3 text-sm font-bold text-emerald-100">SCORE {score}</p>
            <p className="mt-1 text-xs font-semibold text-yellow-100">🏆 BEST {highScore}</p>
            <p className="mt-1 text-xs font-semibold text-orange-100">🔥 BEST COMBO x{bestCombo}</p>
            <div className="mt-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left">
              <p className="text-[11px] font-black text-white/90">RECENT 5</p>
              {history.length > 0 ? (
                history.map((entry) => (
                  <p key={entry.createdAt} className="mt-1 text-[11px] font-semibold text-white/80">
                    {entry.score} / x{entry.bestCombo}
                  </p>
                ))
              ) : (
                <p className="mt-1 text-[11px] font-semibold text-white/60">기록 없음</p>
              )}
            </div>
            <div className="mt-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left">
              <p className="text-[11px] font-black text-white/90">🏆 TOP 10</p>
              {leaderboard.length > 0 ? (
                leaderboard.map((entry, idx) => (
                  <p
                    key={`${entry.userId}-${idx}`}
                    className={`mt-1 text-[11px] font-semibold ${
                      isMyEntry(entry.userId) ? "font-black text-yellow-300" : "text-white/80"
                    }`}
                  >
                    {idx + 1}. {entry.name} · {entry.score} / x{entry.bestCombo}
                  </p>
                ))
              ) : (
                <p className="mt-1 text-[11px] font-semibold text-white/60">랭킹 로딩 중...</p>
              )}
            </div>
            {myRank ? (
              <p className="mt-3 text-center text-xs font-semibold text-white/85">
                🙋 내 순위 <span className="font-black text-yellow-300">#{myRank}</span>
              </p>
            ) : null}
            <div className="mt-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left">
              <p className="text-[11px] font-black text-white/90">닉네임</p>
              <input
                value={playerName}
                maxLength={16}
                onChange={(e) => setPlayerName(e.target.value)}
                onBlur={() => {
                  const trimmed = playerName.trim();
                  const safeName = trimmed || playerId || "guest";
                  setPlayerName(safeName);
                  window.localStorage.setItem(MINI_SHOT_PLAYER_NAME_KEY, safeName);
                }}
                className="mt-1 w-full rounded-md border border-white/25 bg-black/40 px-2 py-1 text-xs font-semibold text-white outline-none"
                placeholder="닉네임 입력"
              />
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="mt-3 w-full rounded-lg bg-yellow-400 px-3 py-2 text-sm font-black text-slate-900"
            >
              📤 공유하기
            </button>
            <button
              type="button"
              onClick={resetGame}
              className="mt-4 w-full rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-900"
            >
              RETRY
            </button>
          </div>
        </div>
      ) : null}

      {/* 필드 section과 형제 — 상단 골 기준 공은 플레이어보다 위(y 작음)에 두었고, z로 필드 위에만 얹음 */}
      <div
        className={`${miniFieldShellClass} pointer-events-none`}
        style={{
          ...miniFieldShellStyle,
          zIndex: 100,
          isolation: "isolate",
        }}
        aria-hidden
      >
        <div
          className="pointer-events-none absolute select-none text-[22px] leading-none"
          style={{
            left: `${ballPos.x}%`,
            top: `${ballPos.y}%`,
            transform: `translate3d(-50%, -50%, 0) scale(${ballKickScale})`,
            transition: "transform 75ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          aria-hidden
        >
          ⚽
        </div>
      </div>
    </div>
  );
}
