<template lang="pug">
v-snackbar(
  v-model="active"
  :color="color"
  :bottom="bottom"
  :top="top"
  :left="left"
  :right="right"
  transition='scroll-x-reverse-transition'
  :timeout="timeout")
  v-icon.mr-3(color="white" v-text='icon')
  span {{ message }}
  template(v-slot:action="{ }")
    v-icon(size="16" @click="active = false" v-text='mdiCloseCircle')
</template>

<script>
import { mdiAlert, mdiCloseCircle, mdiInformation } from '@mdi/js'

export default {
  data() {
    return {
      mdiAlert,
      mdiCloseCircle,
      mdiInformation,
      icon: mdiInformation,
      color: 'secondary',
      bottom: true,
      top: false,
      left: false,
      right: true,
      active: false,
      timeout: 5000,
      message: ''
    }
  },
  created() {
    this.$root.$message = (message, opts = {}) => {
      this.active = true
      this.message = this.$t(message, opts)
      this.color = opts.color || 'primary'
      this.icon =
        opts.icon || (this.color === 'success' ? mdiInformation : mdiAlert)
    }
  }
}
</script>
