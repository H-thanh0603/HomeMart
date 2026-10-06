import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { getEnv } from '../../config/env';

/**
 * Operational alerting. The API must be able to shout about incidents without
 * a metrics stack — an outage nobody is told about is an outage nobody fixes.
 *
 * Channels (any subset; env validation requires at least one in production):
 *   ALERT_WEBHOOK_URL          generic JSON POST {"text": "..."}
 *   ALERT_SLACK_WEBHOOK_URL    Slack incoming webhook {"text": "..."}
 *   ALERT_TELEGRAM_BOT_TOKEN + ALERT_TELEGRAM_CHAT_ID
 *
 * Two modes:
 *   - alert(message)           immediate (used for rare, must-see events)
 *   - alertThrottled(id, msg)  coalesced per-id, flushed on an interval so a
 *                              flood of 5xx cannot turn into an alert storm
 *                              (and cannot itself become a self-DoS).
 *
 * Fail-quiet: a broken alerting channel must never break a request path.
 */
@Injectable()
export class AlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertsService.name);
  private readonly pending = new Map<string, { count: number; message: string }>();
  private timer?: NodeJS.Timeout;

  onModuleInit() {
    const intervalMs = getEnv().ALERT_FLUSH_INTERVAL_SECONDS * 1000;
    this.timer = setInterval(() => void this.flush(), intervalMs);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Coalesced alert: repeated calls with the same id increment a counter and
   *  the flush sends one message describing how many occurrences there were. */
  alertThrottled(id: string, message: string): void {
    const existing = this.pending.get(id);
    if (existing) {
      existing.count += 1;
      existing.message = message;
    } else {
      this.pending.set(id, { count: 1, message });
    }
  }

  /** Immediate alert — for events that must not wait for the flush interval. */
  async alert(message: string): Promise<void> {
    await this.send(`[HomeMart] ${message}`);
  }

  private async flush(): Promise<void> {
    if (!this.pending.size) return;
    const batch = [...this.pending.entries()];
    this.pending.clear();
    const lines = batch.map(([id, v]) => (v.count > 1 ? `${v.message} (x${v.count} in interval, id=${id})` : `${v.message} (id=${id})`));
    await this.send(`[HomeMart] ${lines.join('\n')}`);
  }

  private async send(text: string): Promise<void> {
    const env = getEnv();
    const jobs: Promise<unknown>[] = [];

    // Always log locally, so even with no channel configured the event is on
    // stdout and visible to the Docker logging driver.
    const isError = /fail|error|down|mismatch/i.test(text);
    if (isError) this.logger.error(text);
    else this.logger.warn(text);

    const post = (url: string, body: unknown) =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      }).catch((e: Error) => this.logger.warn(`Alert channel failed: ${e.message}`));

    if (env.ALERT_WEBHOOK_URL) jobs.push(post(env.ALERT_WEBHOOK_URL, { text }));
    if (env.ALERT_SLACK_WEBHOOK_URL) jobs.push(post(env.ALERT_SLACK_WEBHOOK_URL, { text }));
    if (env.ALERT_TELEGRAM_BOT_TOKEN && env.ALERT_TELEGRAM_CHAT_ID) {
      const url = `https://api.telegram.org/bot${env.ALERT_TELEGRAM_BOT_TOKEN}/sendMessage`;
      const body = new URLSearchParams({ chat_id: env.ALERT_TELEGRAM_CHAT_ID, text });
      jobs.push(
        fetch(url, { method: 'POST', body, signal: AbortSignal.timeout(5000) }).catch((e: Error) =>
          this.logger.warn(`Telegram alert failed: ${e.message}`),
        ),
      );
    }

    await Promise.all(jobs);
  }
}