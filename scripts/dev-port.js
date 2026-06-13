const DEFAULT_PORT = 6969

export const getPort = () => {
  if (process.env.PORT) return parseInt(process.env.PORT)
  return DEFAULT_PORT
}

const main = () => {
  process.stdout.write(String(getPort()))
}

if (import.meta.url === `file://${process.argv[1]}`) main()
