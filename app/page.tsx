"use client";

import { ChevronRight, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { TEMPLATE } from "@/lib/exercises";

export default function HomePage() {
  const router = useRouter();
  const { recTpl, recList, activeKey, lastLabel, startSession, seeDoctor } =
    useTraining();
  const tags = [...new Set(recList.map(({ ex }) => ex.tag))];
  const activeName = TEMPLATE.find((t) => t.key === activeKey)?.name;

  const start = (key: string) => {
    startSession(key);
    router.push(`/workout/${key}`);
  };

  return (
    <div>
      <p className="mb-1 text-2xl font-semibold tracking-tight">Servus.</p>
      <p className="mb-6 text-sm text-neutral-500">{lastLabel}.</p>

      {seeDoctor && (
        <div className="mb-4 rounded-2xl bg-rose-950 p-4">
          <p className="text-sm font-medium text-rose-200">
            Rücken zweimal in Folge gereizt
          </p>
          <p className="mt-1 text-xs leading-relaxed text-rose-300">
            Nimm das ernst — sprich mit Arzt oder Physio, bevor du wieder schwer
            trainierst. Heute lieber nur Stabis und Mobilität.
          </p>
        </div>
      )}

      {activeKey && (
        <Pressable
          onClick={() => router.push(`/workout/${activeKey}`)}
          className="mb-4 flex w-full items-center justify-between rounded-2xl bg-amber-950 px-4 py-3 text-left focus:outline-none"
        >
          <span className="text-sm text-amber-300">Einheit läuft · {activeName}</span>
          <span className="flex items-center gap-1 text-sm font-medium text-amber-300">
            Fortsetzen <ChevronRight size={16} />
          </span>
        </Pressable>
      )}

      <div className="mb-5 rounded-3xl bg-neutral-900 p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-amber-400">
          Empfohlen heute
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">{recTpl.name}</h2>
        <p className="mb-4 text-neutral-400">{recTpl.focus}</p>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-lg bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
            >
              {t}
            </span>
          ))}
        </div>
        <Pressable
          onClick={() => start(recTpl.key)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-4 text-lg font-semibold text-neutral-950 focus:outline-none"
        >
          <Play size={18} strokeWidth={2.5} /> Training starten
        </Pressable>
      </div>

      <p className="mb-2 px-1 text-xs text-neutral-500">Oder andere Einheit</p>
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATE.map((t) => (
          <Pressable
            key={t.key}
            onClick={() => start(t.key)}
            className="rounded-2xl bg-neutral-900 px-3 py-3 text-left focus:outline-none"
          >
            <span
              className={
                t.key === recTpl.key
                  ? "font-mono text-xs text-amber-400"
                  : "font-mono text-xs text-neutral-500"
              }
            >
              {t.key}
            </span>
            <p className="mt-1 text-sm font-medium leading-tight">{t.focus}</p>
          </Pressable>
        ))}
      </div>
    </div>
  );
}
