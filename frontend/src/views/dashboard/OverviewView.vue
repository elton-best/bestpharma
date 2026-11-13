<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { downloadSalesCsv, loadPeriodSales, pilotageLinks, readPeriod, validDate, type SalesDay } from '@/services/pilotageOverview'
import { demoMode } from '@/services/quality'
import { currentOffice, supportState } from '@/services/supportDemo'
import { getDemoDashboard, resetBoardsDemo, type DemoDashboard } from '@/services/cdcBoardsDemo'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import QualityDashboard from './DashboardView.vue'

const dashboard = ref<DemoDashboard | null>(null)
const error = ref('')
const restoreOpen = ref(false)
const restoreError = ref('')
const allAlerts = ref(false)
const route = useRoute()
const router = useRouter()
const period = computed(() => readPeriod(route.query))
const from = ref(period.value.from)
const to = ref(period.value.to)
const filterError = ref('')
const periodError = ref('')
const periodLoading = ref(false)
const periodSeries = ref<SalesDay[] | null>(null)
const detail = ref<{ title: string; detail: string; to: string } | null>(null)
const detailOpen = computed({ get: () => !!detail.value, set: value => { if (!value) detail.value = null } })
let generation = 0
async function refreshPeriod() {
  const run = ++generation
  periodError.value = ''; periodSeries.value = null
  if (!demoMode || !route.query.period) { periodLoading.value = false; return }
  periodLoading.value = true
  try { const data = await loadPeriodSales(period.value); if (run === generation) periodSeries.value = data }
  catch (cause) { if (run === generation) periodError.value = cause instanceof Error ? cause.message : 'Ventes indisponibles.' }
  finally { if (run === generation) periodLoading.value = false }
}
function applyPeriod(value: string) {
  filterError.value = ''
  if (value === 'custom' && (!validDate(from.value) || !validDate(to.value) || from.value > to.value || Date.parse(to.value) - Date.parse(from.value) > 365 * 86400000)) { filterError.value = 'Choisissez des dates valides, dans l’ordre, sur 366 jours maximum.'; return }
  void router.replace({ query: { ...route.query, period: value, from: value === 'custom' ? from.value : undefined, to: value === 'custom' ? to.value : undefined } })
}
watch(() => [route.query.period, route.query.from, route.query.to], () => { from.value = period.value.from; to.value = period.value.to; void refreshPeriod() })
const series = computed(() => periodSeries.value ?? (!route.query.period ? dashboard.value?.sales.series ?? [] : []))
function exportCsv() { try { downloadSalesCsv(series.value, period.value) } catch { periodError.value = 'Le navigateur a refusé le téléchargement. Réessayez.' } }
const rankedAlerts = computed(() => {
  const rank = { critical: 0, warning: 1, info: 2 }
  return [...(dashboard.value?.alerts ?? [])].sort((a, b) => rank[a.severity] - rank[b.severity])
})
const visibleAlerts = computed(() => allAlerts.value ? rankedAlerts.value : rankedAlerts.value.slice(0, 5))
function openRestore() {
  restoreError.value = ''
  restoreOpen.value = true
}
function restoreExamples() {
  if (!demoMode) return
  restoreError.value = ''
  try {
    resetBoardsDemo(currentOffice.value.id)
    refresh()
    if (error.value) { restoreError.value = error.value; return }
    restoreOpen.value = false
  } catch (cause) {
    restoreError.value = cause instanceof DOMException
      ? cause.name === 'QuotaExceededError'
        ? 'Le quota de stockage du navigateur est dépassé.'
        : 'Le navigateur refuse l’accès au stockage des exemples.'
      : cause instanceof Error ? cause.message : 'Le navigateur a refusé la restauration des exemples.'
  }
}
function refresh() {
  if (!demoMode) return
  dashboard.value = null
  error.value = ''
  try { dashboard.value = getDemoDashboard(currentOffice.value.id) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Impossible de lire les données de démonstration.' }
  void refreshPeriod()
}
watch(() => supportState.selectedOffice, () => {
  restoreOpen.value = false
  restoreError.value = ''
  allAlerts.value = false
  detail.value = null
  refresh()
}, { immediate: true, flush: 'sync' })
const number = (value: number) => new Intl.NumberFormat('fr-FR').format(value)
const money = (value: number) => `${number(value)} FCFA`
const date = (value: string, short = false) => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: short ? 'short' : 'long', ...(short ? {} : { year: 'numeric' as const }), timeZone: 'Africa/Porto-Novo',
}).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value))
const time = (value: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Porto-Novo' }).format(new Date(value))
const today = computed(() => date(dashboard.value?.generatedAt ?? new Date().toISOString()))
const total = computed(() => series.value.reduce((sum, day) => sum + day.amount, 0))
const max = computed(() => Math.max(1, ...series.value.map(day => day.amount)))
const bars = computed(() => series.value.map((day, index, days) => ({
  ...day, x: index * (640 / days.length) + (640 / days.length - Math.min(42, 360 / days.length)) / 2, height: day.amount / max.value * 132,
})))
const shortcuts = [
  { label: 'Caisse', detail: 'Sessions & encaissements', icon: 'caisse', to: '/tresorerie/caisse' },
  { label: 'Stock & réception', detail: 'Produits, lots, commandes', icon: 'box', to: '/stock/approvisionnements' },
  { label: 'Non-conformités', detail: 'Déclaration & suivi', icon: 'quality', to: '/qualite/non-conformites' },
  { label: 'Équipe', detail: 'Personnel & formations', icon: 'team', to: '/personnel/formations' },
  { label: 'Documentation', detail: 'Procédures & versions', icon: 'documents', to: '/documents' },
]
</script>

<template>
  <template v-if="!demoMode">
    <div class="page erp-page" style="padding-bottom:0">
      <RouterLink to="/dashboard/acces" class="button secondary">Tableau des accès et journal · Module 01</RouterLink>
      <RouterLink to="/dashboard/accompagnement" class="button primary">Mes demandes d’accompagnement · Module 02</RouterLink>
    </div>
    <QualityDashboard />
  </template>
  <section v-else class="page erp-page officine-dashboard" data-tour="dashboard">
    <header class="page-heading compact">
      <div><p class="eyebrow">PILOTAGE DE L’OFFICINE</p><h1>Tableau de bord</h1><p class="page-subtitle">{{ currentOffice.name }} · {{ currentOffice.city }}</p></div>
      <div class="officine-heading-actions"><span class="officine-date"><AppIcon name="calendar" :size="16" />{{ today }}</span><button class="button secondary" @click="refresh"><AppIcon name="clock" :size="16" />Actualiser</button><button class="text-link" data-testid="dashboard-restore" @click="openRestore">Restaurer les exemples</button></div>
    </header>
    <nav class="pilotage-nav" aria-label="Autres écrans Pilotage" data-testid="dashboard-pilotage-links"><RouterLink v-for="link in pilotageLinks" :key="link.to" :to="link.to" class="button secondary">{{ link.label }} <AppIcon name="arrow" :size="14" /></RouterLink></nav>
    <form class="pilotage-filters" data-testid="dashboard-period-filter" @submit.prevent="applyPeriod('custom')">
      <label>Période des ventes <select data-testid="dashboard-period" :value="period.period" @change="applyPeriod(($event.target as HTMLSelectElement).value)"><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="custom">Dates personnalisées</option></select></label>
      <label>Du <input v-model="from" data-testid="dashboard-from" type="date" required /></label><label>Au <input v-model="to" data-testid="dashboard-to" type="date" required /></label>
      <button class="button secondary" data-testid="dashboard-apply" type="submit">Appliquer les dates</button>
      <button class="button secondary" data-testid="dashboard-export" type="button" :disabled="periodLoading || !!periodError || !dashboard" @click="exportCsv">Exporter les ventes CSV</button>
      <p v-if="filterError" role="alert">{{ filterError }}</p>
    </form>
    <div v-if="error" class="officine-error" role="alert"><AppIcon name="warning" /><div><strong>Tableau de bord indisponible</strong><p>{{ error }}</p><div class="officine-error-actions"><button class="button secondary" @click="refresh">Réessayer</button><button class="button secondary" data-testid="dashboard-error-restore" @click="openRestore">Restaurer les exemples</button></div></div></div>
    <template v-else-if="dashboard">
      <section class="officine-situation" aria-labelledby="situation-title" data-tour="dashboard-situation">
        <div><span class="officine-demo-label">DÉMONSTRATION · DONNÉES FICTIVES</span><h2 id="situation-title">Aujourd’hui à l’officine</h2><p><strong>{{ dashboard.alerts.length }} point{{ dashboard.alerts.length > 1 ? 's' : '' }} de vigilance</strong> à consulter · {{ dashboard.stock.products }} produits suivis · {{ dashboard.team.activeEmployees }} membres actifs</p></div>
        <div class="officine-situation-actions"><RouterLink to="/tresorerie/caisse" class="button primary"><AppIcon name="caisse" :size="18" />Ouvrir la caisse</RouterLink><RouterLink to="/stock/approvisionnements" class="officine-banner-link">Consulter le stock <AppIcon name="arrow" :size="16" /></RouterLink></div>
      </section>
      <div class="officine-update" role="status"><AppIcon name="check" :size="14" />Données recalculées à {{ time(dashboard.generatedAt) }} · heure de Porto-Novo</div>
      <p class="pilotage-notice" data-testid="dashboard-current-notice">Stock à l’instant d’actualisation · qualité et équipe actuelles. Le filtre de dates s’applique uniquement aux ventes, pas à une reconstitution historique du stock.</p>
      <div class="officine-kpis" data-tour="dashboard-indicateurs">
        <RouterLink to="/dispensation/ventes" class="officine-kpi sales" data-testid="dashboard-kpi-sales"><span>Ventes du jour <AppIcon name="caisse" :size="19" /></span><strong>{{ money(dashboard.sales.todayAmount) }}</strong><small>{{ number(dashboard.sales.todayCount) }} ticket(s) payé(s)</small></RouterLink>
        <RouterLink to="/stock/approvisionnements" class="officine-kpi" data-testid="dashboard-kpi-stock"><span>Produits sous seuil <AppIcon name="box" :size="19" /></span><strong>{{ number(dashboard.stock.lowStock) }}</strong><small>Sur {{ number(dashboard.stock.products) }} produits suivis</small></RouterLink>
        <RouterLink to="/stock/approvisionnements" class="officine-kpi caution"><span>Lots en quarantaine <AppIcon name="warning" :size="19" /></span><strong>{{ number(dashboard.stock.quarantineLots) }}</strong><small>Décision pharmaceutique à suivre</small></RouterLink>
        <RouterLink to="/qualite/non-conformites" class="officine-kpi"><span>NC ouvertes <AppIcon name="quality" :size="19" /></span><strong>{{ number(dashboard.quality.openNc) }}</strong><small>{{ number(dashboard.quality.overdueActions) }} action(s) en retard</small></RouterLink>
        <RouterLink to="/personnel/formations" class="officine-kpi"><span>Équipe active <AppIcon name="team" :size="19" /></span><strong>{{ number(dashboard.team.activeEmployees) }}</strong><small>{{ number(dashboard.team.plannedTrainings) }} formation(s) planifiée(s)</small></RouterLink>
      </div>
      <div class="officine-analysis-grid">
        <section class="officine-panel officine-sales" aria-labelledby="sales-title" data-testid="dashboard-sales-chart">
          <header><div><p class="eyebrow">ACTIVITÉ COMMERCIALE</p><h2 id="sales-title">{{ period.period === 'custom' ? 'Période personnalisée' : `Les ${period.period} derniers jours` }}</h2></div><RouterLink to="/dispensation/ventes" class="text-link">Voir les ventes <AppIcon name="arrow" :size="15" /></RouterLink></header>
          <p v-if="periodLoading" role="status" data-testid="dashboard-period-loading">Chargement des ventes…</p>
          <p v-else-if="periodError" role="alert" data-testid="dashboard-period-error">{{ periodError }} <button class="text-link" @click="refreshPeriod">Réessayer</button></p>
          <template v-else>
          <p class="officine-chart-total">{{ money(total) }} <span>de ventes payées sur la période</span></p>
          <figure v-if="bars.length" class="officine-chart">
            <div class="officine-chart-scale" aria-hidden="true">{{ number(max) }} FCFA</div>
            <svg viewBox="0 0 640 166" preserveAspectRatio="none" role="img" aria-labelledby="sales-chart-title sales-chart-desc">
              <title id="sales-chart-title">Montants des ventes payées par jour en FCFA</title><desc id="sales-chart-desc">Total : {{ money(total) }}. Les montants et tickets de chaque date sont disponibles dans le tableau ci-dessous.</desc>
              <g class="officine-chart-grid" aria-hidden="true"><path d="M0 24H640 M0 68H640 M0 112H640 M0 156H640" /></g>
              <g v-for="bar in bars" :key="bar.date"><rect :x="bar.x" :y="156 - bar.height" :width="Math.min(42, 360 / bars.length)" :height="bar.height" rx="5"><title>{{ date(bar.date) }} : {{ money(bar.amount) }}, {{ bar.count }} ticket(s)</title></rect></g>
            </svg>
            <div class="officine-chart-labels" :style="{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }" aria-hidden="true"><span v-for="(bar, index) in bars" :key="bar.date">{{ bars.length <= 7 || index === 0 || index === bars.length - 1 ? date(bar.date, true) : '' }}</span></div>
            <figcaption v-if="!total">Aucune vente payée sur cette période.</figcaption>
          </figure>
          <p v-else class="officine-empty">Aucun historique de ventes disponible.</p>
          <details class="officine-chart-details"><summary>Consulter les données du graphique</summary><div class="table-scroll"><table><caption>Ventes payées sur la période sélectionnée</caption><thead><tr><th scope="col">Date</th><th scope="col">Montant FCFA</th><th scope="col">Tickets</th></tr></thead><tbody><tr v-for="day in series" :key="day.date"><th scope="row">{{ date(day.date) }}</th><td>{{ number(day.amount) }}</td><td>{{ day.count }}</td></tr></tbody></table></div></details>
          </template>
        </section>
        <section class="officine-panel officine-stock" aria-labelledby="stock-title"><header><div><p class="eyebrow">STOCK & QUALITÉ</p><h2 id="stock-title">Les points de contrôle</h2></div><AppIcon name="quality" :size="24" /></header><dl class="officine-controls"><div><dt>Lots disponibles à la vente</dt><dd>{{ number(dashboard.stock.availableLots) }}</dd></div><div><dt>Lots à péremption proche</dt><dd>{{ number(dashboard.stock.expiringLots) }}</dd></div><div><dt>Actions qualité en retard</dt><dd>{{ number(dashboard.quality.overdueActions) }}</dd></div><div><dt>Auto-inspections planifiées</dt><dd>{{ number(dashboard.quality.plannedInspections) }}</dd></div></dl><RouterLink class="text-link" to="/qualite/inspections">Préparer une auto-inspection <AppIcon name="arrow" :size="15" /></RouterLink></section>
      </div>
      <div class="officine-feed-grid">
        <section class="officine-panel" aria-labelledby="alerts-title" data-testid="dashboard-alerts"><header><div><p class="eyebrow">À TRAITER</p><h2 id="alerts-title">Vigilances <span class="officine-count">{{ dashboard.alerts.length }}</span></h2></div><AppIcon name="warning" :size="22" /></header><ul id="dashboard-vigilance-list" class="officine-alerts"><li v-for="alert in visibleAlerts" :key="alert.id"><a :href="alert.to" aria-haspopup="dialog" @click.prevent="detail = alert"><span class="officine-alert-icon" :class="alert.severity"><AppIcon :name="alert.severity === 'info' ? 'info' : 'warning'" :size="18" /></span><div><small class="officine-severity">{{ { critical: 'Prioritaire', warning: 'À surveiller', info: 'À suivre' }[alert.severity] }}</small><strong>{{ alert.title }}</strong><p>{{ alert.detail }}</p></div><AppIcon name="chevron" :size="16" /></a></li></ul><button v-if="dashboard.alerts.length > 5" class="button secondary officine-alert-toggle" :aria-expanded="allAlerts" aria-controls="dashboard-vigilance-list" @click="allAlerts=!allAlerts">{{ allAlerts ? 'Réduire aux 5 prioritaires' : `Voir les ${dashboard.alerts.length} vigilances` }}</button><p v-if="!dashboard.alerts.length" class="officine-empty">Aucun point de vigilance dans les données de cette officine.</p></section>
        <section class="officine-panel" aria-labelledby="activity-title" data-testid="dashboard-activity"><header><div><p class="eyebrow">JOURNAL DE L’OFFICINE</p><h2 id="activity-title">Activité récente</h2></div><AppIcon name="clock" :size="22" /></header><ol class="officine-activity"><li v-for="item in dashboard.activity.slice(0, 6)" :key="item.id"><RouterLink :to="item.to"><span class="officine-activity-dot" aria-hidden="true" /><div><strong>{{ item.title }}</strong><p>{{ item.detail }}</p><time :datetime="item.at">{{ date(item.at, true) }} · {{ time(item.at) }}</time></div><AppIcon name="chevron" :size="15" /></RouterLink></li></ol><p v-if="!dashboard.activity.length" class="officine-empty">Aucune activité enregistrée pour cette officine.</p></section>
      </div>
      <nav class="officine-shortcuts" aria-label="Accès rapides métier"><RouterLink v-for="link in shortcuts" :key="link.to" :to="link.to"><AppIcon :name="link.icon" :size="22" /><span><strong>{{ link.label }}</strong><small>{{ link.detail }}</small></span><AppIcon name="arrow" :size="15" /></RouterLink></nav>
      <aside class="officine-help"><AppIcon name="support" :size="23" /><div><strong>Un parcours à essayer</strong><p>Suivez un lot en quarantaine, consultez sa réception puis retrouvez les non-conformités associées.</p></div><RouterLink class="text-link" to="/dashboard/accompagnement">Mon accompagnement <AppIcon name="arrow" :size="15" /></RouterLink></aside>
    </template>
    <AppModal v-model="detailOpen" :title="detail?.title ?? 'Détail de vigilance'" eyebrow="VIGILANCE · DÉMONSTRATION"><div class="form-body"><p>{{ detail?.detail }}</p><p>État actuel de l’officine sélectionnée. Consultez la source pour les informations métier complètes.</p><RouterLink v-if="detail" :to="detail.to" class="button primary" @click="detail = null">Voir la source <AppIcon name="arrow" :size="16" /></RouterLink></div></AppModal>
    <AppModal v-model="restoreOpen" title="Restaurer les exemples ?" size="small">
      <div class="form-body">
        <p>Les tableaux de démonstration des modules 3 à 15 de <strong>{{ currentOffice.name }}</strong> retrouveront leurs exemples d’origine. Vos modifications dans ces tableaux seront supprimées.</p>
        <p>Les autres officines, les accès et l’accompagnement (modules 1 et 2), l’ancien simulateur de stock et les données réelles ne seront pas modifiés.</p>
        <p v-if="restoreError" class="officine-restore-error" role="alert">Restauration impossible : {{ restoreError }} Vous pouvez réessayer ou annuler.</p>
      </div>
      <template #footer><button class="button secondary" data-testid="dashboard-restore-cancel" @click="restoreOpen=false">Annuler</button><button class="button primary" data-testid="dashboard-restore-confirm" @click="restoreExamples">Confirmer la restauration</button></template>
    </AppModal>
  </section>
</template>

<style scoped>
.pilotage-nav,.pilotage-filters{display:flex;flex-wrap:wrap;align-items:end;gap:12px;margin-bottom:20px}.pilotage-filters{padding:16px;background:#fff;border:1px solid #dbe9dd;border-radius:12px}.pilotage-filters label{display:grid;gap:6px;font-size:12px;font-weight:700}.pilotage-filters input,.pilotage-filters select{max-width:100%;min-height:42px;border:1px solid #bcd8c1;border-radius:7px;padding:8px;background:white;color:#0f3b27}.pilotage-notice{font-size:12px;color:#475c50;margin:0 0 18px}.pilotage-filters p{flex-basis:100%;color:#a63212}.officine-dashboard{min-width:0}.pilotage-nav .button{white-space:normal}@media(max-width:600px){.pilotage-filters label{flex:1 1 130px;min-width:0}.pilotage-nav .button{flex:1 1 100%}}
</style>
