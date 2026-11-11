<script setup lang="ts">
import {demoMode} from '@/services/quality'
import SupportView from './SupportView.vue'
import RequestsApiView from './RequestsApiView.vue'
</script>
<template><RequestsApiView v-if="!demoMode"/><SupportView v-else/></template>
