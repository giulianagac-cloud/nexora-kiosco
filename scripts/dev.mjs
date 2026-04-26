import { spawnSync } from 'child_process'

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

// .cmd files on Windows require shell execution
const result = spawnSync('electron-vite', ['dev'], {
  env,
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
})

process.exit(result.status ?? 0)
