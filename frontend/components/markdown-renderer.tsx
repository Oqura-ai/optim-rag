"use client"
import { useState, useCallback } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import "katex/dist/katex.min.css"
import { cn } from "@/lib/utils"
import { Check, Copy } from 'lucide-react'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold mb-3 mt-4 pb-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold mb-2 mt-4 pb-1" {...props} />
          ),
          h3: ({ node, ...props }) => <h3 className="text-lg font-bold mb-2 mt-3" {...props} />,
          h4: ({ node, ...props }) => <h4 className="text-base font-bold text-purple-300 mb-2 mt-3" {...props} />,
          h5: ({ node, ...props }) => <h5 className="text-sm font-bold text-purple-300 mb-1 mt-2" {...props} />,
          h6: ({ node, ...props }) => <h6 className="text-sm font-bold  mb-1 mt-2" {...props} />,
          p: ({ node, ...props }) => <p className=" mb-3" {...props} />,
          a: ({ node, ...props }) => (
            <a className="text-purple-400 hover:text-purple-300 underline transition-colors" {...props} />
          ),
          ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 " {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 " {...props} />,
          li: ({ node, ...props }) => <li className="mb-1" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-purple-500 pl-4 py-1 mb-3  italic" {...props} />
          ),
          hr: ({ node, ...props }) => <hr className="border-none my-6" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-gray-700 rounded-md" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-gray-800" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-gray-800/50 transition-colors" {...props} />,
          th: ({ node, ...props }) => (
            <th
              className="px-3 py-2 text-left text-xs font-medium text-purple-300 uppercase tracking-wider"
              {...props}
            />
          ),
          td: ({ node, ...props }) => <td className="px-3 py-2 text-sm " {...props} />,
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "")
            return !inline && match ? (
              <CodeBlock language={match[1]} code={String(children).replace(/\n$/, "")} />
            ) : (
              <code className="bg-gray-800 text-purple-300 px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>
                {children}
              </code>
            )
          },
          img: ({ node, ...props }) => (
            <img className="max-w-full h-auto rounded-md border border-gray-700 my-3" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

interface CodeBlockProps {
  language: string
  code: string
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="text-xs  font-mono">{language}</div>
        <button
          onClick={handleCopy}
          className=" hover transition-colors focus:outline-none"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <SyntaxHighlighter
        style={atomDark}
        language={language}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.9rem",
        }}
        showLineNumbers
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}