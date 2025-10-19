const autocannon = require('autocannon')
const buildApp = require('../src/app')

async function runBenchmark() {
  const app = await buildApp()

  await app.listen({ port: 3000, host: '127.0.0.1' })

  console.log('Server started, running benchmark...\n')

  const result = await autocannon({
    url: 'http://127.0.0.1:3000/api/users',
    connections: 100,
    duration: 10,
    pipelining: 10
  })

  console.log('\n=== Benchmark Results ===\n')
  console.log(autocannon.printResult(result))

  await app.close()
}

runBenchmark().catch(err => {
  console.error(err)
  process.exit(1)
})
