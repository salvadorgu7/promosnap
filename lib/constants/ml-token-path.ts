import path from 'path'

// Resolve the project root regardless of whether we're running from a
// git worktree or from the main repo. __dirname here is
// <root>/lib/constants, so we go up two levels.
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')

export const ML_TOKEN_PATH = path.join(PROJECT_ROOT, '.ml-token.json')
