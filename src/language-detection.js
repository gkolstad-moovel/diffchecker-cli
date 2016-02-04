/* Used to see if the language being used in the diff is on the list of ones looked for by Hired.com */

import highlight from 'highlight.js';

export default function checkLanguage (code) {
  const sample = code.slice(0,4000);
  const language = highlight.highlightAuto(sample).language;

  return language;
}
