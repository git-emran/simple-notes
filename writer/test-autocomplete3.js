const { EditorState } = require('@codemirror/state');
const { markdown } = require('@codemirror/lang-markdown');

const state = EditorState.create({
  doc: "```js\n\n```",
  extensions: [
    markdown(),
    EditorState.languageData.of(() => [{ autocomplete: "test-source" }])
  ]
});

console.log(state.languageDataAt("autocomplete", 5));
