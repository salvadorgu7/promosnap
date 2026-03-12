export const dynamic = "force-dynamic"

import prisma from "@/lib/db/prisma"
import { runFullAudit } from "@/lib/audit/runner"
import type { AuditReport, AuditSection, AuditIssue } from "@/lib/audit/types"
import { RunAuditButton } from "./run-button"

// ── Grade colors ─────────────────────────────────────

function gradeColor(grade: string): string {
  switch (grade) {
    case "A": return "text-green-600 bg-green-50 border-green-200"
    case "B": return "text-blue-600 bg-blue-50 border-blue-200"
    case "C": return "text-yellow-600 bg-yellow-50 border-yellow-200"
    case "D": return "text-orange-600 bg-orange-50 border-orange-200"
    case "F": return "text-red-600 bg-red-50 border-red-200"
    default: return "text-gray-600 bg-gray-50 border-gray-200"
  }
}

function scoreBarColor(score: number): string {
  if (score >= 90) return "bg-green-500"
  if (score >= 75) return "bg-blue-500"
  if (score >= 55) return "bg-yellow-500"
  if (score >= 35) return "bg-orange-500"
  return "bg-red-500"
}

// ── Page ─────────────────────────────────────────────

export default async function AuditPage() {
  let report: AuditReport | null = null

  try {
    report = await runFullAudit()
  } catch (error) {
    console.error("[admin/audit] error running audit:", error)
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-text-primary">Auditoria</h1>
            <p className="text-sm text-text-muted mt-1">Erro ao executar auditoria</p>
          </div>
          <RunAuditButton />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">Nao foi possivel gerar o relatorio de auditoria.</p>
          <p className="text-red-500 text-sm mt-1">Verifique os logs do servidor para mais detalhes.</p>
        </div>
      </div>
    )
  }

  const sections = Object.values(report.sections) as AuditSection[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Auditoria</h1>
          <p className="text-sm text-text-muted mt-1">
            Ultima execucao: {new Date(report.timestamp).toLocaleString("pt-BR")}
          </p>
        </div>
        <RunAuditButton />
      </div>

      {/* Overall Score */}
      <div className="bg-white rounded-xl border border-surface-200 p-8 flex items-center gap-8">
        <div className="flex flex-col items-center">
          <div className={`text-6xl font-bold font-display ${report.overallScore >= 75 ? "text-green-600" : report.overallScore >= 55 ? "text-yellow-600" : "text-red-600"}`}>
            {report.overallScore}
          </div>
          <div className="text-sm text-text-muted mt-1">de 100</div>
        </div>
        <div className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center ${gradeColor(report.grade)}`}>
          <span className="text-4xl font-bold font-display">{report.grade}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-text-secondary leading-relaxed">{report.summary}</p>
        </div>
      </div>

      {/* Critical Issues */}
      {report.criticalIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-700 mb-3">Problemas Criticos</h2>
          <div className="space-y-2">
            {report.criticalIssues.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {report.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-yellow-700 mb-3">Avisos</h2>
          <div className="space-y-2">
            {report.warnings.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Opportunities */}
      {report.opportunities.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-700 mb-3">Oportunidades</h2>
          <div className="space-y-2">
            {report.opportunities.map((issue, i) => (
              <IssueRow key={i} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {/* Section Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">Detalhamento por Area</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section) => (
            <SectionCard key={section.name} section={section} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Components ───────────────────────────────────────

function IssueRow({ issue }: { issue: AuditIssue }) {
  return (
    <div className="bg-white/60 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <span className="text-xs font-medium bg-white rounded px-2 py-0.5 border border-current/10">
          {issue.section}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">{issue.message}</p>
          {issue.recommendation && (
            <p className="text-xs text-text-muted mt-1">{issue.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionCard({ section }: { section: AuditSection }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text-primary">{section.name}</h3>
        <div className={`px-2 py-1 rounded-lg border text-sm font-bold ${gradeColor(section.grade)}`}>
          {section.grade}
        </div>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold font-display text-text-primary">{section.score}</span>
        <span className="text-sm text-text-muted mb-1">/100</span>
      </div>
      <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${scoreBarColor(section.score)}`}
          style={{ width: `${section.score}%` }}
        />
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{section.summary}</p>
      {section.issueCount > 0 && (
        <p className="text-xs text-text-muted mt-2">
          {section.issueCount} {section.issueCount === 1 ? "problema" : "problemas"}
        </p>
      )}
    </div>
  )
}
