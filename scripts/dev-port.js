import { execSync } from 'child_process'

export const branchToPort = (branch) => {
  if (branch === 'main') return 6969
  let hash = 0
  for (const ch of branch) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0
  return 1024 + (Math.abs(hash) % 64511)
}

export const getPort = () => {
  if (process.env.PORT) return parseInt(process.env.PORT)
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
  return branchToPort(branch)
}

const main = () => {
  process.stdout.write(String(getPort()))
}

if (import.meta.url === `file://${process.argv[1]}`) main()
