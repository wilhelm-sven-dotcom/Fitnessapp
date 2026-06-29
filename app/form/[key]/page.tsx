"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { CameraView } from "@/components/form-check/CameraView";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";

export default function FormPage() {
  const params = useParams();
  const key = Array.isArray(params.key) ? params.key[0] : params.key;
  const router = useRouter();
  const { allLib, settings } = useTraining();
  const ex = allLib.find((e) => e.id === key);

  if (!ex) {
    return (
      <div>
        <p className="text-muted">Übung nicht gefunden.</p>
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
    <CameraView
      exerciseName={ex.name}
      pattern={ex.pattern}
      voiceOn={!!settings.voiceCues}
      onClose={() => router.back()}
    />
  );
}
