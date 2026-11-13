<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { demoMode, request } from '@/services/quality'

interface Device { id: number; name: string; type: string; is_attendance_terminal: boolean; is_active: boolean; last_seen_at: string | null; version: number }
const rows = ref<Device[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const open = ref(false)
const form = ref({ name: '', type: 'caisse', fingerprint: '' })

async function load() {
  loading.value = true; error.value = ''
  try { rows.value = (await request<{data: Device[]}>('/tenancy/devices')).data }
  catch (e) { error.value = (e as Error).message; rows.value = [] }
  finally { loading.value = false }
}
function beginRegistration() { form.value = { name: '', type: 'caisse', fingerprint: '' }; error.value = ''; open.value = true }
async function register() {
  busy.value = true; error.value = ''
  try {
    await request('/tenancy/devices', 'POST', { ...form.value })
    form.value.fingerprint = ''
    open.value = false; notice.value = 'Appareil enregistré. Son identifiant brut n’est pas conservé.'
    await load()
  } catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
async function transition(device: Device, active: boolean) {
  error.value = ''; notice.value = ''
  try {
    const result = await request<{data: Device}>(`/tenancy/devices/${device.id}/${active ? 'reactivate' : 'revoke'}`, 'POST', { version: device.version })
    rows.value = rows.value.map(row => row.id === device.id ? result.data : row)
    notice.value = active ? 'Appareil réactivé.' : 'Appareil révoqué.'
  } catch (e) { error.value = (e as Error).message; if (error.value.includes('Version périmée')) await load() }
}
onMounted(() => { if (!demoMode) load() })
</script>

<template>
  <section class="page erp-page">
    <div class="page-heading compact"><div><p class="eyebrow">SÉCURITÉ OFFICINE</p><h1>Appareils autorisés</h1><p class="page-subtitle">Enregistrement, révocation et réactivation dans l’officine sélectionnée.</p></div></div>
    <div v-if="demoMode" class="panel form-body"><h2>Parc connecté requis</h2><p>La démonstration ne crée ni n’autorise de véritables appareils. Ouvrez l’aperçu API pour gérer le parc.</p></div>
    <template v-else>
      <p v-if="error" class="alert error" role="alert">{{ error }}</p><p v-if="notice" class="alert success" role="status">{{ notice }}</p>
      <div class="panel">
        <div class="panel-heading"><div><h2>Parc de l’officine</h2><p class="page-subtitle">Les identifiants sont conservés sous forme d’empreinte HMAC, jamais en clair.</p></div><button class="button primary" @click="beginRegistration">Enregistrer un appareil</button></div>
        <p v-if="loading" class="form-body" role="status">Chargement…</p>
        <div v-else class="table-scroll"><table><thead><tr><th>APPAREIL</th><th>TYPE</th><th>ÉTAT</th><th>DERNIÈRE ACTIVITÉ</th><th>ACTION</th></tr></thead><tbody>
          <tr v-for="device in rows" :key="device.id"><td><strong>{{ device.name }}</strong><span v-if="device.is_attendance_terminal" class="table-subtitle">Borne de pointage</span></td><td>{{ device.type }}</td><td><span class="status-badge" :class="device.is_active ? 'active' : 'suspended'">{{ device.is_active ? 'Actif' : 'Révoqué' }}</span></td><td>{{ device.last_seen_at || '—' }}</td><td><button class="button small" :class="device.is_active ? 'danger' : 'secondary'" :disabled="busy" @click="transition(device, !device.is_active)">{{ device.is_active ? 'Révoquer' : 'Réactiver' }}</button></td></tr>
          <tr v-if="!rows.length"><td colspan="5" class="empty-state">Aucun appareil enregistré pour cette officine.</td></tr>
        </tbody></table></div>
      </div>
      <AppModal v-model="open" title="Enregistrer un appareil" :busy="busy"><form id="device-form" class="form-body" @submit.prevent="register"><p v-if="error" class="alert error" role="alert">{{ error }}</p><label>Nom de l’appareil<input v-model="form.name" required maxlength="100" autocomplete="off"></label><label>Type<select v-model="form.type"><option value="caisse">Caisse</option><option value="pc_bureau">PC de bureau</option><option value="borne_pointage">Borne de pointage</option><option value="tablette_inventaire">Tablette d’inventaire</option><option value="smartphone_nomade">Smartphone nomade</option></select></label><label>Empreinte fournie par l’appareil<input v-model="form.fingerprint" type="password" required minlength="32" maxlength="512" autocomplete="new-password"><small>Valeur secrète utilisée uniquement pour calculer son empreinte sécurisée.</small></label></form><template #footer><button class="button secondary" :disabled="busy" @click="open=false">Annuler</button><button class="button primary" form="device-form" type="submit" :disabled="busy">Enregistrer</button></template></AppModal>
    </template>
  </section>
</template>
