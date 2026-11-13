<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import { currentOffice, supportState } from '@/services/supportDemo'
import { downloadSalesCsv, loadCurrentDomains, loadPeriodSales, pilotageLinks, readPeriod, validDate, type Domain, type SalesDay } from '@/services/pilotageOverview'

const route = useRoute(), router = useRouter()
const period = computed(() => readPeriod(route.query))
const from = ref(period.value.from), to = ref(period.value.to)
const validation = ref(''), salesError = ref(''), exportError = ref('')
const loading = ref(false), domains = ref<Domain[]>([]), sales = ref<SalesDay[] | null>(null)
const refreshedAt = ref(''), selected = ref<Domain | null>(null)
const detailOpen = computed({ get: () => !!selected.value, set: value => { if (!value) selected.value = null } })
let generation = 0
const total = computed(() => sales.value?.reduce((sum, day) => sum + day.amount, 0) ?? 0)
const tickets = computed(() => sales.value?.reduce((sum, day) => sum + day.count, 0) ?? 0)
const max = computed(() => Math.max(1, ...(sales.value?.map(day => day.amount) ?? [])))
const number = (value: number | null) => value === null ? 'N/D' : new Intl.NumberFormat('fr-FR').format(value)
const time = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Porto-Novo' }).format(new Date(value))
async function refresh() {
  const run = ++generation
  loading.value = true; domains.value = []; sales.value = null; salesError.value = ''; refreshedAt.value = ''; exportError.value = ''
  const [current, activity] = await Promise.allSettled([loadCurrentDomains(), loadPeriodSales(period.value)])
  if (run !== generation) return
  if (current.status === 'fulfilled') domains.value = current.value
  if (activity.status === 'fulfilled') sales.value = activity.value
  else salesError.value = activity.reason instanceof Error ? activity.reason.message : 'Ventes indisponibles / accès non autorisé.'
  refreshedAt.value = new Date().toISOString(); loading.value = false
}
function apply(value: string) {
  validation.value = ''
  if (value === 'custom' && (!validDate(from.value) || !validDate(to.value) || from.value > to.value || Date.parse(to.value) - Date.parse(from.value) > 365 * 86400000)) { validation.value = 'Dates invalides : choisissez un intervalle ordonné de 366 jours maximum.'; return }
  void router.replace({ query: { ...route.query, period: value, from: value === 'custom' ? from.value : undefined, to: value === 'custom' ? to.value : undefined } })
}
function exportCsv() { try { if (sales.value) downloadSalesCsv(sales.value, period.value) } catch { exportError.value = 'Téléchargement refusé par le navigateur. Réessayez.' } }
watch(() => [supportState.selectedOffice, route.query.period, route.query.from, route.query.to], () => { selected.value = null; from.value = period.value.from; to.value = period.value.to; void refresh() }, { immediate: true })
onBeforeUnmount(() => { generation++ })
</script>

<template>
  <section class="page erp-page officine-dashboard api-overview" data-tour="dashboard" :aria-busy="loading">
    <header class="page-heading compact"><div><p class="eyebrow">PILOTAGE DE L’OFFICINE</p><h1>Tableau de bord</h1><p class="page-subtitle">{{ currentOffice.name }} · Vue opérationnelle multi-domaines</p></div><button class="button secondary" data-testid="api-refresh" :disabled="loading" @click="refresh"><AppIcon name="clock" :size="16" />{{ loading ? 'Actualisation…' : 'Actualiser' }}</button></header>
    <nav class="pilotage-nav" aria-label="Autres écrans Pilotage" data-testid="api-pilotage-links"><RouterLink v-for="link in pilotageLinks" :key="link.to" class="button secondary" :to="link.to">{{ link.label }} <AppIcon name="arrow" :size="14" /></RouterLink></nav>
    <section class="officine-situation" data-tour="dashboard-situation"><div><span class="officine-demo-label">DONNÉES API · ACCÈS SELON VOS DROITS</span><h2>L’essentiel pour agir.</h2><p>Ventes sur la période, stock et suivi métier à l’instant présent.</p></div><RouterLink class="button primary" to="/tresorerie/caisse">Ouvrir la caisse <AppIcon name="arrow" :size="16" /></RouterLink></section>
    <p v-if="loading" role="status" data-testid="api-loading">Chargement des domaines autorisés…</p><p v-else class="officine-update" role="status" data-testid="api-freshness">Dernière tentative : {{ refreshedAt ? time(refreshedAt) : 'N/D' }} · Porto-Novo. Horodatage de chaque source dans son détail.</p>
    <form class="pilotage-filters" data-testid="api-period-filter" @submit.prevent="apply('custom')"><label>Période des ventes<select :value="period.period" data-testid="api-period" @change="apply(($event.target as HTMLSelectElement).value)"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="custom">Dates personnalisées</option></select></label><label>Du<input v-model="from" type="date" data-testid="api-from" required /></label><label>Au<input v-model="to" type="date" data-testid="api-to" required /></label><button class="button secondary" type="submit" data-testid="api-apply">Appliquer les dates</button><button class="button secondary" type="button" data-testid="api-export" :disabled="loading || !sales" @click="exportCsv">Exporter les ventes CSV</button><p v-if="validation || exportError" role="alert">{{ validation || exportError }}</p></form>
    <section class="officine-panel sales-panel" data-testid="api-sales" data-tour="dashboard-indicateurs" aria-labelledby="api-sales-title"><header><div><p class="eyebrow">ACTIVITÉ SUR LA PÉRIODE</p><h2 id="api-sales-title">Ventes payées · {{ period.from }} → {{ period.to }}</h2></div><RouterLink class="text-link" to="/dispensation/ventes">Voir les ventes</RouterLink></header>
      <p v-if="salesError" role="alert" data-testid="api-sales-error">Indisponible / accès non autorisé : {{ salesError }} <button class="text-link" @click="refresh">Réessayer</button></p>
      <template v-else-if="sales"><p class="officine-chart-total" data-testid="api-sales-total">{{ number(total) }} FCFA <span>{{ number(tickets) }} ticket(s) payé(s) · date d’encaissement</span></p><p v-if="!tickets">Aucune vente payée sur cette période.</p>
        <svg class="sales-chart" viewBox="0 0 640 160" preserveAspectRatio="none" role="img" aria-labelledby="api-chart-title api-chart-desc" data-testid="api-sales-chart"><title id="api-chart-title">Ventes payées par jour en FCFA</title><desc id="api-chart-desc">Total {{ number(total) }} FCFA. Données journalières dans le tableau dépliable suivant.</desc><g v-for="(day, index) in sales" :key="day.date"><rect :x="index * 640 / sales.length + 2" :y="150 - day.amount / max * 140" :width="Math.max(1, 640 / sales.length - 4)" :height="day.amount / max * 140" rx="3"><title>{{ day.date }} : {{ number(day.amount) }} FCFA, {{ day.count }} tickets</title></rect></g></svg>
        <details data-testid="api-sales-data"><summary>Consulter les données du graphique</summary><div class="table-scroll"><table><caption>Ventes payées · Africa/Porto-Novo</caption><thead><tr><th scope="col">Date</th><th scope="col">Montant FCFA</th><th scope="col">Tickets</th></tr></thead><tbody><tr v-for="day in sales" :key="day.date"><th scope="row">{{ day.date }}</th><td>{{ number(day.amount) }}</td><td>{{ day.count }}</td></tr></tbody></table></div></details>
      </template>
    </section>
    <h2 class="current-title">Situation actuelle</h2><p class="notice" data-testid="api-current-notice">Stock à l’instant d’actualisation · ces indicateurs actuels ne sont pas filtrés par les dates des ventes. N/D signifie que le champ n’est pas fourni ; un refus d’accès n’est jamais un zéro.</p>
    <div class="domain-grid"><section v-for="domain in domains" :key="domain.id" class="officine-panel" :data-testid="`api-domain-${domain.id}`"><header><h2>{{ domain.title }}</h2><AppIcon :name="domain.id === 'stock' ? 'box' : domain.id === 'team' ? 'team' : 'quality'" :size="22" /></header><p v-if="domain.error" role="alert" :data-testid="`api-error-${domain.id}`">Indisponible / accès non autorisé : {{ domain.error }}</p><dl v-else class="officine-controls"><div v-for="metric in domain.metrics" :key="metric.label"><dt>{{ metric.label }}</dt><dd>{{ number(metric.value) }}</dd></div></dl><div class="domain-actions"><button class="text-link" :data-testid="`api-detail-${domain.id}`" @click="selected = domain">Voir le détail</button><button v-if="domain.error" class="button secondary" @click="refresh">Réessayer</button><RouterLink v-else class="text-link" :to="domain.to">Voir la source <AppIcon name="arrow" :size="14" /></RouterLink></div></section></div>
    <AppModal v-model="detailOpen" :title="selected?.title ?? 'Détail'" eyebrow="INDICATEURS ACTUELS"><div v-if="selected" class="form-body"><p v-if="selected.error" role="alert">Indisponible / accès non autorisé : {{ selected.error }}</p><dl v-else class="officine-controls"><div v-for="metric in selected.metrics" :key="metric.label"><dt>{{ metric.label }}</dt><dd>{{ number(metric.value) }}</dd></div></dl><p>Horodatage source : {{ selected.asOf ? time(selected.asOf) : 'N/D — non fourni par le serveur' }}</p><p>Ces compteurs ne constituent pas une attestation de conformité.</p><RouterLink class="button primary" :to="selected.to" @click="selected = null">Voir la source</RouterLink></div></AppModal>
  </section>
</template>

<style scoped>
.api-overview{min-width:0}.pilotage-nav,.pilotage-filters{display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin-bottom:22px}.pilotage-nav .button{white-space:normal}.pilotage-filters{padding:16px;background:#fff;border:1px solid #dbe9dd;border-radius:12px}.pilotage-filters label{display:grid;gap:6px;font-size:12px;font-weight:700}.pilotage-filters input,.pilotage-filters select{min-height:42px;max-width:100%;border:1px solid #bcd8c1;border-radius:7px;padding:8px;background:#fff;color:#0f3b27}.pilotage-filters p{flex-basis:100%}.sales-panel{margin-top:22px}.sales-chart{display:block;width:100%;height:170px;margin:20px 0;fill:#277348}.sales-panel summary{cursor:pointer;padding:12px 0}.sales-panel table{width:100%}.sales-panel th,.sales-panel td{padding:10px;text-align:left}.domain-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.domain-actions{display:flex;justify-content:space-between;gap:12px}.notice{color:#475c50;font-size:13px;line-height:1.7}.current-title{margin:28px 0 8px}.api-overview [role=alert]{color:#a63212;line-height:1.7;overflow-wrap:anywhere}@media(max-width:600px){.domain-grid{grid-template-columns:1fr}.pilotage-filters label{flex:1 1 130px;min-width:0}.pilotage-nav .button{flex:1 1 100%}.officine-panel>header{flex-wrap:wrap}}
</style>
