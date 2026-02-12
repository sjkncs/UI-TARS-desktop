import ReactMarkdown from 'react-markdown';
import { memo, useState, useCallback } from 'react';
import { Copy, Check, Download } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  CodeBlock — Doubao/Qwen-style with language label + copy + save   */
/* ------------------------------------------------------------------ */

function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleSave = useCallback(async () => {
    try {
      await window.electron.ipcRenderer.invoke('system:exportCodeBlock', {
        code,
        language: language || 'txt',
      });
    } catch {
      // fallback: copy to clipboard
      await navigator.clipboard.writeText(code);
    }
  }, [code, language]);

  const displayLang = language || 'text';

  return (
    <div className="group relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {displayLang}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSave}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Save"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      {/* Code body */}
      <pre className="p-4 overflow-x-auto bg-gray-50 dark:bg-gray-900">
        <code className="text-sm font-mono text-gray-800 dark:text-gray-200 leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Markdown renderer with enhanced components                        */
/* ------------------------------------------------------------------ */

export const Markdown = memo(({ children }: { children: string }) => {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h1 className="font-bold text-2xl mb-2 mt-4 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-bold text-xl mb-2 mt-4 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-bold text-lg mb-2 mt-4 first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="font-bold text-base mb-2 mt-4 first:mt-0">
            {children}
          </h4>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3">{children}</ol>
        ),
        li: ({ children }) => <li className="ml-2">{children}</li>,
        p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-300 pl-4 py-2 mb-3 bg-blue-50 dark:bg-blue-950/30 italic text-gray-700 dark:text-gray-300 rounded-r">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="border-0 border-t border-gray-300 dark:border-gray-600 my-6" />,
        a: ({ children, href, title }) => (
          <a
            href={href}
            title={title}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        del: ({ children }) => <del className="line-through">{children}</del>,
        table: ({ children }) => (
          <div className="overflow-x-auto mb-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-50 dark:bg-gray-800">
            {children}
          </thead>
        ),
        th: ({ children }) => (
          <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400">
            {children}
          </td>
        ),
        code: ({ children, className }) => {
          // Fenced code block: className = "language-xxx"
          const match = className?.match(/language-(\w+)/);
          if (match) {
            const lang = match[1];
            const codeText = String(children).replace(/\n$/, '');
            return <CodeBlock language={lang} code={codeText} />;
          }
          // Inline code
          return (
            <code className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono text-sm">
              {children}
            </code>
          );
        },
        pre: ({ children }) => {
          // react-markdown renders: <pre><code className="language-xx">...</code></pre>
          // Our `code` component already renders a CodeBlock for fenced blocks,
          // so we just pass children through to avoid double-wrapping.
          const child = children as React.ReactElement;
          const childProps = child?.props as { className?: string; children?: unknown } | undefined;

          // If the inner <code> had a language class, our code component already
          // returned a <CodeBlock>. Just render children directly.
          if (childProps?.className && /language-/.test(String(childProps.className))) {
            return <>{children}</>;
          }

          // Fallback: plain <pre> with no language → wrap in CodeBlock
          const codeText = typeof children === 'string'
            ? children
            : String(childProps?.children || '');
          return <CodeBlock language="" code={codeText} />;
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
});
