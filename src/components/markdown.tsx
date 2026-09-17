import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders document and ticket bodies written by the crew.
 *
 * Raw HTML is never rendered: react-markdown escapes it by default and we do
 * not enable rehype-raw. Links open in a new tab without referrer/opener.
 * Only http(s) and mailto URLs are honoured; anything else is shown as text.
 */

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function isSafeHref(href: string | undefined): href is string {
  if (!href) return false;
  try {
    return SAFE_PROTOCOLS.has(new URL(href, "https://placeholder.invalid").protocol);
  } catch {
    return false;
  }
}

const components: Components = {
  a({ href, children }) {
    if (!isSafeHref(href)) return <span>{children}</span>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  img({ alt }) {
    // Remote images from ticket bodies would leak the reader's IP to
    // arbitrary hosts and violate the CSP; show the alt text instead.
    return <span className="text-fg-muted italic">[image{alt ? `: ${alt}` : ""}]</span>;
  },
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-doc">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
