<template>
  <div class="json-schema-container">
    <iframe
      ref="formFrame"
      src="/json-schema-form.html"
      style="width: 100%; height: 100vh; border: none"
      @load="onIframeLoad"
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
      form: null
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

  methods: {
    onIframeLoad() {
      // Get reference to the form inside iframe
      const iframe = this.$refs.formFrame
      const form = iframe.contentWindow.document.getElementById('myForm')

      if (form) {
        this.form = form

        iframe.contentWindow.postMessage(
          {
            type: 'schema-change',
            data: this.schema
          },
          '*'
        )

        // this.updateFormSchema(this.schema)
        // this.updateFormData(this.data)
        // this.updateFormUiSchema(this.uiSchema)

        // form.dataChangeCallback = (newData) => {
        //   this.$emit('form-change', newData)
        // }

        // form.onFormSubmit = (newData, valid) => {
        //   this.$emit('form-submit', { data: newData, valid })
        // }
      }
    }

    // updateFormData(newData) {
    //   if (this.form) {
    //     this.form.data = newData
    //   }
    // },

    // updateFormSchema(newSchema) {
    //   if (this.form) {
    //     this.form.schema = newSchema
    //   }
    // },

    // updateFormUiSchema(newUiSchema) {
    //   if (this.form) {
    //     this.form.uiSchema = newUiSchema
    //   }
    // }
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
