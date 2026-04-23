"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = ".reveal-up, .reveal-zoom";

export function ScrollReveal() {
  useEffect(() => {
    const targets = () =>
      Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets().forEach((element) => element.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const element = entry.target as HTMLElement;
          element.classList.add("in-view");
          observer.unobserve(element);
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -10% 0px",
      },
    );

    targets().forEach((element) => observer.observe(element));

    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.matches(REVEAL_SELECTOR)) {
            observer.observe(node);
          }

          node
            .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
            .forEach((child) => observer.observe(child));
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}
