<template>
  <v-app>
    <Appbar />
    <template v-if="$route.name === 'index'">
      <TimeFilters />
    </template>
    <v-main>
      <Snackbar />
      <Confirm />
      <v-fade-transition hide-on-leave>
        <nuxt />
      </v-fade-transition>
    </v-main>
    <Footer />
  </v-app>
</template>

<script>
import Appbar from '../components/Appbar.vue'
import Snackbar from '../components/Snackbar.vue'
import Footer from '../components/Footer.vue'
import Confirm from '../components/Confirm.vue'
import TimeFilters from '../components/TimeFilters.vue'
import { mapState, mapGetters } from 'vuex'
import { setRandomFontFeatures } from '../plugins/helpers.js'

export default {
  name: 'Default',
  // eslint-disable-next-line vue/no-reserved-component-names
  components: { Appbar, Snackbar, Footer, Confirm, TimeFilters },
  head() {
    const custom_script = [
      {
        type: 'application/javascript',
        defer: true,
        src: '/custom_js',
        body: true
      }
    ]
    const custom_style = [
      { rel: 'stylesheet', href: this.settings.baseurl + '/custom_css' }
    ]
    return {
      htmlAttrs: {
        lang: this.locale
      },
      link: [
        {
          rel: 'icon',
          type: 'image/png',
          href: this.settings.baseurl + '/logo.png'
        },
        ...custom_style
      ],
      script: [
        { src: '/gancio-events.es.js', body: true, defer: true },
        ...custom_script
      ]
    }
  },

  computed: {
    ...mapState(['settings']),
    ...mapGetters(['is_dark'])
  },
  created() {
    try {
      this.$vuetify.theme.dark = this.is_dark
    } catch (e) {
      console.error(e)
    }
  },
  mounted() {
    // Set random font-feature-settings on page load
    setRandomFontFeatures()
  }
}
</script>
