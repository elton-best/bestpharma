<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Documents · Référentiel M03</span>
        <h1>Modèles Types BPD (59)</h1>
        <p class="subtitle">Catalogue des 59 modèles types officinaux BPD prêts à être adoptés et rattachés au SMQ de l'officine.</p>
      </div>
      <button class="btn-primary" :disabled="busy" @click="bootstrap">Charger les 59 Modèles BPD</button>
    </header>
    <div v-if="error" class="banner error" role="alert">{{ error }}</div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <section class="panel">
      <table class="data-table">
        <thead>
          <tr><th>Code</th><th>Intitulé</th><th>Catégorie</th><th>Réf. BPD</th><th>Statut</th><th>Action</th></tr>
        </thead>
        <tbody>
          <tr v-for="m in rows" :key="m.id">
            <td><strong>{{ m.code }}</strong></td>
            <td>{{ m.title }}</td>
            <td>{{ m.category }}</td>
            <td>{{ m.bpd_reference }}</td>
            <td>{{ m.is_adopted ? 'Adopté' : 'Disponible' }}</td>
            <td>
              <button v-if="!m.is_adopted" class="btn-secondary" :disabled="busy" @click="adopt(m.id)">Adopter</button>
              <span v-else class="ok-text">Actif</span>
            </td>
          </tr>
          <tr v-if="!rows.length"><td colspan="6" class="empty-row">Cliquez sur « Charger les 59 Modèles BPD » pour initialiser le catalogue.</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { request } from '@/services/quality'

const rows = ref<any[]>([])
const busy = ref(false)
const error = ref('')
const notice = ref('')

async function load() {
  try {
    const res = await request<{ data: any[] }>('/qualite/cdc-extras/bpd-models')
    rows.value = res.data || []
  } catch (e) { error.value = (e as Error).message }
}

async function bootstrap() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    const res = await request<{ created: number }>('/qualite/cdc-extras/bpd-models/bootstrap', 'POST')
    notice.value = `${res.created} modèle(s) BPD initialisé(s).`
    await load()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}

async function adopt(id: number) {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request(`/qualite/cdc-extras/bpd-models/${id}/adopt`, 'POST')
    notice.value = 'Modèle adopté dans le SMQ.'
    await load()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}

onMounted(load)
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.module-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #ede9fe; color: #5b21b6; font-size: 0.75rem; font-weight: 600; }
h1 { margin: 0.25rem 0 0; font-size: 1.55rem; }
.subtitle { margin: 0.2rem 0 0; color: #475569; font-size: 0.9rem; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
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
