<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Qualité · Grille 267 Articles</span>
        <h1>Auto-évaluation 267 Articles BPD</h1>
        <p class="subtitle">Suivi des campagnes d'auto-évaluation officinale sur la grille des 267 articles BPD et calcul du taux de conformité.</p>
      </div>
    </header>
    <div v-if="error" class="banner error" role="alert">{{ error }}</div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <section class="panel">
      <form class="inline-form mb-4" @submit.prevent="submitEval">
        <input v-model="form.reference" placeholder="Réf (ex: AUTO-2026-Q4)" required />
        <input v-model="form.title" placeholder="Intitulé campagne" required />
        <input v-model.number="form.compliant_count" type="number" min="0" max="267" placeholder="Conformes" required />
        <input v-model.number="form.non_compliant_count" type="number" min="0" max="267" placeholder="Non-conformes" required />
        <button type="submit" class="btn-primary" :disabled="busy">Enregistrer Campagne</button>
      </form>

      <table class="data-table">
        <thead>
          <tr><th>Référence</th><th>Campagne</th><th>Conformes / 267</th><th>Non-conformes</th><th>Score</th><th>Statut</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c.id">
            <td><strong>{{ c.reference }}</strong></td>
            <td>{{ c.title }}</td>
            <td>{{ c.compliant_count }} / {{ c.total_articles }}</td>
            <td>{{ c.non_compliant_count }}</td>
            <td><strong>{{ c.score_percent }}%</strong></td>
            <td>{{ c.status }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="6" class="empty-row">Aucune campagne d'auto-évaluation enregistrée.</td></tr>
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
const form = reactive({ reference: '', title: '', total_articles: 267, compliant_count: 0, non_compliant_count: 0 })

async function load() {
  try {
    const res = await request<{ data: any[] }>('/qualite/cdc-extras/autoeval')
    rows.value = res.data || []
  } catch (e) { error.value = (e as Error).message }
}

async function submitEval() {
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await request('/qualite/cdc-extras/autoeval', 'POST', form)
    notice.value = 'Campagne enregistrée.'
    form.reference = ''; form.title = ''
    await load()
  } catch (e) { error.value = (e as Error).message } finally { busy.value = false }
}

onMounted(load)
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 0.75rem; font-weight: 600; }
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
.banner { padding: 0.75rem 1rem; border-radius: 0.5rem; }
.banner.error { background: #fef2f2; color: #991b1b; }
.banner.success { background: #f0fdf4; color: #166534; }
</style>
