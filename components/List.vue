<template lang="pug">
div#list
  v-list(dense)
    v-list-item
      h3(v-if='title') {{title}}
    v-list-item(
      target='_blank'
      :to='`/event/${event.slug || event.id}`'
      v-for='event in computedEvents'
      :key='`${event.id}_${event.start_datetime}`' small)
      v-list-item-content
        v-list-item-subtitle <v-icon small color='success' v-if='event.parentId' v-text='mdiRepeat'></v-icon> {{$time.when(event)}}
          span.primary--text.ml-1 @{{event.place.name}}
        v-list-item-title(v-text='event.title')
</template>
<script>
import { mdiRepeat } from '@mdi/js'

export default {
  name: 'List',
  props: {
    title: {
      type: String,
      default: ''
    },
    events: {
      type: Array,
      default: () => {
        return []
      }
    },
    maxEvents: {
      type: Number,
      default: 0
    },
    minimal: {
      type: Boolean,
      default: false
    },
    showTags: {
      type: Boolean,
      default: true
    },
    showImage: {
      type: Boolean,
      default: true
    },
    showDescription: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return { mdiRepeat }
  },
  computed: {
    computedEvents() {
      if (!this.maxEvents) {
        return this.events
      }
      return this.events.slice(0, this.maxEvents)
    }
  }
}
</script>
<style>
#list {
  max-width: 500px;
  margin: 0 auto;
}
#list .v-list-item__title {
  white-space: normal !important;
}
</style>
