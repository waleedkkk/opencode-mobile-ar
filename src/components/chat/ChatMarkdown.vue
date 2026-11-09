<template>
  <div
    class="chat-markdown prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed"
    v-html="renderedHtml"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import { useI18n } from '@/i18n'

const props = defineProps<{
  content: string
}>()

const { t } = useI18n()

const md = new MarkdownIt({
  html: false, // Prevents XSS by escaping HTML tags
  breaks: true,
  linkify: true,
})

// Custom fence renderer to wrap code blocks with LTR isolation and copy button
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]
  const info = token.info ? token.info.trim() : ''
  const lang = info ? info.split(/\s+/)[0] : 'text'
  const code = token.content

  const encodedCode = encodeURIComponent(code)
  const escapedCode = md.utils.escapeHtml(code)
  const copyLabel = t('chat.copy') || 'Copy'

  let formattedCode = escapedCode
  if (lang === 'diff' || lang === 'patch') {
    formattedCode = code
      .split('\n')
      .map((line) => {
        const escaped = md.utils.escapeHtml(line)
        if (line.startsWith('+') && !line.startsWith('+++')) {
          return `<span class="bg-green-500/15 text-green-700 dark:text-green-300 block -mx-3 px-3">${escaped}</span>`
        }
        if (line.startsWith('-') && !line.startsWith('---')) {
          return `<span class="bg-destructive/15 text-destructive block -mx-3 px-3">${escaped}</span>`
        }
        if (line.startsWith('@@')) {
          return `<span class="text-muted-foreground/70 block -mx-3 px-3 text-[11px] italic">${escaped}</span>`
        }
        return `<span class="block -mx-3 px-3">${escaped}</span>`
      })
      .join('')
  }

  return `<div data-code-block dir="ltr" class="my-3 rounded-xl overflow-hidden border border-border bg-muted/50 text-left font-mono text-xs">
  <div class="flex items-center justify-between px-3 py-1.5 bg-muted/90 border-b border-border text-muted-foreground text-[11px] select-none">
    <span class="font-medium uppercase">${lang}</span>
    <button type="button" data-action="copy-code" data-code="${encodedCode}" class="inline-flex items-center gap-1 hover:text-foreground transition-colors py-0.5 px-1.5 rounded cursor-pointer" aria-label="Copy code">
      <span data-copy-label>${copyLabel}</span>
    </button>
  </div>
  <pre class="p-3 overflow-x-auto m-0!"><code class="language-${lang}">${formattedCode}</code></pre>
</div>`
}

// Open links safely in new tab
const defaultLinkOpen = md.renderer.rules.link_open || function (tokens, idx, options, _env, self) {
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

// Wrap indented code blocks in LTR container
md.renderer.rules.code_block = (tokens, idx) => {
  const code = tokens[idx].content
  const escapedCode = md.utils.escapeHtml(code)
  return `<div data-code-block dir="ltr" class="my-3 rounded-xl overflow-hidden border border-border bg-muted/50 text-left font-mono text-xs"><pre class="p-3 overflow-x-auto m-0!"><code>${escapedCode}</code></pre></div>`
}

const renderedHtml = computed(() => {
  return md.render(props.content || '')
})

function handleClick(e: MouseEvent): void {
  const target = (e.target as HTMLElement)?.closest('[data-action="copy-code"]') as HTMLElement | null
  if (!target) return

  const encoded = target.getAttribute('data-code')
  const code = encoded ? decodeURIComponent(encoded) : ''

  if (code && navigator.clipboard) {
    void navigator.clipboard.writeText(code)
    const labelSpan = target.querySelector('[data-copy-label]')
    if (labelSpan) {
      const original = labelSpan.textContent
      labelSpan.textContent = t('chat.copied') || 'Copied!'
      setTimeout(() => {
        labelSpan.textContent = original
      }, 2000)
    }
  }
}
</script>

<style scoped>
.chat-markdown :deep(p) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.chat-markdown :deep(p:first-child) {
  margin-top: 0;
}
.chat-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-markdown :deep(ul), .chat-markdown :deep(ol) {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding-inline-start: 1.25rem;
}
.chat-markdown :deep(li) {
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}
.chat-markdown :deep(a) {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.chat-markdown :deep(code:not(pre code)) {
  padding: 0.2em 0.4em;
  border-radius: 4px;
  background-color: var(--muted);
  font-family: monospace;
  font-size: 0.85em;
  direction: ltr;
  unicode-bidi: isolate;
}
</style>
