const { EditorState } = require('@codemirror/state');
const { markdown } = require('@codemirror/lang-markdown');

const state = EditorState.create({
  doc: "```js\n\n```",
  extensions: [
    markdown(),
    EditorState.languageData.of({ autocomplete: () => null })
  ]
});

console.log(state.languageDataAt("autocomplete", 5));
