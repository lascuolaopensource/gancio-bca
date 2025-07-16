/** @typedef {import("./schemas.d.ts").EventMetadataSchema} EventMetadataSchema */
/** @typedef {import("./schemas.d.ts").Collection} Collection */

//

const schemas = require('./schemas.generated')

const Ajv = require('ajv')
const ajv = new Ajv()

/**
 * @param {Collection} collection
 * @returns {object | undefined}
 */
function getCollectionSchema(collection) {
  return schemas[collection]
}

/**
 * @param {Collection} collection
 * @param {unknown} data
 * @returns {EventMetadataSchema | Error}
 */
function parseEvent(data) {
  try {
    const schema = getCollectionSchema('eventSchema')
    const valid = ajv.validate(schema, data)
    return valid
  } catch (e) {
    if (e instanceof Error) {
      return e
    } else {
      return new Error(e)
    }
  }
}

module.exports = {
  getCollectionSchema,
  parseEvent
}
