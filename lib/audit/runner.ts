// ============================================
// AUDIT RUNNER — consolidate all audits
// ============================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getCatalogHealthReport } from '@/lib/catalog/governance'
import { auditSEOHealth, calculateSEOScore } from '@/lib/seo/governance'
import { getContentHealthReport } from '@/lib/content/governance'
import { runAllQualityGates } from '@/lib/quality/gates'
import type { AuditReport, AuditSection, AuditIssue, AuditGrade } from './types'

// ── Helpers ──────────────────────────────────────────

function scoreToGrade(score: number): AuditGrade {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 55) return 'C'
  if (score >= 35) return 'D'
  return 'F'
}

// ── Section: Catalog ─────────────────────────────────

async function runCatalogAudit(): Promise<AuditSection> {
  try {
    const report = await getCatalogHealthReport()
    const total = report.total || 1
    const healthyRatio = report.healthy / total
    const score = Math.round(Math.min(100, healthyRatio * 100))

    const issues: string[] = []
    if (report.incomplete > 0) issues.push(`${report.incomplete} produtos incompletos`)
    if (report.stale > 0) issues.push(`${report.stale} produtos desatualizados`)
    if (report.orphan > 0) issues.push(`${report.orphan} listings orfas`)
    if (report.weakCanonical > 0) issues.push(`${report.weakCanonical} canonicos fracos`)

    return {
      name: 'Catalogo',
      score,
      grade: scoreToGrade(score),
      summary: issues.length > 0 ? issues.join('; ') : 'Catalogo saudavel',
      issueCount: report.incomplete + report.stale + report.orphan + report.weakCanonical,
      details: {
        total: report.total,
        healthy: report.healthy,
        incomplete: report.incomplete,
        stale: report.stale,
        orphan: report.orphan,
        weakCanonical: report.weakCanonical,
      },
    }
  } catch (error) {
    logger.error('audit.catalog.error', { error })
    return {
      name: 'Catalogo',
      score: 0,
      grade: 'F',
      summary: 'Erro ao executar auditoria do catalogo',
      issueCount: 1,
      details: { error: true },
    }
  }
}

// ── Section: SEO ─────────────────────────────────────

async function runSEOAudit(): Promise<AuditSection> {
  try {
    const [seoReport, seoScore] = await Promise.all([
      auditSEOHealth(),
      calculateSEOScore(),
    ])

    const issues: string[] = []
    if (seoReport.issuesBySeverity.critical > 0) {
      issues.push(`${seoReport.issuesBySeverity.critical} problemas criticos`)
    }
    if (seoReport.issuesBySeverity.warning > 0) {
      issues.push(`${seoReport.issuesBySeverity.warning} avisos`)
    }
    if (seoReport.pagesWithIssues > 0) {
      issues.push(`${seoReport.pagesWithIssues} paginas com problemas`)
    }

    return {
      name: 'SEO',
      score: seoScore.overall,
      grade: scoreToGrade(seoScore.overall),
      summary: issues.length > 0 ? issues.join('; ') : 'SEO saudavel',
      issueCount: seoReport.issues.length,
      details: {
        overall: seoScore.overall,
        metadata: seoScore.metadata,
        content: seoScore.content,
        internalLinking: seoScore.internalLinking,
        coverage: seoScore.coverage,
        totalPages: seoReport.totalPages,
        pagesWithIssues: seoReport.pagesWithIssues,
      },
    }
  } catch (error) {
    logger.error('audit.seo.error', { error })
    return {
      name: 'SEO',
      score: 0,
      grade: 'F',
      summary: 'Erro ao executar auditoria de SEO',
      issueCount: 1,
      details: { error: true },
    }
  }
}

// ── Section: Content ─────────────────────────────────

async function runContentAudit(): Promise<AuditSection> {
  try {
    const report = await getContentHealthReport()

    const issues: string[] = []
    if (report.thin.count > 0) issues.push(`${report.thin.count} artigos finos`)
    if (report.stale.count > 0) issues.push(`${report.stale.count} artigos desatualizados`)
    if (report.weak.count > 0) issues.push(`${report.weak.count} artigos fracos`)

    return {
      name: 'Conteudo',
      score: report.averageScore,
      grade: scoreToGrade(report.averageScore),
      summary: issues.length > 0 ? issues.join('; ') : 'Conteudo saudavel',
      issueCount: report.thin.count + report.stale.count + report.weak.count,
      details: {
        total: report.total,
        strong: report.strong.count,
        weak: report.weak.count,
        stale: report.stale.count,
        thin: report.thin.count,
        averageScore: report.averageScore,
      },
    }
  } catch (error) {
    logger.error('audit.content.error', { error })
    return {
      name: 'Conteudo',
      score: 0,
      grade: 'F',
      summary: 'Erro ao executar auditoria de conteudo',
      issueCount: 1,
      details: { error: true },
    }
  }
}

// ── Section: Sources ─────────────────────────────────

async function runSourcesAudit(): Promise<AuditSection> {
  try {
    const [sources, listings] = await Promise.all([
      prisma.source.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          _count: { select: { listings: true } },
        },
      }),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
    ])

    const activeSources = sources.filter((s) => s.status === 'ACTIVE')
    const totalSources = sources.length
    const activeCount = activeSources.length

    // Diversity: check if listings are spread across sources
    const sourcesWithListings = sources.filter((s) => s._count.listings > 0)
    const diversityRatio = totalSources > 0 ? sourcesWithListings.length / totalSources : 0

    // Score: base on active sources and diversity
    let score = 0
    if (activeCount >= 5) score += 40
    else if (activeCount >= 3) score += 30
    else if (activeCount >= 2) score += 20
    else if (activeCount >= 1) score += 10

    score += Math.round(diversityRatio * 30)

    // Bonus for listing volume
    if (listings >= 100) score += 30
    else if (listings >= 50) score += 20
    else if (listings >= 10) score += 10

    score = Math.min(100, score)

    const issues: string[] = []
    const inactiveSources = sources.filter((s) => s.status !== 'ACTIVE')
    if (inactiveSources.length > 0) {
      issues.push(`${inactiveSources.length} fontes inativas`)
    }
    if (activeCount < 3) {
      issues.push(`Apenas ${activeCount} fontes ativas — diversificar`)
    }
    const emptySources = sources.filter((s) => s._count.listings === 0)
    if (emptySources.length > 0) {
      issues.push(`${emptySources.length} fontes sem listings`)
    }

    return {
      name: 'Fontes',
      score,
      grade: scoreToGrade(score),
      summary: issues.length > 0 ? issues.join('; ') : `${activeCount} fontes ativas com boa diversidade`,
      issueCount: issues.length,
      details: {
        totalSources,
        activeSources: activeCount,
        inactiveSources: inactiveSources.length,
        totalListings: listings,
        sourcesWithListings: sourcesWithListings.length,
        diversityRatio: Math.round(diversityRatio * 100),
      },
    }
  } catch (error) {
    logger.error('audit.sources.error', { error })
    return {
      name: 'Fontes',
      score: 0,
      grade: 'F',
      summary: 'Erro ao executar auditoria de fontes',
      issueCount: 1,
      details: { error: true },
    }
  }
}

// ── Section: Quality ─────────────────────────────────

async function runQualityAudit(): Promise<AuditSection> {
  try {
    const report = await runAllQualityGates()

    // Score: start at 100, penalize based on severity
    let score = 100
    for (const gate of report.gates) {
      if (gate.count === 0) continue
      if (gate.severity === 'critical') score -= Math.min(25, gate.count * 5)
      else if (gate.severity === 'warning') score -= Math.min(15, gate.count * 2)
      else score -= Math.min(5, gate.count)
    }
    score = Math.max(0, Math.min(100, score))

    const issues: string[] = []
    if (report.summary.critical > 0) {
      issues.push(`${report.summary.critical} gates criticos`)
    }
    if (report.summary.warning > 0) {
      issues.push(`${report.summary.warning} gates com aviso`)
    }
    issues.push(`${report.summary.totalIssues} problemas totais`)

    return {
      name: 'Qualidade',
      score,
      grade: scoreToGrade(score),
      summary: issues.join('; '),
      issueCount: report.summary.totalIssues,
      details: {
        totalGates: report.summary.total,
        critical: report.summary.critical,
        warning: report.summary.warning,
        info: report.summary.info,
        totalIssues: report.summary.totalIssues,
        gates: report.gates.map((g) => ({
          gate: g.gate,
          severity: g.severity,
          count: g.count,
        })),
      },
    }
  } catch (error) {
    logger.error('audit.quality.error', { error })
    return {
      name: 'Qualidade',
      score: 0,
      grade: 'F',
      summary: 'Erro ao executar auditoria de qualidade',
      issueCount: 1,
      details: { error: true },
    }
  }
}

// ── Section: Design Consistency ──────────────────────

async function runDesignAudit(): Promise<AuditSection> {
  try {
    const [products, categories, brands, articles] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          imageUrl: true,
          description: true,
          name: true,
          slug: true,
        },
      }),
      prisma.category.findMany({
        select: {
          id: true,
          seoTitle: true,
          seoDescription: true,
          description: true,
        },
      }),
      prisma.brand.findMany({
        select: {
          id: true,
          logoUrl: true,
        },
      }),
      prisma.article.findMany({
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          imageUrl: true,
          subtitle: true,
        },
      }),
    ])

    const totalProducts = products.length || 1
    const totalCategories = categories.length || 1
    const totalBrands = brands.length || 1
    const totalArticles = articles.length || 1

    // Metadata coverage
    const productsWithDesc = products.filter((p) => p.description && p.description.length > 0).length
    const metadataCoverage = Math.round((productsWithDesc / totalProducts) * 100)

    // Image coverage
    const productsWithImage = products.filter((p) => !!p.imageUrl).length
    const imageCoverage = Math.round((productsWithImage / totalProducts) * 100)

    // Category SEO coverage
    const catsWithSEO = categories.filter(
      (c) => !!c.seoTitle && !!c.seoDescription
    ).length
    const catSEOCoverage = Math.round((catsWithSEO / totalCategories) * 100)

    // Brand logo coverage
    const brandsWithLogo = brands.filter((b) => !!b.logoUrl).length
    const logoCoverage = Math.round((brandsWithLogo / totalBrands) * 100)

    // Article image coverage
    const articlesWithImage = articles.filter((a) => !!a.imageUrl).length
    const articleImageCoverage = Math.round((articlesWithImage / totalArticles) * 100)

    // Consistent slug patterns
    const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/
    const productsWithGoodSlugs = products.filter((p) => slugPattern.test(p.slug)).length
    const slugConsistency = Math.round((productsWithGoodSlugs / totalProducts) * 100)

    // Composite score
    const score = Math.round(
      metadataCoverage * 0.2 +
      imageCoverage * 0.25 +
      catSEOCoverage * 0.15 +
      logoCoverage * 0.1 +
      articleImageCoverage * 0.15 +
      slugConsistency * 0.15
    )

    const issues: string[] = []
    if (imageCoverage < 80) issues.push(`Cobertura de imagens: ${imageCoverage}%`)
    if (metadataCoverage < 80) issues.push(`Cobertura de descricoes: ${metadataCoverage}%`)
    if (catSEOCoverage < 80) issues.push(`SEO de categorias: ${catSEOCoverage}%`)
    if (logoCoverage < 50) issues.push(`Logos de marcas: ${logoCoverage}%`)
    if (articleImageCoverage < 80) issues.push(`Imagens de artigos: ${articleImageCoverage}%`)

    return {
      name: 'Design',
      score,
      grade: scoreToGrade(score),
      summary: issues.length > 0 ? issues.join('; ') : 'Design consistente',
      issueCount: issues.length,
      details: {
        metadataCoverage,
        imageCoverage,
        catSEOCoverage,
        logoCoverage,
        articleImageCoverage,
        slugConsistency,
      },
    }
  } catch (error) {
    logger.error('audit.design.error', { error })
    return {
      name: 'Design',
      score: 0,
      grade: 'F',
      summary: 'Erro ao executar auditoria de design',
      issueCount: 1,
      details: { error: true },
    }
  }
}

// ── Consolidate Issues ───────────────────────────────

function collectIssues(sections: AuditReport['sections']): {
  criticalIssues: AuditIssue[]
  warnings: AuditIssue[]
  opportunities: AuditIssue[]
} {
  const criticalIssues: AuditIssue[] = []
  const warnings: AuditIssue[] = []
  const opportunities: AuditIssue[] = []

  for (const section of Object.values(sections)) {
    const s = section as AuditSection
    if (s.score < 35) {
      criticalIssues.push({
        section: s.name,
        severity: 'critical',
        message: `${s.name} com score ${s.score}/100 (${s.grade}): ${s.summary}`,
        recommendation: `Priorizar correcoes em ${s.name}`,
      })
    } else if (s.score < 55) {
      warnings.push({
        section: s.name,
        severity: 'warning',
        message: `${s.name} precisa de atencao — score ${s.score}/100: ${s.summary}`,
        recommendation: `Melhorar ${s.name} para atingir nota C ou superior`,
      })
    } else if (s.score < 90) {
      opportunities.push({
        section: s.name,
        severity: 'info',
        message: `${s.name} pode melhorar — score ${s.score}/100: ${s.summary}`,
        recommendation: `Otimizar ${s.name} para atingir nota A`,
      })
    }
  }

  return { criticalIssues, warnings, opportunities }
}

function buildSummary(score: number, grade: AuditGrade, sections: AuditReport['sections']): string {
  const sectionList = Object.values(sections) as AuditSection[]
  const worst = sectionList.reduce((a, b) => (a.score < b.score ? a : b))
  const best = sectionList.reduce((a, b) => (a.score > b.score ? a : b))

  const totalIssues = sectionList.reduce((sum, s) => sum + s.issueCount, 0)

  return `Score geral: ${score}/100 (${grade}). ` +
    `${totalIssues} problemas encontrados. ` +
    `Melhor area: ${best.name} (${best.score}). ` +
    `Area critica: ${worst.name} (${worst.score}).`
}

// ── Main Runner ──────────────────────────────────────

export async function runFullAudit(): Promise<AuditReport> {
  const [catalog, seo, content, sources, quality, design] = await Promise.all([
    runCatalogAudit(),
    runSEOAudit(),
    runContentAudit(),
    runSourcesAudit(),
    runQualityAudit(),
    runDesignAudit(),
  ])

  const sections = { catalog, seo, content, sources, quality, design }

  // Overall score: weighted average
  const overallScore = Math.round(
    catalog.score * 0.20 +
    seo.score * 0.20 +
    content.score * 0.15 +
    sources.score * 0.10 +
    quality.score * 0.20 +
    design.score * 0.15
  )

  const grade = scoreToGrade(overallScore)
  const { criticalIssues, warnings, opportunities } = collectIssues(sections)
  const summary = buildSummary(overallScore, grade, sections)

  return {
    timestamp: new Date().toISOString(),
    overallScore,
    grade,
    sections,
    criticalIssues,
    warnings,
    opportunities,
    summary,
  }
}
