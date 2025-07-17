import type { eventMetadataSchema } from './schemas.source'
import type generatedSchemas from './schemas.generated'
import type { z } from 'zod'

export type EventMetadataSchema = z.infer<typeof eventMetadataSchema>

export type SchemasRegistry = typeof generatedSchemas
export type Collection = keyof SchemasRegistry
