// NODE: Run with `bun run server/schemas.test.ts`

import { z } from 'zod/v4'
import { writeFileSync } from 'fs'
import { format } from 'prettier'

const categoriaSchema = z.enum([
  'mostre',
  'teatro_e_spettacoli',
  'concerti_e_musica',
  'corsi',
  'seminari_e_conferenze',
  'feste',
  'sagre',
  'enogastronomia',
  'benessere_e_lifestyle',
  'sport',
  'fiere_e_mercatini',
  'laboratorio',
  'lingue_parlate'
])

const moodSchema = z.enum([
  'rilassante',
  'party_vibes',
  'chic_e_sofisticato',
  'hip_hop',
  'indie',
  'chill',
  'euforico',
  'creativo',
  'comunitario',
  'scatenato',
  'caloroso',
  'divertente',
  'underground',
  'alternative'
])

const accessibilitaSchema = z.enum([
  'accessibile_in_sedia_a_rotelle',
  'posti_a_sedere_disponibili',
  'supporto_lis_sottotitoli',
  'sensorialmente_inclusivo',
  'no_strobo_presenti'
])

const etaSchema = z.enum([
  'per_tutte_le_eta',
  'bambini',
  'ragazzi',
  'adulti',
  'anziani',
  'genitori_con_bambini',
  '+18'
])

const valoriSchema = z.enum([
  'inclusivita',
  'parita_di_genere',
  'diversita_culturale',
  'diritti_umani',
  'solidarieta',
  'uguaglianza_sociale',
  'sostenibilita',
  'antifascismo',
  'collaborazione',
  'cura_della_comunita',
  'salute_mentale',
  'valorizzazione_del_territorio',
  'educazione',
  'innovazione',
  'lgbt+',
  'sicuro_per_i_bambini',
  'no_alcool_e_sostanze',
  'ambiente_positivo'
])

export const eventMetadataSchema = z.object({
  categoria: z.array(categoriaSchema).optional(),
  mood: z.array(moodSchema).optional(),
  accessibilita: z.array(accessibilitaSchema).optional(),
  eta: z.array(etaSchema).optional(),
  valori: z.array(valoriSchema).optional()
})

// Export

const jsonSchema = z.toJSONSchema(eventMetadataSchema)

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
