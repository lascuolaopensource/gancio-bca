import type { parcoMetadataSchema } from './schemas.source'
import type generatedSchemas from './schemas.generated'
import type { z } from 'zod'

export type EventMetadataSchema = z.infer<typeof parcoMetadataSchema>

export type SchemasRegistry = typeof generatedSchemas
export type Collection = keyof SchemasRegistry
