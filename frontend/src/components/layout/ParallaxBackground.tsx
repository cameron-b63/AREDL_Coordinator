interface ParallaxBackgroundProps {
  offset: number;
}

export function ParallaxBackground({ offset }: ParallaxBackgroundProps) {
  return (
    <div
      class="parallax-bg"
      aria-hidden="true"
      style={{ transform: `translate3d(0, ${offset}px, 0)` }}
    >
      <div class="parallax-bg__grid" />
      <div class="parallax-bg__stripes" />
    </div>
  );
}
