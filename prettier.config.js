/** @type {import('prettier').Config} */
module.exports = {
  semi:           false,
  singleQuote:    true,
  trailingComma:  'es5',
  printWidth:     100,
  tabWidth:       2,
  useTabs:        false,
  bracketSpacing: true,
  arrowParens:    'always',
  endOfLine:      'lf',
  overrides: [
    {
      files: '*.json',
      options: { printWidth: 80 },
    },
    {
      files: ['*.tsx', '*.jsx'],
      options: { jsxSingleQuote: false },
    },
  ],
}
