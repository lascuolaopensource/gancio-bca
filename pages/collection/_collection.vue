<template>
  <v-container id="home" class="px-2 px-sm-6 pt-0" fluid>
    <h1
      class="d-block text-h3 font-weight-black text-center text-uppercase mt-10 mb-16 mx-auto w-100 text-underline"
    >
      <u>{{ collection }}</u>
    </h1>

    <!-- Events -->
    <div class="mb-2 mt-1 pl-1 pl-sm-2" id="events">
      <v-lazy
        class="event v-card"
        :value="idx < 9"
        v-for="(event, idx) in events"
        :key="event.id"
        :min-height="hide_thumbs ? 105 : undefined"
        :options="{ threshold: 0.5, rootMargin: '500px' }"
        :class="{ 'theme--dark': is_dark }"
      >
        <Event :event="event" :lazy="idx > 9" />
      </v-lazy>
    </div>
  </v-container>
</template>
<script>
import { mapState, mapGetters } from 'vuex'
import Event from '@/components/Event'

export default {
  name: 'Collection',
  components: { Event },
  head() {
    const title = `${this.settings.title} - ${this.collection}`
    return {
      title,
      htmlAttrs: {
        lang: this.settings.instance_locale
      },
      link: [
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title,
          href:
            this.settings.baseurl + `/feed/rss/collection/${this.collection}`
        },
        {
          rel: 'alternate',
          type: 'text/calendar',
          title,
          href:
            this.settings.baseurl + `/feed/ics/collection/${this.collection}`
        }
      ]
    }
  },
  computed: {
    ...mapState(['settings']),
    ...mapGetters(['hide_thumbs', 'is_dark'])
  },
  async asyncData({ $axios, params, error }) {
    try {
      const collection = params.collection
      const events = await $axios.$get(
        `/collections/${encodeURIComponent(collection)}`
      )
      return { events, collection }
    } catch (e) {
      console.error(e)
      error({ statusCode: 400, message: 'Error!' })
    }
  }
}
</script>
