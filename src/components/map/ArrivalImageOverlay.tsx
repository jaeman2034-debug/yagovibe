/**
 * 🔥 ARRIVED 상태: 도착 배경 이미지 오버레이 (보조 역할)
 * 
 * 원칙:
 * - 목적지 정보 카드 아래 레이어 (z-index: 400)
 * - 지도를 가리지 않음 (opacity: 0.2)
 * - 분위기/감정 보조 역할만
 * - 정보 전달 역할 아님
 */

type Props = {
  imageUrl?: string; // 향후 장소 이미지 URL (옵션)
};

export default function ArrivalImageOverlay({ imageUrl }: Props) {
  // 🔥 향후 이미지 URL이 있으면 사용, 없으면 그라데이션 배경
  const backgroundStyle = imageUrl
    ? {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {
        // 기본 그라데이션 (도착 감정 표현)
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(26, 115, 232, 0.1) 100%)',
      };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0, // 전체 화면
        zIndex: 400, // 🔥 레이어 우선순위: Header(1000) > Voice(900) > NavigationCard(800) > ArrivalImageOverlay(400) > Map(0)
        opacity: 0.2, // 🔥 보조 정보 (지도를 가리지 않음)
        pointerEvents: 'none', // 🔥 클릭 불가 (보조 정보)
        ...backgroundStyle,
      }}
      aria-hidden="true" // 스크린 리더에서 무시
    />
  );
}
