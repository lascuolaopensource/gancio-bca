<template>
  <div>
    <!-- Declarative setup -->
    <schema-form
      id="myForm"
      :schema="eventSchema"
      :data="{
        foo: 'Hello'
      }"
      :ui-schema="{
        bar: {
          'ui:widget': 'switch'
        }
      }"
    />
  </div>
</template>

<script>
import SchemaForm from '~/components/SchemaForm.vue'
import { eventSchema } from '../server/schemas.generated.js'

export default {
  components: {
    SchemaForm
  },
  data() {
    return {
      eventSchema
    }
  }
}
</script>
