"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { WarmupPlayer } from "@/components/warmup/WarmupPlayer";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { warmupFor } from "@/lib/warmup";

export default function WarmupPage() {
  const params = useParams();
  const key = Array.isArray(params.key) ? params.key[0] : params.key;
  const router = useRouter();
  const { settings, sessionTemplate } = useTraining();
  const tpl = sessionTemplate(key ?? "");

  if (!tpl) {
    return (
      <div>
        <p className="text-muted">Einheit nicht gefunden.</p>
        <Pressable
          onClick={() => router.push("/")}
          className="mt-3 flex items-center gap-1 text-sm text-accent-ink focus:outline-none"
        >
          <ArrowLeft size={16} /> Zur Startseite
        </Pressable>
      </div>
    );
  }

  return (
    <WarmupPlayer
      drills={warmupFor(tpl, { bike: settings.bikeWarmup })}
      voiceOn={!!settings.voiceCues}
      onClose={() => {
        // A deep link / SW reload may have no history — back() would leave the PWA.
        if (window.history.length > 1) router.back();
        else router.push(`/workout/${key}`);
      }}
    />
  );
}
