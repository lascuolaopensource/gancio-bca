<template lang="pug">
v-footer(aria-label='Footer')

  v-dialog(v-model='showFollowMe' destroy-on-close max-width='700px' :fullscreen='$vuetify.breakpoint.xsOnly')
    FollowMe(@close='showFollowMe=false' is-dialog)

  v-btn.ml-1(v-for='link in footerLinks'
    :key='link.label' color='primary' text
    :href='link.href' :to='link.to' :target="link.href && '_blank'") {{link.label}}

  v-menu(v-if='settings.enable_federation && trusted_sources?.length' max-height=550
    offset-y bottom transition="slide-y-transition")
    template(v-slot:activator="{ on, attrs }")
      v-btn.ml-1(v-bind='attrs' v-on='on' color='primary' text) {{ settings.trusted_sources_label || $t('admin.trusted_sources_label_default')}}
    v-list(subheaders two-lines max-width=550)
      v-list-item(v-for='instance in trusted_sources'
        :key='instance.ap_id'
        target='_blank'
        :href='instance?.object?.url ?? instance?.ap_id'
        two-line)
        v-list-item-avatar
          v-img(:src='instance?.object?.icon?.url ?? `${instance.url}/favicon.ico`')
        v-list-item-content
          v-list-item-title {{ instance?.object?.name ?? instance?.object?.preferredUsername }}
          v-list-item-subtitle {{ instance?.object?.summary ?? instance?.instance?.data?.metadata?.nodeDescription }}

  v-btn.ml-1(v-if='settings.enable_federation' color='primary' text rel='me' @click.prevent='showFollowMe=true') {{$t('event.interact_with_me')}}
  v-spacer
  v-btn(color='primary' text href='https://gancio.org' target='_blank' rel="noopener") Gancio <small>{{settings.version}}</small>

</template>
<script>
import { mapState } from 'vuex'
import FollowMe from '../components/FollowMe'

export default {
  components: { FollowMe },
  data() {
    return {
      showFollowMe: false,
      trusted_sources: []
    }
  },
  async mounted() {
    this.$root.$on('update_trusted_sources', async () => {
      this.trusted_sources = await this.$axios.$get('ap_actors/trusted').catch()
    })
    this.trusted_sources = await this.$axios.$get('ap_actors/trusted').catch()
  },
  computed: {
    ...mapState(['settings']),
    footerLinks() {
      if (!this.settings || !this.settings.footerLinks) return []
      return this.settings.footerLinks.map((link) => {
        if (/^https?:\/\//.test(link.href)) {
          return {
            href: link.href,
            label: link.label.startsWith('common.')
              ? this.$t(link.label)
              : link.label
          }
        } else {
          return {
            to: link.href,
            label: link.label.startsWith('common.')
              ? this.$t(link.label)
              : link.label
          }
        }
      })
    }
  }
}
</script>
