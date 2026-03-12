import prisma from '@/lib/db/prisma';

export interface JobContext {
  log: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  updateProgress: (done: number, total: number) => Promise<void>;
}

export interface JobResult {
  jobRunId: string;
  status: 'SUCCESS' | 'FAILED';
  durationMs: number;
  itemsTotal: number;
  itemsDone: number;
  errorLog?: string;
  metadata?: Record<string, any>;
}

export async function runJob(
  name: string,
  fn: (ctx: JobContext) => Promise<{ itemsTotal: number; itemsDone: number; metadata?: any }>
): Promise<JobResult> {
  const startTime = Date.now();

  const jobRun = await prisma.jobRun.create({
    data: {
      jobName: name,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  });

  const logs: string[] = [];

  const ctx: JobContext = {
    log: (msg: string) => {
      console.log(`[job:${name}] ${msg}`);
      logs.push(`[INFO] ${msg}`);
    },
    warn: (msg: string) => {
      console.warn(`[job:${name}] WARN: ${msg}`);
      logs.push(`[WARN] ${msg}`);
    },
    error: (msg: string) => {
      console.error(`[job:${name}] ERROR: ${msg}`);
      logs.push(`[ERROR] ${msg}`);
    },
    updateProgress: async (done: number, total: number) => {
      await prisma.jobRun.update({
        where: { id: jobRun.id },
        data: { itemsDone: done, itemsTotal: total },
      });
    },
  };

  try {
    const result = await fn(ctx);
    const durationMs = Date.now() - startTime;

    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'SUCCESS',
        endedAt: new Date(),
        durationMs,
        itemsTotal: result.itemsTotal,
        itemsDone: result.itemsDone,
        metadata: result.metadata ?? undefined,
      },
    });

    return {
      jobRunId: jobRun.id,
      status: 'SUCCESS',
      durationMs,
      itemsTotal: result.itemsTotal,
      itemsDone: result.itemsDone,
      metadata: result.metadata,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorLog = [...logs, `[FATAL] ${errorMessage}`].join('\n');

    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'FAILED',
        endedAt: new Date(),
        durationMs,
        errorLog,
      },
    });

    return {
      jobRunId: jobRun.id,
      status: 'FAILED',
      durationMs,
      itemsTotal: 0,
      itemsDone: 0,
      errorLog,
    };
  }
}

export async function getJobHistory(name: string, limit = 20) {
  return prisma.jobRun.findMany({
    where: { jobName: name },
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}

export async function getLastRun(name: string) {
  return prisma.jobRun.findFirst({
    where: { jobName: name },
    orderBy: { startedAt: 'desc' },
  });
}
