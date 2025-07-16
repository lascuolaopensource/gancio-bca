<!-- eslint-disable vue/no-v-text-v-html-on-component -->
<template>
  <div class="tags">
    <!-- eslint-disable-next-line vue/singleline-html-element-content-newline -->
    <div v-if="loading" class="loading">Loading tags...</div>
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    <template v-else>
      <a
        v-for="tag in tags"
        :key="tag.tag"
        :href="`/tag/${encodeURIComponent(tag.tag)}`"
        class="tag"
      >
        {{ tag.tag }}
        <span v-if="showCount" class="count">({{ tag.count }})</span>
      </a>
    </template>
  </div>
</template>

<script>
export default {
  name: 'Tags',

  props: {
    showCount: {
      type: Boolean,
      default: false
    },
    limit: {
      type: Number,
      default: 10
    }
  },

  data() {
    return {
      tags: [],
      loading: true,
      error: null
    }
  },

  async created() {
    try {
      const response = await this.$axios.$get('/tags')
      this.tags = response.slice(0, this.limit)
      this.loading = false
    } catch (err) {
      this.error = 'Failed to load tags'
      this.loading = false
      console.error('Error fetching tags:', err)
    }
  }
}
</script>

<style scoped>
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  text-decoration: none;
  color: inherit;
  background: #f5f5f5;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.tag:hover {
  background: #e0e0e0;
}

.count {
  font-size: 0.8rem;
  opacity: 0.7;
}

.loading,
.error {
  font-size: 0.9rem;
  color: #666;
}

.error {
  color: #dc3545;
}
</style>
