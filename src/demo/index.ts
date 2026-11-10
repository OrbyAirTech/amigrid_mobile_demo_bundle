import { API_URL, CHAT_URL, DEMO } from '@/config/env';
import { handleChat, onChatEvent, startChatScript } from './chat';
import { handleCore, type Call, type Reply } from './core';

/**
 * Demo mode: the app talks to an in-memory copy of both servers, so it runs from `npx expo start` in Expo Go with
 * no backend, no accounts and no native build. It works by answering `fetch` calls to the Core and chat base URLs
 * in the servers' real wire format (tokens in headers, `status: false` bodies, 202 for queued messages), so every
 * screen runs its normal code path. Set EXPO_PUBLIC_DEMO=0 in `.env` to talk to real servers again.
 */

export { DEMO };

let latency: [number, number] = [140, 380];
export const setDemoLatency = (min: number, max: number) => {
  latency = [min, max];
};
const wait = () => new Promise<void>((r) => setTimeout(r, latency[0] + Math.random() * (latency[1] - latency[0])));

function parseQuery(url: string): { path: string; query: Record<string, string> } {
  const [rawPath, qs = ''] = url.split('#')[0].split('?');
  const query: Record<string, string> = {};
  for (const part of qs.split('&')) {
    if (!part) continue;
    const i = part.indexOf('=');
    const k = decodeURIComponent((i < 0 ? part : part.slice(0, i)).replace(/\+/g, ' '));
    query[k] = i < 0 ? '' : decodeURIComponent(part.slice(i + 1).replace(/\+/g, ' '));
  }
  return { path: rawPath, query };
}

function toResponse(r: Reply): Response {
  const status = r.status ?? 200;
  const headers: Record<string, string> = { 'content-type': 'application/json', ...r.headers };
  const body = r.body === undefined ? null : JSON.stringify(r.body);
  return new Response(status === 204 ? null : body, { status, headers });
}

export async function demoFetch(url: string, init?: { method?: string; body?: unknown }): Promise<Response | null> {
  const isChat = url.startsWith(CHAT_URL);
  const isCore = !isChat && url.startsWith(API_URL);
  if (url.startsWith('demo://')) return new Response(null, { status: 200 });
  if (!isChat && !isCore) return null;

  const { path, query } = parseQuery(url.slice((isChat ? CHAT_URL : API_URL).length));
  let body: any;
  if (typeof init?.body === 'string' && init.body) {
    try {
      body = JSON.parse(init.body);
    } catch {
      body = undefined;
    }
  }
  const call: Call = { method: (init?.method ?? 'GET').toUpperCase(), path, query, body };
  await wait();
  return toResponse(isChat ? handleChat(call) : handleCore(call));
}

let installed = false;
/** Routes fetch calls for the (fake) server addresses to the demo handlers. Everything else goes through untouched. */
export function installDemo() {
  if (!DEMO || installed) return;
  installed = true;
  const real = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : (input?.url ?? String(input));
    const res = await demoFetch(url, init);
    return res ?? real(input, init);
  }) as typeof fetch;
}

/** A stand-in for the chat WebSocket: same handshake frame, then the demo chat's live events. */
export class DemoSocket {
  readyState = 0;
  onmessage: ((m: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private off: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout>;

  constructor(..._args: unknown[]) {
    this.timer = setTimeout(() => {
      if (this.readyState !== 0) return;
      this.readyState = 1;
      this.deliver({ status: true });
      this.off = onChatEvent((f) => this.deliver(f));
      startChatScript();
    }, 350);
  }

  private deliver(frame: unknown) {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  send(_data: string) {}
  close() {
    clearTimeout(this.timer);
    this.off?.();
    this.off = null;
    this.readyState = 3;
    this.onclose?.();
  }
}
