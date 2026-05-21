import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreateHeaderProps {
  title: string;
}

export function CreateHeader({ title }: CreateHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className="sticky z-20 bg-white/95 backdrop-blur border-b border-gray-200"
      style={{ top: "calc(var(--header-h, 56px) + env(safe-area-inset-top, 0px))" }}
    >
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">{title}</h1>
      </div>
    </header>
  );
}

