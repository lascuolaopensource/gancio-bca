<!-- eslint-disable vue/no-v-text-v-html-on-component -->
<template>
  <div>
    
    <v-tabs
      id="navbar"
      centered
      background-color="transparent"
      optional
      dense
      icons-and-text
      class="action-buttons-add-export"
    >
      <v-tab
        v-if="$auth.loggedIn || settings.allow_anon_event"
        to="/add"
        :ripple="false"
      >
        <span class="d-none d-sm-flex">{{ $t('common.add_event') }}</span>
        <v-icon color="primary" v-text="mdiPlus" />
      </v-tab>
      <v-tab to="/export" :ripple="false">
        <span class="d-none d-sm-flex">{{ $t('common.share') }}</span>
        <v-icon v-text="mdiShareVariant" />
      </v-tab>
    </v-tabs>
    
  </div>
</template>

<script>
import { mdiPlus, mdiShareVariant, mdiHome, mdiInformation } from '@mdi/js'
import { mapState } from 'vuex'

export default {
  name: 'Navbar',
  data() {
    return { mdiPlus, mdiShareVariant, mdiHome, mdiInformation }
  },
  computed: mapState(['settings'])
}
</script>
