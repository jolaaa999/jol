<script setup lang="ts">
import { ref } from 'vue'
import { SITE } from '@/data/site'

const email = ref('')
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const message = ref('')

async function submit(): Promise<void> {
  if (!email.value.trim()) return
  status.value = 'loading'
  message.value = ''

  try {
    const res = await fetch(SITE.newsletter.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim() }),
    })

    const data = (await res.json().catch(() => ({}))) as {
      message?: string
      error?: string
    }

    if (!res.ok) {
      status.value = 'error'
      message.value =
        data.message ||
        (res.status === 502
          ? '邮件服务连接失败，请检查 Vercel 环境变量后重新部署。'
          : '订阅失败，请稍后重试或直接邮件联系。')
      return
    }

    status.value = 'success'
    message.value = '已订阅。请查收确认邮件（可能在垃圾箱）。'
    email.value = ''
  } catch {
    status.value = 'error'
    message.value = '网络异常，请稍后重试或直接邮件联系。'
  }
}
</script>

<template>
  <section v-if="SITE.newsletter.enabled" class="newsletter glass-fluid" aria-label="邮件订阅">
    <p class="newsletter__heading">Newsletter</p>
    <p class="newsletter__lead">新文章发布时收到通知（低频，无垃圾邮件）。</p>
    <form class="newsletter__form" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        class="newsletter__input"
        placeholder="your@email.com"
        required
        autocomplete="email"
        :disabled="status === 'loading'"
      />
      <button type="submit" class="newsletter__btn" :disabled="status === 'loading'">
        {{ status === 'loading' ? '…' : 'Subscribe' }}
      </button>
    </form>
    <p v-if="message" class="newsletter__msg" :class="status">{{ message }}</p>
  </section>
</template>

<style scoped>
.newsletter {
  padding: 1.25rem 1.35rem;
  margin-top: 2rem;
}

.newsletter__heading {
  margin: 0 0 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
}

.newsletter__lead {
  margin: 0 0 1rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
}

.newsletter__form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.newsletter__input {
  flex: 1;
  min-width: 12rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0;
  background: rgba(0, 0, 0, 0.25);
  color: rgba(255, 255, 255, 0.9);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.newsletter__input:focus {
  outline: none;
  border-color: rgba(158, 216, 255, 0.45);
}

.newsletter__input:disabled {
  opacity: 0.6;
}

.newsletter__btn {
  padding: 0.55rem 1rem;
  border: 1px solid rgba(158, 216, 255, 0.35);
  background: rgba(158, 216, 255, 0.08);
  color: #9ed8ff;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.3s var(--ease-mechanical);
}

.newsletter__btn:hover:not(:disabled) {
  background: rgba(158, 216, 255, 0.16);
}

.newsletter__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.newsletter__msg {
  margin: 0.75rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
}

.newsletter__msg.success {
  color: #9ed8ff;
}

.newsletter__msg.error {
  color: #f0abfc;
}
</style>
