<template>
  <div class="ambient-shell" aria-hidden="true">
    <div class="ambient-shell__grid" />
    <div class="ambient-shell__lines" />
    <div class="ambient-shell__glow ambient-shell__glow--cyan" />
    <div class="ambient-shell__glow ambient-shell__glow--accent" />
  </div>
</template>

<style scoped>
.ambient-shell {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    linear-gradient(115deg, rgba(0, 212, 170, 0.08), transparent 26%),
    linear-gradient(245deg, rgba(255, 107, 44, 0.06), transparent 32%),
    #08090b;
}

.ambient-shell__grid,
.ambient-shell__lines {
  position: absolute;
  inset: 0;
}

.ambient-shell__grid {
  opacity: 0.72;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: linear-gradient(to bottom, black 0%, transparent 82%);
}

.ambient-shell__lines {
  opacity: 0.58;
  background:
    repeating-linear-gradient(
      115deg,
      transparent 0,
      transparent 56px,
      rgba(255, 255, 255, 0.035) 57px,
      transparent 58px
    );
}

.ambient-shell__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
}

.ambient-shell__glow--cyan {
  top: -12%;
  right: -8%;
  width: 42vw;
  height: 42vw;
  background: rgba(0, 212, 170, 0.14);
}

.ambient-shell__glow--accent {
  bottom: -18%;
  left: -6%;
  width: 36vw;
  height: 36vw;
  background: rgba(255, 107, 44, 0.1);
}
</style>
