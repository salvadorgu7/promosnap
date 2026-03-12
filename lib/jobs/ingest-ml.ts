import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';

interface MLTrend {
  keyword: string;
  url: string;
}

export async function ingestMLTrends(): Promise<JobResult> {
  return runJob('ingest-ml-trends', async (ctx) => {
    ctx.log('Fetching trends from Mercado Libre API...');

    let trends: MLTrend[] = [];

    try {
      const response = await fetch('https://api.mercadolibre.com/trends/MLB');
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      trends = await response.json();
      ctx.log(`Fetched ${trends.length} trends from API`);
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
      metadata: { fetchedAt: now.toISOString() },
    };
  });
}
