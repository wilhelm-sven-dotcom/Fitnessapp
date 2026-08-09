import type Anthropic from "@anthropic-ai/sdk";

/**
 * Gemeinsamer Text-Stream für die ATLAS-Endpunkte (Chat, Debrief, Rapport):
 * Text-Deltas als plain text durchreichen, Abbruch sauber weitergeben,
 * Fehler als freundliche Zeile statt als kaputter Stream.
 */
export function textStreamResponse(stream: {
  [Symbol.asyncIterator](): AsyncIterator<Anthropic.MessageStreamEvent>;
  abort: () => void;
}): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(
          encoder.encode("\n\n(ATLAS war kurz nicht erreichbar — versuch es gleich nochmal.)"),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
