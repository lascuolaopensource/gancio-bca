<template lang="pug">
#navsearch.mt-2.mt-sm-4(v-if='showCollectionsBar || showSearchBar || showCalendar')
  div
    client-only(v-if='showSearchBar')
      v-menu(offset-y :close-on-content-click='false' tile)
        template(v-slot:activator="{on ,attrs}")
          v-text-field(hide-details v-model='query'
            :placeholder='$t("common.search")' @click:clear="setFilter(['query', null])"
            @keypress.enter="setFilter(['query', query])" clearable :clear-icon='mdiClose' class='search-input')
            template(v-slot:append)
              v-icon.mr-2(v-if='query' v-text='mdiMagnify' @click="setFilter(['query', query])")
              v-icon(v-if='settings.allow_recurrent_event || settings.allow_multidate_event' v-text='mdiCog' v-bind='attrs' v-on='on')
        v-card(outlined :rounded='"0"')
          v-card-text
            v-row(dense)
              v-col(v-if='settings.allow_recurrent_event')
                v-switch.mt-0(v-model='show_recurrent' @change="v => setFilter(['show_recurrent', v])"
                  hide-details :label="$t('event.show_recurrent')" inset)
              v-col(v-if='settings.allow_multidate_event')
                v-switch.mt-0(v-model='show_multidate' @change="v => setFilter(['show_multidate', v])"
                  hide-details :label="$t('event.show_multidate')" inset)
            v-row(v-if='!showCalendar')
              v-col
                Calendar.mt-2
      v-text-field(slot='placeholder' outlined hide-details :placeholder="$t('common.search')" :append-icon='mdiCog')

    span(v-if='showCollectionsBar')
      v-btn.mr-2.mt-2(small outlined v-for='collection in collections'
        color='primary' :key='collection.id'
        :to='`/collection/${encodeURIComponent(collection.name)}`') {{collection.name}}

</template>

<script>
import { mapState, mapActions } from 'vuex'
import Calendar from '@/components/Calendar'
import { mdiClose, mdiCog, mdiMagnify } from '@mdi/js'

export default {
  components: { Calendar },
  data: ({ $store }) => ({
    oldRoute: '',
    mdiClose,
    mdiCog,
    mdiMagnify,
    show_recurrent: $store.state.settings.recurrent_event_visible,
    show_multidate: true,
    query: ''
  }),
  computed: {
    ...mapState(['collections']),
    showSearchBar() {
      return ['index'].includes(this.$route.name)
    },
    showCalendar() {
      return (
        !this.settings.hide_calendar && ['index'].includes(this.$route.name)
      )
    },
    showCollectionsBar() {
      const show = ['index', 'collection-collection'].includes(this.$route.name)
      if (show && this.oldRoute !== this.$route.name) {
        // eslint-disable-next-line vue/no-side-effects-in-computed-properties
        this.oldRoute = this.$route.name
      }
      return show
    },
    ...mapState(['settings', 'filter'])
  },
  methods: {
    ...mapActions(['setFilter'])
  }
}
</script>
<style>
#navsearch {
  margin: 0 auto;
  max-width: 700px;
}
</style>
