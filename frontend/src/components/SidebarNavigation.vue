<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { navigation } from '@/config/navigation'
const props = defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ navigate: []; expand: [] }>()
const route = useRoute()
const opened = ref<string[]>(['pilotage','support','compte'])
const active = (to:string) => route.fullPath.split('#')[0] === to
watch(()=>route.fullPath,()=>{ const group = navigation.find(g=>g.children.some(c=>active(c.to))); if(group && !opened.value.includes(group.id)) opened.value.push(group.id) },{immediate:true})
function toggle(id:string) {
 if(props.collapsed) { emit('expand'); if(!opened.value.includes(id)) opened.value.push(id); return }
 opened.value=opened.value.includes(id)?opened.value.filter(x=>x!==id):[...opened.value,id]
}
</script>
<template><nav class="erp-nav" aria-label="Navigation principale"><div v-for="group in navigation" :key="group.id" class="erp-nav-group">
<button class="erp-parent" :class="{active:group.children.some(c=>active(c.to))}" :title="group.label" :aria-label="group.label" :aria-expanded="!collapsed && opened.includes(group.id)" :aria-controls="`nav-${group.id}`" @click="toggle(group.id)"><AppIcon :name="group.icon" :size="18"/><span v-if="!collapsed" class="parent-label">{{group.label}}</span><small v-if="!collapsed && group.badge">{{group.badge}}</small><AppIcon v-if="!collapsed" name="chevron" :size="12" class="group-chevron" :class="{opened:opened.includes(group.id)}"/></button>
<ul v-show="!collapsed && opened.includes(group.id)" :id="`nav-${group.id}`" class="erp-children"><li v-for="child in group.children" :key="child.to"><RouterLink :to="child.to" :class="{selected:active(child.to)}" :aria-current="active(child.to)?'page':undefined" @click="emit('navigate')"><span>{{child.label}}</span><span v-if="child.planned" class="planned-dot" title="Module prévu, non livré" aria-label="Module prévu"></span></RouterLink></li></ul>
</div></nav></template>
