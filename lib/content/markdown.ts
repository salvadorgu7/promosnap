/**
 * Simple markdown-to-HTML converter.
 * Handles: headings (h2-h4), bold, italic, links, unordered/ordered lists, paragraphs, line breaks.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdown(line: string): string {
  // Bold: **text**
  line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic: *text*
  line = line.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Links: [text](url)
  line = line.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-accent-blue hover:underline">$1</a>'
  );
  // Inline code: `code`
  line = line.replace(
    /`([^`]+)`/g,
    '<code class="bg-surface-100 px-1.5 py-0.5 rounded text-sm">$1</code>'
  );
  return line;
}

export function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let inParagraph = false;

  function closeList() {
    if (inList) {
      html.push(inList === "ul" ? "</ul>" : "</ol>");
      inList = null;
    }
  }

  function closeParagraph() {
    if (inParagraph) {
      html.push("</p>");
      inParagraph = false;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      closeList();
      closeParagraph();
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      closeParagraph();
      const level = headingMatch[1].length;
      const text = inlineMarkdown(escapeHtml(headingMatch[2]));
      const id = headingMatch[2]
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const classes =
        level === 2
          ? "text-2xl font-bold font-display text-text-primary mt-8 mb-4"
          : level === 3
          ? "text-xl font-semibold font-display text-text-primary mt-6 mb-3"
          : "text-lg font-semibold text-text-primary mt-4 mb-2";
      html.push(`<h${level} id="${id}" class="${classes}">${text}</h${level}>`);
      continue;
    }

    // Unordered list
    if (trimmed.match(/^[-*]\s+/)) {
      closeParagraph();
      if (inList !== "ul") {
        closeList();
        html.push('<ul class="list-disc list-inside space-y-1 my-4 text-text-secondary">');
        inList = "ul";
      }
      const content = inlineMarkdown(escapeHtml(trimmed.replace(/^[-*]\s+/, "")));
      html.push(`<li>${content}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      closeParagraph();
      if (inList !== "ol") {
        closeList();
        html.push('<ol class="list-decimal list-inside space-y-1 my-4 text-text-secondary">');
        inList = "ol";
      }
      const content = inlineMarkdown(escapeHtml(olMatch[1]));
      html.push(`<li>${content}</li>`);
      continue;
    }

    // Horizontal rule
    if (trimmed.match(/^---+$/)) {
      closeList();
      closeParagraph();
      html.push('<hr class="my-6 border-surface-200" />');
      continue;
    }

    // Regular paragraph text
    closeList();
    if (!inParagraph) {
      html.push('<p class="text-text-secondary leading-relaxed mb-4">');
      inParagraph = true;
    } else {
      html.push("<br />");
    }
    html.push(inlineMarkdown(escapeHtml(trimmed)));
  }

  closeList();
  closeParagraph();

  return html.join("\n");
}

/**
 * Extract headings (h2/h3) from markdown for table of contents.
 */
export function extractHeadings(
  md: string
): Array<{ level: number; text: string; id: string }> {
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const lines = md.split("\n");

  for (const line of lines) {
    const match = line.trim().match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
      const id = text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      headings.push({ level, text, id });
    }
  }

  return headings;
}
