import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const children = (element) => element ? [...element.children] : [];

// Text stays in the document and in its original flow. No letter splitting or
// animated heights: selection, focus, printing and screen readers stay intact.
export function useReadingReveal(root, { hero = false } = {}) {
  useGSAP((context, contextSafe) => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const node = root.current;
      if (!node) return;
      if (hero) {
        const intro = node.querySelectorAll(".back-link, .case-heading-grid .section-kicker, .case-heading h1, .case-subtitle, .case-position, .case-facts > div, .case-actions");
        const cover = node.querySelector(".case-cover");
        const timeline = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.7 } });
        timeline.from(intro, { opacity: 0, y: 22, stagger: 0.055, clearProps: "opacity,transform" }, 0.05);
        if (cover) timeline.from(cover, { opacity: 0, y: 30, scale: 0.985, clearProps: "opacity,transform" }, 0.2);
      }

      const nodes = [...node.querySelectorAll("[data-reading-reveal]")]
        .filter((element) => element.closest("[data-reading-scope]") === node);
      const reveal = contextSafe((element) => {
        // Do not leave off-screen material invisible. Apply the starting state
        // only at entry, which also keeps find-in-page and print dependable.
        const targets = children(element);
        gsap.from(targets.length ? targets : element, {
          opacity: 0, y: 18, duration: 0.65, stagger: 0.065,
          ease: "power3.out", clearProps: "opacity,transform",
        });
      });
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          reveal(entry.target);
        });
      }, { rootMargin: "0px 0px -4% 0px", threshold: 0.06 });
      nodes.forEach((element) => observer.observe(element));
      return () => observer.disconnect();
    }, root);
    return () => media.revert();
  }, { scope: root });
}

export function useReadingSelection(root, panelSelector) {
  const [selected, setSelected] = useState(0);
  const transition = useRef(null);
  const { contextSafe } = useGSAP(() => {
    if (reduceMotion()) return;
    const panel = root.current?.querySelector(panelSelector);
    if (!panel) return;
    gsap.fromTo(children(panel), { opacity: 0, y: 10 }, {
      opacity: 1, y: 0, duration: 0.38, stagger: 0.035,
      ease: "power2.out", clearProps: "opacity,transform",
    });
  }, { scope: root, dependencies: [selected], revertOnUpdate: true });

  const choose = (next) => contextSafe(() => {
    transition.current?.kill();
    if (next === selected) {
      gsap.set(children(root.current?.querySelector(panelSelector)), { clearProps: "opacity,transform" });
      return;
    }
    const panel = root.current?.querySelector(panelSelector);
    if (!panel || reduceMotion()) {
      setSelected(next);
      return;
    }
    transition.current = gsap.to(children(panel), {
      opacity: 0, y: -6, duration: 0.14, ease: "power1.in",
      overwrite: "auto", onComplete: () => setSelected(next),
    });
  })();
  return [selected, choose];
}

export function useProjectTransition(root, route) {
  const pending = useRef(null);
  const { contextSafe } = useGSAP(() => {}, {
    scope: root, dependencies: [route], revertOnUpdate: true,
  });
  return (event) => contextSafe(() => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduceMotion()) return;
    const link = event.target.closest?.("a[href^='#project/'], a[href='#process'], a[href='#about'], a[href='#reading/process'], a[href='#reading/about']");
    // The opening tree owns its own spatial click transition.
    if (!link || link.closest(".tree-experience") || link.target || link.hasAttribute("download")) return;
    const hash = link.getAttribute("href");
    if (hash === window.location.hash) return;
    event.preventDefault();
    pending.current?.kill();
    pending.current = gsap.to(root.current, {
      opacity: 0.14, duration: 0.22, ease: "power2.in",
      onComplete: () => { window.location.hash = hash; },
    });
  })();
}

export function useImageReveal(root, index) {
  useGSAP(() => {
    if (reduceMotion() || !root.current) return;
    gsap.fromTo(root.current.querySelector(".case-image-viewer-media"), {
      opacity: 0, scale: 0.97,
    }, { opacity: 1, scale: 1, duration: 0.38, ease: "power3.out", clearProps: "opacity,transform" });
  }, { scope: root, dependencies: [index], revertOnUpdate: true });
}
