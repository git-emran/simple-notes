const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const loadTsModule = (relativePath) => {
  const sourcePath = path.join(__dirname, relativePath)
  const source = fs.readFileSync(sourcePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText

  const moduleUnderTest = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(
    require,
    moduleUnderTest,
    moduleUnderTest.exports
  )
  return moduleUnderTest.exports
}

const {
  buildMoveDestination,
  canMovePathToDirectory,
  getBasenameFromPath,
  getParentPath,
  isSameOrDescendantPath,
  joinPath
} = loadTsModule('src/renderer/src/utils/fileTreeDrag.ts')

const {
  buildMarkdownToc,
  getHastNodeText,
  groupMarkdownSections,
  slugifyMarkdownHeading
} = loadTsModule('src/renderer/src/components/markdown-editor/MarkdownPreview.helpers.ts')

assert.equal(getBasenameFromPath('/notes/Projects/App.md'), 'App.md')
assert.equal(getBasenameFromPath('C:\\notes\\Projects\\App.md'), 'App.md')
assert.equal(getParentPath('/notes/Projects/App.md'), '/notes/Projects')
assert.equal(getParentPath('C:\\notes\\Projects\\App.md'), 'C:\\notes\\Projects')
assert.equal(joinPath('/notes/Projects', 'Inbox'), '/notes/Projects/Inbox')
assert.equal(joinPath('C:\\notes\\Projects', 'Inbox'), 'C:\\notes\\Projects\\Inbox')

assert.equal(buildMoveDestination('/notes/Inbox', '/notes/Archive'), '/notes/Archive/Inbox')
assert.equal(
  buildMoveDestination('C:\\notes\\Inbox', 'C:\\notes\\Archive'),
  'C:\\notes\\Archive\\Inbox'
)

assert.equal(isSameOrDescendantPath('/notes/Inbox', '/notes/Inbox'), true)
assert.equal(isSameOrDescendantPath('/notes/Inbox/Nested', '/notes/Inbox'), true)
assert.equal(isSameOrDescendantPath('/notes/Inboxish', '/notes/Inbox'), false)

assert.equal(canMovePathToDirectory('/notes/Inbox', '/notes', 'folder'), false)
assert.equal(canMovePathToDirectory('/notes/Archive/Inbox', '/notes', 'folder'), true)
assert.equal(canMovePathToDirectory('/notes/Inbox', '/notes/Archive', 'folder'), true)
assert.equal(canMovePathToDirectory('/notes/Inbox', '/notes/Inbox', 'folder'), false)
assert.equal(canMovePathToDirectory('/notes/Inbox', '/notes/Inbox/Nested', 'folder'), false)
assert.equal(canMovePathToDirectory('/notes/Inbox/App.md', '/notes/Inbox', 'file'), false)
assert.equal(canMovePathToDirectory('/notes/Inbox/App.md', '/notes/Archive', 'file'), true)

assert.equal(slugifyMarkdownHeading('Hello, Production Notes!'), 'hello-production-notes')
assert.deepEqual(
  buildMarkdownToc(
    [
      '# Intro',
      '',
      '```',
      '# Ignored',
      '```',
      '## [Details](./details.md)',
      '## Details',
      '### `Nested` *Item*'
    ].join('\n')
  ),
  [
    { level: 1, text: 'Intro', id: 'intro' },
    { level: 2, text: 'Details', id: 'details' },
    { level: 2, text: 'Details', id: 'details-2' },
    { level: 3, text: 'Nested Item', id: 'nested-item' }
  ]
)

assert.equal(
  getHastNodeText({
    type: 'element',
    children: [
      { type: 'text', value: 'Save ' },
      { type: 'element', children: [{ type: 'text', value: 'state' }] }
    ]
  }),
  'Save state'
)

const groupedSections = groupMarkdownSections([
  { type: 'element', tagName: 'h1', properties: {}, children: [] },
  { type: 'element', tagName: 'p', properties: {}, children: [] },
  { type: 'element', tagName: 'h2', properties: {}, children: [] },
  { type: 'element', tagName: 'p', properties: {}, children: [] }
])
assert.equal(groupedSections.length, 1)
assert.equal(groupedSections[0].tagName, 'section')
assert.equal(groupedSections[0].properties.dataLevel, 1)
assert.equal(groupedSections[0].children.length, 3)
assert.equal(groupedSections[0].children[2].tagName, 'section')
assert.equal(groupedSections[0].children[2].properties.dataLevel, 2)

console.log('tests passed')
