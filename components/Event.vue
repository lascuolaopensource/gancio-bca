<!-- eslint-disable vue/multi-word-component-names -->
<!-- eslint-disable vue/no-v-text-v-html-on-component -->

<template>
  <article
    class="h-event"
    :class="{ 'is-past': isPast }"
    itemscope
    itemtype="https://schema.org/Event"
  >
    <nuxt-link :to="`/event/${event.slug || event.id}`" itemprop="url">
      <MyPicture v-if="!hide_thumbs" :event="event" thumb :lazy="lazy" />
      <v-icon
        v-if="event.parentId"
        class="float-right mt-1 mr-1"
        color="success"
        v-text="mdiRepeat"
      />
      <v-icon
        v-if="isPast"
        class="float-right mt-1 mr-1"
        color="warning"
        v-text="mdiTimerSandComplete"
      />
      <h2 class="title p-name" itemprop="name">
        {{ event.title }}
      </h2>
    </nuxt-link>

    <v-card-text class="body pt-0 pb-0">
      <div
        class="p-location"
        itemprop="location"
        itemscope
        itemtype="https://schema.org/Place"
      >
        <nuxt-link
          class="place d-block pl-0"
          text
          :to="`/place/${event.place.id}/${encodeURIComponent(
            event.place.name
          )}`"
        >
          <!-- eslint-disable-next-line vue/no-v-text-v-html-on-component -->
          <v-icon v-text="mdiMapMarker" />
          <span itemprop="name">{{ event.place.name }}</span>
        </nuxt-link>
        <div class="d-none p-street-address" itemprop="address">
          {{ event.place.address }}
        </div>
      </div>
    </v-card-text>

    <v-card-actions class="flex-wrap">
      <v-chip
        v-for="tag in event.tags.slice(0, 6)"
        :key="tag"
        class="ml-1 mt-1"
        small
        label
        :to="`/tag/${encodeURIComponent(tag)}`"
        outlined
        color="primary"
      >
        {{ tag }}
      </v-chip>
    </v-card-actions>
  </article>
</template>

<script>
import { mapGetters } from 'vuex'
import MyPicture from '~/components/MyPicture'
import {
  mdiRepeat,
  mdiCalendar,
  mdiMapMarker,
  mdiTimerSandComplete
} from '@mdi/js'

export default {
  components: {
    MyPicture
  },
  props: {
    event: { type: Object, default: () => ({}) },
    lazy: Boolean
  },
  data() {
    return { mdiRepeat, mdiMapMarker, mdiCalendar, mdiTimerSandComplete }
  },
  computed: {
    ...mapGetters(['hide_thumbs']),
    isPast() {
      const now = new Date()
      if (this.event.end_datetime) {
        return new Date(this.event.end_datetime * 1000) < now
      } else {
        return new Date((3 * 60 * 60 + this.event.start_datetime) * 1000) < now
      }
    }
  }
}
</script>
