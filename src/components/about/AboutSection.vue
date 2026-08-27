<script setup lang="ts">
import { ABOUT_COPY, SITE, SKILLS } from '@/data/site'
import ExperienceTimeline from '@/components/about/ExperienceTimeline.vue'
</script>

<template>
  <section id="about" class="about" aria-labelledby="about-title">
    <div class="about__rule" aria-hidden="true" />

    <header class="about__intro">
      <p class="about__eyebrow iridescent iridescent--hero">About</p>
      <h2 id="about-title" class="about__title">{{ ABOUT_COPY.headline }}</h2>
      <p class="about__lead">{{ ABOUT_COPY.lead }}</p>
    </header>

    <div class="about__grid">
      <div class="about__card glass-fluid">
        <div class="about__profile">
          <div class="about__avatar" aria-hidden="true">J</div>
          <div>
            <p class="about__name">{{ SITE.author.name }}</p>
            <p class="about__bio">{{ SITE.author.bio }}</p>
          </div>
        </div>
        <a class="about__resume" :href="SITE.resumeUrl" download>
          下载简历 PDF
          <span aria-hidden="true">↓</span>
        </a>
      </div>

      <div class="about__card glass-fluid">
        <p class="about__heading">Skills</p>
        <ul class="about__skills">
          <li v-for="skill in SKILLS" :key="skill.name" class="about__skill">
            <span class="about__skill-name">{{ skill.name }}</span>
            <div class="about__skill-bar" aria-hidden="true">
              <span class="about__skill-fill" :style="{ width: `${skill.level}%` }" />
            </div>
          </li>
        </ul>
      </div>

      <div class="about__card glass-fluid about__card--wide">
        <p class="about__heading">Values</p>
        <ul class="about__values">
          <li v-for="v in ABOUT_COPY.values" :key="v.id" class="about__value">
            <span class="about__value-label">{{ v.label }}</span>
            <span class="about__value-text">{{ v.text }}</span>
          </li>
        </ul>
      </div>

      <div class="about__card glass-fluid about__card--wide">
        <p class="about__heading">Experience</p>
        <ExperienceTimeline />
      </div>
    </div>
  </section>
</template>

<style scoped>
.about {
  position: relative;
  z-index: 5;
  max-width: var(--content-max, 72rem);
  margin: 0 auto;
  padding: clamp(3rem, 8vh, 5rem) clamp(1.5rem, 4vw, 2.75rem);
}

.about__rule {
  height: 1px;
  margin-bottom: clamp(2rem, 5vh, 3rem);
  background: linear-gradient(90deg, rgba(158, 216, 255, 0.45), rgba(192, 132, 252, 0.28), transparent);
}

.about__eyebrow {
  margin: 0 0 1rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.28em;
  text-transform: uppercase;
}

.about__title {
  margin: 0 0 1rem;
  max-width: 20em;
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  line-height: 1.1;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}

.about__lead {
  margin: 0;
  max-width: 36rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.55);
}

.about__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.about__card {
  padding: 1.35rem 1.5rem;
}

.about__card--wide {
  grid-column: 1 / -1;
}

.about__profile {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.about__avatar {
  width: 3rem;
  height: 3rem;
  display: grid;
  place-items: center;
  border: 1px solid rgba(158, 216, 255, 0.35);
  font-family: var(--font-mono);
  font-size: 1.1rem;
  color: #9ed8ff;
  background: rgba(158, 216, 255, 0.08);
}

.about__name {
  margin: 0 0 0.35rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.about__bio {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.52);
}

.about__resume {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-decoration: none;
  color: #9ed8ff;
  border: 1px solid rgba(158, 216, 255, 0.3);
  padding: 0.45rem 0.75rem;
  transition: background 0.3s var(--ease-mechanical);
}

.about__resume:hover {
  background: rgba(158, 216, 255, 0.1);
}

.about__heading {
  margin: 0 0 1rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

.about__skills {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.about__skill-name {
  display: block;
  margin-bottom: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.7);
}

.about__skill-bar {
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
}

.about__skill-fill {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #9ed8ff, #c084fc);
}

.about__values {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.about__value-label {
  display: block;
  margin-bottom: 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c084fc;
}

.about__value-text {
  font-size: 0.8125rem;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.55);
}

@media (max-width: 800px) {
  .about__grid {
    grid-template-columns: 1fr;
  }

  .about__values {
    grid-template-columns: 1fr;
  }
}
</style>
