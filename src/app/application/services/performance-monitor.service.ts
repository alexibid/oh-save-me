import { Injectable, computed, isDevMode, signal } from '@angular/core';

const LOG_ENDPOINT = 'http://localhost:4790/log';
const HEAVY_OPERATION_THRESHOLD_MS = 16;
const TICK_INTERVAL_MS = 50;

interface PerformanceLogEntry {
  readonly label: string;
  readonly durationMs: number;
  readonly timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class PerformanceMonitorService {
  private readonly activeOperations = signal<number>(0);
  private readonly startedAt = signal<number>(0);
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private isLogServerAvailable = this.checkInitialRemoteLogging();
  private hasLoggedActiveState = false;

  readonly isBusy = computed<boolean>(() => this.activeOperations() > 0);
  readonly currentLabel = signal<string | null>(null);
  readonly elapsedMs = signal<number>(0);

  enableRemoteLogging(): void {
    this.isLogServerAvailable = true;
    this.notifyIfActive();
  }

  disableRemoteLogging(): void {
    this.isLogServerAvailable = false;
  }

  async measureAsync<T>(label: string, operation: () => Promise<T>, minVisibleMs = 260): Promise<T> {
    this.beginVisibleOperation(label);
    const start = performance.now();
    try {
      const result = await operation();
      const elapsed = performance.now() - start;
      if (elapsed < minVisibleMs) {
        await new Promise(resolve => setTimeout(resolve, minVisibleMs - elapsed));
      }
      return result;
    } finally {
      this.record(label, performance.now() - start);
      this.endVisibleOperation();
    }
  }

  measureSync<T>(label: string, operation: () => T): T {
    const start = performance.now();
    const result = operation();
    this.record(label, performance.now() - start);
    return result;
  }

  private beginVisibleOperation(label: string): void {
    this.currentLabel.set(label);
    this.startedAt.set(performance.now());
    this.activeOperations.update(count => count + 1);
    this.startTickingIfNeeded();
  }

  private endVisibleOperation(): void {
    this.activeOperations.update(count => Math.max(0, count - 1));
    if (this.activeOperations() === 0) {
      this.stopTicking();
    }
  }

  private startTickingIfNeeded(): void {
    if (this.tickHandle) return;
    this.tickHandle = setInterval(() => {
      this.elapsedMs.set(Math.round(performance.now() - this.startedAt()));
    }, TICK_INTERVAL_MS);
  }

  private stopTicking(): void {
    if (!this.tickHandle) return;
    clearInterval(this.tickHandle);
    this.tickHandle = null;
    this.elapsedMs.set(0);
    this.currentLabel.set(null);
  }

  private record(label: string, durationMs: number): void {
    const entry: PerformanceLogEntry = {
      label,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
    };
    this.appendToLog('performance.log', entry);
    if (durationMs >= HEAVY_OPERATION_THRESHOLD_MS) {
      this.appendToLog('heavy-operations.log', entry);
    }
  }

  private appendToLog(file: string, entry: PerformanceLogEntry): void {
    if (!isDevMode()) return;

    const line = `${entry.timestamp} | ${entry.durationMs}ms | ${entry.label}`;
    console.debug(`[perf] ${line}`);

    if (!this.isLogServerAvailable || typeof fetch === 'undefined') return;

    const globalProcess = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process;
    const isMockedFetch = (candidate: unknown): boolean =>
      typeof candidate === 'function' && 'mock' in candidate;

    if (globalProcess?.env?.['VITEST'] && !isMockedFetch(globalThis.fetch)) {
      return;
    }

    this.notifyIfActive();

    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, line }),
      keepalive: true,
    }).catch(() => {
      this.isLogServerAvailable = false;
    });
  }

  private notifyIfActive(): void {
    if (this.hasLoggedActiveState || !this.isLogServerAvailable) return;
    this.hasLoggedActiveState = true;
    console.info(`[perf] Performance log server active at ${LOG_ENDPOINT}`);
  }

  private checkInitialRemoteLogging(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      return localStorage.getItem('ENABLE_PERF_LOG') === 'true' || localStorage.getItem('ibid_perf_log') === 'true';
    } catch {
      return false;
    }
  }
}
