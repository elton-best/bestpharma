<script setup lang="ts">
import {demoMode} from '@/services/quality'
import OfficeView from './OfficeView.vue'
import ApiOfficeView from './ApiOfficeView.vue'
</script>
<template><OfficeView v-if="demoMode"/><ApiOfficeView v-else/></template>
