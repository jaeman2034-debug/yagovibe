const rawBase = import.meta.env.BASE_URL ?? "/";
const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;
/** UI·PWA 단일 소스: `public/icons/icon-maskable-512.png` */
const LOGO_SRC = `${base}icons/icon-maskable-512.png`;

export type LogoProps = {
  /** 픽셀 단위 가로·세로 (미주면 className의 w-/h-만 사용) */
  size?: number;
  className?: string;
  alt?: string;
};

export default function Logo({ size, className = "", alt = "YAGO" }: LogoProps) {
  const dim = size != null ? { width: size, height: size } : undefined;
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      {...(dim ?? {})}
      className={`object-contain ${className}`.trim()}
      draggable={false}
    />
  );
}
