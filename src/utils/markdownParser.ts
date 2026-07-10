/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A lightweight, robust Markdown-to-HTML converter that styles everything with Tailwind.
 * Specifically handles headings, list items, bold, italics, paragraphs, and images.
 */
export function parseMarkdown(md: string): string {
  if (!md) return '';

  const lines = md.split(/\r?\n/);
  const htmlLines: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Handle empty lines (paragraph breaks)
    if (line === '') {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
      continue;
    }

    // Handle Lists
    if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        htmlLines.push('<ul class="list-disc pl-6 my-3 space-y-1.5 text-slate-700">');
        inList = true;
      }
      const itemText = parseInlineMarkdown(line.substring(2));
      htmlLines.push(`<li>${itemText}</li>`);
      continue;
    } else {
      if (inList) {
        htmlLines.push('</ul>');
        inList = false;
      }
    }

    // Handle Headings
    if (line.startsWith('# ')) {
      const text = parseInlineMarkdown(line.substring(2));
      htmlLines.push(`<h1 class="text-3xl font-bold text-slate-900 mt-6 mb-4 tracking-tight border-b border-slate-200 pb-2">${text}</h1>`);
    } else if (line.startsWith('## ')) {
      const text = parseInlineMarkdown(line.substring(3));
      htmlLines.push(`<h2 class="text-2xl font-bold text-slate-800 mt-5 mb-3 tracking-tight">${text}</h2>`);
    } else if (line.startsWith('### ')) {
      const text = parseInlineMarkdown(line.substring(4));
      htmlLines.push(`<h3 class="text-xl font-semibold text-slate-800 mt-4 mb-2 tracking-tight">${text}</h3>`);
    } else if (line.startsWith('#### ')) {
      const text = parseInlineMarkdown(line.substring(5));
      htmlLines.push(`<h4 class="text-lg font-semibold text-slate-700 mt-3 mb-2">${text}</h4>`);
    }
    // Handle Images: ![alt](url)
    else if (line.startsWith('![') && line.includes('](')) {
      const match = line.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const alt = match[1];
        const url = match[2];
        htmlLines.push(`
          <div class="my-6 overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
            <img src="${url}" alt="${alt}" class="w-full max-h-[450px] object-cover mx-auto block" referrerPolicy="no-referrer" />
            <p class="bg-slate-50 px-4 py-2.5 text-xs text-slate-500 font-medium tracking-wide text-center border-t border-slate-100 italic">
              Figura: ${alt}
            </p>
          </div>
        `);
      } else {
        htmlLines.push(`<p class="my-3 text-slate-700 leading-relaxed">${parseInlineMarkdown(line)}</p>`);
      }
    }
    // Regular paragraphs
    else {
      htmlLines.push(`<p class="my-3 text-slate-700 leading-relaxed text-justify">${parseInlineMarkdown(line)}</p>`);
    }
  }

  if (inList) {
    htmlLines.push('</ul>');
  }

  return htmlLines.join('\n');
}

/**
 * Parses inline elements like bold (**), italics (*), and images
 */
function parseInlineMarkdown(text: string): string {
  let parsed = text;

  // Bold: **text**
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');

  // Italics: *text* or _text_
  parsed = parsed.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  parsed = parsed.replace(/_(.*?)_/g, '<em class="italic">$1</em>');

  // Link: [text](url)
  parsed = parsed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-indigo-600 hover:underline hover:text-indigo-800" target="_blank" rel="noopener noreferrer">$1</a>');

  // Code: `code`
  parsed = parsed.replace(/`(.*?)`/g, '<code class="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-sm">$1</code>');

  return parsed;
}
