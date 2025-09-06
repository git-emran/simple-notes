import { LanguageDescription, StreamLanguage, LanguageSupport } from '@codemirror/language'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { sql } from '@codemirror/lang-sql'
import { php } from '@codemirror/lang-php'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { rust } from '@codemirror/lang-rust'
import { go } from '@codemirror/lang-go'
import { languages } from '@codemirror/language-data'

export const codeLanguages = [
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['javascript', 'js', 'jsx', 'node'],
    extensions: ['js', 'jsx', 'mjs', 'cjs'],
    load() {
      return Promise.resolve(javascript())
    }
  }),
  LanguageDescription.of({
    name: 'TypeScript',
    alias: ['typescript', 'ts', 'tsx'],
    extensions: ['ts', 'tsx'],
    load() {
      return Promise.resolve(javascript({ typescript: true }))
    }
  }),
  LanguageDescription.of({
    name: 'Python',
    alias: ['python', 'py'],
    extensions: ['py', 'pyw'],
    load() {
      return Promise.resolve(python())
    }
  }),
  LanguageDescription.of({
    name: 'HTML',
    alias: ['html', 'htm'],
    extensions: ['html', 'htm', 'xhtml'],
    load() {
      return Promise.resolve(html())
    }
  }),
  LanguageDescription.of({
    name: 'CSS',
    alias: ['css'],
    extensions: ['css'],
    load() {
      return Promise.resolve(css())
    }
  }),
  LanguageDescription.of({
    name: 'JSON',
    alias: ['json'],
    extensions: ['json'],
    load() {
      return Promise.resolve(json())
    }
  }),
  LanguageDescription.of({
    name: 'XML',
    alias: ['xml'],
    extensions: ['xml'],
    load() {
      return Promise.resolve(xml())
    }
  }),
  LanguageDescription.of({
    name: 'SQL',
    alias: ['sql'],
    extensions: ['sql'],
    load() {
      return Promise.resolve(sql())
    }
  }),
  LanguageDescription.of({
    name: 'PHP',
    alias: ['php'],
    extensions: ['php'],
    load() {
      return Promise.resolve(php())
    }
  }),
  LanguageDescription.of({
    name: 'Java',
    alias: ['java'],
    extensions: ['java'],
    load() {
      return Promise.resolve(java())
    }
  }),
  LanguageDescription.of({
    name: 'C++',
    alias: ['cpp', 'c++', 'cxx', 'cc', 'c'],
    extensions: ['cpp', 'cxx', 'cc', 'c', 'h'],
    load() {
      return Promise.resolve(cpp())
    }
  }),
  LanguageDescription.of({
    name: 'Rust',
    alias: ['rust', 'rs'],
    extensions: ['rs'],
    load() {
      return Promise.resolve(rust())
    }
  }),
  LanguageDescription.of({
    name: 'Go',
    alias: ['go', 'golang'],
    extensions: ['go'],
    load() {
      return Promise.resolve(go())
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
                'if',
                'then',
                'else',
                'elif',
                'fi',
                'for',
                'while',
                'do',
                'done',
                'case',
                'esac',
                'function'
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
