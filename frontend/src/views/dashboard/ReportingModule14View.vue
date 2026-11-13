<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import PilotagePageHeader from '@/components/PilotagePageHeader.vue'
import PilotageNav from '@/components/PilotageNav.vue'
import { demoMode } from '@/services/quality'
import { currentOffice } from '@/services/supportDemo'
import { reportingService as api, officeToday, previousPeriod, validatePeriod, metricDisplay, metricDelta, downloadCsv, type Overview, type Metric, type ReportTemplate, type ReportRun, type NotificationJob, type Recipient, type RunInput, type TemplateInput } from '@/services/reporting'

const route = useRoute(), router = useRouter()
const sections = [{ key: 'overview', label: 'Vue d’ensemble' }, { key: 'compare', label: 'Comparaison' }, { key: 'runs', label: 'Rapports & exports' }, { key: 'templates', label: 'Modèles' }, { key: 'notifications', label: 'Diffusions' }]
const today = officeToday(), defaultStart = new Date(Date.parse(today) - 29 * 86400000).toISOString().slice(0, 10)
const tab = computed(() => sections.some(s => s.key === route.query.tab) ? String(route.query.tab) : 'overview')
const start = ref(String(route.query.period_start || defaultStart)), end = ref(String(route.query.period_end || today))
const loading = ref(false), error = ref(''), feedback = ref(''), busy = ref(false), modalError = ref('')
const overview = ref<Overview | null>(null), previous = ref<Overview | null>(null), templates = ref<ReportTemplate[]>([]), runs = ref<ReportRun[]>([]), jobs = ref<NotificationJob[]>([]), recipients = ref<Recipient[]>([])
const available = ref<Metric[]>([]), showRun = ref(false), showTemplate = ref(false), detail = ref<ReportRun | null>(null), retry = ref<NotificationJob | null>(null)
const runForm = reactive<RunInput>({ reference: '', title: 'Bilan officinal', period_start: start.value, period_end: end.value, template_id: null, metric_codes: [] })
const tplForm = reactive<TemplateInput>({ code: '', title: '', category: 'smq_bpd', default_format: 'csv', metric_codes: [], is_scheduled: false, cron_schedule: '0 8 1 * *', consent_confirmed: false, recipients: [] })
const prevPeriod = computed(() => { try { return previousPeriod(start.value, end.value) } catch { return null } })
const comparison = computed(() => overview.value?.metrics.map(metric => ({ metric, previous: previous.value?.metrics.find(m => m.code === metric.code) })) || [])
let loadId = 0
async function load() {
  const id = ++loadId; loading.value = true; error.value = ''; overview.value = null; previous.value = null; runs.value = []; templates.value = []; jobs.value = []
  try {
    validatePeriod(start.value, end.value)
    if (tab.value === 'compare') { const result = await api.compare(start.value, end.value); if (id !== loadId) return; overview.value = result.current; previous.value = result.previous }
    else if (tab.value === 'overview') { const result = await api.overview(start.value, end.value); if (id !== loadId) return; overview.value = result }
    else if (tab.value === 'runs') { const result = await api.runs(); if (id !== loadId) return; runs.value = result }
    else if (tab.value === 'templates') { const result = await api.templates(); if (id !== loadId) return; templates.value = result }
    else { const result = await api.jobs(); if (id !== loadId) return; jobs.value = result }
  } catch (e) { if (id === loadId) error.value = message(e) } finally { if (id === loadId) loading.value = false }
}
function message(e: unknown) { return e instanceof Error ? e.message : 'Opération impossible. Réessayez.' }
async function navigate(next = tab.value) {
  try { validatePeriod(start.value, end.value); await router.replace({ query: { ...route.query, tab: next, period_start: start.value, period_end: end.value } }) } catch (e) { error.value = message(e) }
}
watch(() => [route.query.tab, route.query.period_start, route.query.period_end], () => { start.value = String(route.query.period_start || defaultStart); end.value = String(route.query.period_end || today); void load() }, { immediate: true })
async function prepare(kind: 'run' | 'template') {
  modalError.value = ''; busy.value = true; available.value = []; recipients.value = []
  if (kind === 'run') {
    Object.assign(runForm, { reference: `RPT-${crypto.randomUUID().slice(0, 18)}`, period_start: start.value, period_end: end.value, template_id: null, metric_codes: [] })
    showRun.value = true
  } else { Object.assign(tplForm, { code: '', title: '', metric_codes: [], recipients: [], is_scheduled: false, consent_confirmed: false }); showTemplate.value = true }
  try {
    const result = await api.overview(start.value, end.value); available.value = result.metrics
    if (kind === 'run') { templates.value = await api.templates(); runForm.metric_codes = result.metrics.map(m => m.code) }
    else recipients.value = await api.recipients()
  } catch (e) { modalError.value = message(e) } finally { busy.value = false }
}
function chooseTemplate() {
  const template = templates.value.find(t => t.id === runForm.template_id)
  runForm.metric_codes = template ? template.metric_codes.filter(code => available.value.some(m => m.code === code)) : available.value.map(m => m.code)
  if (template) runForm.title = template.title
}
async function generate() {
  if (busy.value) return; busy.value = true; modalError.value = ''
  try { await api.generate({ ...runForm, metric_codes: [...runForm.metric_codes] }); showRun.value = false; feedback.value = 'Rapport figé enregistré.'; await load() } catch (e) { modalError.value = message(e) } finally { busy.value = false }
}
async function saveTemplate() {
  if (busy.value) return; busy.value = true; modalError.value = ''
  try { await api.createTemplate({ ...tplForm, cron_schedule: tplForm.is_scheduled ? tplForm.cron_schedule : null, recipients: tplForm.is_scheduled ? [...tplForm.recipients] : [] }); showTemplate.value = false; feedback.value = 'Modèle enregistré. La planification ne constitue pas une preuve de diffusion.'; await load() } catch (e) { modalError.value = message(e) } finally { busy.value = false }
}
async function exportRun(run: ReportRun) {
  if (busy.value) return; busy.value = true; error.value = ''; modalError.value = ''; feedback.value = ''
  try { const result = await api.export(run.id); const hash = await downloadCsv(result.content, run.reference); feedback.value = `CSV téléchargé · ${result.data.export_ref}.${hash ? ` SHA-256 du fichier : ${hash}` : ' Empreinte locale indisponible.'}`; if (detail.value) detail.value.exports = [...(detail.value.exports || []), result.data]; await load() } catch (e) { if (detail.value) modalError.value = message(e); else error.value = message(e) } finally { busy.value = false }
}
async function confirmRetry() {
  if (!retry.value || busy.value) return; busy.value = true; modalError.value = ''
  try { const result = await api.retry(retry.value.id); feedback.value = `État retourné : ${result.status} · ${result.attempts} tentative(s). Aucune preuve de livraison email disponible.`; retry.value = null; await load() } catch (e) { modalError.value = message(e) } finally { busy.value = false }
}
const visibleRuns = computed(() => runs.value.filter(r => r.period_start.slice(0, 10) <= end.value && r.period_end.slice(0, 10) >= start.value))
</script>

<template>
  <main class="reporting-page" data-testid="reporting-page">
    <PilotagePageHeader
      eyebrow="PILOTAGE / M14"
      title="Tableaux de bord & rapports"
      subtitle="Comparer les faits. Figer les bilans. Garder la trace."
      :office="currentOffice.name"
      :source="demoMode ? 'Démonstration · données fictives' : 'Données API · officine active'"
      :tone="demoMode ? 'demo' : 'api'"
      tour="reporting-heading"
    />
    <PilotageNav />
    <nav class="section-nav" aria-label="Sections des rapports" data-tour="reporting-sections"><button v-for="section in sections" :key="section.key" :data-testid="`tab-${section.key}`" :aria-current="tab === section.key ? 'page' : undefined" @click="navigate(section.key)">{{ section.label }}</button></nav>
    <form class="filters" data-tour="reporting-period" @submit.prevent="navigate()"><label>Du<input v-model="start" data-testid="period-start" type="date" required /></label><label>Au<input v-model="end" data-testid="period-end" type="date" required /></label><button class="button secondary" data-testid="apply-period" :disabled="loading">Appliquer la période</button><span>Jours inclusifs · Africa/Porto-Novo</span></form>
    <p v-if="feedback" role="status" class="feedback" data-testid="reporting-feedback">{{ feedback }}</p>
    <div v-if="error" role="alert" class="error" data-testid="reporting-error">{{ error }} <button class="button secondary" data-testid="reporting-retry" @click="load">Réessayer</button></div>
    <p v-if="loading" role="status" data-testid="reporting-loading" class="state">Chargement des données de l’officine…</p>
    <template v-else-if="!error">
      <section v-if="tab === 'overview' || tab === 'compare'">
        <div v-if="overview && tab === 'overview'" class="kpis" data-testid="reporting-kpis"><article><strong>{{ overview.kpis.templates_count }}</strong><span>Modèles actifs</span></article><article><strong>{{ overview.kpis.runs_count }}</strong><span>Rapports figés</span></article><article><strong>{{ overview.kpis.exports_count }}</strong><span>Exports enregistrés</span></article><article><strong>{{ overview.kpis.failed_notifications }}</strong><span>Diffusions en échec</span></article></div>
        <div class="panel"><header><h2>{{ tab === 'compare' ? 'Deux périodes, les mêmes définitions' : 'Indicateurs de l’officine' }}</h2><p v-if="tab === 'compare' && prevPeriod">Précédente : {{ prevPeriod.start }} → {{ prevPeriod.end }} · Choisie : {{ start }} → {{ end }}</p><p>Un dénominateur nul donne N/D, jamais 0 %. Le stock et les fournisseurs de l’API sont des états courants, non des historiques.</p></header>
          <div v-if="overview?.metrics.length" class="table-scroll"><table data-testid="metrics-table"><thead><tr><th>Indicateur / définition</th><th>Source</th><th v-if="tab === 'compare'">Précédente</th><th>Choisie</th><th>{{ tab === 'compare' ? 'Écart' : 'Num. / Dén.' }}</th></tr></thead><tbody><tr v-for="row in comparison" :key="row.metric.code"><td data-label="Indicateur / définition"><strong>{{ row.metric.title }}</strong><small>{{ row.metric.definition }}</small><small>{{ row.metric.code }}</small></td><td data-label="Source">{{ row.metric.module_key }}</td><td v-if="tab === 'compare'" data-label="Précédente">{{ metricDisplay(row.previous) }}</td><td data-label="Choisie" class="metric-value">{{ metricDisplay(row.metric) }}</td><td :data-label="tab === 'compare' ? 'Écart' : 'Num. / Dén.'">{{ tab === 'compare' ? metricDelta(row.metric, row.previous) : `${row.metric.numerator} / ${row.metric.denominator}` }}</td></tr></tbody></table></div><p v-else class="state">Aucun indicateur disponible sur cette période.</p>
        </div>
      </section>
      <section v-if="tab === 'runs'" class="panel"><header class="panel-heading"><div><h2>Les bilans, conservés à date</h2><p>{{ visibleRuns.length }} rapport(s) couvrant la période choisie. Les exports utilisent le snapshot, pas les données live.</p></div><button class="button primary" data-testid="create-run" :disabled="busy" @click="prepare('run')">Générer un rapport</button></header><div v-if="visibleRuns.length" class="table-scroll"><table data-testid="runs-table"><thead><tr><th>Rapport</th><th>Période</th><th>État</th><th>Exports</th><th>Actions</th></tr></thead><tbody><tr v-for="run in visibleRuns" :key="run.id"><td data-label="Rapport"><strong>{{ run.title }}</strong><small>{{ run.reference }}</small></td><td data-label="Période">{{ run.period_start.slice(0, 10) }} → {{ run.period_end.slice(0, 10) }}</td><td data-label="État">{{ run.status }}</td><td data-label="Exports">{{ run.exports?.length || 0 }}</td><td data-label="Actions"><div class="actions"><button class="button secondary" data-testid="run-detail" @click="detail = run; modalError = ''">Consulter</button><button class="button secondary" data-testid="run-export" :disabled="busy" @click="exportRun(run)">CSV</button></div></td></tr></tbody></table></div><p v-else class="state">Aucun rapport sur cette période. Générez votre premier bilan.</p></section>
      <section v-if="tab === 'templates'" class="panel"><header class="panel-heading"><div><h2>Modèles & planification</h2><p>Des indicateurs choisis, des destinataires explicites.</p></div><button class="button primary" data-testid="create-template" :disabled="busy" @click="prepare('template')">Nouveau modèle</button></header><div v-if="templates.length" class="table-scroll"><table data-testid="templates-table"><thead><tr><th>Modèle</th><th>Indicateurs</th><th>Format</th><th>Planification</th></tr></thead><tbody><tr v-for="tpl in templates" :key="tpl.id"><td data-label="Modèle"><strong>{{ tpl.title }}</strong><small>{{ tpl.code }}</small></td><td data-label="Indicateurs">{{ tpl.metric_codes.join(', ') }}</td><td data-label="Format">{{ tpl.default_format }}</td><td data-label="Planification">{{ tpl.is_scheduled ? tpl.cron_schedule : 'Manuel' }}<small>{{ tpl.consent_confirmed ? 'Consentement enregistré' : 'Consentement non confirmé' }}</small></td></tr></tbody></table></div><p v-else class="state">Aucun modèle configuré.</p></section>
      <section v-if="tab === 'notifications'" class="panel"><header><h2>Diffusions & reprises</h2><p>Un état « envoyé » du serveur ne prouve pas la livraison au destinataire.</p></header><div v-if="jobs.length" class="table-scroll"><table data-testid="notifications-table"><thead><tr><th>Modèle / canal</th><th>État serveur</th><th>Tentatives</th><th>Dernière erreur</th><th>Action</th></tr></thead><tbody><tr v-for="job in jobs" :key="job.id"><td data-label="Modèle / canal"><strong>{{ job.template?.title || 'Notification directe' }}</strong><small>{{ job.channel }}</small></td><td data-label="État serveur"><span class="status" :class="{ failed: job.status === 'echec' }">{{ job.status }}</span></td><td data-label="Tentatives">{{ job.attempts }}</td><td data-label="Dernière erreur">{{ job.last_error || '—' }}</td><td data-label="Action"><button v-if="job.status === 'echec'" class="button secondary" data-testid="retry-notification" :disabled="busy" @click="retry = job; modalError = ''">Reprendre</button><span v-else>—</span></td></tr></tbody></table></div><p v-else class="state">Aucune diffusion enregistrée.</p></section>
    </template>

    <AppModal v-model="showRun" title="Générer un bilan figé" :busy="busy">
      <form class="modal-form" data-testid="run-form" @submit.prevent="generate">
        <p v-if="modalError" role="alert" class="error">{{ modalError }}</p>
        <fieldset :disabled="busy">
          <legend>Périmètre du bilan</legend>
          <label>Référence stable<input v-model="runForm.reference" required maxlength="50" /></label>
          <label>Titre<input v-model="runForm.title" required maxlength="150" /></label>
          <label>Modèle<select v-model="runForm.template_id" @change="chooseTemplate"><option :value="null">Sélection libre</option><option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.title }}</option></select></label>
          <div class="date-grid"><label>Début<input v-model="runForm.period_start" type="date" required /></label><label>Fin<input v-model="runForm.period_end" type="date" required /></label></div>
        </fieldset>
        <fieldset :disabled="busy">
          <legend>Indicateurs figés</legend>
          <label v-for="m in available" :key="m.code" class="check"><input v-model="runForm.metric_codes" type="checkbox" :value="m.code" />{{ m.title }}</label>
          <p v-if="!available.length">Aucun indicateur disponible : le bilan ne peut pas être généré.</p>
        </fieldset>
        <p>La référence reste identique après un refus. Le serveur calcule et fige les indicateurs pour cet intervalle.</p>
        <div class="modal-actions">
          <button class="button primary" data-testid="submit-run" :disabled="busy || !available.length || !runForm.metric_codes.length">{{ busy ? 'Traitement…' : 'Calculer & figer' }}</button>
        </div>
      </form>
    </AppModal>
    <AppModal v-model="showTemplate" title="Nouveau modèle de rapport" :busy="busy">
      <form class="modal-form" data-testid="template-form" @submit.prevent="saveTemplate">
        <p v-if="modalError" role="alert" class="error">{{ modalError }}</p>
        <fieldset :disabled="busy">
          <legend>Définition du modèle</legend>
          <label>Code<input v-model="tplForm.code" required maxlength="50" /></label>
          <label>Titre<input v-model="tplForm.title" required maxlength="150" /></label>
          <label>Catégorie<select v-model="tplForm.category"><option value="smq_bpd">SMQ / BPD</option><option value="stock_fefo">Stock / FEFO</option><option value="ventes_caisse">Ventes / caisse</option><option value="fournisseurs">Fournisseurs</option><option value="locaux">Locaux</option></select></label>
          <p>Format : CSV uniquement</p>
        </fieldset>
        <fieldset :disabled="busy">
          <legend>Indicateurs du modèle</legend>
          <label v-for="m in available" :key="m.code" class="check"><input v-model="tplForm.metric_codes" type="checkbox" :value="m.code" />{{ m.title }}</label>
          <p v-if="!available.length">Aucun indicateur disponible : le modèle ne peut pas être enregistré.</p>
        </fieldset>
        <fieldset :disabled="busy">
          <legend>Planification et destinataires</legend>
          <label class="check"><input v-model="tplForm.is_scheduled" data-testid="schedule-toggle" type="checkbox" />Planifier automatiquement</label>
          <template v-if="tplForm.is_scheduled">
            <label>Fréquence<select v-model="tplForm.cron_schedule"><option value="0 8 1 * *">Le 1er du mois, 8 h</option><option value="0 8 * * 1">Chaque lundi, 8 h</option></select></label>
            <p>Expression transmise telle quelle au serveur ; fuseau d’exécution à confirmer côté serveur.</p>
            <p v-if="!recipients.length">Aucun destinataire accessible. La planification est indisponible.</p>
            <label v-for="member in recipients" :key="member.id" class="check"><input v-model="tplForm.recipients" type="checkbox" :value="member.id" />{{ member.name }} · {{ member.email }}</label>
            <label class="check"><input v-model="tplForm.consent_confirmed" data-testid="schedule-consent" type="checkbox" />Je confirme le consentement métier et les destinataires autorisés.</label>
          </template>
        </fieldset>
        <div class="modal-actions">
          <button class="button primary" data-testid="submit-template" :disabled="busy || !available.length || !tplForm.metric_codes.length || (tplForm.is_scheduled && (!tplForm.consent_confirmed || !tplForm.recipients.length))">Enregistrer le modèle</button>
        </div>
      </form>
    </AppModal>
    <AppModal :model-value="!!detail" title="Snapshot du rapport" size="wide" :busy="busy" @update:model-value="value => { if (!value) detail = null }"><template v-if="detail"><p v-if="modalError" role="alert" class="error">{{ modalError }}</p><h3>{{ detail.title }}</h3><p>{{ detail.reference }} · {{ detail.status }}</p><p>{{ detail.period_start.slice(0, 10) }} → {{ detail.period_end.slice(0, 10) }} · Généré : {{ detail.generated_at }}</p><p>Modèle : {{ detail.template?.title || 'Sélection libre / modèle non retourné' }}</p><div class="snapshot" data-testid="run-snapshot"><article v-for="m in detail.computed_metrics" :key="m.code"><strong>{{ m.title }} · {{ metricDisplay(m) }}</strong><p>{{ m.definition }}</p><small>{{ m.numerator }} / {{ m.denominator }} · {{ m.computed_at }}</small></article></div><h3>Historique des exports</h3><ul><li v-for="item in detail.exports" :key="item.id">{{ item.export_ref }} · {{ item.format }} · {{ item.exported_at || 'Date non retournée' }}<small v-if="/^[a-f0-9]{64}$/i.test(item.file_checksum_sha256 || '')">Empreinte serveur (contenu avant sécurisation locale) : {{ item.file_checksum_sha256 }}</small></li></ul><p v-if="!detail.exports?.length">Aucun export enregistré.</p><button class="button primary" :disabled="busy" @click="exportRun(detail)">Télécharger le snapshot CSV</button><p v-if="feedback" role="status">{{ feedback }}</p></template></AppModal>
    <AppModal :model-value="!!retry" title="Confirmer la reprise" :busy="busy" size="small" @update:model-value="value => { if (!value) retry = null }"><p v-if="modalError" role="alert" class="error">{{ modalError }}</p><p>Reprendre la tâche en échec ? Le statut retourné sera affiché sans présumer d’une livraison email.</p><button class="button primary" data-testid="confirm-retry" :disabled="busy" @click="confirmRetry">Confirmer la reprise</button></AppModal>
  </main>
</template>

<style scoped>
.reporting-page{max-width:1600px;padding:28px;min-width:0;color:#0f3b27}.page-heading,.panel-heading{display:flex;justify-content:space-between;align-items:center;gap:20px}.page-heading{margin-bottom:24px}h1{font-size:30px;line-height:1.2;margin:6px 0 10px}h2{font-size:19px;margin:0 0 8px}h3{font-size:17px}.eyebrow{letter-spacing:.1em;font-size:11px;font-weight:800}.page-subtitle,.panel p,.filters span{color:#475c50}.source-label{padding:8px 12px;background:#e3f4e6;border:1px solid #cff1d2;border-radius:6px;font-size:12px}.section-nav{display:flex;gap:4px;overflow:auto;border-bottom:1px solid #cff1d2;margin-bottom:20px}.section-nav button{white-space:nowrap;border:0;background:transparent;padding:13px 16px;color:#475c50;font-weight:700;border-bottom:3px solid transparent}.section-nav [aria-current]{color:#0f3b27;border-color:#0f3b27;background:#eaf5ec}.filters{display:flex;align-items:end;gap:14px;flex-wrap:wrap;margin-bottom:24px}.filters label,.modal-form label:not(.check){display:grid;gap:6px;font-size:13px;font-weight:700}input:not([type=checkbox]),select{min-height:42px;padding:8px 12px;border:1px solid #bcd8c1;border-radius:6px;max-width:100%;background:white;color:#0f3b27}.filters span{font-size:12px;padding-bottom:12px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:22px}.kpis article{border-left:3px solid #92ff5f;background:white;padding:20px;border-radius:0 8px 8px 0}.kpis strong{display:block;font-size:32px}.kpis span{font-size:12px;color:#475c50}.panel{background:#fff;border:1px solid #dbe9dd;border-radius:12px;overflow:hidden}.panel>header{padding:22px}.panel p{font-size:13px;line-height:1.6;margin:4px 0}.table-scroll{max-width:100%;overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px;min-width:650px}th{text-align:left;font-size:11px;letter-spacing:.04em;text-transform:uppercase;background:#f4f8f4;color:#475c50}th,td{padding:15px 20px;border-bottom:1px solid #e5eee6;vertical-align:top}td:first-child{max-width:380px}small{display:block;font-size:11px;line-height:1.5;color:#475c50;margin-top:5px}.metric-value{font-size:19px;font-weight:800;white-space:nowrap}.actions{display:flex;gap:6px}.button{min-height:40px;border-radius:6px;padding:8px 13px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}.primary{background:#0f3b27;border:1px solid #0f3b27;color:white}.secondary{background:white;border:1px solid #bcd8c1;color:#0f3b27}button:disabled{opacity:.55;cursor:wait}.state{padding:44px 24px;color:#475c50;text-align:center}.error,.feedback{padding:14px;border-radius:8px;font-size:13px;overflow-wrap:anywhere;margin-bottom:16px}.error{background:#fff0ed;color:#942e20}.feedback{background:#eaf7e9;border:1px solid #cff1d2}.status{background:#eaf5ec;padding:5px 8px;border-radius:5px;font-size:12px}.status.failed{background:#fff0ed;color:#942e20}.modal-form{display:grid;gap:15px}.modal-form fieldset{border:0;padding:0;margin:0;display:grid;gap:15px;min-width:0}.modal-form legend{font-weight:800;font-size:13px;margin:14px 0}.check{display:flex;align-items:start;gap:9px;font-size:13px;line-height:1.5}.check input{margin-top:4px}.date-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.snapshot article{padding:15px 0;border-bottom:1px solid #dbe9dd}.snapshot p{font-size:13px}li{overflow-wrap:anywhere}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #367d50;outline-offset:3px}@media(max-width:900px){.reporting-page{padding:20px}.page-heading{align-items:start;flex-direction:column}.section-nav{flex-wrap:wrap;overflow:visible}.kpis{grid-template-columns:repeat(2,1fr)}.panel-heading{align-items:start;flex-direction:column}}@media(max-width:480px){.reporting-page{padding:16px}h1{font-size:25px}.filters label{flex:1;min-width:120px}.filters button{width:100%}.kpis{gap:10px}.kpis article{padding:15px}.kpis strong{font-size:27px}.date-grid{grid-template-columns:1fr}.panel>header{padding:17px}}@media(max-width:600px){.panel .table-scroll{overflow:visible}.panel table,.panel thead,.panel tbody,.panel tr,.panel td{display:block;width:100%;min-width:0}.panel thead{display:none}.panel tbody tr{padding:12px 16px;border-bottom:1px solid #e5eee6}.panel tbody tr:last-child{border-bottom:0}.panel td{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:4px 0;border:0;text-align:right}.panel td::before{content:attr(data-label);flex-shrink:0;color:#475c50;font-size:11px;font-weight:700;text-align:left}.panel td:first-child{display:block;max-width:none;padding-bottom:7px;text-align:left}.panel td:first-child::before{display:none}.panel .metric-value{white-space:normal}.panel .actions{justify-content:flex-end}}
</style>
