"use client";

import { createContext, useContext } from "react";

/**
 * "Booted" = the splash overlay has lifted and the app shell is actually visible.
 * The home VolumeGauge subscribes to this so its sweep starts only once the user
 * can see it (on a cold open the page mounts *under* the splash, so a mount-time
 * animation would finish unseen). On in-app navigation `booted` is already true,
 * so the sweep plays immediately. Provided by AppShell.
 */
export const BootedContext = createContext(false);

export const useBooted = () => useContext(BootedContext);
