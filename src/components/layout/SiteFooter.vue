<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const year = new Date().getFullYear()
const route = useRoute()

const worksHref = computed(() => (route.name === 'entry' ? '#works' : '/entry#works'))
const contactHref = computed(() => (route.name === 'entry' ? '#contact' : '/entry#contact'))

const contacts = [
  {
    id: 'email',
    label: 'Email',
    value: '2843422418@qq.com',
    href: 'mailto:2843422418@qq.com',
  },
  {
    id: 'phone',
    label: 'Phone',
    value: '13035103738',
    href: 'tel:13035103738',
  },
  {
    id: 'github',
    label: 'GitHub',
    value: 'jolaaa999',
    href: 'https://github.com/jolaaa999',
    external: true,
  },
] as const
</script>

<template>
  <footer class="site-footer" id="contact">
    <div class="site-footer__rule" aria-hidden="true" />

    <div class="site-footer__inner">
      <div class="site-footer__brand">
        <p class="site-footer__mark">jol</p>
        <p class="site-footer__tagline">
          Developer &amp; creator — building digital experiences with technical precision and fluid aesthetics.
        </p>
      </div>

      <div class="site-footer__contacts">
        <p class="site-footer__heading">Contact</p>
        <ul class="site-footer__list">
          <li v-for="item in contacts" :key="item.id" class="site-footer__item">
            <span class="site-footer__label">{{ item.label }}</span>
            <a
              class="site-footer__link"
              :href="item.href"
              :target="'external' in item && item.external ? '_blank' : undefined"
              :rel="'external' in item && item.external ? 'noopener noreferrer' : undefined"
            >
              {{ item.value }}
              <span v-if="'external' in item && item.external" aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
      </div>

      <div class="site-footer__nav">
        <p class="site-footer__heading">Navigate</p>
        <ul class="site-footer__list">
          <li class="site-footer__item">
            <RouterLink class="site-footer__link" to="/blog">Blog</RouterLink>
          </li>
          <li class="site-footer__item">
            <a class="site-footer__link" :href="worksHref">Works</a>
          </li>
          <li class="site-footer__item">
            <a class="site-footer__link" :href="contactHref">Contact</a>
          </li>
          <li class="site-footer__item">
            <a
              class="site-footer__link"
              href="https://github.com/jolaaa999"
              target="_blank"
              rel="noopener noreferrer"
            >
              Repositories
              <span aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div class="site-footer__bottom">
      <p class="site-footer__copy">
        © {{ year }} JOL. All rights reserved.
      </p>
      <p class="site-footer__legal">
        Built with Vue · Deployed on Vercel
      </p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: 5;
  max-width: var(--content-max, 72rem);
  margin: 0 auto;
  padding: 0 clamp(1.5rem, 4vw, 2.75rem) clamp(2.5rem, 6vh, 3.5rem);
}

.site-footer__rule {
  height: 1px;
  margin-bottom: clamp(2.25rem, 5vh, 3.25rem);
  background: linear-gradient(
    90deg,
    rgba(158, 216, 255, 0.45) 0%,
    rgba(192, 132, 252, 0.28) 40%,
    rgba(255, 255, 255, 0.06) 100%
  );
}

.site-footer__inner {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.8fr);
  gap: clamp(1.75rem, 4vw, 3rem);
  margin-bottom: clamp(2.25rem, 5vh, 3rem);
}

.site-footer__mark {
  margin: 0 0 0.85rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: lowercase;
  color: rgba(255, 255, 255, 0.92);
}

.site-footer__tagline {
  margin: 0;
  max-width: 22rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 300;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.4);
}

.site-footer__heading {
  margin: 0 0 1rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.32);
}

.site-footer__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.site-footer__item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.site-footer__label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.28);
}

.site-footer__link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 300;
  letter-spacing: 0.02em;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.72);
  transition: color 0.3s var(--ease-mechanical, cubic-bezier(0.22, 1, 0.36, 1));
}

.site-footer__link:hover {
  color: rgba(158, 216, 255, 0.95);
}

.site-footer__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1.35rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.site-footer__copy,
.site-footer__legal {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.28);
}

.site-footer__legal {
  text-align: right;
}

@media (max-width: 800px) {
  .site-footer__inner {
    grid-template-columns: 1fr 1fr;
  }

  .site-footer__brand {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .site-footer {
    padding: 0 1.25rem 2.5rem;
  }

  .site-footer__inner {
    grid-template-columns: 1fr;
    gap: 1.75rem;
  }

  .site-footer__bottom {
    flex-direction: column;
    align-items: flex-start;
  }

  .site-footer__legal {
    text-align: left;
  }
}
</style>
