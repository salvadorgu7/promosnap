import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';
import { fetchTrendingSignals } from '@/lib/ml-discovery';

export async function ingestMLTrends(): Promise<JobResult> {
  return runJob('ingest-ml-trends', async (ctx) => {
    // Check ML credentials before attempting fetch
    const hasML = !!(
      (process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID) &&
      (process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET)
    )
    if (!hasML) {
      ctx.log('ML credentials not configured — skipping trends ingestion')
      return { itemsTotal: 0, itemsDone: 0, metadata: { skipped: true, reason: 'ml_credentials_missing' } }
    }

    ctx.log('Fetching trends from ML discovery engine...');

    let trends: Awaited<ReturnType<typeof fetchTrendingSignals>> = [];

    try {
      trends = await fetchTrendingSignals();
      ctx.log(`Fetched ${trends.length} trends`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.error(`Failed to fetch ML trends: ${message}`);
      return { itemsTotal: 0, itemsDone: 0, metadata: { error: message } };
    }

    const now = new Date();
    let persisted = 0;

    for (let i = 0; i < trends.length; i++) {
      const trend = trends[i];
      try {
        await prisma.trendingKeyword.upsert({
          where: {
            keyword_fetchedAt: {
              keyword: trend.keyword,
              fetchedAt: now,
            },
          },
          update: {
            url: trend.url,
            position: i + 1,
          },
          create: {
            keyword: trend.keyword,
            url: trend.url,
            position: i + 1,
            fetchedAt: now,
          },
        });
        persisted++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.warn(`Failed to upsert trend "${trend.keyword}": ${message}`);
      }
    }

    ctx.log(`Persisted ${persisted}/${trends.length} trends`);
    await ctx.updateProgress(persisted, trends.length);

    return {
      itemsTotal: trends.length,
      itemsDone: persisted,
      metadata: {
        fetchedAt: now.toISOString(),
        categoriesResolved: trends.filter(t => t.resolvedCategory).length,
      },
    };
  });
}
