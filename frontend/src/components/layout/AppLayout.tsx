import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { useParallax } from '../../hooks/useParallax';
import { ParallaxBackground } from './ParallaxBackground';

interface AppLayoutProps {
  header: ComponentChildren;
  children: ComponentChildren;
}

export function AppLayout({ header, children }: AppLayoutProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const parallaxOffset = useParallax(mainRef, 0.08);

  return (
    <div class="app-shell">
      <ParallaxBackground offset={parallaxOffset} />
      <header class="app-header">{header}</header>
      <div ref={mainRef} class="app-main">
        {children}
      </div>
    </div>
  );
}
