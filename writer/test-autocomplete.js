const { EditorState } = require('@codemirror/state');
const { autocompletion } = require('@codemirror/autocomplete');
const { markdown } = require('@codemirror/lang-markdown');

const state = EditorState.create({
  doc: "```js\n\n```",
  extensions: [
    markdown(),
    EditorState.languageData.of({ autocomplete: () => null })
  ]
});

console.log("Language data:", state.languageDataAt("autocomplete", 5));
