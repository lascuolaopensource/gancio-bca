<template>
  <div>
    <!-- Declarative setup -->
    <json-schema-form
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
export default {
  name: 'JsonSchemaDemo',
  layout: 'clean',

  head() {
    return {
      htmlAttrs: {
        lang: 'en',
        class: 'sl-theme-dark'
      },
      title: 'Pure HTML with CDN import maps - JSFE demo',
      meta: [{ charset: 'utf-8' }],
      script: [
        // Import map
        {
          type: 'importmap',
          innerHTML: JSON.stringify({
            imports: {
              lit: 'https://ga.jspm.io/npm:lit@2.8.0/index.js',
              'lit/': 'https://ga.jspm.io/npm:lit@2.8.0/',
              'lit-html': 'https://ga.jspm.io/npm:lit-html@2.8.0/lit-html.js',
              'lit-html/': 'https://ga.jspm.io/npm:lit-html@2.8.0/',
              'lit-element/': 'https://ga.jspm.io/npm:lit-element@3.3.3/',
              '@lit/reactive-element':
                'https://ga.jspm.io/npm:@lit/reactive-element@1.6.3/reactive-element.js',
              '@lit/reactive-element/':
                'https://ga.jspm.io/npm:@lit/reactive-element@1.6.1/',
              '@shoelace-style/shoelace/':
                'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.3.0/',
              'lodash-es/set': 'https://unpkg.com/lodash-es@4.17.21/set.js',
              '@jsfe/core': 'https://unpkg.com/@jsfe/core@0.0.5/dist/esm-min'
            }
          })
        },
        // Module script for form handling
        {
          type: 'module',
          innerHTML: `
            import '@jsfe/core';

            console.log(myForm);

            myForm.dataChangeCallback = (newData) => {
              console.info(newData);
            };
            myForm.onFormSubmit = (newData, valid) => {
              console.info({ newData, valid });
            };

            // Programmatic manipulations
            setTimeout(() => {
              myForm.schema = {
                title: 'CDN demo - alternative',
                description: 'Pretty neat, huh!?',
                properties: {
                  baz: {
                    type: 'string',
                  },
                  buzz: {
                    type: 'boolean',
                  },
                },
              };
            }, 1500);

            setTimeout(() => {
              myForm.data = {
                baz: 'Bonjour',
                buzz: true,
              };
            }, 3000);
          `
        }
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.9.0/cdn/themes/dark.css'
        }
      ]
    }
  },

  mounted() {
    // If you need to do any additional setup after the component is mounted
    console.log('Component mounted')
  }
}
</script>

<style>
body {
  display: flex;
  justify-content: center;
}

json-schema-form {
  margin: 2rem;
  width: calc(50rem + 5vw);
}
</style>
