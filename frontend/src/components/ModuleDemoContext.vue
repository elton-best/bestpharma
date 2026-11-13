<script setup lang="ts">
import { ref } from 'vue'
import { currentOffice, supportState, selectOffice, switchPersona, resetSupportDemo } from '@/services/supportDemo'
import AppModal from './AppModal.vue'
const error=ref('');const reset=ref(false)
function change(action:()=>void){try{action();error.value=''}catch(e){error.value=(e as Error).message}}
</script>
<template><div class="module-context"><label>Officine<select :value="currentOffice.id" @change="change(()=>selectOffice(($event.target as HTMLSelectElement).value))"><option v-for="o in supportState.offices" :key="o.id" :value="o.id">{{o.name}}</option></select></label><label>Point de vue<select :value="supportState.persona" @change="change(()=>switchPersona(($event.target as HTMLSelectElement).value as 'office'|'company'))"><option value="office">Administrateur officine</option><option value="company">Coordination entreprise</option></select></label><button class="text-link" @click="reset=true">Réinitialiser l’espace</button><p v-if="error" role="alert">{{error}}</p></div><AppModal v-model="reset" title="Revenir aux données d’origine ?" size="small"><div class="form-body"><p>Les officines, accompagnateurs, demandes et missions seront restaurés. Les actions qualité et l’équipe ne seront pas modifiées.</p></div><template #footer><button class="button secondary" @click="reset=false">Annuler</button><button class="button primary" @click="change(resetSupportDemo);reset=false">Restaurer</button></template></AppModal></template>
