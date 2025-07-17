<template lang="pug">
client-only(placeholder='Loading...')
  LMap(ref="leafletMap"
      id="leaflet-map"
      :style="LMapStyles"
      :zoom="currentZoom"
      :options="{attributionControl: false}"
      :center="currentCenter"
      @ready="handleMapReady")
    LControlAttribution(position='bottomright' prefix="")
    LTileLayer(
        @tileload="$emit('tileload')"
        @tileerror="$emit('tileerror')"
        :url="url"
        :attribution="attribution")
    template(v-if="showMarker && places.length === 0")
      LMarker(
        :lat-lng="markerPosition"
        @update:lat-lng="updateCoords"
        :draggable="draggable")
    template(v-else-if="showMarker && places.length > 0")
      LMarker(
        v-for="(place, index) in places"
        :key="index"
        :lat-lng="getLatLng(place)"
        @click="$emit('marker-click', place)")
</template>

<script>
let L, leaflet
if (process.client) {
  require('leaflet/dist/leaflet.css')
  const {
    LMap,
    LTileLayer,
    LMarker,
    LPopup,
    LControlAttribution
  } = require('vue2-leaflet')
  leaflet = require('leaflet')

  // Fix Leaflet's default icon path issues
  delete leaflet.Icon.Default.prototype._getIconUrl
  leaflet.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/dist/images/marker-icon-2x.png',
    iconUrl: '/leaflet/dist/images/marker-icon.png',
    shadowUrl: '/leaflet/dist/images/marker-shadow.png'
  })

  L = {
    LMap,
    LTileLayer,
    LMarker,
    LPopup,
    LControlAttribution,
    leaflet
  }
}

export default {
  components: process.client
    ? {
        LMap: L.LMap,
        LTileLayer: L.LTileLayer,
        LMarker: L.LMarker,
        LPopup: L.LPopup,
        LControlAttribution: L.LControlAttribution
      }
    : {},
  props: {
    place: {
      type: Object,
      required: true,
      validator: (prop) => {
        return (
          typeof prop.latitude === 'number' &&
          typeof prop.longitude === 'number'
        )
      }
    },
    places: {
      type: Array,
      default: () => [],
      validator: (props) => {
        return props.every(
          (p) =>
            typeof p.latitude === 'number' && typeof p.longitude === 'number'
        )
      }
    },
    showMarker: { type: Boolean, default: true },
    mapCenter: { type: Array, default: () => [] },
    zoom: { type: Number, default: () => 16 },
    draggable: { type: Boolean, default: false },
    LMapStyles: { type: Object, default: () => ({}) }
  },
  data({ $store }) {
    return {
      url:
        $store.state.settings.tilelayer_provider ||
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        $store.state.settings.tilelayer_provider_attribution ||
        '<a target="_blank" href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      localLatitude: this.place.latitude,
      localLongitude: this.place.longitude,
      currentZoom: this.zoom,
      currentCenter: null,
      bounds: null
    }
  },
  computed: {
    center() {
      if (this.mapCenter.length) {
        return this.mapCenter
      }
      const lat = isNaN(this.localLatitude) ? 0 : this.localLatitude
      const lng = isNaN(this.localLongitude) ? 0 : this.localLongitude
      return [lat, lng]
    },
    markerPosition() {
      return {
        lat: this.localLatitude,
        lng: this.localLongitude
      }
    }
  },
  watch: {
    'place.latitude'(newVal) {
      this.localLatitude = newVal
    },
    'place.longitude'(newVal) {
      this.localLongitude = newVal
    },
    places: {
      handler(newPlaces) {
        if (newPlaces.length > 0) {
          this.$nextTick(() => {
            this.fitBounds()
          })
        }
      },
      deep: true
    }
  },
  mounted() {
    if (!process.client) {
      return
    }

    setTimeout(() => {
      if (this.$refs.leafletMap && this.$refs.leafletMap.mapObject) {
        this.$refs.leafletMap.mapObject.invalidateSize()
        if (this.places.length > 0) {
          this.fitBounds()
        } else {
          this.currentCenter = this.center
        }
      }
    }, 200)
  },
  methods: {
    updateCoords(v) {
      this.localLatitude = Number.parseFloat(v.lat).toFixed(7)
      this.localLongitude = Number.parseFloat(v.lng).toFixed(7)
      this.$emit('update:coordinates', {
        latitude: this.localLatitude,
        longitude: this.localLongitude
      })
    },
    getLatLng(place) {
      return {
        lat: place.latitude,
        lng: place.longitude
      }
    },
    handleMapReady() {
      if (this.places.length > 0) {
        this.fitBounds()
      } else {
        this.currentCenter = this.center
      }
    },
    fitBounds() {
      if (
        !this.$refs.leafletMap ||
        !this.$refs.leafletMap.mapObject ||
        !process.client
      ) {
        return
      }

      const points = this.places.map((place) => [
        place.latitude,
        place.longitude
      ])

      if (points.length > 0) {
        const bounds = L.leaflet.latLngBounds(points)
        this.$refs.leafletMap.mapObject.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: this.zoom
        })
      }
    }
  }
}
</script>

<style>
#leaflet-map {
  height: 10rem;
  border-radius: 0.3rem;
  border: 1px solid #fff;
  z-index: 1;
}
</style>
