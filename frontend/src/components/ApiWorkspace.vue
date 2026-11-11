<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppModal from './AppModal.vue'
import AppIcon from './AppIcon.vue'
import { officineService, accountState, chooseOffice } from '@/services/officine'
const open=ref(false);const busy=ref(false);const error=ref('')
const current=computed(()=>accountState.officines.find(o=>String(o.id)===sessionStorage.getItem('bestpharma.officine')))
async function load(){busy.value=true;error.value='';try{await officineService.account()}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
function select(id:number){try{chooseOffice(id)}catch(e){error.value=(e as Error).message}}
onMounted(()=>{if(sessionStorage.getItem('bestpharma.token'))load()})
</script>
<template><button class="workspace api-workspace" @click="open=true;load()" aria-label="Choisir une officine"><span class="workspace-avatar">BP</span><span class="workspace-copy"><strong>{{current?.name||'Choisir une officine'}}</strong><small>{{current?.access_type==='support'?'Accès accompagnateur':'Mes espaces autorisés'}}</small></span><AppIcon name="chevron" :size="13"/></button><AppModal v-model="open" title="Choisir votre officine"><div class="form-body"><p v-if="busy" role="status">Chargement de vos accès…</p><p v-if="error" class="alert error" role="alert">{{error}}</p><p class="module-disclaimer">Seules vos appartenances actives ou affectations approuvées sont proposées. Le serveur revérifie chaque accès.</p><div v-for="o in accountState.officines" :key="o.id" class="detail-card section-toolbar"><div><strong>{{o.name}}</strong><p class="page-subtitle">{{o.status==='active'?'Active':'En attente'}} · {{o.access_type==='support'?'Accompagnateur':o.is_admin?'Administrateur':'Membre'}}</p></div><button :disabled="busy||o.status!=='active'" class="button primary small" @click="select(o.id)">Ouvrir</button></div><p v-if="!busy&&!accountState.officines.length" class="empty-state">Aucune officine autorisée actuellement.</p></div><template #footer><button class="button secondary" @click="open=false">Fermer</button><RouterLink v-if="accountState.user?.is_support_coordinator" to="/beg/accompagnateurs" class="button primary" @click="open=false">Coordination des accès</RouterLink></template></AppModal></template>
