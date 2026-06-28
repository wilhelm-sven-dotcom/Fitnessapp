"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { WarmupPlayer } from "@/components/warmup/WarmupPlayer";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { TEMPLATE } from "@/lib/exercises";
import { warmupFor } from "@/lib/warmup";

export default function WarmupPage() {
  const params = useParams();
  const key = Array.isArray(params.key) ? params.key[0] : params.key;
  const router = useRouter();
  const { settings } = useTraining();
  const tpl = TEMPLATE.find((t) => t.key === key);

  if (!tpl) {
    return (
      <div>
        <p className="text-neutral-400">Einheit nicht gefunden.</p>
        <Pressable
          onClick={() => router.push("/")}
          className="mt-3 flex items-center gap-1 text-sm text-accent-sessions focus:outline-none"
        >
          <ArrowLeft size={16} /> Zur Startseite
        </Pressable>
      </div>
    );
  }

  return (
    <WarmupPlayer
      drills={warmupFor(tpl)}
      voiceOn={!!settings.voiceCues}
      onClose={() => router.back()}
    />
  );
}
