<template>
  <div>
    <!-- Declarative setup -->
    <schema-form
      id="myForm"
      :schema="{
        title: 'CDN demo',
        description: 'Pretty neat, huh?',
        properties: {
          foo: {
            type: 'string'
          },
          bar: {
            type: 'boolean'
          }
        }
      }"
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

export default {
  components: {
    SchemaForm
  }
}
</script>
