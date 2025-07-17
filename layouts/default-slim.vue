<template>
  <v-app>
    <NavHeader />
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
import Snackbar from '../components/Snackbar.vue'
import Footer from '../components/Footer.vue'
import Confirm from '../components/Confirm.vue'
import NavHeader from '../components/NavHeader.vue'
import { mapState, mapGetters } from 'vuex'

export default {
  name: 'DefaultSlim',
  // eslint-disable-next-line vue/no-reserved-component-names
  components: { Snackbar, Footer, Confirm, NavHeader },
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
  }
}
</script>
