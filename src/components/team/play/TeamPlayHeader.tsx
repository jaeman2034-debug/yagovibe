import { Gamepad2 } from "lucide-react";

export function TeamPlayHeader({ teamName }: { teamName: string }) {
  return (
    <header className="mb-1">
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
        <Gamepad2 className="h-3.5 w-3.5" aria-hidden />
        Play Lounge
      </div>
      <h1 className="mt-2 bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-2xl font-black tracking-tight text-transparent sm:text-3xl">
        {teamName}
      </h1>
      <p className="mt-1 text-[11px] text-slate-500">매치 찾기 또는 운동장으로 바로 플레이</p>
    </header>
  );
}
