<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Personnel · Article 1.11 BPD</span>
        <h1>Pointage Présence (Art. 1.11)</h1>
        <p class="subtitle">Registre journalier de présence effective du pharmacien titulaire/assistant et de l'équipe officinale.</p>
      </div>
    </header>
    <div v-if="error" class="banner error" role="alert">{{ error }}</div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <section class="panel">
      <form class="inline-form mb-4" @submit.prevent="submitPresence">
        <input v-model="form.staff_name" placeholder="Nom & Prénom" required />
        <input v-model="form.role_badge" placeholder="Fonction (ex: Pharmacien)" required />
        <input v-model="form.work_date" type="date" required />
        <input v-model="form.check_in_at" type="time" required />
        <input v-model="form.check_out_at" type="time" />
        <label class="chk"><input v-model="form.pharmacist_present" type="checkbox" /> Pharmacien présent</label>
        <button type="submit" class="btn-primary" :disabled="busy">Pointer</button>
      </form>

      <table class="data-table">
        <thead>
          <tr><th>Date</th><th>Collaborateur</th><th>Fonction</th><th>Arrivée</th><th>Départ</th><th>Pharmacien présent</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.work_date }}</td>
            <td><strong>{{ r.staff_name }}</strong></td>
            <td>{{ r.role_badge }}</td>
            <td>{{ r.check_in_at }}</td>
            <td>{{ r.check_out_at || '—' }}</td>
            <td>{{ r.pharmacist_present ? 'Oui' : 'Non' }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="6" class="empty-row">Aucun pointage enregistré.</td></tr>
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
  staff_name: '',
  role_badge: 'Pharmacien Titulaire',
  work_date: new Date().toISOString().slice(0, 10),
  check_in_at: '08:00',
  check_out_at: '',
  pharmacist_present: true,
})

async function load() {
  try {
    const res = await request<{ data: any[] }>('/qualite/cdc-extras/presence')
    rows.value = res.data || []
  } catch (e) { error.value = (e as Error).message }
}

async function submitPresence() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request('/qualite/cdc-extras/presence', 'POST', form)
    notice.value = 'Pointage enregistré.'
    form.staff_name = ''
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
.inline-form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
.inline-form input { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 0.45rem; }
.chk { display: flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; }
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
