<template>
  <v-container id="home" class="px-2 px-sm-6 pt-0" fluid>
    <h1
      class="d-block text-h3 font-weight-black text-center text-uppercase mt-10 mx-auto w-100 text-underline tag-title"
    >
      <u>{{ tag }}</u>
    </h1>

    <!-- Events -->
    <div id="events" class="mb-2 mt-14 pl-1 pl-sm-2">
      <v-lazy
        v-for="(event, idx) in events"
        :key="event.id"
        class="event v-card"
        :value="idx < 9"
        :min-height="hide_thumbs ? 105 : undefined"
        :options="{ threshold: 0.5, rootMargin: '500px' }"
        :class="{ 'theme--dark': is_dark }"
      >
        <Event :event="event" :lazy="idx > 9" />
      </v-lazy>
    </div>

    <!-- Past Events -->
    <h2 v-if="pastEvents.length" class="mt-14 mb-3">
      {{ $t('common.past_events') }}
    </h2>
    <div v-if="pastEvents.length" id="events">
      <v-lazy
        v-for="(event, idx) in pastEvents"
        :key="event.id"
        class="event v-card"
        :value="idx < 9"
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
  name: 'Tag',
  components: { Event },
  async asyncData({ $axios, params, error }) {
    try {
      const tag = params.tag
      const { pastEvents, events } = await $axios.$get(
        `/tag/${encodeURIComponent(tag)}`
      )
      return { pastEvents, events, tag }
    } catch (e) {
      error({ statusCode: 404, message: 'Tag not found' })
    }
  },
  head({ $route }) {
    const tag = $route.params.tag
    const title = `${this.settings.title} #${tag}`
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
          href: this.settings.baseurl + `/feed/rss/tag/${tag}`
        },
        {
          rel: 'alternate',
          type: 'text/calendar',
          title,
          href: this.settings.baseurl + `/feed/ics/tag/${tag}`
        }
      ]
    }
  },
  computed: {
    ...mapState(['settings']),
    ...mapGetters(['hide_thumbs', 'is_dark'])
  }
}
</script>
