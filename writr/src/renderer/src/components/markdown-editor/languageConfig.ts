import { LanguageDescription, StreamLanguage, LanguageSupport } from '@codemirror/language'
import { languages } from '@codemirror/language-data'

// Cache to store loaded language support objects
const languageCache = new Map<string, LanguageSupport>()

async function getLanguageSupport(name: string, loader: () => Promise<LanguageSupport>): Promise<LanguageSupport> {
  if (languageCache.has(name)) return languageCache.get(name)!
  const support = await loader()
  languageCache.set(name, support)
  return support
}

export const codeLanguages = [
  LanguageDescription.of({
    name: 'javascript',
    alias: ['javascript', 'js', 'jsx', 'node'],
    extensions: ['js', 'jsx', 'mjs', 'cjs'],
    async load() {
      return getLanguageSupport('javascript', () => 
        import('@codemirror/lang-javascript').then((m) => m.javascript())
      )
    }
  }),
  LanguageDescription.of({
    name: 'typescript',
    alias: ['typescript', 'ts', 'tsx'],
    extensions: ['ts', 'tsx'],
    async load() {
      return getLanguageSupport('typescript', () => 
        import('@codemirror/lang-javascript').then((m) => m.javascript({ typescript: true }))
      )
    }
  }),
  LanguageDescription.of({
    name: 'python',
    alias: ['python', 'py'],
    extensions: ['py', 'pyw'],
    async load() {
      return getLanguageSupport('python', () => 
        import('@codemirror/lang-python').then((m) => m.python())
      )
    }
  }),
  LanguageDescription.of({
    name: 'html',
    alias: ['html', 'htm'],
    extensions: ['html', 'htm', 'xhtml'],
    async load() {
      return getLanguageSupport('html', () => 
        import('@codemirror/lang-html').then((m) => m.html())
      )
    }
  }),
  LanguageDescription.of({
    name: 'css',
    alias: ['css'],
    extensions: ['css'],
    async load() {
      return getLanguageSupport('css', () => 
        import('@codemirror/lang-css').then((m) => m.css())
      )
    }
  }),
  LanguageDescription.of({
    name: 'json',
    alias: ['json'],
    extensions: ['json'],
    async load() {
      return getLanguageSupport('json', () => 
        import('@codemirror/lang-json').then((m) => m.json())
      )
    }
  }),
  LanguageDescription.of({
    name: 'xml',
    alias: ['xml'],
    extensions: ['xml'],
    async load() {
      return getLanguageSupport('xml', () => 
        import('@codemirror/lang-xml').then((m) => m.xml())
      )
    }
  }),
  LanguageDescription.of({
    name: 'sql',
    alias: ['sql'],
    extensions: ['sql'],
    async load() {
      return getLanguageSupport('sql', () => 
        import('@codemirror/lang-sql').then((m) => m.sql({ dialect: m.StandardSQL }))
      )
    }
  }),
  LanguageDescription.of({
    name: 'php',
    alias: ['php'],
    extensions: ['php'],
    async load() {
      return getLanguageSupport('php', () => 
        import('@codemirror/lang-php').then((m) => m.php())
      )
    }
  }),
  LanguageDescription.of({
    name: 'java',
    alias: ['java'],
    extensions: ['java'],
    async load() {
      return getLanguageSupport('java', () => 
        import('@codemirror/lang-java').then((m) => m.java())
      )
    }
  }),
  LanguageDescription.of({
    name: 'cpp',
    alias: ['cpp', 'c++', 'cxx', 'cc', 'c', 'C++', 'CPP'],
    extensions: ['cpp', 'cxx', 'cc', 'c', 'h', 'hpp', 'hxx'],
    async load() {
      return getLanguageSupport('cpp', () => 
        import('@codemirror/lang-cpp').then((m) => m.cpp())
      )
    }
  }),
  LanguageDescription.of({
    name: 'rust',
    alias: ['rust', 'rs'],
    extensions: ['rs'],
    async load() {
      return getLanguageSupport('rust', () => 
        import('@codemirror/lang-rust').then((m) => m.rust())
      )
    }
  }),
  LanguageDescription.of({
    name: 'go',
    alias: ['go', 'golang'],
    extensions: ['go'],
    async load() {
      return getLanguageSupport('go', () => 
        import('@codemirror/lang-go').then((m) => m.go())
      )
    }
  }),
  LanguageDescription.of({
    name: 'Shell',
    alias: ['bash', 'sh', 'shell', 'zsh'],
    extensions: ['sh', 'bash'],
    load() {
      const shellLang = StreamLanguage.define({
        startState() {
          return {}
        },
        token(stream) {
          if (stream.match(/^#.*/)) return 'comment'
          if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
            const word = stream.current()
            if (
              [
                'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function'
              ].includes(word)
            ) {
              return 'keyword'
            }
            return 'variableName'
          }
          if (stream.match(/^["'][^"']*["']/)) return 'string'
          if (stream.match(/^\$[a-zA-Z_][a-zA-Z0-9_]*/)) return 'variableName'
          stream.next()
          return null
        }
      })
      return Promise.resolve(new LanguageSupport(shellLang))
    }
  }),
  ...languages
]
