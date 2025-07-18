<template lang="pug">
v-card
  v-card-title(v-text="$t('common.follow_me_title')")
  v-card-text
    v-alert(type='warning' border='left' :icon='mdiInformation') {{$t('admin.stats', stats)}}

    p(v-html="$t('event.follow_me_description', { title: settings.title, account: `@${settings.instance_name}@${settings.hostname}`})")
    v-text-field(
      :rules="[$validators.required('common.url')]"
      :loading='loading'
      :label="$t('common.url')"
      v-model='instance_hostname')
      v-btn(v-if='!isDialog' slot='prepend' text :disabled='(!couldGo || !proceed)' :href='link' target='_blank'
        :loading='loading' color="primary") {{$t("common.follow")}}

      p(slot='append') <img class='instance_thumb' :src="instance.thumbnail"/> {{instance.title}}

  v-card-actions(v-if='isDialog')
    v-btn(outlined color='info' @click='clipboard(`@${settings.instance_name}@${settings.hostname}`)') {{$t("common.copy")}}  @{{settings.instance_name}}@{{settings.hostname}}
    v-spacer
    v-btn(v-if='isDialog' outlined color='warning' @click="$emit('close')") {{$t("common.cancel")}}
    v-btn(:disabled='(!couldGo || !proceed)' outlined :href='link' target='_blank'
      :loading='loading' color="primary") {{$t("common.follow")}}
</template>
<script>
import { mapState } from 'vuex'
import debounce from 'lodash/debounce'
import { mdiInformation } from '@mdi/js'
import clipboard from '../assets/clipboard'

export default {
  name: 'FollowMe',
  props: { isDialog: { type: Boolean, default: false } },
  mixins: [clipboard],
  data() {
    return {
      mdiInformation,
      instance_hostname: '',
      proceed: false,
      instance: {},
      stats: {},
      loading: false,
      get_instance_info: debounce(this.getInstanceInfo, 300)
    }
  },
  async fetch() {
    this.stats = await this.$axios.$get('/ap_actors/stats')
  },
  computed: {
    ...mapState(['settings']),
    couldGo() {
      // check if is mastodon
      this.get_instance_info(this.instance_hostname)
      return true
    },
    link() {
      // check if exists
      return `https://${this.instance_hostname}/authorize_interaction?uri=${this.settings.instance_name}@${this.settings.hostname}`
    }
  },
  methods: {
    getInstanceInfo() {
      if (!this.instance_hostname) {
        return
      }
      this.loading = true

      const instance_url = `https://${this.instance_hostname}/api/v1/instance`
      this.$axios
        .$get(instance_url)
        .then((ret) => {
          this.instance = ret
          this.proceed = true
          this.loading = false
        })
        .catch((e) => {
          this.instance = {}
          this.proceed = false
          this.loading = false
        })
    }
  }
}
</script>
<style>
.instance_thumb {
  height: 20px;
}
</style>
