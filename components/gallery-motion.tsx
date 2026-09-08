'use client';
import { useEffect, useRef, type ReactNode } from 'react';

// The skill's observer/reveal pattern, scoped and cleaned up per mounted surface.
export function GalleryReveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { element.dataset.visible = 'true'; observer.disconnect(); }
    }, { threshold: .08 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`gallery-reveal ${className}`} style={{ animationDelay: `${Math.min(delay, 240)}ms` }}>{children}</div>;
}

export function GalleryMasonry({ children, layoutKey }: { children: ReactNode; layoutKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const grid = ref.current;
    if (!grid) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const style = getComputedStyle(grid);
      const row = parseFloat(style.gridAutoRows);
      const gap = parseFloat(style.rowGap);
      if (!Number.isFinite(row) || !row) return;
      Array.from(grid.children).forEach((item) => {
        const content = item.firstElementChild;
        if (item instanceof HTMLElement && content) {
          const span = Math.ceil((content.getBoundingClientRect().height + gap) / (row + gap));
          if (item.style.gridRowEnd !== `span ${span}`) item.style.gridRowEnd = `span ${span}`;
        }
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(grid);
    Array.from(grid.children).forEach(item => { if (item.firstElementChild) observer.observe(item.firstElementChild); });
    schedule();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [layoutKey, children]);
  return <div ref={ref} className="gallery-feed">{children}</div>;
}

export function GalleryAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 900px)');
    let frame = 0;
    let visible = true;
    const update = () => {
      frame = 0;
      const active = visible && !document.hidden && !reduce.matches && desktop.matches;
      element.dataset.active = String(active);
      element.style.setProperty('--ambient-y', `${active ? Math.min(8, scrollY * .025) : 0}px`);
    };
    const scroll = () => { if (!frame && visible) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); });
    observer.observe(element);
    addEventListener('scroll', scroll, { passive: true });
    document.addEventListener('visibilitychange', update);
    reduce.addEventListener('change', update);
    desktop.addEventListener('change', update);
    update();
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame);
      removeEventListener('scroll', scroll);
      document.removeEventListener('visibilitychange', update);
      reduce.removeEventListener('change', update);
      desktop.removeEventListener('change', update);
    };
  }, []);
  return <div ref={ref} className="gallery-ambient" aria-hidden="true" />;
}
