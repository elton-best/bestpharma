<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import FilePicker from '@/components/FilePicker.vue'
import { boardRequest } from '@/services/cdcBoardsDemo'
import { demoMode, httpErrorMessage, readResponseJson, request, serviceUnavailable } from '@/services/quality'

type RecordRow = { id: number; zone: string; temperature: number; measured_at: string; conformity_status: string; notes?: string | null }
type BoardRow = { id: number; zone_name: string; measured_temperature: number; is_excursion: boolean; measured_at: string; effectiveness_status: string }

const rows = ref<RecordRow[]>([])
const loading = ref(false)
const error = ref('')
const notice = ref('')
const allowed = ref(true)
const busy = ref(false)
const csv = ref<File | null>(null)
const zones = [['refrigeree_2_8', 'Enceinte réfrigérée'], ['magasin_reserve', 'Magasin / réserve'], ['hall_dispensation', 'Hall de dispensation']]
const form = ref({ zone: 'refrigeree_2_8', temperature: '', measured_at: '', notes: '' })

function zoneKey(name: string) {
  return /positive|réfrig|refrig/i.test(name) ? 'refrigeree_2_8' : 'magasin_reserve'
}
function fromBoard(row: BoardRow): RecordRow {
  return {
    id: row.id,
    zone: zoneKey(row.zone_name),
    temperature: row.measured_temperature,
    measured_at: row.measured_at,
    conformity_status: row.is_excursion ? 'hors_seuil' : 'conforme',
    notes: row.effectiveness_status,
  }
}

const ordered = computed(() => [...rows.value].sort((a, b) => a.measured_at.localeCompare(b.measured_at)))
function excursionText(row: RecordRow) {
  const label = zones.find(zone => zone[0] === row.zone)?.[1] || row.zone
  return `${label} · ${row.temperature} °C · ${new Date(row.measured_at).toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' })}`
}
const excursion = computed(() => [...ordered.value].reverse().find(row => row.conformity_status === 'hors_seuil') || null)
const chart = computed(() => {
  const points = ordered.value
  if (points.length < 2) return ''
  const temps = points.map(row => row.temperature)
  const min = Math.min(...temps, 2)
  const max = Math.max(...temps, 8)
  const span = max - min || 1
  return points.map((row, index) => {
    const x = 16 + (index / (points.length - 1)) * 288
    const y = 116 - ((row.temperature - min) / span) * 96
    return `${x},${y}`
  }).join(' ')
})

async function reload() {
  loading.value = true
  error.value = ''
  try {
    if (demoMode) {
      const result = await boardRequest<{ data: BoardRow[] }>('/stock/temperatures')
      rows.value = result.data.map(fromBoard)
    } else {
      const result = await request<{ data: RecordRow[] }>('/locauxequipements/temperatures')
      rows.value = result.data
    }
    allowed.value = true
  } catch (e) {
    allowed.value = false
    error.value = e instanceof Error && e.message ? e.message : serviceUnavailable
  } finally {
    loading.value = false
  }
}

async function save() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    if (demoMode) {
      const temperature = Number(form.value.temperature)
      rows.value = [...rows.value, { id: Date.now(), zone: form.value.zone, temperature, measured_at: form.value.measured_at, conformity_status: temperature < 2 || temperature > 8 ? 'hors_seuil' : 'conforme', notes: form.value.notes }]
      notice.value = 'Relevé enregistré.'
    } else {
      const result = await request<{ message: string }>('/locauxequipements/temperatures', 'POST', { ...form.value, temperature: Number(form.value.temperature) })
      notice.value = result.message
      await reload()
    }
    form.value.temperature = ''
    form.value.notes = ''
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : serviceUnavailable
  } finally {
    busy.value = false
  }
}

async function upload() {
  const file = csv.value
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    if (demoMode) {
      const text = await file.text()
      const imported = text.split(/\r?\n/).slice(1).filter(Boolean)
      notice.value = `${imported.length} ligne(s) lue(s) dans ${file.name}.`
      csv.value = null
      return
    }
    const body = new FormData()
    body.append('file', file)
    body.append('zone', form.value.zone)
    const token = sessionStorage.getItem('bestpharma.token')
    const tenant = sessionStorage.getItem('bestpharma.officine')
    let response: Response
    try {
      response = await fetch('/api/v1/locauxequipements/temperatures/import', { method: 'POST', headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(tenant ? { 'X-Officine-ID': tenant } : {}) }, body })
    } catch {
      throw Error(serviceUnavailable)
    }
    const result = await readResponseJson<{ message?: string; imported_count?: number; rejected_count?: number; rejected_rows?: { line: number }[] }>(response)
    if (!response.ok) throw Error(httpErrorMessage(response, result, 'Import impossible.'))
    notice.value = `${result.imported_count ?? 0} relevé(s) importé(s) · ${result.rejected_count ?? 0} ligne(s) rejetée(s).`
    if (result.rejected_rows?.length) notice.value += ' Lignes invalides : ' + result.rejected_rows.map(row => row.line).join(', ')
    csv.value = null
    await reload()
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : serviceUnavailable
  } finally {
    busy.value = false
  }
}

onMounted(reload)
</script>
<template>
  <main class="page erp-page">
    <div class="page-heading compact">
      <div>
        <p class="eyebrow">LOCAUX & ÉQUIPEMENTS · CONSERVATION</p>
        <h1>Températures & chaîne du froid</h1>
        <p class="page-subtitle">Relevés horodatés et import des mesures présentes dans un CSV. Seuils à configurer après validation.</p>
      </div>
      <button class="button secondary" :disabled="loading || busy" @click="reload">Actualiser</button>
    </div>
    <p v-if="loading" role="status">Chargement des relevés…</p>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
    <p v-if="notice" class="alert success" role="status">{{ notice }}</p>
    <section v-if="allowed" class="panel form-body">
      <h2>Saisir un relevé</h2>
      <form class="form-grid" @submit.prevent="save">
        <label>Zone<select v-model="form.zone"><option v-for="z in zones" :key="z[0]" :value="z[0]">{{ z[1] }}</option></select></label>
        <label>Température (°C)<input v-model="form.temperature" type="number" step="0.01" required></label>
        <label>Date et heure mesurées<input v-model="form.measured_at" type="datetime-local" required></label>
        <label>Notes (facultatif)<input v-model="form.notes" maxlength="2000"></label>
        <button class="button primary" :disabled="busy || loading">Enregistrer le relevé</button>
      </form>
      <hr>
      <h2>Importer un CSV</h2>
      <p>Colonnes acceptées : Date + Heure (ou Date/Heure), Température. Les lignes invalides sont rapportées et ne sont pas complétées automatiquement.</p>
      <label>Fichier CSV<FilePicker v-model="csv" accept=".csv,text/csv" :disabled="busy" /></label>
      <button class="button secondary" type="button" :disabled="busy || !csv" @click="upload">Importer le fichier</button>
    </section>
    <section v-if="allowed" class="panel" data-tour="temp-courbe">
      <h2>Courbe des relevés</h2>
      <p v-if="ordered.length < 2" class="empty-state">Au moins deux relevés sont nécessaires pour tracer la courbe.</p>
      <svg v-else viewBox="0 0 320 140" role="img" aria-label="Courbe des températures relevées">
        <polyline :points="chart" fill="none" stroke="#0f3b27" stroke-width="2" />
      </svg>
      <ul>
        <li v-for="row in ordered" :key="row.id">{{ new Date(row.measured_at).toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' }) }} · {{ row.temperature }} °C · {{ row.conformity_status }}</li>
      </ul>
    </section>
    <section v-if="allowed" class="panel" data-tour="temp-excursion">
      <h2>Dernière excursion</h2>
      <p v-if="excursion">{{ excursionText(excursion) }}</p>
      <p v-else>Aucune excursion sur la période.</p>
    </section>
    <section class="panel">
      <h2>Historique</h2>
      <p v-if="!loading && !error && !rows.length" class="empty-state">Aucun relevé enregistré pour cette officine.</p>
      <div v-else-if="rows.length" class="table-scroll">
        <table>
          <thead><tr><th>Date/heure mesurée</th><th>Zone</th><th>°C</th><th>Évaluation</th><th>Notes</th></tr></thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ new Date(row.measured_at).toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' }) }}</td>
              <td>{{ zones.find(z => z[0] === row.zone)?.[1] || row.zone }}</td>
              <td>{{ row.temperature }}</td>
              <td>{{ row.conformity_status }}</td>
              <td>{{ row.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
