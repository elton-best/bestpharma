<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Réglementaire · Tableau B</span>
        <h1>Registre Stupéfiants Tableau B</h1>
        <p class="subtitle">Traçabilité nominative des entrées, sorties sur ordonnance sécurisée et destructions, scellée SHA-256.</p>
      </div>
    </header>
    <div v-if="error" class="banner error" role="alert">{{ error }}</div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <section class="panel">
      <form class="inline-form mb-4" @submit.prevent="submitEntry">
        <input v-model="form.entry_date" type="date" required />
        <select v-model="form.movement_type">
          <option value="entree">Entrée</option>
          <option value="sortie">Sortie (Dispensation)</option>
          <option value="destruction">Destruction</option>
        </select>
        <input v-model="form.substance_name" placeholder="Substance (ex: Morphine 10mg)" required />
        <input v-model="form.lot_number" placeholder="N° Lot" required />
        <input v-model.number="form.quantity" type="number" min="0.01" step="0.01" placeholder="Qté" required />
        <input v-model="form.prescription_ref" placeholder="Réf. Ordonnance" />
        <input v-model="form.patient_name" placeholder="Patient" />
        <button type="submit" class="btn-primary" :disabled="busy">Inscrire au registre</button>
      </form>

      <table class="data-table">
        <thead>
          <tr><th>Date</th><th>Mouvement</th><th>Substance</th><th>Lot</th><th>Qté</th><th>Ordonnance</th><th>Visa</th><th>Empreinte SHA-256</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.entry_date }}</td>
            <td><strong>{{ r.movement_type }}</strong></td>
            <td>{{ r.substance_name }}</td>
            <td>{{ r.lot_number }}</td>
            <td>{{ r.quantity }} {{ r.unit }}</td>
            <td>{{ r.prescription_ref || '—' }}</td>
            <td>{{ r.pharmacist_visa }}</td>
            <td><code>{{ r.entry_hash?.slice(0, 12) }}…</code></td>
          </tr>
          <tr v-if="!rows.length"><td colspan="8" class="empty-row">Aucun mouvement inscrit au registre Tableau B.</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { request } from '@/services/quality'

const rows = ref<any[]>([])
const busy = ref(false)
const error = ref('')
const notice = ref('')
const form = reactive({
  entry_date: new Date().toISOString().slice(0, 10),
  movement_type: 'sortie',
  substance_name: '',
  lot_number: '',
  quantity: 1,
  prescription_ref: '',
  patient_name: '',
})

async function load() {
  try {
    const res = await request<{ data: any[] }>('/qualite/cdc-extras/stupefiants')
    rows.value = res.data || []
  } catch (e) { error.value = (e as Error).message }
}

async function submitEntry() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request('/qualite/cdc-extras/stupefiants', 'POST', form)
    notice.value = 'Mouvement Tableau B inscrit et scellé SHA-256.'
    form.substance_name = ''; form.lot_number = ''; form.prescription_ref = ''
    await load()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}

onMounted(load)
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #fee2e2; color: #991b1b; font-size: 0.75rem; font-weight: 600; }
h1 { margin: 0.25rem 0 0; font-size: 1.55rem; }
.subtitle { margin: 0.2rem 0 0; color: #475569; font-size: 0.9rem; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
.inline-form { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.inline-form input, .inline-form select { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 0.45rem; }
.mb-4 { margin-bottom: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.data-table th, .data-table td { padding: 0.55rem 0.7rem; border-bottom: 1px solid #f1f5f9; text-align: left; }
.data-table th { background: #f8fafc; color: #64748b; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.25rem; }
.btn-primary { background: #0f766e; color: #fff; border: none; border-radius: 0.5rem; padding: 0.5rem 0.9rem; cursor: pointer; font-weight: 600; }
.banner { padding: 0.75rem 1rem; border-radius: 0.5rem; }
.banner.error { background: #fef2f2; color: #991b1b; }
.banner.success { background: #f0fdf4; color: #166534; }
</style>
