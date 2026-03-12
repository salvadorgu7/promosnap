import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { enrichCandidate } from "./enrich";
import type { ImportCandidate, CandidateValidation, ImportBatchResult } from "./types";

// ─── CSV Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse CSV content into CatalogCandidate-compatible objects.
 * Expects header row with supported field names.
 * Supported fields: title, brand, category, imageUrl, price, originalPrice,
 *                   affiliateUrl, sourceSlug, externalId
 */
export function parseCSVImport(content: string): ImportCandidate[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  const FIELD_MAP: Record<string, keyof ImportCandidate> = {
    title: "title",
    titulo: "title",
    nome: "title",
    name: "title",
    brand: "brand",
    marca: "brand",
    category: "category",
    categoria: "category",
    imageurl: "imageUrl",
    image_url: "imageUrl",
    imagem: "imageUrl",
    price: "price",
    preco: "price",
    valor: "price",
    originalprice: "originalPrice",
    original_price: "originalPrice",
    preco_original: "originalPrice",
    affiliateurl: "affiliateUrl",
    affiliate_url: "affiliateUrl",
    url: "affiliateUrl",
    link: "affiliateUrl",
    sourceslug: "sourceSlug",
    source_slug: "sourceSlug",
    fonte: "sourceSlug",
    externalid: "externalId",
    external_id: "externalId",
    id_externo: "externalId",
  };

  const mappedHeaders = headers.map((h) => FIELD_MAP[h] || null);

  const candidates: ImportCandidate[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const candidate: Record<string, unknown> = {};

    for (let j = 0; j < mappedHeaders.length; j++) {
      const field = mappedHeaders[j];
      if (!field || j >= values.length) continue;

      const val = values[j].trim();
      if (!val) continue;

      if (field === "price" || field === "originalPrice") {
        const num = parseFloat(val.replace(/[R$\s.]/g, "").replace(",", "."));
        if (!isNaN(num)) candidate[field] = num;
      } else {
        candidate[field] = val;
      }
    }

    if (candidate.title && typeof candidate.title === "string") {
      candidates.push(candidate as unknown as ImportCandidate);
    }
  }

  return candidates;
}

/** Simple CSV line parser that handles quoted values */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && (i === 0 || line[i - 1] !== "\\")) {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── JSON Parsing ────────────────────────────────────────────────────────────

/**
 * Parse JSON content into CatalogCandidate-compatible objects.
 * Accepts either an array of objects or { items: [...] } / { products: [...] }.
 */
export function parseJSONImport(content: string): ImportCandidate[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.items)) items = obj.items;
    else if (Array.isArray(obj.products)) items = obj.products;
    else if (Array.isArray(obj.candidates)) items = obj.candidates;
    else return [];
  } else {
    return [];
  }

  const candidates: ImportCandidate[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const raw = item as Record<string, unknown>;

    const title = (raw.title || raw.titulo || raw.nome || raw.name) as string | undefined;
    if (!title || typeof title !== "string") continue;

    const candidate: ImportCandidate = { title };

    if (typeof raw.brand === "string") candidate.brand = raw.brand;
    if (typeof raw.marca === "string") candidate.brand = raw.marca;
    if (typeof raw.category === "string") candidate.category = raw.category;
    if (typeof raw.categoria === "string") candidate.category = raw.categoria;
    if (typeof raw.imageUrl === "string") candidate.imageUrl = raw.imageUrl;
    if (typeof raw.image_url === "string") candidate.imageUrl = raw.image_url;
    if (typeof raw.affiliateUrl === "string") candidate.affiliateUrl = raw.affiliateUrl;
    if (typeof raw.affiliate_url === "string") candidate.affiliateUrl = raw.affiliate_url;
    if (typeof raw.url === "string" && !candidate.affiliateUrl) candidate.affiliateUrl = raw.url;
    if (typeof raw.sourceSlug === "string") candidate.sourceSlug = raw.sourceSlug;
    if (typeof raw.source_slug === "string") candidate.sourceSlug = raw.source_slug;
    if (typeof raw.externalId === "string") candidate.externalId = raw.externalId;
    if (typeof raw.external_id === "string") candidate.externalId = raw.external_id;

    const price = parseNumeric(raw.price ?? raw.preco ?? raw.valor);
    if (price !== null) candidate.price = price;

    const originalPrice = parseNumeric(raw.originalPrice ?? raw.original_price ?? raw.preco_original);
    if (originalPrice !== null) candidate.originalPrice = originalPrice;

    candidates.push(candidate);
  }

  return candidates;
}

function parseNumeric(val: unknown): number | null {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const num = parseFloat(val.replace(/[R$\s.]/g, "").replace(",", "."));
    if (!isNaN(num)) return num;
  }
  return null;
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate a single import candidate.
 */
export function validateCandidate(candidate: ImportCandidate): CandidateValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: title
  if (!candidate.title || candidate.title.trim().length < 3) {
    errors.push("Titulo obrigatorio (minimo 3 caracteres)");
  }

  // Price validation
  if (candidate.price !== undefined) {
    if (candidate.price <= 0) errors.push("Preco deve ser maior que zero");
    if (candidate.price > 1_000_000) warnings.push("Preco parece muito alto");
  }

  if (candidate.originalPrice !== undefined) {
    if (candidate.originalPrice <= 0) errors.push("Preco original deve ser maior que zero");
    if (candidate.price && candidate.originalPrice < candidate.price) {
      warnings.push("Preco original menor que preco atual");
    }
  }

  // URL validation
  if (candidate.imageUrl && !isValidUrl(candidate.imageUrl)) {
    warnings.push("URL da imagem parece invalida");
  }

  if (candidate.affiliateUrl && !isValidUrl(candidate.affiliateUrl)) {
    warnings.push("URL de afiliado parece invalida");
  }

  // External ID
  if (candidate.externalId && candidate.externalId.length > 100) {
    warnings.push("ID externo muito longo");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return url.startsWith("http://") || url.startsWith("https://");
  }
}

// ─── Batch Processing ────────────────────────────────────────────────────────

/**
 * Process all pending candidates in an import batch.
 * Validates, enriches, and creates catalog candidates in the DB.
 */
export async function processImportBatch(batchId: string): Promise<ImportBatchResult> {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { candidates: { where: { status: "PENDING" } } },
  });

  if (!batch) {
    return { batchId, total: 0, imported: 0, rejected: 0, errors: ["Batch nao encontrado"] };
  }

  // Mark as processing
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: "PROCESSING" },
  });

  let imported = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const candidate of batch.candidates) {
    const importCandidate: ImportCandidate = {
      title: candidate.title,
      brand: candidate.brand ?? undefined,
      category: candidate.category ?? undefined,
      imageUrl: candidate.imageUrl ?? undefined,
      price: candidate.price ?? undefined,
      originalPrice: candidate.originalPrice ?? undefined,
      affiliateUrl: candidate.affiliateUrl ?? undefined,
      sourceSlug: candidate.sourceSlug ?? undefined,
      externalId: candidate.externalId ?? undefined,
    };

    const validation = validateCandidate(importCandidate);

    if (!validation.isValid) {
      await prisma.catalogCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "REJECTED",
          rejectionNote: validation.errors.join("; "),
        },
      });
      rejected++;
      errors.push(`${candidate.title}: ${validation.errors.join(", ")}`);
      continue;
    }

    try {
      // Enrich the candidate
      const enrichment = enrichCandidate(importCandidate);

      await prisma.catalogCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "APPROVED",
          brand: enrichment.detectedBrand || candidate.brand,
          category: enrichment.inferredCategory || candidate.category,
          enrichedData: enrichment as unknown as Prisma.InputJsonValue,
        },
      });
      imported++;
    } catch (err) {
      await prisma.catalogCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "REJECTED",
          rejectionNote: `Erro no processamento: ${String(err)}`,
        },
      });
      rejected++;
      errors.push(`${candidate.title}: ${String(err)}`);
    }
  }

  // Update batch status
  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: "COMPLETED",
      imported,
      rejected,
      errors: errors.length > 0 ? (errors as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
      processedAt: new Date(),
    },
  });

  return {
    batchId,
    total: batch.candidates.length,
    imported,
    rejected,
    errors,
  };
}
