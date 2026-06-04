const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const utilityPath = path.join(__dirname, 'src/renderer/src/utils/fileTreeDrag.ts')
const source = fs.readFileSync(utilityPath, 'utf8')
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

const {
  buildMoveDestination,
  canMovePathToDirectory,
  getBasenameFromPath,
  getParentPath,
  isSameOrDescendantPath,
  joinPath
} = moduleUnderTest.exports

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

console.log('fileTreeDrag tests passed')
