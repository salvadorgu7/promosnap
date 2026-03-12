import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';

const STATIC_PAGES = ['/', '/about', '/privacy', '/terms', '/contact'];

export async function generateSitemap(): Promise<JobResult> {
  return runJob('generate-sitemap', async (ctx) => {
    ctx.log('Counting URLs for sitemap...');

    const [productCount, categoryCount, brandCount] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.category.count(),
      prisma.brand.count(),
    ]);

    const staticPageCount = STATIC_PAGES.length;
    const totalUrls = productCount + categoryCount + brandCount + staticPageCount;

    ctx.log(`Products: ${productCount}`);
    ctx.log(`Categories: ${categoryCount}`);
    ctx.log(`Brands: ${brandCount}`);
    ctx.log(`Static pages: ${staticPageCount}`);
    ctx.log(`Total URLs: ${totalUrls}`);

    return {
      itemsTotal: totalUrls,
      itemsDone: totalUrls,
      metadata: {
        products: productCount,
        categories: categoryCount,
        brands: brandCount,
        staticPages: staticPageCount,
        totalUrls,
      },
    };
  });
}
