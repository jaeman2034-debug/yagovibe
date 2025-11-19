import { useEffect } from "react";

type MarketToastProps = {
  message: string;
  onClose: () => void;
};

export default function MarketToast({ message, onClose }: MarketToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fadeIn rounded-xl bg-gray-900 px-5 py-3 text-white shadow-lg">
      {message}
    </div>
  );
}

