// NODE: Run with `bun run server/schemas.test.ts`

import { z } from 'zod/v4'
import { writeFileSync } from 'fs'
import { format } from 'prettier'

const areaSchema = z.enum(['Area cani', 'Area fitness', 'Area giochi'])

const trasportoSchema = z.enum(['Bus Linea 13 e 14'])

export const parcoMetadataSchema = z.object({
  aree: z.array(areaSchema).optional(),
  trasporti: z.array(trasportoSchema).optional(),
  orari: z.string().optional()
})

// Export

const jsonSchema = z.toJSONSchema(parcoMetadataSchema)

// TODO - Review this
// Add uniqueItems to all array properties
const modifiedSchema = {
  ...jsonSchema,
  properties: Object.fromEntries(
    Object.entries(jsonSchema.properties || {}).map(([key, prop]) => [
      key,
      typeof prop === 'object' &&
      prop !== null &&
      'type' in prop &&
      prop.type === 'array'
        ? { ...prop, uniqueItems: true }
        : prop
    ])
  )
}

const code =
  'module.exports = { eventSchema: ' +
  JSON.stringify(modifiedSchema, null, 2) +
  '}'

const formatPromise = format(code, {
  parser: 'typescript',
  singleQuote: true,
  trailingComma: 'none',
  semi: false
})

formatPromise.then((formatted) => {
  const filePath = 'server/schemas.generated.js'
  writeFileSync(filePath, formatted)
  console.log(`${filePath} written`)
})
