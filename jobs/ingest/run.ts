import { runIngest } from './index'

const query = process.argv[2]
const sourceSlug = process.argv[3]

console.log('🚀 Running ingest job...')
if (query) console.log(`  Query: ${query}`)
if (sourceSlug) console.log(`  Source: ${sourceSlug}`)

runIngest({ query, sourceSlug })
  .then(() => {
    console.log('✅ Ingest job complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Ingest job failed:', error)
    process.exit(1)
  })
