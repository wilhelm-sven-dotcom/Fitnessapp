"use client";

import { SessionRunner } from "@/components/session/SessionRunner";

/** /workout — das laufende Training. Die ganze Logik lebt im SessionRunner;
 *  ohne startbare Einheit leitet er zurück auf die Startseite. */
export default function WorkoutPage() {
  return <SessionRunner />;
}
