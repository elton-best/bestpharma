<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { request } from '@/services/quality'

/* ─── Types ─── */
interface LocationRow {
  id: number; name: string; description: string | null; is_active: boolean
  equipments_count?: number
}
interface LocationHistoryRow {
  id: number; moved_at: string; reason: string | null
  location?: { id: number; name: string }
  moved_by?: { id: number; name: string }
}
interface EquipmentRow {
  id: number; code: string; designation: string; category: string
  brand: string | null; model: string | null; serial_number: string | null
  acquisition_year: number | null; installation_date: string | null
  current_location_id: number | null; status: 'en_service' | 'en_panne' | 'en_maintenance' | 'hors_service'
  criticality: 'critique_bpd' | 'standard'; notes: string | null; version: number
  location?: { id: number; name: string }
  location_histories?: LocationHistoryRow[]
}
interface MaintenancePlanRow {
  id: number; equipment_id: number; maintenance_type: string; frequency_days: number
  last_performed_at: string | null; next_due_date: string; default_provider_name: string | null
  is_active: boolean
  equipment?: { id: number; code: string; designation: string; category: string }
}
interface MaintenanceEventRow {
  id: number; equipment_id: number; intervention_type: string; intervention_date: string
  provider_name: string | null; technician_name: string | null; description: string
  result: 'conforme' | 'non_conforme' | 'a_surveiller'; next_due_date: string | null
  cost: number | null; is_verified: boolean; created_action_id: number | null
  equipment?: { id: number; code: string; designation: string }
  verified_by?: { id: number; name: string }
}
interface GeneratorTestRow {
  id: number; equipment_id: number; test_date: string; fuel_level_percent: number
  start_delay_seconds: number; oil_level_ok: boolean; battery_voltage_ok: boolean
  frequency_hz: number | null; test_result: 'conforme' | 'echec' | 'reserve'; comment: string | null
  created_action_id: number | null
  equipment?: { id: number; code: string; designation: string }
  tested_by?: { id: number; name: string }
}
interface CleaningPlanRow {
  id: number; zone_name: string; frequency: string; cleaning_method: string
  products_used: string | null; assigned_role: string | null; is_active: boolean
}
interface CleaningOccurrenceRow {
  id: number; cleaning_plan_id: number; planned_date: string; status: 'realise' | 'non_realise' | 'en_retard'
  is_verified: boolean; anomalies_detected: string | null
  plan?: { id: number; zone_name: string; frequency: string }
  performed_by?: { id: number; name: string }
}
interface WithdrawalRow {
  id: number; equipment_id: number; request_date: string; withdrawal_reason: string
  destination: string; status: 'demande' | 'approuve' | 'rejete'; decided_at: string | null
  equipment?: { id: number; code: string; designation: string; status: string }
  requested_by?: { id: number; name: string }
  approved_by?: { id: number; name: string }
}
interface Kpis {
  total_equipments: number; in_service: number; in_maintenance: number
  out_of_order: number; withdrawn: number; critical_bpd_count: number
  overdue_maintenances: number
  generator_last_test: { date: string; result: string; fuel_level: string } | null
  cleaning_completion_rate: string; pending_withdrawals: number
}

/* ─── State ─── */
const base = '/locauxequipements'
const tab = ref<'overview' | 'equipments' | 'maintenance' | 'generator' | 'cleaning' | 'withdrawals'>('overview')
const loading = ref(false)
const error = ref('')

const kpis = ref<Kpis | null>(null)
const locations = ref<LocationRow[]>([])
const equipments = ref<EquipmentRow[]>([])
const maintenancePlans = ref<MaintenancePlanRow[]>([])
const maintenanceEvents = ref<MaintenanceEventRow[]>([])
const generatorTests = ref<GeneratorTestRow[]>([])
const cleaningPlans = ref<CleaningPlanRow[]>([])
const cleaningOccurrences = ref<CleaningOccurrenceRow[]>([])
const withdrawals = ref<WithdrawalRow[]>([])

// Filters
const searchEquipment = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')

// Modals
const showCreateEquipment = ref(false)
const showCommissioning = ref(false)
const showCreatePlan = ref(false)
const showCreateEvent = ref(false)
const showCreateGenTest = ref(false)
const showCreateCleanPlan = ref(false)
const showCreateCleanOcc = ref(false)
const showCreateWithdrawal = ref(false)
const showDetail = ref<EquipmentRow | null>(null)
const showDetailOpen = computed({
  get: () => showDetail.value !== null,
  set: (v: boolean) => { if (!v) showDetail.value = null },
})

// Forms
const eqForm = reactive({
  code: '', designation: '', category: 'froid', brand: '', model: '', serial_number: '',
  acquisition_year: new Date().getFullYear(), current_location_id: 0, criticality: 'critique_bpd', notes: '',
})
const commissionForm = reactive({
  equipment_id: 0, test_date: new Date().toISOString().slice(0, 10),
  electrical_safety_checked: true, functional_test_passed: true,
  temperature_conformity_passed: true, calibration_checked: true, staff_trained: true,
  decision: 'conforme', notes: '',
})
const maintPlanForm = reactive({
  equipment_id: 0, maintenance_type: 'preventive', frequency_days: 90,
  next_due_date: '', default_provider_name: '', instructions: '',
})
const maintEventForm = reactive({
  equipment_id: 0, maintenance_plan_id: null as number | null, intervention_type: 'preventive',
  intervention_date: new Date().toISOString().slice(0, 10), provider_name: '', technician_name: '',
  description: '', result: 'conforme', cost: 0,
})
const genTestForm = reactive({
  equipment_id: 0, test_date: new Date().toISOString().slice(0, 10), fuel_level_percent: 85,
  start_delay_seconds: 5, oil_level_ok: true, battery_voltage_ok: true, frequency_hz: 50.0,
  test_result: 'conforme', comment: '',
})
const cleanPlanForm = reactive({
  zone_name: '', frequency: 'quotidien', cleaning_method: '', products_used: '', assigned_role: '',
})
const cleanOccForm = reactive({
  cleaning_plan_id: 0, planned_date: new Date().toISOString().slice(0, 10), status: 'realise', anomalies_detected: '',
})
const withdrawalForm = reactive({
  equipment_id: 0, request_date: new Date().toISOString().slice(0, 10), withdrawal_reason: '', destination: 'reforme',
})

/* ─── API Calls ─── */
async function load(what: string) {
  loading.value = true; error.value = ''
  try {
    if (what === 'overview' || what === 'all') {
      const res = await request<{ kpis: Kpis }>(`${base}/overview`)
      kpis.value = res.kpis
    }
    if (what === 'equipments' || what === 'all') {
      const params = new URLSearchParams()
      if (searchEquipment.value) params.set('search', searchEquipment.value)
      if (categoryFilter.value) params.set('category', categoryFilter.value)
      if (statusFilter.value) params.set('status', statusFilter.value)
      const q = params.toString() ? `?${params}` : ''
      equipments.value = (await request<{ data: EquipmentRow[] }>(`${base}/equipments${q}`)).data
      locations.value = (await request<{ data: LocationRow[] }>(`${base}/locations`)).data
    }
    if (what === 'maintenance' || what === 'all') {
      maintenancePlans.value = (await request<{ data: MaintenancePlanRow[] }>(`${base}/maintenance-plans`)).data
      maintenanceEvents.value = (await request<{ data: MaintenanceEventRow[] }>(`${base}/maintenance-events`)).data
    }
    if (what === 'generator' || what === 'all') {
      generatorTests.value = (await request<{ data: GeneratorTestRow[] }>(`${base}/generator-tests`)).data
    }
    if (what === 'cleaning' || what === 'all') {
      cleaningPlans.value = (await request<{ data: CleaningPlanRow[] }>(`${base}/cleaning-plans`)).data
      cleaningOccurrences.value = (await request<{ data: CleaningOccurrenceRow[] }>(`${base}/cleaning-occurrences`)).data
    }
    if (what === 'withdrawals' || what === 'all') {
      withdrawals.value = (await request<{ data: WithdrawalRow[] }>(`${base}/withdrawals`)).data
    }
  } catch (e: any) { error.value = e.message || 'Erreur de chargement' }
  finally { loading.value = false }
}

async function createEquipment() {
  try {
    const payload = { ...eqForm, current_location_id: eqForm.current_location_id || null }
    await request(`${base}/equipments`, 'POST', payload)
    showCreateEquipment.value = false
    Object.assign(eqForm, { code: '', designation: '', brand: '', model: '', serial_number: '', notes: '' })
    await load('equipments'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function submitCommissioning() {
  try {
    await request(`${base}/equipments/${commissionForm.equipment_id}/commissioning`, 'POST', commissionForm)
    showCommissioning.value = false
    await load('equipments'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createMaintenancePlan() {
  try {
    await request(`${base}/maintenance-plans`, 'POST', maintPlanForm)
    showCreatePlan.value = false; await load('maintenance'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createMaintenanceEvent() {
  try {
    await request(`${base}/maintenance-events`, 'POST', maintEventForm)
    showCreateEvent.value = false; await load('maintenance'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function verifyMaintenance(id: number) {
  try {
    await request(`${base}/maintenance-events/${id}/verify`, 'POST')
    await load('maintenance')
  } catch (e: any) { error.value = e.message }
}

async function createGeneratorTest() {
  try {
    await request(`${base}/generator-tests`, 'POST', genTestForm)
    showCreateGenTest.value = false; await load('generator'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createCleaningPlan() {
  try {
    await request(`${base}/cleaning-plans`, 'POST', cleanPlanForm)
    showCreateCleanPlan.value = false; await load('cleaning')
  } catch (e: any) { error.value = e.message }
}

async function createCleaningOcc() {
  try {
    await request(`${base}/cleaning-occurrences`, 'POST', cleanOccForm)
    showCreateCleanOcc.value = false; await load('cleaning'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function verifyCleaning(id: number) {
  try {
    await request(`${base}/cleaning-occurrences/${id}/verify`, 'POST')
    await load('cleaning')
  } catch (e: any) { error.value = e.message }
}

async function createWithdrawal() {
  try {
    await request(`${base}/withdrawals`, 'POST', withdrawalForm)
    showCreateWithdrawal.value = false; await load('withdrawals'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function decideWithdrawal(id: number, decision: 'approuve' | 'rejete') {
  try {
    await request(`${base}/withdrawals/${id}/decision`, 'POST', { decision })
    await load('withdrawals'); await load('equipments'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function openDetail(e: EquipmentRow) {
  try {
    const detail = (await request<{ data: EquipmentRow }>(`${base}/equipments/${e.id}`)).data
    showDetail.value = detail
  } catch {
    showDetail.value = e
  }
}

/* ─── Helpers ─── */
const categoryLabel: Record<string, string> = {
  froid: 'Enceinte réfrigérée', climatisation: 'Climatisation', energie: 'Énergie / Secours',
  pesage: 'Balance / Pesage', informatique: 'Informatique & Réseau', securite: 'Sécurité & Alarme', autre: 'Autre',
}
const statusLabel: Record<string, string> = {
  en_service: 'En service', en_panne: 'En panne', en_maintenance: 'En maintenance', hors_service: 'Hors service',
}
const statusColor: Record<string, string> = {
  en_service: '#10b981', en_panne: '#ef4444', en_maintenance: '#f59e0b', hors_service: '#6b7280',
}

function onTab(t: typeof tab.value) { tab.value = t; load(t) }

onMounted(() => load('overview'))
</script>

<template>
  <div class="module-page">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1 class="font-display text-2xl font-bold">Équipements & Locaux</h1>
        <p class="accent-serif text-gray-500">Module 09 — Matériel BPD, maintenance, groupe électrogène, hygiène & retraits</p>
      </div>
    </header>

    <!-- Tabs -->
    <nav class="tab-bar">
      <button v-for="t in [
        { key: 'overview', label: 'Vue d\'ensemble', icon: 'chart-bar' },
        { key: 'equipments', label: 'Inventaire Matériel', icon: 'box' },
        { key: 'maintenance', label: 'Maintenance & Étalonnage', icon: 'wrench' },
        { key: 'generator', label: 'Groupe Électrogène', icon: 'bolt' },
        { key: 'cleaning', label: 'Hygiène & Nettoyage', icon: 'sparkles' },
        { key: 'withdrawals', label: 'Retrait / Réforme', icon: 'archive-box-x-mark' },
      ]" :key="t.key" :class="['tab-btn', { active: tab === t.key }]" @click="onTab(t.key as any)">
        <AppIcon :name="t.icon" class="tab-icon" /> {{ t.label }}
      </button>
    </nav>

    <!-- Error -->
    <div v-if="error" class="err-banner" @click="error = ''">⚠️ {{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="loading-bar"><div class="loading-track" /></div>

    <!-- ═══════════ OVERVIEW ═══════════ -->
    <section v-if="tab === 'overview'" class="content-section">
      <div v-if="kpis" class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ kpis.total_equipments }}</span><span class="kpi-label">Total équipements</span></div>
        <div class="kpi-card green"><span class="kpi-value">{{ kpis.in_service }}</span><span class="kpi-label">En service</span></div>
        <div class="kpi-card red" v-if="kpis.out_of_order > 0"><span class="kpi-value">{{ kpis.out_of_order }}</span><span class="kpi-label">En panne</span></div>
        <div class="kpi-card orange" v-if="kpis.in_maintenance > 0"><span class="kpi-value">{{ kpis.in_maintenance }}</span><span class="kpi-label">En maintenance</span></div>
        <div class="kpi-card blue"><span class="kpi-value">{{ kpis.critical_bpd_count }}</span><span class="kpi-label">Critiques BPD</span></div>
        <div class="kpi-card" :class="{ red: kpis.overdue_maintenances > 0 }"><span class="kpi-value">{{ kpis.overdue_maintenances }}</span><span class="kpi-label">Maintenances en retard</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ kpis.cleaning_completion_rate }}</span><span class="kpi-label">Nettoyage ce mois</span></div>
        <div class="kpi-card" :class="{ orange: kpis.pending_withdrawals > 0 }"><span class="kpi-value">{{ kpis.pending_withdrawals }}</span><span class="kpi-label">Retraits en attente</span></div>
      </div>

      <!-- Alerte Groupe Électrogène -->
      <div v-if="kpis?.generator_last_test" class="alert-box">
        <h3>⚡ État du Groupe Électrogène de Secours</h3>
        <p class="text-sm">
          Dernier test réalisé le <strong>{{ kpis.generator_last_test.date }}</strong> — Résultat :
          <span class="badge" :class="kpis.generator_last_test.result">{{ kpis.generator_last_test.result }}</span>
          — Niveau de carburant : <strong>{{ kpis.generator_last_test.fuel_level }}</strong>
        </p>
      </div>
    </section>

    <!-- ═══════════ EQUIPMENTS ═══════════ -->
    <section v-if="tab === 'equipments'" class="content-section">
      <div class="section-toolbar">
        <input v-model="searchEquipment" type="text" placeholder="Rechercher code, désignation…" class="search-input" @input="load('equipments')" />
        <select v-model="categoryFilter" class="filter-select" @change="load('equipments')">
          <option value="">Toutes les catégories</option>
          <option value="froid">Froid (2-8°C)</option>
          <option value="climatisation">Climatisation</option>
          <option value="energie">Énergie / Secours</option>
          <option value="pesage">Pesage</option>
          <option value="informatique">Informatique</option>
        </select>
        <select v-model="statusFilter" class="filter-select" @change="load('equipments')">
          <option value="">Tous les statuts</option>
          <option value="en_service">En service</option>
          <option value="en_panne">En panne</option>
          <option value="en_maintenance">En maintenance</option>
          <option value="hors_service">Hors service</option>
        </select>
        <button class="btn-primary" @click="showCreateEquipment = true">+ Nouvel équipement</button>
      </div>

      <table v-if="equipments.length" class="data-table">
        <thead><tr><th>Code</th><th>Désignation</th><th>Catégorie</th><th>Emplacement</th><th>Criticité</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="e in equipments" :key="e.id" class="clickable-row" @click="openDetail(e)">
            <td class="font-mono text-sm font-bold">{{ e.code }}</td>
            <td><strong>{{ e.designation }}</strong> <span v-if="e.brand" class="text-xs text-gray-500">({{ e.brand }} {{ e.model || '' }})</span></td>
            <td>{{ categoryLabel[e.category] || e.category }}</td>
            <td>{{ e.location?.name || 'Non assigné' }}</td>
            <td><span class="badge" :class="e.criticality">{{ e.criticality === 'critique_bpd' ? 'Critique BPD' : 'Standard' }}</span></td>
            <td><span class="status-pill" :style="{ background: statusColor[e.status] + '20', color: statusColor[e.status] }">{{ statusLabel[e.status] || e.status }}</span></td>
            <td @click.stop>
              <button class="btn-sm btn-blue" @click="commissionForm.equipment_id = e.id; showCommissioning = true">Mise en service</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun équipement enregistré. Cliquez sur « + Nouvel équipement ».</p>
    </section>

    <!-- ═══════════ MAINTENANCE ═══════════ -->
    <section v-if="tab === 'maintenance'" class="content-section">
      <div class="section-toolbar">
        <h3>Maintenances & Étalonnages</h3>
        <button class="btn-secondary" @click="showCreatePlan = true">+ Programmer maintenance</button>
        <button class="btn-primary" @click="showCreateEvent = true">+ Consigner intervention</button>
      </div>

      <h4 class="subhead mt-4">Interventions récentes</h4>
      <table v-if="maintenanceEvents.length" class="data-table">
        <thead><tr><th>Date</th><th>Équipement</th><th>Type</th><th>Prestataire</th><th>Résultat</th><th>Vérification</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="m in maintenanceEvents" :key="m.id">
            <td>{{ m.intervention_date }}</td>
            <td><strong>{{ m.equipment?.code }}</strong> — {{ m.equipment?.designation }}</td>
            <td>{{ m.intervention_type }}</td>
            <td>{{ m.provider_name || 'Interne' }}</td>
            <td><span class="badge" :class="m.result">{{ m.result }}</span></td>
            <td>
              <span v-if="m.is_verified" class="badge-verified">✓ Vérifié Titulaire</span>
              <span v-else class="badge-unverified">En attente vérification</span>
            </td>
            <td>
              <button v-if="!m.is_verified" class="btn-sm btn-green" @click="verifyMaintenance(m.id)">Vérifier</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune intervention enregistrée.</p>
    </section>

    <!-- ═══════════ GENERATOR ═══════════ -->
    <section v-if="tab === 'generator'" class="content-section">
      <div class="section-toolbar">
        <h3>Tests périodiques du Groupe Électrogène (Secours)</h3>
        <button class="btn-primary" @click="showCreateGenTest = true">+ Enregistrer un test</button>
      </div>

      <table v-if="generatorTests.length" class="data-table">
        <thead><tr><th>Date</th><th>Groupe</th><th>Carburant</th><th>Délai démarrage</th><th>Résultat</th><th>Testé par</th></tr></thead>
        <tbody>
          <tr v-for="g in generatorTests" :key="g.id">
            <td>{{ g.test_date }}</td>
            <td><strong>{{ g.equipment?.code }}</strong></td>
            <td><strong :class="{ 'text-red-600': g.fuel_level_percent < 25 }">{{ g.fuel_level_percent }}%</strong></td>
            <td>{{ g.start_delay_seconds }}s</td>
            <td><span class="badge" :class="g.test_result">{{ g.test_result }}</span></td>
            <td>{{ g.tested_by?.name || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun test de groupe électrogène enregistré.</p>
    </section>

    <!-- ═══════════ CLEANING ═══════════ -->
    <section v-if="tab === 'cleaning'" class="content-section">
      <div class="section-toolbar">
        <h3>Hygiène & Plan de Nettoyage des Locaux</h3>
        <button class="btn-secondary" @click="showCreateCleanPlan = true">+ Définir zone</button>
        <button class="btn-primary" @click="showCreateCleanOcc = true">+ Valider nettoyage</button>
      </div>

      <h4 class="subhead mt-4">Occurrences de nettoyage</h4>
      <table v-if="cleaningOccurrences.length" class="data-table">
        <thead><tr><th>Date</th><th>Zone</th><th>Statut</th><th>Anomalies</th><th>Vérifié</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="c in cleaningOccurrences" :key="c.id">
            <td>{{ c.planned_date }}</td>
            <td><strong>{{ c.plan?.zone_name }}</strong> ({{ c.plan?.frequency }})</td>
            <td><span class="badge" :class="c.status">{{ c.status }}</span></td>
            <td>{{ c.anomalies_detected || 'Aucune' }}</td>
            <td>
              <span v-if="c.is_verified" class="badge-verified">✓ Vérifié</span>
              <span v-else class="text-xs text-gray-400">Non vérifié</span>
            </td>
            <td>
              <button v-if="!c.is_verified" class="btn-sm btn-green" @click="verifyCleaning(c.id)">Vérifier</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun passage de nettoyage enregistré.</p>
    </section>

    <!-- ═══════════ WITHDRAWALS ═══════════ -->
    <section v-if="tab === 'withdrawals'" class="content-section">
      <div class="section-toolbar">
        <h3>Retrait & Mise hors service d'Équipement</h3>
        <button class="btn-primary" @click="showCreateWithdrawal = true">+ Demander retrait</button>
      </div>

      <table v-if="withdrawals.length" class="data-table">
        <thead><tr><th>Date</th><th>Équipement</th><th>Motif</th><th>Destination</th><th>Statut</th><th>Décision</th></tr></thead>
        <tbody>
          <tr v-for="w in withdrawals" :key="w.id">
            <td>{{ w.request_date }}</td>
            <td><strong>{{ w.equipment?.code }}</strong> — {{ w.equipment?.designation }}</td>
            <td>{{ w.withdrawal_reason }}</td>
            <td>{{ w.destination }}</td>
            <td><span class="badge" :class="w.status">{{ w.status }}</span></td>
            <td>
              <template v-if="w.status === 'demande'">
                <button class="btn-sm btn-green" @click="decideWithdrawal(w.id, 'approuve')">✓ Approuver</button>
                <button class="btn-sm btn-red" @click="decideWithdrawal(w.id, 'rejete')">✗ Rejeter</button>
              </template>
              <span v-else class="text-xs text-gray-500">{{ w.status === 'approuve' ? 'Approuvé par Titulaire' : 'Rejeté' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune demande de retrait enregistrée.</p>
    </section>

    <!-- ═══════════ MODALS ═══════════ -->

    <!-- Modal: Créer Équipement -->
    <AppModal v-model="showCreateEquipment" title="Nouvel équipement">
      <form @submit.prevent="createEquipment" class="modal-form">
        <div class="form-row"><label>Code (ex: FRIGO-01, CLIM-02)</label><input v-model="eqForm.code" required /></div>
        <div class="form-row"><label>Désignation</label><input v-model="eqForm.designation" required /></div>
        <div class="form-row"><label>Catégorie</label>
          <select v-model="eqForm.category">
            <option value="froid">Froid (2-8°C)</option>
            <option value="climatisation">Climatisation</option>
            <option value="energie">Énergie / Groupe</option>
            <option value="pesage">Pesage</option>
            <option value="informatique">Informatique</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="form-row"><label>Marque</label><input v-model="eqForm.brand" /></div>
        <div class="form-row"><label>Modèle</label><input v-model="eqForm.model" /></div>
        <div class="form-row"><label>Numéro de série</label><input v-model="eqForm.serial_number" /></div>
        <div class="form-row"><label>Emplacement initial</label>
          <select v-model.number="eqForm.current_location_id">
            <option :value="0">— Non assigné —</option>
            <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
          </select>
        </div>
        <div class="form-row"><label>Criticité BPD</label>
          <select v-model="eqForm.criticality">
            <option value="critique_bpd">Critique BPD (Froid, Balance, Groupe)</option>
            <option value="standard">Standard</option>
          </select>
        </div>
        <button type="submit" class="btn-primary mt-4">Enregistrer équipement</button>
      </form>
    </AppModal>

    <!-- Modal: Mise en service -->
    <AppModal v-model="showCommissioning" title="Fiche de mise en service (CDC 3.2)">
      <form @submit.prevent="submitCommissioning" class="modal-form">
        <div class="form-row"><label>Date de mise en service</label><input v-model="commissionForm.test_date" type="date" required /></div>
        <div class="form-check"><input type="checkbox" v-model="commissionForm.electrical_safety_checked" /> Sécurité électrique vérifiée</div>
        <div class="form-check"><input type="checkbox" v-model="commissionForm.functional_test_passed" /> Tests de fonctionnement réussis</div>
        <div class="form-check"><input type="checkbox" v-model="commissionForm.temperature_conformity_passed" /> Conformité thermo-hygrométrique vérifiée</div>
        <div class="form-check"><input type="checkbox" v-model="commissionForm.calibration_checked" /> Étalonnage / Certificat vérifié</div>
        <div class="form-check"><input type="checkbox" v-model="commissionForm.staff_trained" /> Personnel habilité et formé</div>
        <div class="form-row mt-2"><label>Décision finale</label>
          <select v-model="commissionForm.decision">
            <option value="conforme">Conforme (Autorise la mise en service)</option>
            <option value="avec_reserve">Avec réserve</option>
            <option value="non_conforme">Non conforme (Bloqué)</option>
          </select>
        </div>
        <button type="submit" class="btn-primary mt-4">Valider la mise en service</button>
      </form>
    </AppModal>

    <!-- Modal: Consigner Intervention -->
    <AppModal v-model="showCreateEvent" title="Consigner une intervention de maintenance">
      <form @submit.prevent="createMaintenanceEvent" class="modal-form">
        <div class="form-row"><label>Équipement</label>
          <select v-model.number="maintEventForm.equipment_id" required>
            <option :value="0" disabled>— Sélectionner équipement —</option>
            <option v-for="e in equipments" :key="e.id" :value="e.id">{{ e.code }} — {{ e.designation }}</option>
          </select>
        </div>
        <div class="form-row"><label>Type d'intervention</label>
          <select v-model="maintEventForm.intervention_type">
            <option value="preventive">Préventive</option>
            <option value="curative">Curative</option>
            <option value="etalonnage">Étalonnage / Métrologie</option>
          </select>
        </div>
        <div class="form-row"><label>Date</label><input v-model="maintEventForm.intervention_date" type="date" required /></div>
        <div class="form-row"><label>Prestataire / Société</label><input v-model="maintEventForm.provider_name" /></div>
        <div class="form-row"><label>Description de l'intervention</label><textarea v-model="maintEventForm.description" required rows="2" /></div>
        <div class="form-row"><label>Résultat</label>
          <select v-model="maintEventForm.result">
            <option value="conforme">Conforme</option>
            <option value="a_surveiller">À surveiller</option>
            <option value="non_conforme">Non conforme (Crée une action CAPA)</option>
          </select>
        </div>
        <div class="form-row"><label>Coût (FCFA)</label><input v-model.number="maintEventForm.cost" type="number" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer intervention</button>
      </form>
    </AppModal>

    <!-- Modal: Test Groupe -->
    <AppModal v-model="showCreateGenTest" title="Enregistrer un test groupe électrogène">
      <form @submit.prevent="createGeneratorTest" class="modal-form">
        <div class="form-row"><label>Groupe électrogène</label>
          <select v-model.number="genTestForm.equipment_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="e in equipments.filter(x => x.category === 'energie')" :key="e.id" :value="e.id">{{ e.code }} — {{ e.designation }}</option>
          </select>
        </div>
        <div class="form-row"><label>Niveau carburant (%)</label><input v-model.number="genTestForm.fuel_level_percent" type="number" min="0" max="100" required /></div>
        <div class="form-row"><label>Délai démarrage (secondes)</label><input v-model.number="genTestForm.start_delay_seconds" type="number" required /></div>
        <div class="form-check"><input type="checkbox" v-model="genTestForm.oil_level_ok" /> Niveau d'huile OK</div>
        <div class="form-check"><input type="checkbox" v-model="genTestForm.battery_voltage_ok" /> Tension batterie OK</div>
        <div class="form-row"><label>Résultat</label>
          <select v-model="genTestForm.test_result">
            <option value="conforme">Conforme</option>
            <option value="reserve">Avec réserve</option>
            <option value="echec">Échec (Crée une action d'urgence)</option>
          </select>
        </div>
        <button type="submit" class="btn-primary mt-4">Enregistrer test</button>
      </form>
    </AppModal>

    <!-- Modal: Demander retrait -->
    <AppModal v-model="showCreateWithdrawal" title="Demande de retrait / mise hors service">
      <form @submit.prevent="createWithdrawal" class="modal-form">
        <div class="form-row"><label>Équipement</label>
          <select v-model.number="withdrawalForm.equipment_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="e in equipments.filter(x => x.status !== 'hors_service')" :key="e.id" :value="e.id">{{ e.code }} — {{ e.designation }}</option>
          </select>
        </div>
        <div class="form-row"><label>Motif du retrait</label><textarea v-model="withdrawalForm.withdrawal_reason" required rows="2" /></div>
        <div class="form-row"><label>Destination</label>
          <select v-model="withdrawalForm.destination">
            <option value="reforme">Réforme</option>
            <option value="destruction">Destruction</option>
            <option value="retour_fournisseur">Retour fournisseur</option>
            <option value="stockage_mort">Stockage mort</option>
          </select>
        </div>
        <p class="text-xs text-gray-500 mt-2">ℹ️ La mise hors service définitive requiert l'approbation du Pharmacien Titulaire.</p>
        <button type="submit" class="btn-primary mt-4">Soumettre la demande</button>
      </form>
    </AppModal>

    <!-- Modal: Détail Équipement & Historique Emplacement -->
    <AppModal v-model="showDetailOpen" :title="showDetail ? `${showDetail.code} — ${showDetail.designation}` : ''">
      <div v-if="showDetail" class="detail-content">
        <div class="detail-grid">
          <div><span class="detail-label">Catégorie</span><span class="detail-value">{{ categoryLabel[showDetail.category] }}</span></div>
          <div><span class="detail-label">Statut</span><span class="status-pill" :style="{ background: statusColor[showDetail.status] + '20', color: statusColor[showDetail.status] }">{{ statusLabel[showDetail.status] }}</span></div>
          <div><span class="detail-label">Emplacement</span><span class="detail-value">{{ showDetail.location?.name || 'Non assigné' }}</span></div>
          <div><span class="detail-label">Criticité</span><span class="badge" :class="showDetail.criticality">{{ showDetail.criticality }}</span></div>
        </div>

        <div v-if="showDetail.location_histories?.length" class="mt-4">
          <strong class="text-sm">Historique des déplacements (CDC 7) :</strong>
          <ul class="text-sm mt-1 history-list">
            <li v-for="h in showDetail.location_histories" :key="h.id">
              📍 <strong>{{ h.location?.name }}</strong> — {{ h.moved_at.slice(0, 10) }}
              <span v-if="h.reason" class="text-xs text-gray-500">({{ h.reason }})</span>
            </li>
          </ul>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.module-page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 1.5rem; }

.tab-bar { display: flex; gap: 0.25rem; border-bottom: 2px solid #e5e7eb; margin-bottom: 1.5rem; overflow-x: auto; }
.tab-btn { padding: 0.6rem 1rem; border: none; background: none; cursor: pointer; font-size: 0.85rem; color: #6b7280; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; }
.tab-btn:hover { color: #1f2937; background: #f9fafb; }
.tab-btn.active { color: #1a73e8; border-bottom-color: #1a73e8; font-weight: 600; }
.tab-icon { width: 16px; height: 16px; }

.err-banner { background: #fef2f2; color: #991b1b; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; cursor: pointer; font-size: 0.875rem; }
.loading-bar { height: 3px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 1rem; }
.loading-track { width: 30%; height: 100%; background: #1a73e8; animation: load 1s infinite ease-in-out; }
@keyframes load { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }

.content-section { animation: fadein 0.2s; }
@keyframes fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

/* KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; align-items: center; text-align: center; }
.kpi-card.green { border-left: 4px solid #10b981; }
.kpi-card.blue { border-left: 4px solid #3b82f6; }
.kpi-card.orange { border-left: 4px solid #f59e0b; }
.kpi-card.red { border-left: 4px solid #ef4444; }
.kpi-value { font-size: 1.75rem; font-weight: 700; color: #1f2937; }
.kpi-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }

.alert-box { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; }
.alert-box h3 { font-size: 0.95rem; margin: 0 0 0.5rem; }

.subhead { font-size: 0.95rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem; }

/* Toolbar */
.section-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.section-toolbar h3 { margin: 0; font-size: 1rem; flex: 1; }
.search-input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; min-width: 200px; }
.filter-select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }

/* Table */
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 0.6rem; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.data-table td { padding: 0.6rem; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; transition: background 0.1s; }
.clickable-row:hover { background: #f9fafb; }

.status-pill { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.badge { font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600; text-transform: capitalize; }
.badge.conforme, .badge.realise, .badge.approuve { background: #d1fae5; color: #065f46; }
.badge.non_conforme, .badge.echec, .badge.rejete { background: #fee2e2; color: #991b1b; }
.badge.a_surveiller, .badge.reserve, .badge.en_retard { background: #fef3c7; color: #92400e; }
.badge.critique_bpd { background: #fee2e2; color: #b91c1c; font-weight: 700; }
.badge.standard { background: #f3f4f6; color: #4b5563; }
.badge.demande { background: #dbeafe; color: #1e40af; }

.badge-verified { font-size: 0.75rem; color: #059669; font-weight: 600; }
.badge-unverified { font-size: 0.75rem; color: #d97706; }

.empty-state { text-align: center; color: #9ca3af; padding: 3rem 1rem; font-size: 0.9rem; }

/* Buttons */
.btn-primary { padding: 0.5rem 1.15rem; background: #1a73e8; color: #fff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #1557b0; }
.btn-secondary { padding: 0.5rem 1rem; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-secondary:hover { background: #e5e7eb; }
.btn-sm { padding: 0.25rem 0.6rem; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-right: 0.25rem; }
.btn-green { background: #d1fae5; color: #065f46; }
.btn-green:hover { background: #a7f3d0; }
.btn-red { background: #fee2e2; color: #991b1b; }
.btn-red:hover { background: #fecaca; }
.btn-blue { background: #dbeafe; color: #1e40af; }
.btn-blue:hover { background: #bfdbfe; }

/* Modal form */
.modal-form { display: flex; flex-direction: column; gap: 0.6rem; max-height: 65vh; overflow-y: auto; }
.form-row { display: flex; flex-direction: column; gap: 0.2rem; }
.form-row label { font-size: 0.75rem; font-weight: 600; color: #374151; }
.form-row input, .form-row select, .form-row textarea { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }
.form-check { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }

/* Detail */
.detail-content { font-size: 0.85rem; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.detail-label { font-size: 0.7rem; text-transform: uppercase; color: #6b7280; display: block; }
.detail-value { font-weight: 500; }
.history-list { list-style: none; padding: 0; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
</style>
