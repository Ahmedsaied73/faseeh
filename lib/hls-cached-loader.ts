import Hls, {
  type FragmentLoaderConstructor,
  type HlsConfig,
  type LoaderCallbacks,
  type LoaderConfiguration,
  type LoaderContext,
  type LoaderResponse,
  type LoaderStats,
} from 'hls.js';
import {
  buildCanonicalSegmentKey,
  getSegment,
  putSegment,
  touchSegment,
} from '@/lib/video-segment-cache';

export interface CachedLoaderTelemetry {
  segmentHits: number;
  segmentMisses: number;
  bytesFromCache: number;
  bytesFromNetwork: number;
  idbErrors: number;
}

export interface CachedFragmentLoaderOptions {
  videoId: string;
  maxBudgetMb?: number;
  ttlDays?: number;
  telemetry: CachedLoaderTelemetry;
}

export function createCachedFragmentLoader(
  options: CachedFragmentLoaderOptions
): FragmentLoaderConstructor {
  const BaseLoader = Hls.DefaultConfig.loader;
  const { videoId, maxBudgetMb, ttlDays, telemetry } = options;

  const CachedFragmentLoader = class extends BaseLoader {
    private aborted = false;
    private destroyed = false;
    private delegated = false;
    private pendingContext: LoaderContext | null = null;
    private pendingCallbacks: LoaderCallbacks<LoaderContext> | null = null;

    constructor(config: HlsConfig) {
      super(config);
    }

    override load(
      context: LoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<LoaderContext>
    ): void {
      this.aborted = false;
      this.delegated = false;

      const cacheKey =
        context.type === 'media-fragment'
          ? buildCanonicalSegmentKey(
              context.url,
              videoId,
              context.rangeStart,
              context.rangeEnd
            )
          : null;

      if (!cacheKey) {
        this.delegated = true;
        super.load(context, config, callbacks);
        return;
      }

      this.pendingContext = context;
      this.pendingCallbacks = callbacks;
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

      void this.loadWithCache(cacheKey, context, config, callbacks, startTime);
    }

    private async loadWithCache(
      cacheKey: string,
      context: LoaderContext,
      config: LoaderConfiguration,
      callbacks: LoaderCallbacks<LoaderContext>,
      startTime: number
    ): Promise<void> {
      const cached = await getSegment(cacheKey, ttlDays, () => {
        telemetry.idbErrors += 1;
      });

      if (this.aborted || this.destroyed) return;

      if (cached) {
        this.pendingContext = null;
        this.pendingCallbacks = null;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const stats: LoaderStats = {
          aborted: false,
          loaded: cached.byteLength,
          retry: 0,
          total: cached.byteLength,
          chunkCount: 1,
          bwEstimate: this.stats?.bwEstimate ?? 0,
          loading: { start: startTime, first: now, end: now },
          parsing: { start: 0, end: 0 },
          buffering: { start: 0, first: 0, end: 0 },
        };
        this.stats = stats;
        telemetry.segmentHits += 1;
        telemetry.bytesFromCache += cached.byteLength;
        void touchSegment(cacheKey);
        callbacks.onSuccess({ url: context.url, data: cached }, stats, context, null);
        return;
      }

      this.pendingContext = null;
      this.pendingCallbacks = null;
      this.delegated = true;

      const wrappedCallbacks: LoaderCallbacks<LoaderContext> = {
        ...callbacks,
        onSuccess: (response: LoaderResponse, stats: LoaderStats, ctx: LoaderContext, networkDetails) => {
          telemetry.segmentMisses += 1;
          if (response.data instanceof ArrayBuffer) {
            telemetry.bytesFromNetwork += response.data.byteLength;
            const cloned = response.data.slice(0);
            void putSegment(cacheKey, videoId, cloned, maxBudgetMb, () => {
              telemetry.idbErrors += 1;
            });
          }
          callbacks.onSuccess(response, stats, ctx, networkDetails);
        },
      };

      super.load(context, config, wrappedCallbacks);
    }

    override abort(): void {
      if (this.aborted) return;
      this.aborted = true;
      if (this.delegated) {
        super.abort();
        return;
      }
      const ctx = this.pendingContext;
      const cb = this.pendingCallbacks;
      this.pendingContext = null;
      this.pendingCallbacks = null;
      if (ctx && cb?.onAbort) {
        cb.onAbort({ ...this.stats, aborted: true }, ctx, null);
      }
    }

    override destroy(): void {
      this.destroyed = true;
      this.aborted = true;
      this.pendingContext = null;
      this.pendingCallbacks = null;
      super.destroy();
    }
  };

  return CachedFragmentLoader as unknown as FragmentLoaderConstructor;
}
