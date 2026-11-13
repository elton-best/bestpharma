<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import PilotagePageHeader from '@/components/PilotagePageHeader.vue'
import PilotageNav from '@/components/PilotageNav.vue'
import { demoMode } from '@/services/quality'
import { currentOffice, supportState } from '@/services/supportDemo'
import {
  downloadGroupCsv, listGroupOffices, loadGroupConsolidation, validateGroupPeriod,
  type GroupIndicator, type GroupOffice, type GroupPeriod, type GroupResult, type OfficeIndicators,
} from '@/services/groupConsolidation'

const route = useRoute(), router = useRouter()
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Porto-Novo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const defaultEnd = today()
const defaultStart = new Date(Date.parse(`${defaultEnd}T12:00:00Z`) - 29 * 86400000).toISOString().slice(0, 10)
const start = ref(String(route.query.period_start || defaultStart))
const end = ref(String(route.query.period_end || defaultEnd))
const offices = ref<GroupOffice[]>([])
const selected = ref<string[]>([])
const result = ref<GroupResult | null>(null)
const loading = ref(false), officesLoading = ref(false)
const error = ref(''), officesError = ref(''), feedback = ref('')
const detail = ref<OfficeIndicators | null>(null)
const detailOpen = computed({ get: () => !!detail.value, set: value => { if (!value) detail.value = null } })
const availableCount = computed(() => result.value?.offices.filter(office => office.available).length ?? 0)
const number = (value: number | null) => value === null ? 'N/D' : new Intl.NumberFormat('fr-FR').format(value)
const dateTime = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Porto-Novo' }).format(new Date(value))
const metricValue = (metric: { value: number | null; display_value: string; unit: string }) => metric.value === null ? 'N/D' : metric.display_value
const metricTone = (metric: GroupIndicator) => !metric.complete ? 'partial' : metric.value === null ? 'unavailable' : 'complete'

function message(cause: unknown) { return cause instanceof Error ? cause.message : 'Opération impossible. Réessayez.' }
function syncUrl() {
  void router.replace({ query: { ...route.query, period_start: start.value, period_end: end.value, offices: selected.value.join(',') || undefined } })
}
function requestedOffices(): string[] {
  const raw = String(route.query.offices || '')
  return raw ? raw.split(',').filter(Boolean) : []
}
async function loadOffices() {
  officesLoading.value = true; officesError.value = ''
  try {
    offices.value = await listGroupOffices()
    if (!offices.value.length) throw new Error('Aucune officine active n’est accessible avec votre compte.')
    const requested = requestedOffices().filter(id => offices.value.some(office => office.id === id))
    selected.value = requested.length ? requested : offices.value.map(office => office.id)
  } catch (cause) {
    offices.value = []; selected.value = []; officesError.value = message(cause)
  } finally { officesLoading.value = false }
}
async function consolidate() {
  if (loading.value) return
  error.value = ''; feedback.value = ''; result.value = null
  try {
    const period: GroupPeriod = { start: start.value, end: end.value }
    validateGroupPeriod(period)
    if (!selected.value.length) throw new Error('Sélectionnez au moins une officine à consolider.')
    loading.value = true
    result.value = await loadGroupConsolidation(selected.value, period)
    syncUrl()
  } catch (cause) {
    error.value = message(cause)
  } finally { loading.value = false }
}
async function initialize() {
  detail.value = null
  await loadOffices()
  if (!officesError.value) await consolidate()
}
watch(() => supportState.selectedOffice, () => { void initialize() }, { immediate: true })
function toggleOffice(id: string) {
  selected.value = selected.value.includes(id) ? selected.value.filter(item => item !== id) : [...selected.value, id]
}
function selectAll() { selected.value = offices.value.map(office => office.id) }
function clearSelection() { selected.value = [] }
function exportCsv() {
  if (!result.value) return
  try {
    downloadGroupCsv(result.value)
    feedback.value = 'Consolidation exportée en CSV, avec les sources disponibles et leurs erreurs.'
  } catch { error.value = 'Le navigateur a refusé le téléchargement CSV. Réessayez.' }
}
</script>

<template>
  <main class="page erp-page consolidation-page" data-testid="consolidation-page">
    <PilotagePageHeader
      eyebrow="PILOTAGE · PÉRIMÈTRE MULTI-OFFICINES"
      title="Consolidation Groupe"
      :subtitle="`${currentOffice.name} · agrégation des indicateurs de reporting des officines accessibles.`"
      :office="currentOffice.name"
      :source="demoMode ? 'Démonstration · chiffres fictifs' : 'API · reporting par officine'"
      :tone="demoMode ? 'demo' : 'api'"
      tour="consolidation-heading"
    />
    <PilotageNav />

    <p class="consolidation-notice" data-testid="consolidation-notice"><AppIcon name="info" :size="17" /><span>{{ demoMode ? 'Les officines et leurs chiffres sont fictifs. Cette vue montre le calcul et la couverture des sources, sans constituer une consolidation comptable ou réglementaire.' : 'La vue interroge le reporting de chaque officine où vous êtes membre. Elle ne crée pas un droit de consolidation groupe et ne remplace pas une autorisation dédiée.' }}</span></p>

    <form class="officine-panel consolidation-filters" data-tour="consolidation-filters" @submit.prevent="consolidate">
      <div class="period-fields"><label>Du<input v-model="start" data-testid="consolidation-start" type="date" required /></label><label>Au<input v-model="end" data-testid="consolidation-end" type="date" required /></label></div>
      <fieldset class="office-picker" data-testid="consolidation-offices">
        <legend>Officines du périmètre <span>{{ selected.length }} / {{ offices.length }}</span></legend>
        <p v-if="officesLoading" role="status">Chargement du périmètre…</p>
        <p v-else-if="officesError" role="alert">{{ officesError }} <button class="text-link" type="button" @click="initialize">Réessayer</button></p>
        <template v-else>
          <label v-for="office in offices" :key="office.id" class="office-check"><input type="checkbox" :checked="selected.includes(office.id)" @change="toggleOffice(office.id)" /> <span>{{ office.name }}<small v-if="office.city">{{ office.city }}</small></span></label>
          <div class="office-picker-actions"><button class="text-link" type="button" @click="selectAll">Tout sélectionner</button><button class="text-link" type="button" @click="clearSelection">Tout désélectionner</button></div>
        </template>
      </fieldset>
      <div class="consolidation-submit"><button class="button primary" data-testid="consolidation-submit" :disabled="loading || officesLoading || !!officesError">{{ loading ? 'Consolidation…' : 'Consolider la période' }}</button><button class="button secondary" type="button" data-testid="consolidation-export" :disabled="!result" @click="exportCsv"><AppIcon name="documents" :size="15" />Exporter CSV</button></div>
    </form>

    <p v-if="feedback" role="status" class="consolidation-feedback" data-testid="consolidation-feedback">{{ feedback }}</p>
    <p v-if="error" role="alert" class="consolidation-error" data-testid="consolidation-error">{{ error }} <button class="button secondary" type="button" @click="consolidate">Réessayer</button></p>
    <p v-else-if="loading" role="status" class="consolidation-loading" data-testid="consolidation-loading">Lecture des rapports des officines sélectionnées…</p>

    <template v-else-if="result">
      <section class="consolidation-summary" data-testid="consolidation-summary">
        <div><p class="eyebrow">PÉRIMÈTRE CONSOLIDÉ</p><strong>{{ availableCount }} / {{ result.offices.length }}</strong><span>officine(s) avec une source disponible</span></div>
        <div><p class="eyebrow">PÉRIODE</p><strong>{{ result.period.start }} → {{ result.period.end }}</strong><span>{{ result.complete ? 'Toutes les sources sont disponibles' : 'Périmètre incomplet : aucune valeur n’est inventée' }}</span></div>
        <div><p class="eyebrow">GÉNÉRÉ</p><strong>{{ dateTime(result.generatedAt) }}</strong><span>Heure de Porto-Novo</span></div>
      </section>

      <section class="officine-panel consolidation-table-panel" data-testid="consolidation-metrics" aria-labelledby="consolidation-metrics-title">
        <header><div><p class="eyebrow">INDICATEURS CONSOLIDÉS</p><h2 id="consolidation-metrics-title">Ce qui peut réellement être additionné</h2></div></header>
        <p class="consolidation-rule">Un ratio n’est consolidé que si toutes les sources sélectionnées fournissent le même code, la même définition et la même unité. Il est pondéré par les dénominateurs réels, jamais par le nombre d’officines.</p>
        <div v-if="result.metrics.length" class="table-scroll"><table><caption class="sr-only">Indicateurs consolidés et couverture des sources</caption><thead><tr><th scope="col">Indicateur</th><th scope="col">Num. / Dén.</th><th scope="col">Valeur consolidée</th><th scope="col">Couverture</th><th scope="col">État</th></tr></thead><tbody><tr v-for="metric in result.metrics" :key="metric.code"><td data-label="Indicateur"><strong>{{ metric.title }}</strong><small>{{ metric.definition }}</small><small>{{ metric.code }} · {{ metric.unit }}</small></td><td data-label="Num. / Dén.">{{ number(metric.numerator) }} / {{ number(metric.denominator) }}</td><td data-label="Valeur consolidée" class="metric-value">{{ metricValue(metric) }}</td><td data-label="Couverture">{{ metric.covered }} / {{ metric.expected }} source(s)</td><td data-label="État"><span class="metric-status" :class="metricTone(metric)">{{ metricTone(metric) === 'complete' ? 'Complet' : metricTone(metric) === 'partial' ? 'Périmètre incomplet' : 'Non disponible' }}</span></td></tr></tbody></table></div>
        <p v-else class="officine-empty">Aucun indicateur commun aux sources disponibles.</p>
      </section>

      <section class="office-results" data-testid="consolidation-offices-results" aria-labelledby="office-results-title">
        <header><div><p class="eyebrow">SOURCES PAR OFFICINE</p><h2 id="office-results-title">Ce que chaque officine a réellement retourné</h2></div></header>
        <div class="office-grid">
          <article v-for="source in result.offices" :key="source.office.id" class="officine-panel office-card">
            <header><div><h3>{{ source.office.name }}</h3><p v-if="source.office.city">{{ source.office.city }}</p></div><span class="metric-status" :class="source.available ? 'complete' : 'unavailable'">{{ source.available ? 'Disponible' : 'Indisponible' }}</span></header>
            <p v-if="source.error" role="alert" class="office-error">{{ source.error }}</p>
            <dl v-else><div v-for="metric in source.metrics" :key="metric.code"><dt>{{ metric.title }}</dt><dd>{{ metricValue(metric) }}</dd></div></dl>
            <footer><span v-if="source.asOf">Reçu le {{ dateTime(source.asOf) }}</span><span v-else>Horodatage non fourni</span><button class="text-link" @click="detail = source">Voir le détail <AppIcon name="arrow" :size="14" /></button></footer>
          </article>
        </div>
      </section>
    </template>

    <section v-else-if="!error" class="officine-panel consolidation-intro">
      <AppIcon name="dashboard" :size="28" />
      <div><h2>Une consolidation lisible, pas un total inventé</h2><p>Choisissez une période et les officines autorisées. La vue affichera les indicateurs communs, la couverture des sources et les éventuelles indisponibilités. Aucune valeur n’est remplacée par zéro.</p></div>
    </section>

    <AppModal :model-value="detailOpen" :title="detail?.office.name ?? 'Détail de la source'" eyebrow="DÉTAIL PAR OFFICINE" size="wide" @update:model-value="value => { if (!value) detail = null }">
      <div v-if="detail" class="form-body consolidation-detail">
        <p v-if="detail.error" role="alert" class="office-error">{{ detail.error }}</p>
        <dl v-else><div v-for="metric in detail.metrics" :key="metric.code"><dt>{{ metric.title }} <small>{{ metric.code }}</small></dt><dd>{{ metricValue(metric) }}<small>{{ metric.numerator }} / {{ metric.denominator }} · {{ metric.unit }}</small><p>{{ metric.definition }}</p></dd></div></dl>
        <p class="consolidation-rule">Horodatage source : {{ detail.asOf ? dateTime(detail.asOf) : 'non fourni' }}. Ces indicateurs sont ceux du reporting de cette officine ; ils ne constituent pas une attestation de conformité.</p>
      </div>
      <template #footer><button class="button secondary" @click="detail = null">Fermer</button></template>
    </AppModal>
  </main>
</template>

<style scoped>
.consolidation-page { max-width: 1600px; padding: 28px; color: #0f3b27; }
.consolidation-page .page-heading { align-items: center; gap: 20px; margin-bottom: 18px; }
.consolidation-page h1 { font-size: 32px; line-height: 1.2; margin: 5px 0 8px; }
.consolidation-source { padding: 8px 12px; border: 1px solid #cff1d2; border-radius: 7px; background: #e3f4e6; color: #0f3b27; font-size: 12px; white-space: nowrap; }
.consolidation-notice { display: flex; align-items: flex-start; gap: 9px; padding: 13px 16px; margin: 0 0 18px; border: 1px solid #cff1d2; border-radius: 10px; background: #edf7ee; color: #475c50; font-size: 13px; line-height: 1.6; }
.consolidation-notice svg { flex-shrink: 0; margin-top: 2px; }
.consolidation-filters { display: grid; grid-template-columns: minmax(260px, 0.9fr) minmax(0, 1.6fr) auto; align-items: end; gap: 20px; padding: 20px; margin-bottom: 20px; }
.period-fields { display: flex; flex-wrap: wrap; gap: 12px; }
.period-fields label, .office-check { display: grid; gap: 6px; font-size: 12px; font-weight: 700; }
.period-fields input { min-height: 42px; max-width: 100%; padding: 8px 11px; border: 1px solid #bcd8c1; border-radius: 7px; background: #fff; color: #0f3b27; }
.office-picker { min-width: 0; margin: 0; padding: 12px; border: 1px solid #dbe9dd; border-radius: 9px; }
.office-picker legend { padding: 0 6px; color: #475c50; font-size: 12px; font-weight: 700; }
.office-picker legend span { color: #0f3b27; }
.office-picker > p { margin: 6px 0; font-size: 12px; color: #475c50; }
.office-check { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-weight: 600; }
.office-check input { width: 16px; height: 16px; margin: 0; accent-color: #0f3b27; }
.office-check small { display: block; margin-top: 2px; color: #475c50; font-size: 11px; font-weight: 400; }
.office-picker-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 7px; }
.office-picker-actions .text-link { padding: 0; border: 0; background: transparent; font-size: 12px; }
.consolidation-submit { display: flex; flex-direction: column; gap: 8px; }
.consolidation-feedback { padding: 11px 15px; border-radius: 8px; background: #e3f4e6; font-size: 13px; }
.consolidation-error { padding: 14px 16px; border: 1px solid #f2bda5; border-radius: 10px; background: #fff1e9; color: #792e10; line-height: 1.7; }
.consolidation-error .button { margin-left: 10px; }
.consolidation-loading { padding: 30px; text-align: center; color: #475c50; }
.consolidation-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
.consolidation-summary > div { min-width: 0; padding: 18px 20px; border: 1px solid #dbe9dd; border-radius: 16px; background: #fff; }
.consolidation-summary .eyebrow { margin: 0 0 8px; font-size: 11px; }
.consolidation-summary strong { display: block; font-family: var(--font-display); font-size: 25px; line-height: 1.3; overflow-wrap: anywhere; }
.consolidation-summary span { display: block; margin-top: 5px; color: #475c50; font-size: 12px; line-height: 1.5; }
.consolidation-table-panel { margin-bottom: 22px; }
.consolidation-table-panel > header { margin-bottom: 8px; }
.consolidation-rule { color: #475c50; font-size: 12px; line-height: 1.7; margin: 8px 0 14px; }
.consolidation-table-panel table { min-width: 760px; }
.consolidation-table-panel td { font-size: 13px; }
.consolidation-table-panel td small { display: block; margin-top: 4px; color: #475c50; font-size: 11px; line-height: 1.5; }
.consolidation-table-panel .metric-value { font-weight: 700; white-space: nowrap; }
.metric-status { display: inline-flex; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.metric-status.complete { background: #e3f4e6; color: #0f3b27; }
.metric-status.partial { background: #fff1e9; color: #8c3a13; }
.metric-status.unavailable { background: #f0f1ee; color: #5b665e; }
.office-results > header { margin-bottom: 12px; }
.office-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.office-card { padding: 20px; }
.office-card > header { align-items: flex-start; gap: 12px; }
.office-card h3 { margin: 0; font-size: 18px; overflow-wrap: anywhere; }
.office-card header p { margin: 3px 0 0; color: #475c50; font-size: 12px; }
.office-card dl { display: grid; gap: 8px; margin: 14px 0; }
.office-card dl > div { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 7px; border-bottom: 1px solid #e3eee5; }
.office-card dt { color: #475c50; font-size: 12px; }
.office-card dd { margin: 0; font-size: 13px; font-weight: 700; }
.office-card footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; color: #475c50; font-size: 11px; }
.office-card footer .text-link { padding: 0; border: 0; background: transparent; }
.office-error { padding: 11px 13px; border: 1px solid #f2bda5; border-radius: 8px; background: #fff1e9; color: #792e10; font-size: 12px; line-height: 1.6; }
.consolidation-intro { display: flex; align-items: flex-start; gap: 18px; padding: 28px; }
.consolidation-intro > svg { flex-shrink: 0; color: #0f3b27; }
.consolidation-intro h2 { margin: 0 0 8px; }
.consolidation-intro p { margin: 0; color: #475c50; font-size: 13px; line-height: 1.7; max-width: 720px; }
.consolidation-detail dl { display: grid; gap: 12px; margin: 0; }
.consolidation-detail dl > div { display: grid; grid-template-columns: minmax(160px, 0.8fr) minmax(0, 1.2fr); gap: 14px; padding-bottom: 10px; border-bottom: 1px solid #e3eee5; }
.consolidation-detail dt { font-size: 13px; font-weight: 700; }
.consolidation-detail dt small, .consolidation-detail dd small { display: block; margin-top: 3px; color: #475c50; font-size: 11px; font-weight: 400; }
.consolidation-detail dd { margin: 0; font-size: 13px; overflow-wrap: anywhere; }
.consolidation-detail dd p { margin: 5px 0 0; color: #475c50; font-size: 12px; line-height: 1.6; }
@media (max-width: 1100px) {
  .consolidation-filters { grid-template-columns: 1fr; align-items: stretch; }
  .consolidation-submit { flex-direction: row; flex-wrap: wrap; }
  .consolidation-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .consolidation-summary strong { font-size: 21px; }
}
@media (max-width: 800px) {
  .consolidation-page { padding: 22px 16px; }
  .consolidation-summary { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .consolidation-page h1 { font-size: 28px; }
  .consolidation-page .page-heading { align-items: flex-start; }
  .consolidation-source { white-space: normal; }
  .period-fields label { flex: 1 1 130px; min-width: 0; }
  .consolidation-submit .button { flex: 1 1 100%; }
  .consolidation-intro { flex-direction: column; padding: 20px; }
  .consolidation-detail dl > div { grid-template-columns: 1fr; gap: 4px; }
  .office-card footer { display: grid; }
  .consolidation-table-panel .table-scroll { overflow: visible; }
  .consolidation-table-panel table, .consolidation-table-panel thead, .consolidation-table-panel tbody, .consolidation-table-panel tr, .consolidation-table-panel td { display: block; width: 100%; min-width: 0; }
  .consolidation-table-panel thead { display: none; }
  .consolidation-table-panel tbody tr { padding: 12px 14px; border-bottom: 1px solid #e3eee5; }
  .consolidation-table-panel tbody tr:last-child { border-bottom: 0; }
  .consolidation-table-panel td { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 4px 0; border: 0; text-align: right; }
  .consolidation-table-panel td::before { content: attr(data-label); flex-shrink: 0; color: #475c50; font-size: 11px; font-weight: 700; text-align: left; }
  .consolidation-table-panel td:first-child { display: block; padding-bottom: 7px; text-align: left; }
  .consolidation-table-panel td:first-child::before { display: none; }
  .consolidation-table-panel .metric-value { white-space: normal; }
}
</style>
