module.exports = {
  eventSchema: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      aree: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['Area cani', 'Area fitness', 'Area giochi']
        },
        uniqueItems: true
      },
      trasporti: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['Bus Linea 13 e 14']
        },
        uniqueItems: true
      },
      orari: {
        type: 'string'
      }
    },
    additionalProperties: false
  }
}
