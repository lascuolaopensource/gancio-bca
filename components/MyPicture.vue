<template>
  <div :class="{ img: true, thumb }">
    <img
      v-if="media"
      :class="{ 'u-featured': true }"
      :alt="media.name"
      :loading="lazy ? 'lazy' : 'eager'"
      :src="src"
      :srcset="srcset"
      itemprop="image"
      :height="height"
      :width="width"
      :style="{ 'object-position': thumbnailPosition }"
    />

    <!-- Character fallback when no image -->
    <div
      v-else
      class="event-letter-fallback"
      :style="fallbackStyle"
    >
      {{ eventInitialLetter }}
    </div>
  </div>
</template>
<script>
export default {
  props: {
    event: { type: Object, default: () => ({}) },
    thumb: { type: Boolean, default: false },
    lazy: { type: Boolean, default: false },
    showPreview: { type: Boolean, default: true }
  },
  data() {
    return {
      fallbackStyle: {
        'font-feature-settings': '"ss01"'
      }
    }
  },
  computed: {
    backgroundPreview() {
      if (this.media && this.media.preview) {
        return {
          backgroundPosition: this.thumbnailPosition,
          backgroundImage:
            "url('data:image/png;base64," + this.media.preview + "')"
        }
      }
    },
    srcset() {
      if (this.thumb) return ''
      return `/media/thumb/${this.media.url} 500w, /media/${this.media.url} 1200w`
    },
    media() {
      return this.event.media && this.event.media[0]
    },
    height() {
      return this.media ? this.media.height : 'auto'
    },
    width() {
      return this.media ? this.media.width : 'auto'
    },
    src() {
      if (this.media) {
        return '/media/thumb/' + this.media.url
      }
      if (this.thumb) {
        return '/noimg.svg'
      }
    },
    thumbnailPosition() {
      if (this.media.focalpoint) {
        const focalpoint = this.media.focalpoint
        return `${(focalpoint[0] + 1) * 50}% ${(focalpoint[1] + 1) * 50}%`
      }
      return 'center center'
    },
    eventInitialLetter() {
      if (!this.event.title) return '?'
      return this.event.title.charAt(0).toUpperCase()
    }
  },
  mounted() {
    // Set random font-feature-settings for the fallback
    if (!this.media) {
      this.setRandomFontFeatures()
    }
  },
  methods: {
    setRandomFontFeatures() {
      const ssNumber = Math.floor(Math.random() * 5) + 1 // Random number 1-5
      const ssNumberStr = ssNumber < 10 ? `0${ssNumber}` : `${ssNumber}`
      this.fallbackStyle = {
        'font-feature-settings': `"ss${ssNumberStr}"`
      }
    }
  }
}
</script>
<style>
.img {
  width: 100%;
  height: auto;
  position: relative;
  overflow: hidden;
  display: flex;
  background-size: contain;
}

.img img {
  object-fit: contain;
  max-height: 125vh;
  display: flex;
  width: 100%;
  max-width: 100%;
  height: auto;
  overflow: hidden;
  transition: opacity 0.5s;
  opacity: 1;
  background-size: 100%;
}

.img.thumb img {
  display: flex;
  max-height: 250px;
  min-height: 160px;
  object-fit: cover;
  object-position: top;
  aspect-ratio: 1.7778;
}

.event-letter-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 250px;
  color: var(--white);
  font-family: 'Adaxi Icons', sans-serif;
  font-size: 60px;
  font-weight: bold;
  text-align: center;
  aspect-ratio: 1.7778;
  object-fit: cover;
  object-position: top;
}

.img.thumb .event-letter-fallback {
  max-height: 250px;
  min-height: 160px;
  font-size: 150px;
}
</style>
