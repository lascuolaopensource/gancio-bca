<template lang="pug">
span
  v-dialog(v-model='openMediaDetails' :fullscreen="$vuetify.breakpoint.xsOnly" width='1000px')
    v-card
      v-card-title {{$t('common.media')}}
      v-card-text
        v-row.mt-1
          v-col#focalPointSelector(
              @mousedown='handleStart' @touchstart='handleStart'
              @mousemove='handleMove' @touchmove='handleMove'
              @mouseup='handleStop' @touchend='handleStop'
            )
            div.focalPoint(:style="{ top, left }")
            img(v-if='mediaPreview' :src='mediaPreview')

          v-col.col-12.col-sm-4
            p {{$t('event.choose_focal_point')}}

            //- TODO: what if the URL preview goes wrong?
            //- this could happen due to cors issues or a simply typo
            img.mediaPreview.d-none.d-sm-block(v-if='mediaPreview'
              :src='mediaPreview' :style="{ 'object-position': position }")

            v-textarea.mt-4(type='text'
              label='Alternative text'
              persistent-hint
              @input='v => name=v'
              :value='value.name' filled
              :hint='$t("event.alt_text_description")')
            br
            v-card-actions.justify-space-between
              v-btn(text @click='openMediaDetails=false' color='warning') Cancel
              v-btn(text color='primary' @click='save') Save

  h3.mb-3.font-weight-regular(v-if='mediaPreview') {{$t('common.media')}}
  v-card-actions(v-if='mediaPreview')
    v-switch.ml-3.mt-0.pt-0(v-model='showPreview' inset :label="$t('common.show_preview')" hide-details)
    v-spacer
    v-btn(text color='primary' @click='openMediaDetails = true') {{$t('common.edit')}}
    v-btn(text color='error' @click='remove') {{$t('common.remove')}}

  div.col-12.pt-0(v-if='mediaPreview')
    img.col-12.pa-0(:src='mediaPreview' v-if='!showPreview')
    img.col-12.mediaPreview.pa-0(:src='mediaPreview' v-else :style="{ 'object-position': savedPosition }")
    span.text-center {{event.media[0].name}}

  div(v-else)
    v-text-field(
      v-if="useUrl"
      :label="$t('common.url')"
      :hint="'https://example.com/image.jpg'"
      :prepend-icon="mdiCamera"
      persistent-hint
      type="url"
      v-model="imgUrlInput"
      @change="selectUrl"
      placeholder="https://example.com/image.jpg"
      :rules="[validateUrl]"
    )

    v-file-input(
      v-else
      :label="$t('common.media')"
      :hint="$t('event.media_description')"
      :prepend-icon="mdiCamera"
      @change="selectMedia"
      persistent-hint
      accept="image/*"
    )

    v-switch(v-model="useUrl" inset :label="$t('event.import_URL')")

</template>
<script>
import { mdiCamera } from '@mdi/js'

export default {
  name: 'MediaInput',
  props: {
    value: { type: Object, default: () => ({ image: null }) },
    event: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      mdiCamera,
      useUrl: false,
      imgUrlInput: this.value.url || '',
      showPreview: false,
      openMediaDetails: false,
      name: this.value.name || '',
      focalpoint: this.value.focalpoint || [0, 0],
      dragging: false
    }
  },
  computed: {
    mediaPreview() {
      if (!this.value.url && !this.value.image) {
        return false
      }

      const url = this.value.image
        ? URL.createObjectURL(this.value.image)
        : this.isValidUrl(this.value.url)
        ? this.value.url
        : `/media/thumb/${this.value.url}`

      return url
    },
    top() {
      return (this.focalpoint[1] + 1) * 50 + '%'
    },
    left() {
      return (this.focalpoint[0] + 1) * 50 + '%'
    },
    savedPosition() {
      const focalpoint = this.value.focalpoint || [0, 0]
      return `${(focalpoint[0] + 1) * 50}% ${(focalpoint[1] + 1) * 50}%`
    },
    position() {
      const focalpoint = this.focalpoint || [0, 0]
      return `${(focalpoint[0] + 1) * 50}% ${(focalpoint[1] + 1) * 50}%`
    }
  },
  methods: {
    save() {
      this.$emit('input', {
        url: this.value.url,
        image: this.value.image,
        name: this.name || this.event.title || '',
        focalpoint: [...this.focalpoint]
      })
      this.openMediaDetails = false
    },
    async remove() {
      const ret = await this.$root.$confirm('event.remove_media_confirmation')
      if (!ret) {
        return
      }
      this.imgUrlInput = ''
      this.useUrl = false
      this.$emit('remove')
    },
    selectMedia(v) {
      this.$emit('input', {
        image: v,
        name: this.event.title,
        focalpoint: [0, 0]
      })
    },
    selectUrl() {
      if (this.validateUrl(this.imgUrlInput) === true) {
        this.$emit('input', {
          ...this.value,
          url: this.imgUrlInput
        })
      }
    },
    handleStart(ev) {
      ev.preventDefault()
      this.dragging = true
      this.handleMove(ev, true)
      return false
    },
    handleStop(ev) {
      this.dragging = false
    },
    handleMove(ev, manual = false) {
      if (!this.dragging && !manual) return
      ev.stopPropagation()
      const boundingClientRect = document
        .getElementById('focalPointSelector')
        .getBoundingClientRect()

      const clientX = ev.changedTouches
        ? ev.changedTouches[0].clientX
        : ev.clientX
      const clientY = ev.changedTouches
        ? ev.changedTouches[0].clientY
        : ev.clientY

      // get relative coordinate
      let x = Math.ceil(clientX - boundingClientRect.left)
      let y = Math.ceil(clientY - boundingClientRect.top)

      // snap to border
      x =
        x < 30
          ? 0
          : x > boundingClientRect.width - 30
          ? boundingClientRect.width
          : x
      y =
        y < 30
          ? 0
          : y > boundingClientRect.height - 30
          ? boundingClientRect.height
          : y

      // this.relativeFocalpoint = [x + 'px', y + 'px']

      // map to real image coordinate
      const posY = -1 + (y / boundingClientRect.height) * 2
      const posX = -1 + (x / boundingClientRect.width) * 2

      this.focalpoint = [posX, posY]
      return false
    },
    isValidUrl(url) {
      return /^https?:\/\/.+/i.test(url)
    },

    validateUrl(value) {
      if (!value) return true // empty value is valid, since image is optional
      return this.isValidUrl(value) || this.$t('validators.url')
    }
  }
}
</script>
<style>
.cursorPointer {
  cursor: crosshair;
}

.mediaPreview {
  width: 100%;
  object-fit: cover;
  object-position: top;
  aspect-ratio: 1.7778;
}

#focalPointSelector {
  position: relative;
  cursor: move;
  overflow: hidden;
  display: flex;
  height: 100%;
  justify-self: center;
  align-items: center;
}

#focalPointSelector img {
  width: 100%;
}

.focalPoint {
  position: absolute;
  width: 50px;
  height: 50px;
  top: 100px;
  left: 100px;
  transform: translate(-25px, -25px);
  border-radius: 50%;
  border: 1px solid #ff6d408e;
  box-shadow: 0 0 0 9999em rgba(0, 0, 0, 0.65);
}
</style>
