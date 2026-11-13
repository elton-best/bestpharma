<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Conformité · Obligations</span>
        <h1>Échéancier Réglementaire</h1>
        <p class="subtitle">Suivi des obligations périodiques (ABRP, DGI, CNSS, Ordre, Inspection) et justificatifs de dépôt.</p>
      </div>
    </header>
    <div v-if="error" class="banner error" role="alert">{{ error }}</div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <section class="panel">
      <form class="inline-form mb-4" @submit.prevent="submitDeadline">
        <input v-model="form.reference" placeholder="Réf (ex: ECH-2026-11)" required />
        <input v-model="form.title" placeholder="Obligation réglementaire" required />
        <select v-model="form.authority">
          <option value="ABRP">ABRP</option>
          <option value="DGI">DGI</option>
          <option value="CNSS">CNSS</option>
          <option value="Ordre">Ordre</option>
          <option value="Inspection">Inspection</option>
        </select>
        <input v-model="form.due_date" type="date" required />
        <button type="submit" class="btn-primary" :disabled="busy">Ajouter Échéance</button>
      </form>

      <table class="data-table">
        <thead>
          <tr><th>Référence</th><th>Obligation</th><th>Autorité</th><th>Échéance</th><th>Statut</th><th>Justificatif</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr v-for="d in rows" :key="d.id">
            <td><strong>{{ d.reference }}</strong></td>
            <td>{{ d.title }}</td>
            <td>{{ d.authority }}</td>
            <td>{{ d.due_date }}</td>
            <td>{{ d.status }}</td>
            <td>{{ d.proof_ref || '—' }}</td>
            <td>
              <button v-if="d.status !== 'cloturee'" class="btn-secondary" :disabled="busy" @click="closeItem(d.id)">
                Clôturer
              </button>
              <span v-else class="ok-text">Déposée</span>
            </td>
          </tr>
          <tr v-if="!rows.length"><td colspan="7" class="empty-row">Aucune échéance enregistrée.</td></tr>
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
  title: '',
  authority: 'DGI',
  due_date: new Date().toISOString().slice(0, 10),
})

async function load() {
  try {
    const res = await request<{ data: any[] }>('/qualite/cdc-extras/deadlines')
    rows.value = res.data || []
  } catch (e) { error.value = (e as Error).message }
}

async function submitDeadline() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request('/qualite/cdc-extras/deadlines', 'POST', form)
    notice.value = 'Échéance ajoutée.'
    form.reference = ''; form.title = ''
    await load()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}

async function closeItem(id: number) {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request(`/qualite/cdc-extras/deadlines/${id}/close`, 'POST', { proof_ref: 'DEPOT-VERIFIE' })
    notice.value = 'Échéance clôturée.'
    await load()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}

onMounted(load)
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 0.75rem; font-weight: 600; }
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
.btn-secondary { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 0.45rem; padding: 0.35rem 0.7rem; cursor: pointer; }
.ok-text { color: #15803d; font-weight: 600; }
.banner { padding: 0.75rem 1rem; border-radius: 0.5rem; }
.banner.error { background: #fef2f2; color: #991b1b; }
.banner.success { background: #f0fdf4; color: #166534; }
</style>
