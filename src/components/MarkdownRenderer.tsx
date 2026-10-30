import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-900 text-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-950/80 border-b border-gray-800 text-xs font-mono text-gray-400">
        <div className="flex items-center gap-1.5">
          <Terminal size={14} className="text-gray-400" />
          <span className="capitalize">{language || 'text'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-md hover:bg-gray-800 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-[13.5px] font-mono leading-relaxed bg-[#11161d] text-gray-200 selection:bg-emerald-500/30">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return <CodeBlock language={match ? match[1] : ''} code={codeString} />;
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 font-mono text-[0.88em] font-medium"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-left text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="px-3 py-2 bg-gray-50 dark:bg-gray-800/60 font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-3 py-2 border-b border-gray-100 dark:border-gray-800/40 text-gray-700 dark:text-gray-300">
                {children}
              </td>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
