<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { request } from '@/services/quality'

/* ─── Types ─── */
interface LiveMetric {
  code: string; module_key: string; title: string; definition: string; unit: string
  numerator: number; denominator: number; value: number | null; display_value: string; computed_at: string
}
interface ReportTemplateRow {
  id: number; code: string; title: string; category: string; metric_codes: string[]
  default_format: string; is_scheduled: boolean; cron_schedule: string | null; consent_confirmed: boolean
}
interface ReportRunRow {
  id: number; reference: string; title: string; period_start: string; period_end: string
  status: string; generated_at: string; computed_metrics: LiveMetric[]
  exports?: Array<{ id: number; export_ref: string; format: string; file_checksum_sha256: string }>
}
interface NotificationJobRow {
  id: number; channel: string; status: string; attempts: number; last_error: string | null; scheduled_for: string
  template?: { code: string; title: string }
}

/* ─── State ─── */
const base = '/reporting'
const tab = ref<'overview' | 'runs' | 'templates' | 'notifications'>('overview')
const loading = ref(false)
const error = ref('')

const periodStart = ref(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
const periodEnd = ref(new Date().toISOString().slice(0, 10))

const kpis = ref<{ templates_count: number; runs_count: number; exports_count: number; failed_notifications: number } | null>(null)
const liveMetrics = ref<LiveMetric[]>([])
const templates = ref<ReportTemplateRow[]>([])
const runs = ref<ReportRunRow[]>([])
const jobs = ref<NotificationJobRow[]>([])
const exportedCsvPreview = ref('')

// Modals
const showCreateRun = ref(false)
const showCreateTemplate = ref(false)

const runForm = reactive({
  reference: '', title: 'Bilan Officinal Consolidé',
  period_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  period_end: new Date().toISOString().slice(0, 10),
})
const tplForm = reactive({
  code: '', title: '', category: 'smq_bpd', default_format: 'csv',
  is_scheduled: false, consent_confirmed: false, cron_schedule: '0 8 * * 1',
  metric_codes: ['CAPA_CLOSURE_RATE', 'STOCK_CONFORMITY_RATE', 'CASH_CLEAN_CLOSE_RATE'],
})

/* ─── API Calls ─── */
async function load(what: string) {
  loading.value = true; error.value = ''
  try {
    if (what === 'overview' || what === 'all') {
      const res = await request<{ kpis: any; metrics: LiveMetric[] }>(`${base}/overview?period_start=${periodStart.value}&period_end=${periodEnd.value}`)
      kpis.value = res.kpis
      liveMetrics.value = res.metrics
    }
    if (what === 'runs' || what === 'all') {
      runs.value = (await request<{ data: ReportRunRow[] }>(`${base}/runs`)).data
    }
    if (what === 'templates' || what === 'all') {
      templates.value = (await request<{ data: ReportTemplateRow[] }>(`${base}/templates`)).data
    }
    if (what === 'notifications' || what === 'all') {
      jobs.value = (await request<{ data: NotificationJobRow[] }>(`${base}/notification-jobs`)).data
    }
  } catch (e: any) {
    error.value = e.message || 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

async function generateRun() {
  try {
    await request(`${base}/runs`, 'POST', runForm)
    showCreateRun.value = false
    await load('runs'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function exportCsv(runId: number) {
  try {
    const res = await request<{ data: { export_ref: string }; content: string }>(`${base}/runs/${runId}/export`, 'POST', { format: 'csv' })
    exportedCsvPreview.value = res.content
    await load('runs'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createTemplate() {
  try {
    await request(`${base}/templates`, 'POST', {
      ...tplForm,
      recipients: tplForm.is_scheduled ? [1] : [],
    })
    showCreateTemplate.value = false
    await load('templates'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function retryJob(id: number) {
  try {
    await request(`${base}/notification-jobs/${id}/retry`, 'POST', {})
    await load('notifications'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

function onTab(t: typeof tab.value) { tab.value = t; load(t) }
onMounted(() => load('overview'))
</script>

<template>
  <div class="module-page">
    <header class="page-header">
      <div>
        <h1 class="font-display text-2xl font-bold">Tableaux de Bord & Rapports</h1>
        <p class="accent-serif text-gray-500">Module 14 — Indicateurs exacts documentés (numérateur/dénominateur), rapports datés, exports audités & diffusion</p>
      </div>
    </header>

    <nav class="tab-bar">
      <button v-for="t in [
        { key: 'overview', label: 'Indicateurs Live', icon: 'dashboard' },
        { key: 'runs', label: 'Rapports & Exports', icon: 'documents' },
        { key: 'templates', label: 'Modèles & Planification', icon: 'settings' },
        { key: 'notifications', label: 'Diffusions & Reprises', icon: 'clock' },
      ]" :key="t.key" :class="['tab-btn', { active: tab === t.key }]" @click="onTab(t.key as any)">
        <AppIcon :name="t.icon" class="tab-icon" /> {{ t.label }}
      </button>
    </nav>

    <div v-if="error" class="err-banner" @click="error = ''">⚠️ {{ error }}</div>
    <div v-if="loading" class="loading-bar"><div class="loading-track" /></div>

    <!-- ═══════════ OVERVIEW ═══════════ -->
    <section v-if="tab === 'overview'" class="content-section">
      <div class="section-toolbar">
        <label class="text-xs">Du <input v-model="periodStart" type="date" class="filter-input" /></label>
        <label class="text-xs">Au <input v-model="periodEnd" type="date" class="filter-input" /></label>
        <button class="btn-secondary" @click="load('overview')">Recalculer</button>
      </div>

      <div v-if="kpis" class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ kpis.templates_count }}</span><span class="kpi-label">Modèles actifs</span></div>
        <div class="kpi-card blue"><span class="kpi-value">{{ kpis.runs_count }}</span><span class="kpi-label">Rapports générés</span></div>
        <div class="kpi-card green"><span class="kpi-value">{{ kpis.exports_count }}</span><span class="kpi-label">Exports tracés SHA-256</span></div>
        <div class="kpi-card" :class="{ red: kpis.failed_notifications > 0 }"><span class="kpi-value">{{ kpis.failed_notifications }}</span><span class="kpi-label">Envois en échec</span></div>
      </div>

      <table v-if="liveMetrics.length" class="data-table">
        <thead><tr><th>Code</th><th>Indicateur & Définition</th><th>Module</th><th>Num. / Dén.</th><th>Valeur calculée</th></tr></thead>
        <tbody>
          <tr v-for="m in liveMetrics" :key="m.code">
            <td class="font-mono text-xs font-bold">{{ m.code }}</td>
            <td><strong>{{ m.title }}</strong><div class="text-xs text-gray-500">{{ m.definition }}</div></td>
            <td>{{ m.module_key }}</td>
            <td class="font-mono text-xs">{{ m.numerator }} / {{ m.denominator }}</td>
            <td><strong :class="{ 'text-gray-400': m.value === null }">{{ m.display_value }}</strong></td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ═══════════ RUNS & EXPORTS ═══════════ -->
    <section v-if="tab === 'runs'" class="content-section">
      <div class="section-toolbar">
        <h3>Rapports Générés & Exports Audités</h3>
        <button class="btn-primary" @click="runForm.reference = `RPT-${Date.now().toString().slice(-5)}`; showCreateRun = true">+ Générer un rapport</button>
      </div>

      <table v-if="runs.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Titre</th><th>Période</th><th>Indicateurs</th><th>Exports</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="r in runs" :key="r.id">
            <td class="font-mono font-bold">{{ r.reference }}</td>
            <td><strong>{{ r.title }}</strong></td>
            <td>{{ r.period_start }} → {{ r.period_end }}</td>
            <td>{{ r.computed_metrics?.length || 0 }}</td>
            <td>{{ r.exports?.length || 0 }}</td>
            <td><button class="btn-sm btn-green" @click="exportCsv(r.id)">Exporter CSV (SHA-256)</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun rapport généré.</p>

      <div v-if="exportedCsvPreview" class="mt-4 quote-box">
        <strong class="text-xs">Aperçu dernier export CSV (données sensibles filtrées) :</strong>
        <pre class="text-xs overflow-x-auto">{{ exportedCsvPreview }}</pre>
      </div>
    </section>

    <!-- ═══════════ TEMPLATES ═══════════ -->
    <section v-if="tab === 'templates'" class="content-section">
      <div class="section-toolbar">
        <h3>Modèles de Rapports & Planification</h3>
        <button class="btn-primary" @click="showCreateTemplate = true">+ Nouveau modèle</button>
      </div>

      <table v-if="templates.length" class="data-table">
        <thead><tr><th>Code</th><th>Titre</th><th>Catégorie</th><th>Format</th><th>Planifié</th><th>Consentement</th></tr></thead>
        <tbody>
          <tr v-for="tpl in templates" :key="tpl.id">
            <td class="font-mono font-bold">{{ tpl.code }}</td>
            <td><strong>{{ tpl.title }}</strong></td>
            <td>{{ tpl.category }}</td>
            <td>{{ tpl.default_format }}</td>
            <td>{{ tpl.is_scheduled ? `Oui (${tpl.cron_schedule})` : 'Manuel' }}</td>
            <td><span class="badge" :class="tpl.consent_confirmed ? 'valide' : 'standard'">{{ tpl.consent_confirmed ? 'Confirmé' : 'Non' }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun modèle configuré.</p>
    </section>

    <!-- ═══════════ NOTIFICATIONS ═══════════ -->
    <section v-if="tab === 'notifications'" class="content-section">
      <div class="section-toolbar"><h3>Tâches de Diffusion & Reprises sur Échec</h3></div>
      <table v-if="jobs.length" class="data-table">
        <thead><tr><th>Modèle</th><th>Canal</th><th>Tentatives</th><th>Statut</th><th>Erreur</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="j in jobs" :key="j.id">
            <td>{{ j.template?.title || 'Notification directe' }}</td>
            <td>{{ j.channel }}</td>
            <td>{{ j.attempts }}</td>
            <td><span class="badge" :class="j.status">{{ j.status }}</span></td>
            <td class="text-xs text-red-600">{{ j.last_error || '—' }}</td>
            <td><button v-if="j.status === 'echec'" class="btn-sm btn-blue" @click="retryJob(j.id)">Réessayer</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune tâche de notification planifiée ou en échec.</p>
    </section>

    <!-- ═══════════ MODALS ═══════════ -->
    <AppModal v-model="showCreateRun" title="Générer un rapport daté">
      <form @submit.prevent="generateRun" class="modal-form">
        <div class="form-row"><label>Référence</label><input v-model="runForm.reference" required /></div>
        <div class="form-row"><label>Titre</label><input v-model="runForm.title" required /></div>
        <div class="detail-grid">
          <div class="form-row"><label>Début période</label><input v-model="runForm.period_start" type="date" required /></div>
          <div class="form-row"><label>Fin période</label><input v-model="runForm.period_end" type="date" required /></div>
        </div>
        <button type="submit" class="btn-primary mt-4">Calculer & Figer le rapport</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateTemplate" title="Nouveau modèle de rapport">
      <form @submit.prevent="createTemplate" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Code</label><input v-model="tplForm.code" required placeholder="TPL-SMQ-01" /></div>
          <div class="form-row"><label>Format</label><select v-model="tplForm.default_format"><option value="csv">CSV</option><option value="pdf">PDF</option><option value="json">JSON</option></select></div>
        </div>
        <div class="form-row"><label>Intitulé</label><input v-model="tplForm.title" required /></div>
        <div class="form-check"><input type="checkbox" v-model="tplForm.is_scheduled" id="sched-chk" /><label for="sched-chk">Planifier automatiquement</label></div>
        <div v-if="tplForm.is_scheduled" class="form-check"><input type="checkbox" v-model="tplForm.consent_confirmed" id="cons-chk" /><label for="cons-chk">Consentement métier & destinataires autorisés confirmés</label></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer le modèle</button>
      </form>
    </AppModal>
  </div>
</template>

<style scoped>
.module-page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 1.5rem; }
.tab-bar { display: flex; gap: 0.25rem; border-bottom: 2px solid #e5e7eb; margin-bottom: 1.5rem; overflow-x: auto; }
.tab-btn { padding: 0.6rem 1rem; border: none; background: none; cursor: pointer; font-size: 0.85rem; color: #6b7280; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab-btn.active { color: #1a73e8; border-bottom-color: #1a73e8; font-weight: 600; }
.tab-icon { width: 16px; height: 16px; }
.err-banner { background: #fef2f2; color: #991b1b; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; cursor: pointer; font-size: 0.875rem; }
.loading-bar { height: 3px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 1rem; }
.loading-track { width: 30%; height: 100%; background: #1a73e8; animation: load 1s infinite ease-in-out; }
@keyframes load { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; align-items: center; text-align: center; }
.kpi-card.green { border-left: 4px solid #10b981; }
.kpi-card.blue { border-left: 4px solid #3b82f6; }
.kpi-card.red { border-left: 4px solid #ef4444; }
.kpi-value { font-size: 1.75rem; font-weight: 700; color: #1f2937; }
.kpi-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
.section-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.section-toolbar h3 { margin: 0; font-size: 1rem; flex: 1; }
.filter-input { padding: 0.4rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.8rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 0.6rem; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.data-table td { padding: 0.6rem; border-bottom: 1px solid #f3f4f6; }
.badge { font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600; text-transform: capitalize; }
.badge.valide, .badge.envoye { background: #d1fae5; color: #065f46; }
.badge.echec { background: #fee2e2; color: #991b1b; }
.badge.standard, .badge.planifie { background: #f3f4f6; color: #4b5563; }
.empty-state { text-align: center; color: #9ca3af; padding: 3rem 1rem; font-size: 0.9rem; }
.btn-primary { padding: 0.5rem 1.15rem; background: #1a73e8; color: #fff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-secondary { padding: 0.45rem 0.9rem; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.btn-sm { padding: 0.25rem 0.6rem; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
.btn-green { background: #d1fae5; color: #065f46; }
.btn-blue { background: #dbeafe; color: #1e40af; }
.modal-form { display: flex; flex-direction: column; gap: 0.6rem; }
.form-row { display: flex; flex-direction: column; gap: 0.2rem; }
.form-row label { font-size: 0.75rem; font-weight: 600; color: #374151; }
.form-row input, .form-row select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }
.form-check { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
.quote-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; background: #f9fafb; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
</style>
