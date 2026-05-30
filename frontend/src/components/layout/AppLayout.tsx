import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import { useParallax } from '../../hooks/useParallax';
import { ParallaxBackground } from './ParallaxBackground';

interface AppLayoutProps {
  progress: ComponentChildren;
  header: ComponentChildren;
  children: ComponentChildren;
}

export function AppLayout({ progress, header, children }: AppLayoutProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const parallaxOffset = useParallax(mainRef, 0.08);

  return (
    <div class="app-shell">
      <ParallaxBackground offset={parallaxOffset} />
      <div class="app-chrome">
        {progress}
        <header class="app-header">{header}</header>
      </div>
      <div ref={mainRef} class="app-main">
        {children}
      </div>
    </div>
  );
}
