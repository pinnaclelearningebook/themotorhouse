import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import type { MDXComponents } from "mdx/types";
import { AwaitingInfo } from "@/components/ui/AwaitingInfo";

/**
 * Maps MDX output onto the design system so a post cannot drift from the
 * rest of the site. Posts never carry their own styling.
 *
 * Two components are available inside post content:
 * - <Data> for figures, so a mileage in a post renders in mono exactly as
 *   one in the hero does.
 * - <AwaitingInfo> for a figure we do not have, visible in development
 *   and absent in production.
 */

/**
 * GFM tables only mark the header ROW as <th>. In a comparison table the
 * first COLUMN is also a header, and without it screen readers cannot say
 * which row a cell belongs to (axe: td-has-header). This promotes the
 * first cell of every body row to <th scope="row">.
 */
interface HastNode {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function rehypeRowHeaders() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (node.tagName === "tbody") {
        for (const row of node.children ?? []) {
          const first = (row.children ?? []).find(
            (cell) => cell.type === "element",
          );
          if (first?.tagName === "td") {
            first.tagName = "th";
            first.properties = { ...first.properties, scope: "row" };
          }
        }
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}

function Data({ children }: { children: React.ReactNode }) {
  return <span className="data-inline">{children}</span>;
}

const components: MDXComponents = {
  h2: (props) => (
    <h2
      {...props}
      className="mt-14 font-display text-display-3 first:mt-0"
    />
  ),
  h3: (props) => (
    <h3 {...props} className="mt-10 font-display text-2xl" />
  ),
  p: (props) => <p {...props} className="mt-5 max-w-prose" />,
  ul: (props) => (
    <ul {...props} className="mt-5 max-w-prose list-disc space-y-2 pl-6" />
  ),
  ol: (props) => (
    <ol {...props} className="mt-5 max-w-prose list-decimal space-y-2 pl-6" />
  ),
  li: (props) => <li {...props} className="pl-1" />,
  blockquote: (props) => (
    <blockquote
      {...props}
      className="mt-8 max-w-prose border-l-2 border-oxblood pl-6 text-lg"
    />
  ),
  strong: (props) => <strong {...props} className="font-medium" />,
  hr: () => <hr className="mt-12 border-line" />,
  table: (props) => (
    <div className="mt-8 overflow-x-auto">
      <table {...props} className="w-full border-collapse text-sm" />
    </div>
  ),
  th: ({ scope, ...props }) =>
    scope === "row" ? (
      <th
        {...props}
        scope="row"
        className="border-b border-line px-3 py-3 text-left align-top font-normal"
      />
    ) : (
      <th
        {...props}
        scope="col"
        className="border-b border-ink px-3 py-3 text-left align-top font-medium"
      />
    ),
  td: (props) => (
    <td
      {...props}
      className="border-b border-line px-3 py-3 text-left align-top"
    />
  ),
  a: ({ href = "", children, ...rest }) => {
    const internal = href.startsWith("/");
    const className = "link-draw font-medium text-oxblood";
    return internal ? (
      <Link href={href} className={className}>
        {children}
      </Link>
    ) : (
      <a
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        className={className}
        {...rest}
      >
        {children}
      </a>
    );
  },
  Data,
  AwaitingInfo,
};

export function MdxContent({ source }: { source: string }) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeRowHeaders],
        },
      }}
    />
  );
}
