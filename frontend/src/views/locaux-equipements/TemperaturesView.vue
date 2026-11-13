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
const zones = [['refrigeree_2_8', 'Enceinte réfrigérée (2-8°C)'], ['magasin_reserve', 'Magasin / réserve (15-25°C)'], ['hall_dispensation', 'Hall de dispensation']]
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
  notice.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    await request('/locauxequipements/temperatures/import', 'POST', body)
    notice.value = 'Import CSV des températures terminé.'
    csv.value = null
    await reload()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

onMounted(reload)
</script>

<template>
  <main class="temperatures-page">
    <header class="page-header">
      <div>
        <span class="phase-pill">Qualité · Chaîne du froid BPD</span>
        <h1>Relevés de Température & Chaîne du Froid</h1>
        <p class="subtitle">Surveillance continue des enceintes 2-8°C et des zones 15-25°C avec détection immédiate des excursions.</p>
      </div>
    </header>

    <div v-if="error" class="banner error" role="alert">
      <span>{{ error }}</span>
      <button class="btn-link" @click="reload">Réessayer</button>
    </div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <section class="panel">
      <h2>Saisir un relevé de température</h2>
      <form class="form-grid" @submit.prevent="save">
        <label>Zone surveillée
          <select v-model="form.zone">
            <option v-for="z in zones" :key="z[0]" :value="z[0]">{{ z[1] }}</option>
          </select>
        </label>
        <label>Température (°C)
          <input v-model="form.temperature" type="number" step="0.01" required placeholder="Ex: 4.5" />
        </label>
        <label>Date et heure mesurées
          <input v-model="form.measured_at" type="datetime-local" required />
        </label>
        <label>Notes / Observations
          <input v-model="form.notes" maxlength="2000" placeholder="Ex: Contrôle matinal conforme" />
        </label>
        <button class="button primary" :disabled="busy || loading">Enregistrer le relevé</button>
      </form>

      <hr class="divider" />

      <h2>Importer un relevé CSV</h2>
      <p class="desc">Colonnes acceptées : Date/Heure, Température. Les lignes hors plage 2-8°C ou 15-25°C sont automatiquement signalées.</p>
      <div class="import-row">
        <FilePicker v-model="csv" accept=".csv,text/csv" :disabled="busy" />
        <button class="button secondary" type="button" :disabled="busy || !csv" @click="upload">Importer le fichier CSV</button>
      </div>
    </section>

    <section v-if="allowed" class="panel" data-tour="temp-courbe">
      <h2>Courbe de température journalière</h2>
      <p v-if="ordered.length < 2" class="empty-state">Au moins deux relevés sont nécessaires pour tracer la courbe.</p>
      <svg v-else viewBox="0 0 320 140" role="img" aria-label="Courbe des températures relevées" class="chart-svg">
        <polyline :points="chart" fill="none" stroke="#0f3b27" stroke-width="2.5" />
      </svg>
      <ul class="readings-list">
        <li v-for="row in ordered" :key="row.id">
          <span>{{ new Date(row.measured_at).toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' }) }}</span>
          <strong>{{ row.temperature }} °C</strong>
          <span class="status-tag" :class="row.conformity_status">{{ row.conformity_status }}</span>
        </li>
      </ul>
    </section>

    <section v-if="allowed" class="panel alert-panel" data-tour="temp-excursion">
      <h2>Dernière excursion enregistrée</h2>
      <p v-if="excursion" class="excursion-text">{{ excursionText(excursion) }}</p>
      <p v-else class="text-muted">Aucune excursion sur la période surveillée. Chaîne du froid sous contrôle.</p>
    </section>

    <section class="panel">
      <h2>Historique chronologique des relevés</h2>
      <p v-if="!loading && !error && !rows.length" class="empty-state">Aucun relevé enregistré pour cette officine.</p>
      <div v-else-if="rows.length" class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date/heure mesurée</th>
              <th>Zone</th>
              <th>°C</th>
              <th>Évaluation</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <td>{{ new Date(row.measured_at).toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo' }) }}</td>
              <td><strong>{{ zones.find(z => z[0] === row.zone)?.[1] || row.zone }}</strong></td>
              <td>{{ row.temperature }} °C</td>
              <td>
                <span class="status-tag" :class="row.conformity_status">{{ row.conformity_status }}</span>
              </td>
              <td>{{ row.notes || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
.temperatures-page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: #f8fafc;
}

.page-header {
  border-bottom: 2px solid #0f3b27;
  padding-bottom: 1rem;
}

.phase-pill {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 0 !important;
  background: #0f3b27;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0.35rem 0 0;
  font-size: 1.6rem;
  color: #0f3b27;
  font-weight: 800;
}

h2 {
  font-size: 1.1rem;
  color: #0f3b27;
  margin: 0 0 0.75rem;
  font-weight: 700;
}

.subtitle, .desc {
  color: #475569;
  font-size: 0.88rem;
  margin: 0.2rem 0 0.75rem;
}

.panel {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  padding: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  align-items: flex-end;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #1e293b;
}

input, select {
  padding: 0.5rem 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  outline: none !important;
  font-size: 0.88rem;
  background: #ffffff;
  color: #0f172a;
}

input:focus, select:focus {
  border-color: #0f3b27 !important;
  outline: none !important;
  box-shadow: none !important;
}

.button {
  padding: 0.55rem 1rem;
  border-radius: 0 !important;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.88rem;
}

.button.primary {
  background: #0f3b27;
  color: #ffffff;
  border: none;
}

.button.secondary {
  background: #ffffff;
  color: #0f3b27;
  border: 1px solid #0f3b27;
}

.divider {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 1.25rem 0;
}

.import-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.chart-svg {
  width: 100%;
  max-height: 140px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  padding: 0.5rem;
}

.readings-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
}

.readings-list li {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0 !important;
  padding: 0.25rem 0.5rem;
  display: flex;
  gap: 0.4rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
}

.data-table th, .data-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 0 !important;
  text-align: left;
}

.data-table th {
  background: #0f3b27;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.status-tag {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 0 !important;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-tag.conforme { background: #dcfce7; color: #15803d; }
.status-tag.hors_seuil { background: #fee2e2; color: #b91c1c; }

.alert-panel {
  border-left: 4px solid #0f3b27;
}

.excursion-text {
  color: #b91c1c;
  font-weight: 700;
  font-size: 0.95rem;
}

.text-muted { color: #64748b; font-size: 0.88rem; }
.empty-state { color: #94a3b8; padding: 1rem 0; font-style: italic; }

.btn-link {
  background: none;
  border: none;
  color: #0f3b27;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 700;
  margin-left: 0.5rem;
}

.banner {
  padding: 0.75rem 1rem;
  border-radius: 0 !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.banner.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.banner.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
</style>
