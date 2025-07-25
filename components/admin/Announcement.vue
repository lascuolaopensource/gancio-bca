<template lang="pug">
v-container
  v-card-title {{ $t('common.announcements') }}
  v-card-subtitle(v-html="$t('admin.announcement_description')")
  v-dialog(v-model='dialog' width='800px' :fullscreen='$vuetify.breakpoint.xsOnly')
    v-card
      v-card-title {{ $t('admin.new_announcement') }}
      v-card-text.px-0
        v-form(v-model='valid' ref='announcement' @submit.prevent='save' lazy-validation)
          v-text-field.col-12(v-model='announcement.title'
            :rules="[$validators.required('common.title')]"
            :label='$t("common.title")')
          Editor.col-12(v-model='announcement.announcement'
            border no-save max-height='400px' :placeholder="$t('common.description')")
      v-card-actions
        v-spacer
        v-btn(@click='dialog = false' color='error' outlined) {{ $t('common.cancel') }}
        v-btn(@click='save' color='primary' :disabled='!valid || loading' :loading='loading' outlined) {{ $t(`common.${editing ? 'save' : 'send'}`) }}

  v-btn(@click='openDialog' text color='primary') <v-icon v-text='mdiPlus'></v-icon> {{ $t('common.add') }}
  v-card-text
    v-data-table(
      v-if='announcements.length'
      :hide-default-footer='announcements.length<10'
      :footer-props='{ prevIcon: mdiChevronLeft, nextIcon: mdiChevronRight }'
      :header-props='{ sortIcon: mdiChevronDown }'
      :headers='headers'
      :items='announcements')
      template(v-slot:item.actions='{ item }')
        t-btn(@click='toggle(item)' :color='item.visible ? "warning" : "success"' :tooltip="item.visible ? $t('common.disable') : $t('common.enable')")
          v-icon(v-text='item.visible ? mdiEyeOff : mdiEye')
        t-btn(@click='edit(item)' color='info' :tooltip="$t('common.edit')")
          v-icon(v-text='mdiPencil')
        t-btn(@click='remove(item)' color='error' :tooltip="$t('common.delete')")
          v-icon(v-text='mdiDeleteForever')
</template>
<script>
import { mapActions } from 'vuex'
import cloneDeep from 'lodash/cloneDeep'
import Editor from '../Editor'
import Announcement from '../Announcement'
import TBtn from '../../components/TBtn.vue'

import {
  mdiPlus,
  mdiChevronRight,
  mdiChevronLeft,
  mdiChevronDown,
  mdiDeleteForever,
  mdiPencil,
  mdiEye,
  mdiEyeOff
} from '@mdi/js'

export default {
  components: { Editor, Announcement, TBtn },
  data() {
    return {
      mdiPlus,
      mdiChevronRight,
      mdiChevronLeft,
      mdiChevronDown,
      mdiDeleteForever,
      mdiPencil,
      mdiEyeOff,
      mdiEye,
      valid: false,
      dialog: false,
      editing: false,
      announcements: [],
      loading: false,
      headers: [
        { value: 'title', text: this.$t('common.title') },
        {
          value: 'actions',
          text: this.$t('common.actions'),
          align: 'right',
          sortable: false
        }
      ],
      announcement: { title: '', announcement: '' }
    }
  },
  async mounted() {
    this.announcements = await this.$axios.$get('/announcements')
  },
  methods: {
    ...mapActions(['setAnnouncements']),
    edit(announcement) {
      this.announcement.title = announcement.title
      this.announcement.announcement = announcement.announcement
      this.announcement.id = announcement.id
      this.editing = true
      this.dialog = true
    },
    openDialog() {
      this.announcement = { title: '', announcement: '' }
      this.dialog = true
      this.$nextTick(() => this.$refs.announcement.reset())
    },
    async toggle(announcement) {
      try {
        announcement.visible = !announcement.visible
        await this.$axios.$put(
          `/announcements/${announcement.id}`,
          announcement
        )
        this.announcements = this.announcements.map((a) =>
          a.id === announcement.id ? announcement : a
        )
        this.setAnnouncements(
          cloneDeep(this.announcements.filter((a) => a.visible))
        )
      } catch (e) {}
    },
    async remove(announcement) {
      const ret = await this.$root.$confirm('admin.delete_announcement_confirm')
      if (!ret) {
        return
      }
      this.$axios.delete(`/announcements/${announcement.id}`).then(() => {
        this.$root.$message('admin.announcement_remove_ok')
        this.announcements = this.announcements.filter(
          (a) => a.id !== announcement.id
        )
      })
    },
    async save() {
      if (!this.$refs.announcement.validate()) {
        return
      }
      this.loading = true
      try {
        let announcement = null
        if (this.editing) {
          announcement = await this.$axios.$put(
            `/announcements/${this.announcement.id}`,
            this.announcement
          )
          this.announcements = this.announcements.map((a) =>
            a.id === announcement.id ? announcement : a
          )
        } else {
          announcement = await this.$axios.$post(
            '/announcements',
            this.announcement
          )
          this.announcements = this.announcements.concat(announcement)
        }
        this.setAnnouncements(cloneDeep(this.announcements))
        this.announcement = { title: '', announcement: '' }
        this.$refs.announcement.reset()
        this.editing = false
        this.dialog = false
      } catch (e) {
        console.error(e)
      }
      this.loading = false
    }
  }
}
</script>
