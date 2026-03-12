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
    console.log(`[scheduler] Registered job: ${name} (every ${intervalMinutes}m)`);
  }

  start(): void {
    console.log('[scheduler] Starting all jobs...');
    for (const [name, job] of this.jobs.entries()) {
      if (job.timer) continue;
      job.timer = setInterval(async () => {
        if (job.running) {
          console.log(`[scheduler] Skipping ${name} — already running`);
          return;
        }
        await this.executeJob(name, job);
      }, job.intervalMs);
      console.log(`[scheduler] Started job: ${name}`);
    }
  }

  stop(): void {
    console.log('[scheduler] Stopping all jobs...');
    for (const [name, job] of this.jobs.entries()) {
      if (job.timer) {
        clearInterval(job.timer);
        job.timer = undefined;
        console.log(`[scheduler] Stopped job: ${name}`);
      }
    }
  }

  async runNow(name: string): Promise<any> {
    const job = this.jobs.get(name);
    if (!job) {
      throw new Error(`[scheduler] Job not found: ${name}`);
    }
    if (job.running) {
      console.log(`[scheduler] Job ${name} is already running, skipping`);
      return null;
    }
    return this.executeJob(name, job);
  }

  private async executeJob(name: string, job: JobEntry): Promise<any> {
    job.running = true;
    console.log(`[scheduler] Running job: ${name}`);
    try {
      const result = await job.fn();
      console.log(`[scheduler] Job ${name} completed`);
      return result;
    } catch (err) {
      console.error(`[scheduler] Job ${name} failed:`, err);
      throw err;
    } finally {
      job.running = false;
    }
  }
}

export const scheduler = new JobScheduler();
