"use client";

import { ReactNode, useEffect, useRef, useState } from "react";

/**
 * Reveal — CSS-only viewport enter animation.
 *
 * Previously implemented with framer-motion (whileInView). Now a tiny
 * IntersectionObserver + a single CSS class swap, saving ~30 KB gz of
 * Motion runtime on the critical path.
 *
 * The motion (opacity 0→1, translateY 24px→0) lives in `globals.css`
 * under `.reveal` + `.reveal.is-in`, with a prefers-reduced-motion fallback
 * that strips the transform and shortens the duration.
 */

type RevealAs = "div" | "span" | "h2" | "h3" | "p" | "li";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  as?: RevealAs;
  className?: string;
};

function useInViewOnce<T extends Element>(rootMargin = "-10% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
            return;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return [ref, inView] as const;
}

export function Reveal({
  children,
  delay = 0,
  as = "div",
  className,
}: RevealProps) {
  const [ref, inView] = useInViewOnce<HTMLElement>();
  const Tag = as as unknown as React.FC<
    React.HTMLAttributes<HTMLElement> & {
      ref?: React.Ref<HTMLElement>;
      style?: React.CSSProperties;
    }
  >;

  return (
    <Tag
      ref={ref}
      className={`reveal${inView ? " is-in" : ""}${className ? ` ${className}` : ""}`}
      style={delay ? { transitionDelay: `${delay * 1000}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

type MaskRevealProps = {
  lines: string[];
  className?: string;
  lineClassName?: string;
  stagger?: number;
  delay?: number;
  as?: "div" | "h1" | "h2" | "h3" | "p";
  ariaLabel?: string;
};

export function MaskReveal({
  lines,
  className,
  lineClassName,
  stagger = 0.08,
  delay = 0,
  as = "div",
  ariaLabel,
}: MaskRevealProps) {
  const [ref, inView] = useInViewOnce<HTMLElement>("0px");
  const Tag = as as unknown as React.FC<
    React.HTMLAttributes<HTMLElement> & {
      ref?: React.Ref<HTMLElement>;
      "aria-label"?: string;
    }
  >;

  return (
    <Tag ref={ref} className={className} aria-label={ariaLabel}>
      {lines.map((line, i) => (
        <span
          key={i}
          className={`mask-line${inView ? " is-in" : ""}${lineClassName ? ` ${lineClassName}` : ""}`}
          style={{
            transitionDelay: `${delay + i * stagger}s`,
          }}
          aria-hidden={ariaLabel ? true : undefined}
        >
          <span className="mask-line-inner">{line}</span>
        </span>
      ))}
    </Tag>
  );
}
