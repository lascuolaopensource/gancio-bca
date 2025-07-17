<template>
  <div class="time-filters">
    <v-btn
      v-for="filter in timeFilters"
      :key="filter.id"
      :color="activeFilter === filter.id ? 'primary' : 'default'"
      :outlined="activeFilter !== filter.id"
      class="ma-1"
      @click="selectFilter(filter.id)"
    >
      {{ filter.label }}
    </v-btn>
  </div>
</template>

<script>
export default {
  name: 'TimeFilters',
  data() {
    return {
      activeFilter: 'tutti',
      timeFilters: [
        {
          id: 'oggi',
          label: 'Oggi'
        },
        {
          id: 'questo-weekend',
          label: 'Questo weekend'
        },
        {
          id: 'questa-settimana',
          label: 'Questa settimana'
        },
        {
          id: 'prossima-settimana',
          label: 'Prossima settimana'
        },
        {
          id: 'questo-mese',
          label: 'Questo mese'
        },
        {
          id: 'tutti',
          label: 'Tutti'
        }
      ]
    }
  },
  methods: {
    selectFilter(filterId) {
      this.activeFilter = filterId
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      let startDate = null
      let endDate = null

      switch (filterId) {
        case 'oggi':
          // Get today's events
          startDate = today
          endDate = new Date(today)
          endDate.setHours(23, 59, 59, 999)
          break

        case 'questo-weekend':
          // Get this weekend (Saturday and Sunday)
          const dayOfWeek = now.getDay()
          const daysUntilSaturday = (6 - dayOfWeek + 7) % 7
          const saturday = new Date(now)
          saturday.setDate(now.getDate() + daysUntilSaturday)
          saturday.setHours(0, 0, 0, 0)

          // If this weekend is in the past, use next weekend
          if (saturday < today) {
            saturday.setDate(saturday.getDate() + 7)
          }

          startDate = saturday
          endDate = new Date(saturday)
          endDate.setDate(saturday.getDate() + 1) // Sunday
          endDate.setHours(23, 59, 59, 999)
          break

        case 'questa-settimana':
          // Get this week (Monday to Sunday)
          const currentDayOfWeek = now.getDay()
          const daysFromMonday =
            currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1 // Sunday = 0, Monday = 1
          const monday = new Date(now)
          monday.setDate(now.getDate() - daysFromMonday)
          monday.setHours(0, 0, 0, 0)

          startDate = monday
          endDate = new Date(monday)
          endDate.setDate(monday.getDate() + 6) // Sunday (6 days after Monday)
          endDate.setHours(23, 59, 59, 999)
          break

        case 'prossima-settimana':
          // Get next week (Monday to Sunday)
          const nextMonday = new Date(now)
          const nextDay = now.getDay()
          const nextDiff =
            now.getDate() - nextDay + (nextDay === 0 ? -6 : 1) + 7
          nextMonday.setDate(nextDiff)
          nextMonday.setHours(0, 0, 0, 0)

          startDate = nextMonday
          endDate = new Date(nextMonday)
          endDate.setDate(nextMonday.getDate() + 6) // Sunday
          endDate.setHours(23, 59, 59, 999)
          break

        case 'questo-mese':
          // Get this month, but start from today if we're in the middle of the month
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          startDate = monthStart < today ? today : monthStart
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of current month
          endDate.setHours(23, 59, 59, 999)
          break

        case 'tutti':
          // Start from today for all events
          startDate = today
          endDate = null
          break
      }

      // Debug: log the date ranges
      console.log(`Filter: ${filterId}`)
      console.log(`Start: ${startDate ? startDate.toISOString() : 'null'}`)
      console.log(`End: ${endDate ? endDate.toISOString() : 'null'}`)

      // Emit filter-change event with date range
      this.$root.$emit('filter-change', {
        filterId,
        startDate,
        endDate
      })
    }
  }
}
</script>

<style scoped>
.time-filters {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  /* padding: 16px; */
}
</style>
