<!-- eslint-disable vue/no-v-html -->

<template>
  <nav>
    <NavHeader />

    <template v-if="$route.name === 'index'">
      <div class="hero-section" :style="heroStyle">
        <div class="hero-text-above">
          <p>Oggi ho voglia di</p>
        </div>
        <NavSearch />
        <div class="hero-text-below">
          
        </div>
      </div>
    </template>

    <!-- title -
    <template v-if="!hideTitle">
      <h1 v-if="$route.name === 'index'" class="text-center">
        <nuxt-link id="title" to="/" v-text="settings.title" />
        <div
          class="text-body-1 font-weight-light pb-3"
          v-html="settings?.description"
        />
      </h1>

      <div v-else class="text-center">
        <nuxt-link id="title" to="/" v-text="settings.title" />
        <div
          class="text-body-1 font-weight-light pb-3"
          v-html="settings?.description"
        />
      </div>
    </template>-->

    <template v-if="$route.name === 'index'">
      <div class="main-search-button-container">
        <!--
        <div class="main-search-button" @click="toggleSearch">
          <p>Usa il calendario</p>
        </div>
        <div class="search-calendar-container" :class="{ visible: showSearchContainer }">
          <Calendar v-if="showCalendar" class="" />
          
        </div> -->
        <!-- <TimeFilters @filter-change="handleFilterChange" /> -->
      </div>
    </template>
    
  </nav>
</template>

<script>
import { mapState } from 'vuex'
import NavHeader from './NavHeader.vue'
import NavSearch from './NavSearch.vue'
import Tags from './Tags.vue'
import Calendar from './Calendar.vue'

export default {
  name: 'Appbar',
  components: { NavHeader, NavBar, NavSearch, Tags, Calendar },
  props: {
    hideTitle: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      showSearchContainer: false,
      heroStyle: {
        'font-feature-settings': '"ss01"'
      },
      fontFeatureInterval: null
    }
  },
  computed: {
    ...mapState(['settings']),
    showCalendar() {
      return (
        !this.settings.hide_calendar && ['index'].includes(this.$route.name)
      )
    }
  },
  mounted() {
    if (this.$route.name === 'index') {
      this.startFontFeatureAnimation()
    }
  },
  beforeDestroy() {
    this.stopFontFeatureAnimation()
  },
  watch: {
    '$route.name'(newRoute) {
      if (newRoute === 'index') {
        this.startFontFeatureAnimation()
      } else {
        this.stopFontFeatureAnimation()
      }
    }
  },
  methods: {
    toggleSearch() {
      this.showSearchContainer = !this.showSearchContainer
    },
    handleFilterChange(payload) {
      // This method will be implemented in the parent component to filter events
      console.log('Filter changed:', payload);
    },
    startFontFeatureAnimation() {
      this.stopFontFeatureAnimation() // Clear any existing interval
      this.fontFeatureInterval = setInterval(() => {
        const ssNumber = Math.floor(Math.random() * 5) + 1 // Random number 1-5
        const ssNumberStr = ssNumber < 10 ? `0${ssNumber}` : `${ssNumber}`
        this.heroStyle = {
          'font-feature-settings': `"ss${ssNumberStr}"`
        }
      }, 1000) // Change every 1 second
    },
    stopFontFeatureAnimation() {
      if (this.fontFeatureInterval) {
        clearInterval(this.fontFeatureInterval)
        this.fontFeatureInterval = null
      }
    }
  }
}
</script>

<style>
nav {
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.8), rgba(20, 20, 20, 0.7)),
    url(/headerimage.png);
  background-position: center center;
  background-size: cover;
}

.theme--light nav {
  background-image:
    linear-gradient(
      to bottom,
      rgba(230, 230, 230, 0.95),
      rgba(250, 250, 250, 0.95)
    ),
    url(/headerimage.png);
}

#title {
  word-break: break-all;
  font-size: 2rem;
  font-weight: 600;
  text-decoration: none;
}
</style>
