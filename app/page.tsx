import { Dumbbell } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="flex items-center gap-3">
        <span className="h-8 w-8 rounded-md bg-amber-400 flex items-center justify-center">
          <Dumbbell size={18} className="text-neutral-950" strokeWidth={2.5} />
        </span>
        <span className="text-lg font-semibold tracking-tight text-neutral-100">
          Training
        </span>
      </div>
    </main>
  );
}
