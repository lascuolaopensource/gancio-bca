<template lang="pug">
span.admin-actions.v-card
  v-list(dense nav color='transparent')

    //-v-list-group(:append-icon='mdiChevronUp' :value='true')
      template(v-slot:activator)
        v-list-item.text-overline {{$t('common.admin_actions')}}
    -//

      v-list-item
        h3.text-overline.pl-4 {{$t('common.admin_actions')}}

      //- Hide / confirm event
      v-list-item(@click='toggle(false)')
        v-list-item-icon
          v-icon(v-if='event.is_visible' v-text='mdiEyeOff')
          v-icon(v-else='event.is_visible' v-text='mdiEye')
        v-list-item-content
          v-list-item-title(v-text="$t(`common.${event.is_visible?(event.parentId?'skip':'hide'):'confirm'}`)")

      //- Edit event
      v-list-item(:to='`/add/${event.id}`')
        v-list-item-icon
          v-icon(v-text='mdiCalendarEdit')
        v-list-item-content
          v-list-item-title(v-text="$t('common.edit')")

      //- Clone
      v-list-item(v-if='!event.parentId' :to='`/add/${event.id}?clone=true`')
        v-list-item-icon
          v-icon(v-text='mdiScanner')
        v-list-item-content
          v-list-item-title(v-text="$t('common.clone')")

      //- Remove
      v-list-item(v-if='!event.parentId' @click='remove(false)')
        v-list-item-icon
          v-icon(v-text='mdiDelete')
        v-list-item-content
          v-list-item-title(v-text="$t('common.remove')")

      //- Moderation
      v-list-item(v-if='settings.enable_moderation' @click='$emit("openModeration")')
        v-list-item-icon
          v-icon(v-text='mdiMessageTextOutline')
        v-list-item-content
          v-list-item-title(v-text="$t('common.moderation')")
        v-list-item-icon(v-if='event?.n_messages')
          v-chip(small label class='primary') {{event?.n_messages}}

      //- Disable author
      v-list-item(v-if='settings.enable_moderation && !event.isAnon && $auth.user.is_admin' @click='disableAuthor')
        v-list-item-icon
          v-icon(v-text='mdiAccountOff')
        v-list-item-content
          v-list-item-title(v-text="$t('event.disable_author')")

      v-list-item(v-if='event.isAnon && $auth?.user?.is_admin' @click='$emit("openAssignAuthor")')
        v-list-item-icon
            v-icon(v-text='mdiClipboardAccount')
        v-list-item-content
          v-list-item-title(v-text="$t('event.assign_to_user')")

      template(v-if='event.parentId')
        v-list-item.text-overline(v-html="$t('common.recurring_event_actions')")

        //- Pause / Start to generate recurring event
        v-list-item(@click='toggle(true)')
          v-list-item-icon
            v-icon(v-text='event.parent.is_visible ? mdiPause : mdiPlay')
          v-list-item-content
            v-list-item-title(v-text="$t(`common.${event.parent.is_visible ? 'pause': 'start'}`)")

        //- Edit event
        v-list-item(:to='`/add/${event.parentId}`')
          v-list-item-icon
            v-icon(v-text='mdiCalendarEdit')
          v-list-item-content
            v-list-item-title(v-text="$t('common.edit')")

        //- Remove
        v-list-item(@click='remove(true)')
          v-list-item-icon
            v-icon(v-text='mdiDeleteForever')
          v-list-item-content
            v-list-item-title(v-text="$t('common.remove')")

</template>
<script>
import {
  mdiChevronUp,
  mdiRepeat,
  mdiDelete,
  mdiCalendarEdit,
  mdiEyeOff,
  mdiEye,
  mdiPause,
  mdiPlay,
  mdiDeleteForever,
  mdiScanner,
  mdiMessageTextOutline,
  mdiAccountOff,
  mdiClipboardAccount
} from '@mdi/js'
import { mapState } from 'vuex'
export default {
  name: 'EventAdmin',
  props: {
    event: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      mdiChevronUp,
      mdiRepeat,
      mdiDelete,
      mdiCalendarEdit,
      mdiEyeOff,
      mdiEye,
      mdiPause,
      mdiPlay,
      mdiDeleteForever,
      mdiScanner,
      mdiMessageTextOutline,
      mdiAccountOff,
      mdiClipboardAccount
    }
  },
  computed: {
    ...mapState(['settings'])
  },
  methods: {
    async disableAuthor() {
      const ret = await this.$root.$confirm('event.disable_author_confirm')
      if (!ret) {
        return
      }
      try {
        await this.$axios.$put(`/event/disable_author/${this.event.id}`)
        this.$root.$message('Author disabled!', { color: 'success' })
        this.event.isAnon = true
      } catch (e) {
        this.$root.$message(e, { color: 'warning' })
      }
    },
    async remove(parent = false) {
      const ret = await this.$root.$confirm(
        `event.remove_${parent ? 'recurrent_' : ''}confirmation`,
        { event: this.event.title }
      )
      if (!ret) {
        return
      }
      const id = parent ? this.event.parentId : this.event.id
      await this.$axios.delete(`/event/${id}`)
      this.$router.replace('/')
    },
    async toggle(parent = false) {
      const id = parent ? this.event.parentId : this.event.id
      const is_visible = parent
        ? this.event.parent.is_visible
        : this.event.is_visible
      const method = is_visible ? 'unconfirm' : 'confirm'
      try {
        await this.$axios.$put(`/event/${method}/${id}`)
        if (parent) {
          this.event.parent.is_visible = !is_visible
        } else {
          this.event.is_visible = !is_visible
        }
      } catch (e) {
        console.error(e)
      }
    }
  }
}
</script>
