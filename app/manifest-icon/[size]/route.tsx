import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/icon-art";

export const runtime = "edge";

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const s = (await params).size === "512" ? 512 : 192;
  return new ImageResponse(iconArt(s), { width: s, height: s });
}
