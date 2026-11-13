<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Préparatoire · BPD</span>
        <h1>Préparations Magistrales</h1>
        <p class="subtitle">Ordonnancier des préparations magistrales, contrôle libératoire du pharmacien et scellement SHA-256.</p>
      </div>
    </header>
    <div v-if="error" class="banner error" role="alert">{{ error }}</div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <section class="panel">
      <form class="inline-form mb-4" @submit.prevent="submitPrep">
        <input v-model="form.reference" placeholder="Réf (ex: PREP-2026-01)" required />
        <input v-model="form.formula_name" placeholder="Formule magistrale" required />
        <input v-model="form.patient_name" placeholder="Patient" />
        <input v-model="form.quantity_prepared" placeholder="Quantité (ex: 50g)" required />
        <input v-model="form.expiry_date" type="date" required />
        <button type="submit" class="btn-primary" :disabled="busy">Enregistrer Préparation</button>
      </form>

      <table class="data-table">
        <thead>
          <tr><th>Référence</th><th>Formule</th><th>Patient</th><th>Qté</th><th>Péremption</th><th>Statut</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id">
            <td><strong>{{ p.reference }}</strong></td>
            <td>{{ p.formula_name }}</td>
            <td>{{ p.patient_name || '—' }}</td>
            <td>{{ p.quantity_prepared }}</td>
            <td>{{ p.expiry_date }}</td>
            <td>{{ p.status }}</td>
            <td>
              <button v-if="p.status !== 'delivree'" class="btn-secondary" :disabled="busy" @click="releasePrep(p.id)">
                Libérer & Sceller
              </button>
              <code v-else>{{ p.control_hash?.slice(0, 12) }}…</code>
            </td>
          </tr>
          <tr v-if="!rows.length"><td colspan="7" class="empty-row">Aucune préparation magistrale enregistrée.</td></tr>
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
  reference: '',
  formula_name: '',
  patient_name: '',
  quantity_prepared: '',
  expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
})

async function load() {
  try {
    const res = await request<{ data: any[] }>('/qualite/cdc-extras/preparations')
    rows.value = res.data || []
  } catch (e) { error.value = (e as Error).message }
}

async function submitPrep() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request('/qualite/cdc-extras/preparations', 'POST', form)
    notice.value = 'Préparation enregistrée.'
    form.reference = ''; form.formula_name = ''; form.quantity_prepared = ''
    await load()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}

async function releasePrep(id: number) {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request(`/qualite/cdc-extras/preparations/${id}/release`, 'POST')
    notice.value = 'Préparation libérée et scellée SHA-256.'
    await load()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}

onMounted(load)
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 600; }
h1 { margin: 0.25rem 0 0; font-size: 1.55rem; }
.subtitle { margin: 0.2rem 0 0; color: #475569; font-size: 0.9rem; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
.inline-form { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.inline-form input { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 0.45rem; }
.mb-4 { margin-bottom: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.data-table th, .data-table td { padding: 0.55rem 0.7rem; border-bottom: 1px solid #f1f5f9; text-align: left; }
.data-table th { background: #f8fafc; color: #64748b; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.25rem; }
.btn-primary { background: #0f766e; color: #fff; border: none; border-radius: 0.5rem; padding: 0.5rem 0.9rem; cursor: pointer; font-weight: 600; }
.btn-secondary { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 0.45rem; padding: 0.35rem 0.7rem; cursor: pointer; }
.banner { padding: 0.75rem 1rem; border-radius: 0.5rem; }
.banner.error { background: #fef2f2; color: #991b1b; }
.banner.success { background: #f0fdf4; color: #166534; }
</style>
