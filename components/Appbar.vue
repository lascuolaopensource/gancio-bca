<!-- eslint-disable vue/no-v-html -->

<template>
  <nav>
    <NavHeader />
    <div class="hero-section">
      <div class="hero-text-above">
        <p>Scopri i parchi dell'area metropolitana di Bari</p>
      </div>
      <NavSearch />
    </div>

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
    <div
      class="search-calendar-container"
      :class="{ visible: showSearchContainer }"
    >
      <Calendar v-if="showCalendar" class="" />
      <NavBar v-if="!['event-slug', 'e-slug'].includes($route.name)" />
    </div>
    <!-- <Tags />s -->
  </nav>
</template>

<script>
import { mapState } from 'vuex'
import NavHeader from './NavHeader.vue'
import NavBar from './NavBar.vue'
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
      showSearchContainer: false
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
  methods: {
    toggleSearch() {
      this.showSearchContainer = !this.showSearchContainer
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
