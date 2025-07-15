<template>
  <v-container class="pa-0">
    <v-card>
      <v-card-title>{{ $t('common.my_events') }}</v-card-title>
      <v-card-text class="pa-1 pa-md-3">
        <v-text-field v-model="search" :label="$t('common.search')" />
        <v-data-table
          :items="events"
          :hide-default-footer="events.length < 10"
          dense
          :search="search"
          :header-props="{ sortIcon: mdiChevronDown }"
          :footer-props="{
            prevIcon: mdiChevronLeft,
            nextIcon: mdiChevronRight
          }"
          :headers="headers"
        >
          <!-- eslint-disable-next-line vue/valid-v-slot -->
          <template #item.data-table-select="{ isSelected, select }">
            <v-simple-checkbox
              size="small"
              small
              dense
              :on-icon="mdiCheckboxOutline"
              :off-icon="mdiCheckboxBlankOutline"
              :value="isSelected"
              @input="select($event)"
            />
          </template>

          <!-- eslint-disable-next-line vue/valid-v-slot -->
          <template #item.start_datetime="{ item }">
            <span v-if="!item.recurrent">{{ $time.when(item) }}</span>
            <span v-else>
              <v-icon color="success" v-text="mdiRepeat" />
              {{ $time.recurrentDetail({ parent: item }, 'EEEE, HH:mm') }}
            </span>
          </template>

          <!-- eslint-disable-next-line vue/valid-v-slot -->
          <template #item.actions="{ item }">
            <template v-if="!item.recurrent">
              <t-btn
                v-if="!item.is_visible"
                color="success"
                :tooltip="$t('common.confirm')"
                @click="toggle(item)"
              >
                <v-icon v-text="mdiEye" />
              </t-btn>
              <t-btn
                v-else-if="!item.parentId"
                color="info"
                :tooltip="$t('common.hide')"
                @click="toggle(item)"
              >
                <v-icon v-text="mdiEyeOff" />
              </t-btn>
              <t-btn
                v-else
                color="info"
                :tooltip="$t('common.skip')"
                @click="toggle(item)"
              >
                <v-icon v-text="mdiDebugStepOver" />
              </t-btn>
              <t-btn
                :to="`/event/${item.slug || item.id}`"
                :tooltip="$t('common.preview')"
              >
                <v-icon v-text="mdiArrowRight" />
              </t-btn>
            </template>
            <template v-else>
              <t-btn
                v-if="!item.is_visible"
                color="success"
                :tooltip="$t('common.start')"
                @click="toggle(item)"
              >
                <v-icon v-text="mdiPlay" />
              </t-btn>
              <t-btn
                v-else
                color="info"
                :tooltip="$t('common.pause')"
                @click="toggle(item)"
              >
                <v-icon v-text="mdiPause" />
              </t-btn>
            </template>
            <t-btn
              :to="`/add/${item.id}`"
              color="yellow"
              :tooltip="$t('common.edit')"
            >
              <v-icon v-text="mdiPencil" />
            </t-btn>
            <t-btn
              color="error"
              :tooltip="$t('common.delete')"
              @click="remove(item, item.recurrent)"
            >
              <v-icon v-text="item.recurrent ? mdiDeleteForever : mdiDelete" />
            </t-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import {
  mdiChevronLeft,
  mdiChevronRight,
  mdiChevronDown,
  mdiCheckboxOutline,
  mdiCheckboxBlankOutline,
  mdiPencil,
  mdiDelete,
  mdiArrowRight,
  mdiEye,
  mdiEyeOff,
  mdiRepeat,
  mdiPause,
  mdiPlay,
  mdiDebugStepOver,
  mdiDeleteForever
} from '@mdi/js'
import { mapState } from 'vuex'
import TBtn from '../components/TBtn.vue'

export default {
  name: 'Settings',
  components: { TBtn },
  middleware: ['auth'],
  data() {
    return {
      mdiChevronLeft,
      mdiChevronRight,
      mdiChevronDown,
      mdiCheckboxOutline,
      mdiCheckboxBlankOutline,
      mdiPencil,
      mdiDelete,
      mdiArrowRight,
      mdiEye,
      mdiEyeOff,
      mdiRepeat,
      mdiPause,
      mdiPlay,
      mdiDebugStepOver,
      mdiDeleteForever,
      events: [],
      search: '',
      headers: [
        { value: 'title', text: this.$t('common.title') },
        { value: 'place.name', text: this.$t('common.place') },
        { value: 'start_datetime', text: this.$t('common.when') },
        {
          value: 'actions',
          text: this.$t('common.actions'),
          align: 'right',
          sortable: false
        }
      ]
    }
  },
  async fetch() {
    this.events = await this.$axios.$get('/events/mine')
  },
  head() {
    return {
      title: `${this.settings.title} - ${this.$t('common.my_events')}`
    }
  },
  computed: mapState(['settings']),
  methods: {
    async toggle(event) {
      const id = event.id
      const is_visible = event.is_visible
      const method = is_visible ? 'unconfirm' : 'confirm'
      try {
        await this.$axios.$put(`/event/${method}/${id}`)
        event.is_visible = !is_visible
      } catch (e) {
        console.error(e)
      }
    },
    async remove(event, parent) {
      const ret = await this.$root.$confirm(
        `event.remove_${parent ? 'recurrent_' : ''}confirmation`
      )
      if (!ret) {
        return
      }
      await this.$axios.delete(`/event/${event.id}`)
      this.$fetch()
      this.$root.$message('admin.event_remove_ok')
    }
  }
}
</script>
