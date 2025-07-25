<template lang="pug">
v-container
  v-card-title {{ $t('common.tags') }}
    v-spacer
    v-text-field(v-model='search'
      :append-icon='mdiMagnify' outlined rounded
      :label="$t('common.search')"
      single-line hide-details)

  v-dialog(v-model='dialog' width='600' :fullscreen='$vuetify.breakpoint.xsOnly' v-if='dialog')
    v-card
      v-card-title {{$t('admin.edit_tag')}} -
        strong.ml-2 {{tag.tag}}
      v-card-subtitle {{$tc('admin.edit_tag_help', tag.count)}}
      v-card-text
        v-form(v-model='valid' ref='form')
          v-combobox(v-model='newTag'
            :search-input.sync="newTag"
            :prepend-icon="mdiTag"
            hide-no-data
            persistent-hint
            :items="newTag ? tags.filter(t => t.tag.includes(newTag)) : tags"
            :return-object='false'
            item-value='tag'
            item-text='tag'
            @keyup.enter='saveTag'
            :label="$t('common.tag')")
              template(v-slot:item="{ item, on, attrs }")
                span "{{item.tag}}" <small>({{item.count}})</small>

      v-card-actions
        v-spacer
        v-btn(@click='dialog = false' outlined color='warning') {{ $t('common.cancel') }}
        v-btn(@click='saveTag' color='primary' outlined :loading='loading'
          :disabled='!newTag || loading') {{ $t('common.save') }}

  v-card-text
    v-data-table(
      :headers='headers'
      :items='tags'
      :hide-default-footer='tags.length < 5'
      :header-props='{ sortIcon: mdiChevronDown }'
      :footer-props='{ prevIcon: mdiChevronLeft, nextIcon: mdiChevronRight }'
      :search='search')
      template(v-slot:item.actions='{ item }')
        t-btn(@click='editTag(item)' color='primary' :tooltip="$t('common.edit')")
          v-icon(v-text='mdiPencil')
        t-btn(:to='`/tag/${item.tag}`' color='success'  :tooltip="$t('common.preview')")
          v-icon(v-text='mdiEye')
        t-btn(@click='removeTag(item)' color='error' :tooltip="$t('common.delete')")
          v-icon(v-text='mdiDeleteForever')

</template>
<script>
import {
  mdiPencil,
  mdiChevronLeft,
  mdiChevronRight,
  mdiMagnify,
  mdiEye,
  mdiMapSearch,
  mdiChevronDown,
  mdiDeleteForever,
  mdiTag
} from '@mdi/js'
import { mapState } from 'vuex'
import get from 'lodash/get'
import TBtn from '../../components/TBtn.vue'

export default {
  data() {
    return {
      mdiPencil,
      mdiChevronRight,
      mdiChevronLeft,
      mdiMagnify,
      mdiEye,
      mdiMapSearch,
      mdiChevronDown,
      mdiDeleteForever,
      mdiTag,
      loading: false,
      dialog: false,
      valid: false,
      tag: {},
      newTag: '',
      tags: [],
      search: '',
      headers: [
        { value: 'tag', text: this.$t('common.tag') },
        { value: 'count', text: 'N.' },
        { value: 'actions', text: this.$t('common.actions'), align: 'right' }
      ]
    }
  },
  components: { TBtn },
  async fetch() {
    this.tags = await this.$axios.$get('/tags')
  },
  computed: {
    ...mapState(['settings'])
  },
  methods: {
    editTag(item) {
      this.tag.tag = item.tag
      this.tag.count = item.count
      this.dialog = true
    },
    async saveTag() {
      this.loading = true
      if (!this.$refs.form.validate()) {
        return
      }
      await this.$axios.$put('/tag', { tag: this.tag.tag, newTag: this.newTag })
      this.dialog = false
      await this.$fetch()
      this.loading = false
      this.$root.$message(
        this.$t('admin.tag_renamed', {
          oldTag: this.tag.tag,
          newTag: this.newTag
        }),
        { color: 'success' }
      )
      this.newTag = ''
    },
    async removeTag(tag) {
      const ret = await this.$root.$confirm('admin.delete_tag_confirm', {
        tag: tag.tag,
        n: tag.count
      })
      if (!ret) {
        return
      }
      try {
        await this.$axios.$delete(`/tag/${encodeURIComponent(tag.tag)}`)
        await this.$fetch()
      } catch (e) {
        const err = get(e, 'response.data.errors[0].message', e)
        this.$root.$message(this.$t(err), { color: 'error' })
        this.loading = false
      }
    }
  }
}
</script>
