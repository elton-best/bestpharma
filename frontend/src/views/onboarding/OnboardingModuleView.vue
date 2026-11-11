<script setup lang="ts">
import {useRoute} from 'vue-router'
import {demoMode} from '@/services/quality'
import ApplicationView from './ApplicationView.vue'
import ReviewView from './ReviewView.vue'
import ApplicationsApiView from './ApplicationsApiView.vue'
const route=useRoute()
</script>
<template><ApplicationsApiView v-if="!demoMode"/><ReviewView v-else-if="route.path.startsWith('/beg')"/><ApplicationView v-else/></template>
