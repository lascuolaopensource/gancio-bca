<template>
  <div class="d-flex">
    <v-btn class="site-title-button" nuxt to="/">
      <!-- eslint-disable-next-line vue/html-self-closing -->
      <!--<img src="/logo.png" height="40" />-->
      <p class="site-title">Adaxi</p>
    </v-btn>

    <v-spacer />

    <div class="d-flex navigation">
      <v-btn
        v-for="nav in navLinks"
        :key="nav.to"
        icon
        large
        :href="nav.href"
        :to="nav.to"
        :nuxt="!!nav.to"
        :title="$t(nav.title)"
        :aria-label="$t(nav.title)"
        v-if="!nav.hide"
      >
        Cos'è
      </v-btn>
      <!-- <v-btn icon large @click="toggleDark">
        Darkmode
      </v-btn> -->
      <client-only>
        <v-menu
          offset-y
          transition="slide-y-transition"
          bottom
          max-height="600"
        >
          <template #activator="{ on, attrs }">
            <v-btn
              icon
              large
              v-bind="attrs"
              aria-label="Language"
              v-on="on"
              v-text="$i18n.locale"
            />
          </template>
          <v-list dense>
            <v-list-item
              v-for="locale in $i18n.locales"
              :key="locale.code"
              @click.prevent.stop="$i18n.setLocale(locale.code)"
            >
              <v-list-item-content>
                <v-list-item-title v-text="locale.name" />
              </v-list-item-content>
            </v-list-item>
            <v-list-item
              nuxt
              target="_blank"
              href="https://hosted.weblate.org/engage/gancio/"
            >
              <v-list-item-content>
                <v-list-item-subtitle v-text="$t('common.help_translate')" />
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
        <template #placeholder>
          <v-btn large icon arial-label="Language">
            {{ $i18n.locale }}
          </v-btn>
        </template>
      </client-only>

      <client-only>
        <v-menu v-if="$auth.loggedIn" offset-y transition="slide-y-transition">
          <template #activator="{ on, attrs }">
            <v-btn
              class="mr-0"
              large
              icon
              v-bind="attrs"
              title="Menu"
              aria-label="Menu"
              v-on="on"
            >
              <v-icon v-text="mdiDotsVertical" />
            </v-btn>
          </template>
          <v-list>
            <v-list-item nuxt to="/settings">
              <v-list-item-icon>
                <v-icon v-text="mdiCog" />
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title v-text="$t('common.settings')" />
              </v-list-item-content>
            </v-list-item>

            <v-list-item nuxt to="/my_events">
              <v-list-item-icon>
                <v-icon v-text="mdiCalendarAccount" />
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title v-text="$t('common.my_events')" />
              </v-list-item-content>
            </v-list-item>

            <v-list-item
              v-if="$auth.user.is_admin || $auth.user.is_editor"
              nuxt
              to="/admin"
            >
              <v-list-item-icon>
                <v-icon v-text="mdiAccount" />
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title v-text="$t(`common.${$auth.user.role}`)" />
              </v-list-item-content>
            </v-list-item>

            <v-list-item @click="logout">
              <v-list-item-icon>
                <v-icon v-text="mdiLogout" />
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title v-text="$t('common.logout')" />
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-menu>
        <template #placeholder>
          <v-btn
            v-if="$auth.loggedIn"
            large
            icon
            aria-label="Menu"
            title="Menu"
          >
            <v-icon v-text="mdiDotsVertical" />
          </v-btn>
        </template>
      </client-only>

      <!-- login button -->
      <v-btn
        v-if="!$auth.loggedIn"
        class="mr-0"
        large
        icon
        nuxt
        to="/login"
        :title="$t('common.login')"
        :aria-label="$t('common.login')"
      >
        <v-icon v-text="mdiLogin" />
      </v-btn>
    </div>
  </div>
</template>
<script>
import {
  mdiLogin,
  mdiDotsVertical,
  mdiLogout,
  mdiAccount,
  mdiCog,
  mdiInformation,
  mdiContrastCircle,
  mdiCalendarAccount
} from '@mdi/js'
import { mapActions, mapGetters } from 'vuex'

export default {
  data() {
    return {
      mdiLogin,
      mdiDotsVertical,
      mdiLogout,
      mdiAccount,
      mdiCog,
      mdiInformation,
      mdiContrastCircle,
      mdiCalendarAccount,
      navLinks: [
        {
          to: '/about',
          title: 'common.about',
          icon: mdiInformation
        }
        // Add more navigation links here as needed
      ]
    }
  },
  computed: {
    ...mapGetters(['hide_thumbs', 'is_dark'])
  },
  methods: {
    ...mapActions(['setLocalSetting']),
    toggleDark() {
      this.$vuetify.theme.dark = !this.$vuetify.theme.dark
      this.setLocalSetting({ key: 'theme.is_dark', value: !this.is_dark })
    },
    logout() {
      this.$root.$message('common.logout_ok')
      this.$auth.logout()
    }
  }
}
</script>
