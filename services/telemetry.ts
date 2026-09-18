/**
 * Traceloop telemetry for the browser.
 *
 * This app calls Gemini directly from the browser (no server runtime), so we use
 * OpenTelemetry's Web SDK with OpenLLMetry GenAI semantic conventions and export
 * spans to Traceloop's OTLP endpoint through a same-origin relay
 * (`/api/traceloop/*` → Vite dev proxy in dev, `api/traceloop.py` in production).
 * The relay keeps TRACELOOP_API_KEY out of the browser bundle entirely.
 */
import { Span, SpanStatusCode, Tracer } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import {
  ATTR_GEN_AI_OPERATION_NAME,
  ATTR_GEN_AI_REQUEST_MODEL,
  ATTR_GEN_AI_RESPONSE_MODEL,
  ATTR_GEN_AI_SYSTEM,
} from '@opentelemetry/semantic-conventions/incubating';

const TRACER_NAME = 'nami-ai-system';
const TRACER_VERSION = '1.0.0';
const RELAY_PATH = '/api/traceloop';

let tracerPromise: Promise<Tracer> | null = null;

async function getTracer(): Promise<Tracer> {
  if (!tracerPromise) {
    tracerPromise = (async () => {
      const exporter = new OTLPTraceExporter({ url: RELAY_PATH });
      const provider = new WebTracerProvider({
        resource: new Resource({
          [ATTR_SERVICE_NAME]: TRACER_NAME,
          [ATTR_SERVICE_VERSION]: TRACER_VERSION,
        }),
        spanProcessors: [
          new BatchSpanProcessor(exporter, {
            // Keep small so short browser sessions still flush.
            maxQueueSize: 100,
            // Flush before unload kills the page.
            scheduledDelayMillis: 2000,
          }),
        ],
      });

      // Flush pending spans when the tab is closed or refreshed.
      window.addEventListener('pagehide', () => {
        provider.forceFlush().catch(() => {});
      });

      provider.register();
      return provider.getTracer(TRACER_NAME, TRACER_VERSION);
    })().catch((err) => {
      // Never let telemetry break the app; retry on next call.
      tracerPromise = null;
      throw err;
    });
  }
  return tracerPromise;
}

/** Trim attribute values so traces don't bloat with full prompts/audio. */
const MAX_ATTR_LEN = 400;

function trim(value: string | undefined | null): string {
  if (!value) return '';
  return value.length > MAX_ATTR_LEN ? `${value.slice(0, MAX_ATTR_LEN)}…` : value;
}

export interface GeminiCallTrace {
  operation: string; // e.g. 'chat' | 'text_completion' | 'generate_content'
  model: string;
  prompt?: string;
  error?: unknown;
  responseModel?: string;
}

/** Wrap a Gemini SDK call in a Traceloop-visible span. */
export async function traceGeminiCall<T>(
  name: string,
  info: GeminiCallTrace,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const tracer = await getTracer();
    return await tracer.startActiveSpan(
      name,
      { attributes: {
          [ATTR_GEN_AI_SYSTEM]: 'gemini',
          [ATTR_GEN_AI_OPERATION_NAME]: info.operation,
          [ATTR_GEN_AI_REQUEST_MODEL]: info.model,
          ...(info.prompt ? { 'gen_ai.prompt': trim(info.prompt) } : {}),
        } },
      async (span: Span) => {
        try {
          const result = await fn();
          if (info.responseModel) {
            span.setAttribute(ATTR_GEN_AI_RESPONSE_MODEL, info.responseModel);
          }
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (err) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
          span.recordException(err as Error);
          throw err;
        } finally {
          span.end();
        }
      },
    );
  } catch {
    // Telemetry must never break the app.
    return fn();
  }
}

/** Record a non-fatal error on the current flow (helper for live sessions). */
export async function recordLiveSessionError(scope: string, err: unknown): Promise<void> {
  try {
    const tracer = await getTracer();
    await tracer.startActiveSpan(`live_session.${scope}`, async (span) => {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
      span.recordException(err as Error);
      span.end();
    });
  } catch {
    /* ignore */
  }
}
