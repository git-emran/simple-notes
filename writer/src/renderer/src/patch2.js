const fs = require('fs');
const file = './components/markdown-editor/slashCommandCompletion.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  `    validFor: (text, _from, to, state) => {\n      return text === query\n    }`,
  `    validFor: (_text, _from, to, state) => {\n      const currentTyped = state.sliceDoc(match.from, to)\n      return currentTyped === typed\n    }`
);
fs.writeFileSync(file, code);
