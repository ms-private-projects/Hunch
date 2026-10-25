import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** A GFM table scrolls inside its own container instead of widening the page. */
function ScrollingTable(props: ComponentProps<"table">) {
  return (
    <div className="hunch-table-scroll">
      <table {...props} />
    </div>
  );
}

const components = { table: ScrollingTable };

/** Markdown with the SDK's markdown skin (`theme/markdown.css`). */
export function Markdown({ children, className }: { children: string; className?: string }) {
  if (!children.trim()) return null;
  return (
    <div className={`command-center-markdown${className ? ` ${className}` : ""}`}>
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
