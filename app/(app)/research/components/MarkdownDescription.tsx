'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export function MarkdownDescription({ content }: Props) {
  return (
    <div className="prose prose-sm max-w-none text-lp-text-muted [&_a]:text-lp-dark [&_a]:underline [&_code]:rounded [&_code]:bg-lp-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_li]:my-0.5 [&_p]:my-1 [&_strong]:text-lp-dark [&_table]:text-xs [&_td]:border [&_td]:border-lp-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-lp-border [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold [&_ul]:my-1">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
