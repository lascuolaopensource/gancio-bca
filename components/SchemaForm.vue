<template>
  <div class="json-schema-container">
    <iframe
      ref="formFrame"
      src="/json-schema-form.html"
      style="width: 100%; height: 100vh; border: none"
    />
  </div>
</template>

<script>
export default {
  name: 'SchemaForm',

  props: {
    schema: {
      type: Object,
      required: true
    },
    data: {
      type: Object,
      default: () => ({})
    },
    uiSchema: {
      type: Object,
      default: () => ({})
    }
  },

  emits: ['form-change', 'form-submit'],

  data() {
    return {
      isFormReady: false
    }
  },

  watch: {
    schema: {
      handler(newSchema) {
        this.updateFormSchema(newSchema)
      },
      deep: true
    },
    data: {
      handler(newData) {
        this.updateFormData(newData)
      },
      deep: true
    },
    uiSchema: {
      handler(newUiSchema) {
        this.updateFormUiSchema(newUiSchema)
      },
      deep: true
    }
  },

  mounted() {
    window.addEventListener('message', this.handleMessage)
  },

  beforeUnmount() {
    window.removeEventListener('message', this.handleMessage)
  },

  methods: {
    handleMessage(event) {
      const { type, data } = event.data

      if (type === 'form-ready') {
        this.isFormReady = true
        this.updateFormSchema(this.schema)
        this.updateFormData(this.data)
        this.updateFormUiSchema(this.uiSchema)
      } else if (type === 'form-submit') {
        this.$emit('form-submit', data)
      }
    },

    updateFormData(newData) {
      if (this.isFormReady) {
        this.$refs.formFrame.contentWindow.postMessage(
          {
            type: 'update-data',
            data: newData
          },
          '*'
        )
      }
    },

    updateFormSchema(newSchema) {
      if (this.isFormReady) {
        this.$refs.formFrame.contentWindow.postMessage(
          {
            type: 'update-schema',
            data: newSchema
          },
          '*'
        )
      }
    },

    updateFormUiSchema(newUiSchema) {
      if (this.isFormReady) {
        this.$refs.formFrame.contentWindow.postMessage(
          {
            type: 'update-ui-schema',
            data: newUiSchema
          },
          '*'
        )
      }
    }
  }
}
</script>

<style>
.json-schema-container {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}
</style>
