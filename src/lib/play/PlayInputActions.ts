/** 플랫폼 라이브 매치 공통 조작 계약 (1v1 / 5v5 / 8v8) */

export type MoveVector = {
  x: number;
  y: number;
};

export type PlayInputActions = {
  move(dir: MoveVector): void;
  kick(): void;
  pass?(): void;
  shoot?(): void;
};
