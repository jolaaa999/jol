<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useSeo } from '@/composables/useSeo'

const TOKEN_KEY = 'jol-admin-token'

useSeo({
  title: 'Admin · Write',
  description: 'Publish a new journal entry.',
  path: '/blog/admin',
})

const token = ref('')
const title = ref('')
const category = ref<'有感' | '诗文'>('有感')
const tagsRaw = ref('')
const content = ref('')
const status = ref<'idle' | 'saving' | 'ok' | 'error'>('idle')
const message = ref('')
const lastId = ref('')

const canSubmit = computed(
  () => token.value.trim().length > 0 && title.value.trim().length > 0 && content.value.trim().length > 0,
)

onMounted(() => {
  token.value = localStorage.getItem(TOKEN_KEY) ?? ''
})

function persistToken(): void {
  const t = token.value.trim()
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

function parseTags(raw: string): string[] {
  return raw
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

async function submit(): Promise<void> {
  if (!canSubmit.value || status.value === 'saving') return

  persistToken()
  status.value = 'saving'
  message.value = ''
  lastId.value = ''

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.value.trim()}`,
      },
      body: JSON.stringify({
        title: title.value.trim(),
        category: category.value,
        content: content.value.trim(),
        tags: parseTags(tagsRaw.value),
      }),
    })

    const data = (await res.json()) as {
      data?: { id?: string }
      error?: string
      message?: string
    }

    if (!res.ok) {
      status.value = 'error'
      message.value = data.message || data.error || `HTTP ${res.status}`
      return
    }

    status.value = 'ok'
    lastId.value = data.data?.id ?? ''
    message.value = lastId.value ? `已发布：${lastId.value}` : '已发布'
    title.value = ''
    tagsRaw.value = ''
    content.value = ''
  } catch (err) {
    status.value = 'error'
    message.value = err instanceof Error ? err.message : 'network error'
  }
}
</script>

<template>
  <main class="admin">
    <header class="admin__head">
      <p class="admin__eyebrow">Operator Console</p>
      <h1 class="admin__title">发布文章</h1>
      <p class="admin__lead">
        写入 MySQL。需配置 <code>MYSQL_DSN</code> 与 <code>ADMIN_TOKEN</code>。
      </p>
      <RouterLink class="admin__back" to="/blog">← 返回博客</RouterLink>
    </header>

    <form class="admin__form" @submit.prevent="submit">
      <label class="field">
        <span class="field__label">Admin Token</span>
        <input
          v-model="token"
          class="field__input"
          type="password"
          autocomplete="current-password"
          placeholder="与环境变量 ADMIN_TOKEN 一致"
          @change="persistToken"
        />
      </label>

      <label class="field">
        <span class="field__label">标题</span>
        <input v-model="title" class="field__input" type="text" maxlength="255" required />
      </label>

      <div class="field-row">
        <label class="field">
          <span class="field__label">分类</span>
          <select v-model="category" class="field__input">
            <option value="有感">有感</option>
            <option value="诗文">诗文</option>
          </select>
        </label>

        <label class="field">
          <span class="field__label">标签</span>
          <input
            v-model="tagsRaw"
            class="field__input"
            type="text"
            placeholder="design, vue（逗号分隔）"
          />
        </label>
      </div>

      <label class="field">
        <span class="field__label">正文（Markdown）</span>
        <textarea
          v-model="content"
          class="field__textarea"
          rows="16"
          required
          placeholder="## 标题&#10;&#10;正文…"
        />
      </label>

      <div class="admin__actions">
        <button class="admin__submit" type="submit" :disabled="!canSubmit || status === 'saving'">
          {{ status === 'saving' ? '发布中…' : '发布' }}
        </button>
        <p
          v-if="message"
          class="admin__msg"
          :class="{ 'is-ok': status === 'ok', 'is-err': status === 'error' }"
        >
          <template v-if="status === 'ok' && lastId">
            {{ message }}
            ·
            <RouterLink :to="`/blog/post/${lastId}`">查看</RouterLink>
          </template>
          <template v-else>{{ message }}</template>
        </p>
      </div>
    </form>
  </main>
</template>

<style scoped>
.admin {
  max-width: 44rem;
  margin: 0 auto;
  padding: clamp(2.5rem, 6vh, 4rem) 1.5rem 5rem;
  color: var(--text-primary, #f4f4f5);
}

.admin__head {
  margin-bottom: 2.5rem;
}

.admin__eyebrow {
  margin: 0 0 0.75rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.625rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--text-muted, #747887);
}

.admin__title {
  margin: 0 0 0.75rem;
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.05;
}

.admin__lead {
  margin: 0 0 1rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text-secondary, #7c8090);
}

.admin__lead code {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.8125rem;
  color: var(--accent, #7187ff);
}

.admin__back {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-decoration: none;
  color: var(--text-muted, #747887);
}

.admin__back:hover {
  color: var(--accent, #7187ff);
}

.admin__form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.field__label {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-muted, #747887);
}

.field__input,
.field__textarea {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  background: rgba(8, 8, 16, 0.55);
  color: inherit;
  font: inherit;
  outline: none;
  transition: border-color 0.25s ease;
}

.field__textarea {
  resize: vertical;
  min-height: 18rem;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.875rem;
  line-height: 1.65;
}

.field__input:focus,
.field__textarea:focus {
  border-color: rgba(113, 135, 255, 0.55);
}

.admin__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  padding-top: 0.5rem;
}

.admin__submit {
  padding: 0.7rem 1.4rem;
  border: 1px solid rgba(113, 135, 255, 0.45);
  border-radius: 2px;
  background: rgba(113, 135, 255, 0.12);
  color: #c8d0ff;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.25s ease,
    border-color 0.25s ease;
}

.admin__submit:hover:not(:disabled) {
  background: rgba(113, 135, 255, 0.22);
  border-color: rgba(113, 135, 255, 0.75);
}

.admin__submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.admin__msg {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted, #747887);
}

.admin__msg.is-ok {
  color: #8fd4a8;
}

.admin__msg.is-err {
  color: #f0a0a0;
}

.admin__msg a {
  color: var(--accent, #7187ff);
}

@media (max-width: 620px) {
  .field-row {
    grid-template-columns: 1fr;
  }
}
</style>
