import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';

const components = {
  h1: ({ children }) => <h1 className="mb-2 mt-3 text-lg font-semibold text-white first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-3 text-base font-semibold text-white first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold text-white first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-2 leading-6 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-brand-blue-light">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-brand-blue-light">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-brand-blue pl-3 text-slate-300">{children}</blockquote>,
  code: ({ children, className }) => (
    <code className={`${className || ''} rounded bg-dark-900 px-1 py-0.5 font-mono text-[0.9em] text-sky-200`}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg border border-slate-700 bg-dark-900 p-3 text-xs">
      {children}
    </pre>
  ),
  a: ({ children, href }) => (
    <a className="text-sky-300 underline underline-offset-2" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  img: ({ alt }) => <span className="text-slate-400">{alt}</span>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-slate-700 bg-dark-900 px-2 py-1.5 font-semibold text-white">{children}</th>,
  td: ({ children }) => <td className="border border-slate-700 px-2 py-1.5">{children}</td>,
  hr: () => <hr className="my-3 border-slate-700" />,
};

export default function MarkdownMessage({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
}
