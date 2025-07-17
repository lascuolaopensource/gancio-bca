<template>
  <v-container id="home" class="px-2 px-sm-6 pt-0">
    <!-- Announcements -->
    <section
      v-if="announcements?.length"
      id="announcements"
      class="mt-2 mt-sm-4"
    >
      <Announcement
        v-for="announcement in announcements"
        :key="`a_${announcement.id}`"
        :announcement="announcement"
      />
    </section>

    <!-- Tags -->
    <section class="mt-2 mt-sm-4">
      <Tags :show-count="true" :limit="8" />
    </section>

    <!-- Map -->
    <section class="mt-2 mt-sm-4">
      <GancioMap
        :place="randomPosition"
        :places="randomPositions"
        :zoom="6"
        @update:coordinates="updateMapCoordinates"
        @marker-click="handleMarkerClick"
      />
    </section>

    <!-- Events -->
    <section v-if="!$fetchState.pending" id="events" class="mt-sm-4 mt-2">
      <v-lazy
        v-for="(event, idx) in visibleEvents"
        :key="event.id"
        class="event v-card"
        :value="idx < 9"
        :min-height="hide_thumbs ? 105 : undefined"
        :options="{ threshold: 0.5, rootMargin: '500px' }"
        :class="{ 'theme--dark': is_dark }"
      >
        <Event :event="event" :lazy="idx > 9" />
      </v-lazy>
    </section>

    <section v-else class="text-center">
      <v-progress-circular
        class="mt-5 justify-center align-center mx-auto"
        color="primary"
        indeterminate
        model-value="20"
      />
    </section>
  </v-container>
</template>

<script>
/* eslint-disable indent */

import { mapState, mapActions, mapGetters } from 'vuex'
import { DateTime } from 'luxon'
import Event from '@/components/Event'
import Announcement from '@/components/Announcement'
import Tags from '@/components/Tags'
import GancioMap from '@/components/MapNew'
import { mdiMagnify, mdiCloseCircle } from '@mdi/js'

export default {
  name: 'Index',
  components: { Event, Announcement, Tags, GancioMap },
  middleware: 'setup',
  data({ $time }) {
    return {
      mdiMagnify,
      mdiCloseCircle,
      isCurrentMonth: true,
      now: $time.nowUnix(),
      start: $time.startMonth(),
      end: null,
      tmpEvents: [],
      selectedDay: null,
      storeUnsubscribe: null,
      randomPosition: {
        latitude: 40 + Math.random() * 10, // Random latitude between 40 and 50
        longitude: -5 + Math.random() * 10 // Random longitude between -5 and 5
      },
      randomPositions: [
        {
          latitude: 41.9028, // Rome
          longitude: 12.4964
        },
        {
          latitude: 48.8566, // Paris
          longitude: 2.3522
        },
        {
          latitude: 52.52, // Berlin
          longitude: 13.405
        }
      ]
    }
  },
  fetch() {
    if (process.server) {
      return
    }
    if (this.filter.query) {
      return this.getEvents({
        query: this.filter.query,
        older: true
      })
    } else {
      return this.getEvents({
        start: this.start,
        end: this.end
      })
    }
  },
  head() {
    return {
      title: this.settings.title,
      htmlAttrs: {
        lang: this.settings.instance_locale
      },
      meta: [
        // hid is used as unique identifier. Do not use `vmid` for it as it will not work
        {
          hid: 'description',
          name: 'description',
          content: this.settings?.description
        },
        {
          hid: 'og-description',
          name: 'og:description',
          content: this.settings?.description
        },
        { hid: 'og-title', property: 'og:title', content: this.settings.title },
        { hid: 'og-url', property: 'og:url', content: this.settings.baseurl },
        { property: 'og:image', content: this.settings.baseurl + '/logo.png' }
      ],
      link: [
        { rel: 'apple-touch-icon', href: this.settings.baseurl + '/logo.png' },
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: this.settings.title,
          href: this.settings.baseurl + '/feed/rss'
        },
        {
          rel: 'alternate',
          type: 'text/calendar',
          title: this.settings.title,
          href: this.settings.baseurl + '/feed/ics'
        },
        {
          rel: 'me',
          href: `${this.settings.baseurl}/federation/u/${this.settings.instance_name}`
        }
      ]
    }
  },
  computed: {
    ...mapState(['settings', 'announcements', 'events', 'filter']),
    ...mapGetters(['hide_thumbs', 'is_dark']),
    visibleEvents() {
      const now = this.$time.nowUnix()
      if (this.selectedDay) {
        const min = this.selectedDay.startOf('day').toUnixInteger()
        const max = this.selectedDay.endOf('day').toUnixInteger()
        return this.events.filter(
          (e) =>
            e.start_datetime <= max &&
            (e.end_datetime || e.start_datetime + 1) > min &&
            (this.filter.show_recurrent || !e.parentId)
        )
      } else if (this.isCurrentMonth && !this.filter.query) {
        return this.events.filter((e) => {
          const max_datetime = Math.max(e.start_datetime, e.end_datetime)
          return (
            (e.end_datetime
              ? max_datetime >= now
              : e.start_datetime + 3 * 60 * 60 >= now) &&
            (this.filter.show_recurrent || !e.parentId)
          )
        })
      } else {
        return this.events.filter(
          (e) => this.filter.show_recurrent || !e.parentId
        )
      }
    }
  },
  created() {
    this.$root.$on('dayclick', this.dayChange)
    this.$root.$on('monthchange', this.monthChange)
    if (process.client) {
      this.storeUnsubscribe = this.$store.subscribeAction({
        after: (action, state) => {
          if (action.type === 'setFilter') {
            this.$fetch()
          }
        }
      })
    }
  },
  unmounted() {
    this.$root.$off('dayclick')
    this.$root.$off('monthchange')
    if (typeof this.storeUnsubscribe === 'function') {
      this.storeUnsubscribe()
    }
  },
  methods: {
    ...mapActions(['getEvents']),
    updateMapCoordinates(coords) {
      this.randomPosition = coords
    },
    handleMarkerClick(place) {
      console.log('Marker clicked:', place)
    },
    async monthChange({ year, month }) {
      if (this.filter.query) {
        return
      }
      this.$nuxt.$loading.start()
      let isCurrentMonth

      // unselect current selected day
      this.selectedDay = null
      const now = DateTime.local({ zone: this.settings.instance_timezone })
      // check if current month is selected
      if (month === now.month && year === now.year) {
        isCurrentMonth = true
        this.start = now.startOf('month').toUnixInteger()
        this.end = null
      } else {
        isCurrentMonth = false
        this.start = DateTime.local(year, month, {
          zone: this.settings.instance_timezone
        }).toUnixInteger()
        this.end = DateTime.local(year, month, {
          zone: this.settings.instance_timezone
        })
          .plus({ month: !this.$vuetify.breakpoint.smAndDown ? 1 : 0 })
          .endOf('month')
          .toUnixInteger() // .endOf('week').unix()
      }
      await this.$fetch()
      this.$nuxt.$loading.finish()
      this.$nextTick(() => (this.isCurrentMonth = isCurrentMonth))
    },
    dayChange(day) {
      if (!day) {
        this.selectedDay = null
        return
      }
      const date = DateTime.fromJSDate(day)

      this.selectedDay = day
        ? DateTime.local({ zone: this.settings.instance_timezone }).set({
            year: date.year,
            month: date.month,
            day: date.day
          })
        : null
    }
  }
}
</script>
