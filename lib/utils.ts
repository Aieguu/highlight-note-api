export function generateNoteId(): string {
  return 'note-' + Math.random().toString(36).substr(2, 9);
}

export function generateNoteMarkdown(
  noteId: string,
  articleSlug: string,
  selectedText: string,
  noteContent: string
): string {
  const date = new Date().toISOString().split('T')[0];
  return `---
title: "笔记"
date: ${date}
type: note
hidden: true
article: "${articleSlug}"
selected_text: "${selectedText}"
note_id: "${noteId}"
---

${noteContent}`;
}

export function insertShortcode(article: string, selectedText: string, noteId: string): string {
  const index = article.indexOf(selectedText);
  if (index === -1) {
    throw new Error('未找到选中的文字');
  }

  const before = article.substring(0, index);
  const after = article.substring(index + selectedText.length);
  return `${before}{{< hl "${selectedText}" "${noteId}" >}}${after}`;
}

export function removeShortcode(article: string, selectedText: string, noteId: string): string {
  const shortcodePattern = `{{< hl "${selectedText}" "${noteId}" >}}`;
  return article.replace(shortcodePattern, selectedText);
}

export function parseNoteContent(markdown: string): { selectedText: string; noteContent: string } {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    throw new Error('笔记格式错误');
  }

  const frontmatter = frontmatterMatch[1];
  const content = frontmatterMatch[2].trim();

  const selectedTextMatch = frontmatter.match(/selected_text:\s*"(.+)"/);
  const selectedText = selectedTextMatch ? selectedTextMatch[1] : '';

  return {
    selectedText,
    noteContent: content
  };
}

export function setCorsHeaders(res: any): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
