"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EASE_OUT } from "@/lib/motion";

export default function StravaCallbackPage() {
  const router = useRouter();
  const { strava } = useTraining();
  const [msg, setMsg] = useState("Verbinde mit Strava…");
  const [done, setDone] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      setMsg(
        error === "access_denied"
          ? "Zugriff abgelehnt — du kannst es jederzeit erneut versuchen."
          : "Kein Code von Strava erhalten.",
      );
      setDone(true);
      const t = setTimeout(() => router.replace("/settings"), 2600);
      return () => clearTimeout(t);
    }

    let timer: ReturnType<typeof setTimeout>;
    void (async () => {
      const r = await strava.connect(code);
      setMsg(
        r.ok
          ? "Verbunden! Deine Fahrten werden geladen…"
          : `Fehler: ${r.error ?? "unbekannt"}`,
      );
      setDone(true);
      timer = setTimeout(() => router.replace("/settings"), r.ok ? 1300 : 3000);
    })();
    return () => clearTimeout(timer);
  }, [strava, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="relative flex h-24 w-24 items-center justify-center"
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, var(--accent) 0%, rgba(0,0,0,0) 70%)",
            opacity: 0.35,
          }}
        />
        <motion.span
          animate={done ? { rotate: 0 } : { rotate: 360 }}
          transition={
            done
              ? { duration: 0.3 }
              : { duration: 1.1, repeat: Infinity, ease: "linear" }
          }
        >
          <BrandMark size={56} className="rounded-2xl" />
        </motion.span>
      </motion.div>
      <p className="mt-6 max-w-xs text-sm leading-relaxed text-muted">{msg}</p>
    </div>
  );
}
