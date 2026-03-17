import { logger } from '@/lib/logger';

type JobEntry = {
  fn: () => Promise<any>;
  intervalMs: number;
  timer?: NodeJS.Timeout;
  running: boolean;
};

class JobScheduler {
  private jobs: Map<string, JobEntry> = new Map();

  register(name: string, fn: () => Promise<any>, intervalMinutes: number): void {
    this.jobs.set(name, {
      fn,
      intervalMs: intervalMinutes * 60 * 1000,
      running: false,
    });
    logger.info("scheduler.registered", { name, intervalMinutes });
  }

  start(): void {
    logger.info("scheduler.starting-all");
    for (const [name, job] of this.jobs.entries()) {
      if (job.timer) continue;
      job.timer = setInterval(async () => {
        if (job.running) {
          logger.debug("scheduler.skipping-already-running", { name });
          return;
        }
        await this.executeJob(name, job);
      }, job.intervalMs);
      logger.info("scheduler.started", { name });
    }
  }

  stop(): void {
    logger.info("scheduler.stopping-all");
    for (const [name, job] of this.jobs.entries()) {
      if (job.timer) {
        clearInterval(job.timer);
        job.timer = undefined;
        logger.info("scheduler.stopped", { name });
      }
    }
  }

  async runNow(name: string): Promise<any> {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`[scheduler] Job not found: ${name}`);
    }
    if (job.running) {
      logger.debug("scheduler.already-running", { name });
      return null;
    }
    return this.executeJob(name, job);
  }

  private async executeJob(name: string, job: JobEntry): Promise<any> {
    job.running = true;
    logger.info("scheduler.running", { name });
    try {
      const result = await job.fn();
      logger.info("scheduler.completed", { name });
      return result;
    } catch (err) {
      logger.error("scheduler.job-failed", { name, error: err });
      throw err;
    } finally {
      job.running = false;
    }
  }
}

export const scheduler = new JobScheduler();
