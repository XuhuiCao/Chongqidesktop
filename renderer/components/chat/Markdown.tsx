interface MarkdownProps {
  content: string
}

export function Markdown({ content }: MarkdownProps) {
  // XSS-safe markdown rendering using a whitelist approach
  const formatContent = (text: string): DocumentFragment => {
    const fragment = document.createDocumentFragment()
    const lines = text.split('\n')
    let inCodeBlock = false
    let codeBlockLang = ''
    let codeBlockContent: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Handle code blocks
      const codeBlockMatch = line.match(/^```(\w*)/)
      if (codeBlockMatch && !inCodeBlock) {
        inCodeBlock = true
        codeBlockLang = codeBlockMatch[1] || ''
        codeBlockContent = []
        continue
      }

      if (line === '```' && inCodeBlock) {
        inCodeBlock = false
        const pre = document.createElement('pre')
        pre.className = 'code-block'
        pre.dataset.lang = codeBlockLang
        const code = document.createElement('code')
        code.textContent = codeBlockContent.join('\n')
        pre.appendChild(code)
        fragment.appendChild(pre)
        continue
      }

      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // Skip empty lines but add spacing
      if (line.trim() === '') {
        fragment.appendChild(document.createElement('br'))
        continue
      }

      // Parse inline content
      const p = parseInlineElements(line)
      if (p.childNodes.length > 0) {
        fragment.appendChild(p)
      }
    }

    return fragment
  }

  const parseInlineElements = (text: string): HTMLParagraphElement => {
    const p = document.createElement('p')
    p.style.margin = '0.5em 0'

    // Headers
    if (text.startsWith('### ')) {
      const h3 = document.createElement('h3')
      h3.textContent = text.substring(4)
      h3.style.margin = '0.5em 0'
      p.appendChild(h3)
      return p
    }
    if (text.startsWith('## ')) {
      const h2 = document.createElement('h2')
      h2.textContent = text.substring(3)
      h2.style.margin = '0.5em 0'
      p.appendChild(h2)
      return p
    }
    if (text.startsWith('# ')) {
      const h1 = document.createElement('h1')
      h1.textContent = text.substring(2)
      h1.style.margin = '0.5em 0'
      p.appendChild(h1)
      return p
    }

    // Lists
    if (text.startsWith('- ')) {
      const ul = document.createElement('ul')
      ul.style.margin = '0.5em 0'
      ul.style.paddingLeft = '1.5em'
      const li = document.createElement('li')
      parseInlineContent(text.substring(2), li)
      ul.appendChild(li)
      p.appendChild(ul)
      return p
    }

    // Regular paragraph with inline content
    parseInlineContent(text, p)
    return p
  }

  const parseInlineContent = (text: string, container: HTMLElement) => {
    let remaining = text

    while (remaining.length > 0) {
      // Links [text](url) - only allow http/https
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch && linkMatch.index !== undefined) {
        // Text before link
        if (linkMatch.index > 0) {
          container.appendChild(document.createTextNode(remaining.substring(0, linkMatch.index)))
        }

        const url = linkMatch[2]
        // Validate URL protocol
        if (isValidUrl(url)) {
          const a = document.createElement('a')
          a.textContent = linkMatch[1]
          a.href = url
          a.target = '_blank'
          a.rel = 'noopener noreferrer'
          a.style.color = '#5d7052'
          container.appendChild(a)
        } else {
          container.appendChild(document.createTextNode(linkMatch[1]))
        }

        remaining = remaining.substring(linkMatch.index + linkMatch[0].length)
        continue
      }

      // Inline code `code`
      const codeMatch = remaining.match(/`([^`]+)`/)
      if (codeMatch && codeMatch.index !== undefined) {
        if (codeMatch.index > 0) {
          container.appendChild(document.createTextNode(remaining.substring(0, codeMatch.index)))
        }

        const code = document.createElement('code')
        code.className = 'inline-code'
        code.textContent = codeMatch[1]
        container.appendChild(code)

        remaining = remaining.substring(codeMatch.index + codeMatch[0].length)
        continue
      }

      // Bold **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
      if (boldMatch && boldMatch.index !== undefined) {
        if (boldMatch.index > 0) {
          container.appendChild(document.createTextNode(remaining.substring(0, boldMatch.index)))
        }

        const strong = document.createElement('strong')
        strong.textContent = boldMatch[1]
        container.appendChild(strong)

        remaining = remaining.substring(boldMatch.index + boldMatch[0].length)
        continue
      }

      // Italic *text*
      const italicMatch = remaining.match(/\*([^*]+)\*/)
      if (italicMatch && italicMatch.index !== undefined) {
        if (italicMatch.index > 0) {
          container.appendChild(document.createTextNode(remaining.substring(0, italicMatch.index)))
        }

        const em = document.createElement('em')
        em.textContent = italicMatch[1]
        container.appendChild(em)

        remaining = remaining.substring(italicMatch.index + italicMatch[0].length)
        continue
      }

      // No more patterns, add remaining text
      container.appendChild(document.createTextNode(remaining))
      break
    }
  }

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  const containerRef = (node: HTMLDivElement | null) => {
    if (node) {
      node.innerHTML = ''
      const fragment = formatContent(content)
      node.appendChild(fragment)
    }
  }

  return (
    <div
      ref={containerRef}
      className="markdown-content"
      style={{
        lineHeight: '1.6',
        fontSize: '14px',
        wordBreak: 'break-word'
      }}
    />
  )
}

export default Markdown
