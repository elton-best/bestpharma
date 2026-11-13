<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { demoMode, request as liveRequest } from '@/services/quality'
import { boardRequest } from '@/services/cdcBoardsDemo'
const request = demoMode ? boardRequest : liveRequest

/* ─── Types ─── */
interface EmployeeRow {
  id: number; matricule: string; first_name: string; last_name: string
  email: string | null; phone: string | null; role_title: string
  contract_type: 'CDI' | 'CDD' | 'Stage' | 'Prestataire'
  hire_date: string; status: 'actif' | 'conge' | 'suspendu' | 'quitte'
  ordre_b_number: string | null; ordre_b_expiry: string | null
  qualifications: string[] | null; emergency_contact: string | null; version: number
}
interface LeaveRequestRow {
  id: number; employee_id: number; leave_type: string
  start_date: string; end_date: string; days_count: number
  reason: string | null; status: string; decision_notes: string | null
  employee?: { id: number; matricule: string; first_name: string; last_name: string; role_title: string }
  approver?: { id: number; name: string }
}
interface ShiftRow {
  id: number; employee_id: number; shift_type: string; shift_date: string
  start_time: string; end_time: string; status: string; notes: string | null
  employee?: { id: number; matricule: string; first_name: string; last_name: string; role_title: string }
}
interface TrainingPlanRow {
  id: number; year: number; theme: string; description: string | null
  trainer_organization: string | null; training_type: string
  duration_hours: number; target_audience: string | null; status: string
  sessions?: TrainingSessionRow[]
}
interface TrainingSessionRow {
  id: number; session_date: string; start_time: string | null; end_time: string | null
  location: string | null; trainer_name: string | null; status: string
  attendances?: { employee_id: number; presence_status: string; score: number | null; employee?: { id: number; matricule: string; first_name: string; last_name: string } }[]
}
interface PerformanceReviewRow {
  id: number; employee_id: number; review_type: string; review_period: string
  review_date: string; criteria_scores: { criterion: string; score: number; weight?: number; comment?: string }[]
  overall_score: number; strengths: string | null; improvements: string | null
  status: string; employee?: { id: number; matricule: string; first_name: string; last_name: string; role_title: string }
  reviewer?: { id: number; name: string }
}
interface Kpis {
  total_employees: number; active_employees: number; on_leave_employees: number
  total_job_descriptions: number; pending_leaves: number; shifts_this_month: number
  plans_this_year: number; training_completion_rate: string; expiring_credentials_count: number
}
interface ExpiringCredential { id: number; first_name: string; last_name: string; role_title: string; ordre_b_number: string; ordre_b_expiry: string }

/* ─── State ─── */
const base = '/personnel'
const tab = ref<'overview' | 'employees' | 'leaves' | 'shifts' | 'training' | 'reviews'>('overview')
const loading = ref(false)
const error = ref('')

const kpis = ref<Kpis | null>(null)
const expiringCredentials = ref<ExpiringCredential[]>([])
const employees = ref<EmployeeRow[]>([])
const leaveRequests = ref<LeaveRequestRow[]>([])
const shifts = ref<ShiftRow[]>([])
const trainingPlans = ref<TrainingPlanRow[]>([])
const reviews = ref<PerformanceReviewRow[]>([])

// Filters
const searchEmployee = ref('')
const statusFilter = ref('')

// Modals
const showCreateEmployee = ref(false)
const showCreateLeave = ref(false)
const showCreateShift = ref(false)
const showCreatePlan = ref(false)
const showCreateReview = ref(false)
const showDetail = ref<EmployeeRow | null>(null)
const showDetailOpen = computed({
  get: () => showDetail.value !== null,
  set: (v: boolean) => { if (!v) showDetail.value = null },
})

// Forms
const empForm = reactive({
  matricule: '', first_name: '', last_name: '', email: '', phone: '',
  role_title: '', contract_type: 'CDI' as string, hire_date: '',
  ordre_b_number: '', ordre_b_expiry: '', emergency_contact: '',
})
const leaveForm = reactive({
  employee_id: 0, leave_type: 'conge_annuel', start_date: '', end_date: '', days_count: 1, reason: '',
})
const shiftForm = reactive({
  employee_id: 0, shift_type: 'jour', shift_date: '', start_time: '08:00', end_time: '16:00', notes: '',
})
const planForm = reactive({
  year: new Date().getFullYear(), theme: '', description: '', training_type: 'interne_bpd',
  duration_hours: 2, trainer_organization: '', target_audience: '',
})
const reviewForm = reactive({
  employee_id: 0, review_type: 'non_cadre', review_period: `Année ${new Date().getFullYear()}`,
  review_date: '', criteria_scores: [{ criterion: '', score: 0 }] as { criterion: string; score: number }[],
  overall_score: 0, strengths: '', improvements: '', action_plan: '',
})

/* ─── API Calls ─── */
async function load(what: string) {
  loading.value = true; error.value = ''
  try {
    if (what === 'overview' || what === 'all') {
      const res = await request<{ kpis: Kpis; expiring_credentials: ExpiringCredential[] }>(`${base}/overview`)
      kpis.value = res.kpis; expiringCredentials.value = res.expiring_credentials
    }
    if (what === 'employees' || what === 'all') {
      const params = new URLSearchParams()
      if (searchEmployee.value) params.set('search', searchEmployee.value)
      if (statusFilter.value) params.set('status', statusFilter.value)
      const q = params.toString() ? `?${params}` : ''
      employees.value = (await request<{ data: EmployeeRow[] }>(`${base}/employees${q}`)).data
    }
    if (what === 'leaves' || what === 'all') {
      leaveRequests.value = (await request<{ data: LeaveRequestRow[] }>(`${base}/leave-requests`)).data
    }
    if (what === 'shifts' || what === 'all') {
      shifts.value = (await request<{ data: ShiftRow[] }>(`${base}/shifts`)).data
    }
    if (what === 'training' || what === 'all') {
      trainingPlans.value = (await request<{ data: TrainingPlanRow[] }>(`${base}/training-plans`)).data
    }
    if (what === 'reviews' || what === 'all') {
      reviews.value = (await request<{ data: PerformanceReviewRow[] }>(`${base}/performance-reviews`)).data
    }
  } catch (e: any) { error.value = e.message || 'Erreur de chargement' }
  finally { loading.value = false }
}

async function createEmployee() {
  try {
    await request(`${base}/employees`, 'POST', empForm)
    showCreateEmployee.value = false; Object.assign(empForm, { matricule: '', first_name: '', last_name: '', email: '', phone: '', role_title: '', contract_type: 'CDI', hire_date: '', ordre_b_number: '', ordre_b_expiry: '', emergency_contact: '' })
    await load('employees'); await load('overview')
  } catch (e: any) { error.value = e.message }
}
async function createLeaveRequest() {
  try {
    await request(`${base}/leave-requests`, 'POST', leaveForm)
    showCreateLeave.value = false; await load('leaves')
  } catch (e: any) { error.value = e.message }
}
async function decideLeave(id: number, decision: 'approuve' | 'refuse') {
  try {
    await request(`${base}/leave-requests/${id}/decision`, 'POST', { decision })
    await load('leaves')
  } catch (e: any) { error.value = e.message }
}
async function createShift() {
  try {
    await request(`${base}/shifts`, 'POST', shiftForm)
    showCreateShift.value = false; await load('shifts')
  } catch (e: any) { error.value = e.message }
}
async function createTrainingPlan() {
  try {
    await request(`${base}/training-plans`, 'POST', planForm)
    showCreatePlan.value = false; await load('training')
  } catch (e: any) { error.value = e.message }
}
async function createReview() {
  try {
    await request(`${base}/performance-reviews`, 'POST', reviewForm)
    showCreateReview.value = false; await load('reviews')
  } catch (e: any) { error.value = e.message }
}

/* ─── Computed ─── */
const filteredEmployees = computed(() => employees.value)
const pendingLeaves = computed(() => leaveRequests.value.filter(l => l.status === 'soumis'))

/* ─── Helpers ─── */
const statusLabel: Record<string, string> = { actif: 'Actif', conge: 'En congé', suspendu: 'Suspendu', quitte: 'Parti' }
const statusColor: Record<string, string> = { actif: '#10b981', conge: '#3b82f6', suspendu: '#f59e0b', quitte: '#9ca3af' }
const leaveStatusLabel: Record<string, string> = { brouillon: 'Brouillon', soumis: 'En attente', approuve: 'Approuvé', refuse: 'Refusé', annule: 'Annulé' }
const leaveStatusColor: Record<string, string> = { brouillon: '#9ca3af', soumis: '#f59e0b', approuve: '#10b981', refuse: '#ef4444', annule: '#6b7280' }
const shiftTypeLabel: Record<string, string> = { jour: 'Jour', garde_nuit: 'Garde nuit', garde_dimanche: 'Garde dimanche', astreinte: 'Astreinte' }
const trainingTypeLabel: Record<string, string> = { interne_bpd: 'Interne BPD', externe: 'Externe', securite_incendie: 'Sécurité incendie', pharmacovigilance: 'Pharmacovigilance' }

const sections: { key: typeof tab.value; label: string }[] = [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'employees', label: 'Effectif' },
  { key: 'leaves', label: 'Congés & Absences' },
  { key: 'shifts', label: 'Planning' },
  { key: 'training', label: 'Formations' },
  { key: 'reviews', label: 'Évaluations' },
]

function onTab(t: string) {
  const next = t as typeof tab.value
  tab.value = next
  load(next)
}

onMounted(() => load('overview'))
</script>

<template>
  <div class="module-page">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1 class="font-display text-2xl font-bold">Personnel & Formations</h1>
      </div>
    </header>

    <label class="section-filter">Section
      <select :value="tab" @change="onTab(($event.target as HTMLSelectElement).value)">
        <option v-for="t in sections" :key="t.key" :value="t.key">{{ t.label }}</option>
      </select>
    </label>

    <!-- Error -->
    <div v-if="error" class="err-banner" @click="error = ''"><AppIcon name="warning" :size="16" /> {{ error }}</div>

    <!-- Loading -->
    <div v-if="loading" class="loading-bar"><div class="loading-track" /></div>

    <!-- ═══════════ OVERVIEW ═══════════ -->
    <section v-if="tab === 'overview'" class="content-section">
      <div v-if="kpis" class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ kpis.total_employees }}</span><span class="kpi-label">Total effectif</span></div>
        <div class="kpi-card green"><span class="kpi-value">{{ kpis.active_employees }}</span><span class="kpi-label">En activité</span></div>
        <div class="kpi-card blue"><span class="kpi-value">{{ kpis.on_leave_employees }}</span><span class="kpi-label">En congé</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ kpis.total_job_descriptions }}</span><span class="kpi-label">Fiches de poste</span></div>
        <div class="kpi-card orange"><span class="kpi-value">{{ kpis.pending_leaves }}</span><span class="kpi-label">Congés en attente</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ kpis.shifts_this_month }}</span><span class="kpi-label">Créneaux ce mois</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ kpis.plans_this_year }}</span><span class="kpi-label">Plans formation</span></div>
        <div class="kpi-card" :class="{ green: kpis.training_completion_rate !== 'non disponible' }"><span class="kpi-value">{{ kpis.training_completion_rate }}</span><span class="kpi-label">Taux réalisation</span></div>
      </div>

      <!-- Alertes habilitations -->
      <div v-if="expiringCredentials.length" class="alert-box">
        <h3><AppIcon name="bell" :size="18" /> Habilitations expirant sous 30 jours</h3>
        <div v-for="c in expiringCredentials" :key="c.id" class="alert-row">
          <strong>{{ c.first_name }} {{ c.last_name }}</strong> — {{ c.role_title }}
          <span class="badge-warn">Ordre B {{ c.ordre_b_number }} → {{ c.ordre_b_expiry }}</span>
        </div>
      </div>
      <p v-else-if="kpis" class="text-sm text-gray-500 mt-4"><AppIcon name="check" :size="16" /> Aucune habilitation n'expire sous 30 jours.</p>
    </section>

    <!-- ═══════════ EMPLOYEES ═══════════ -->
    <section v-if="tab === 'employees'" class="content-section">
      <div class="section-toolbar">
        <input v-model="searchEmployee" type="text" placeholder="Rechercher nom, matricule, poste…" class="search-input" @input="load('employees')" />
        <select v-model="statusFilter" class="filter-select" @change="load('employees')">
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="conge">En congé</option>
          <option value="suspendu">Suspendu</option>
          <option value="quitte">Parti</option>
        </select>
        <button class="btn-primary" @click="showCreateEmployee = true">+ Nouveau salarié</button>
      </div>

      <table v-if="filteredEmployees.length" class="data-table">
        <thead><tr><th>Matricule</th><th>Nom complet</th><th>Poste</th><th>Contrat</th><th>Embauche</th><th>Statut</th><th>Ordre B</th></tr></thead>
        <tbody>
          <tr v-for="e in filteredEmployees" :key="e.id" class="clickable-row" @click="showDetail = e">
            <td class="font-mono text-sm">{{ e.matricule }}</td>
            <td><strong>{{ e.last_name }} {{ e.first_name }}</strong></td>
            <td>{{ e.role_title }}</td>
            <td>{{ e.contract_type }}</td>
            <td>{{ e.hire_date }}</td>
            <td><span class="status-pill" :style="{ background: statusColor[e.status] + '20', color: statusColor[e.status] }">{{ statusLabel[e.status] || e.status }}</span></td>
            <td>{{ e.ordre_b_number || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun salarié enregistré. Cliquez sur « + Nouveau salarié » pour commencer.</p>
    </section>

    <!-- ═══════════ LEAVES ═══════════ -->
    <section v-if="tab === 'leaves'" class="content-section">
      <div class="section-toolbar">
        <h3>Demandes de congés & absences</h3>
        <button class="btn-primary" @click="showCreateLeave = true">+ Nouvelle demande</button>
      </div>

      <table v-if="leaveRequests.length" class="data-table">
        <thead><tr><th>Salarié</th><th>Type</th><th>Période</th><th>Jours</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="l in leaveRequests" :key="l.id">
            <td>{{ l.employee ? `${l.employee.last_name} ${l.employee.first_name}` : `#${l.employee_id}` }}</td>
            <td>{{ l.leave_type.replace(/_/g, ' ') }}</td>
            <td>{{ l.start_date }} → {{ l.end_date }}</td>
            <td>{{ l.days_count }}</td>
            <td><span class="status-pill" :style="{ background: (leaveStatusColor[l.status] || '#ccc') + '20', color: leaveStatusColor[l.status] }">{{ leaveStatusLabel[l.status] || l.status }}</span></td>
            <td>
              <template v-if="l.status === 'soumis'">
                <button class="btn-sm btn-green" @click="decideLeave(l.id, 'approuve')">✓ Approuver</button>
                <button class="btn-sm btn-red" @click="decideLeave(l.id, 'refuse')">✗ Refuser</button>
              </template>
              <span v-else class="text-xs text-gray-400">—</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune demande de congé enregistrée.</p>
    </section>

    <!-- ═══════════ SHIFTS ═══════════ -->
    <section v-if="tab === 'shifts'" class="content-section">
      <div class="section-toolbar">
        <h3>Planning & Gardes</h3>
        <button class="btn-primary" @click="showCreateShift = true">+ Nouveau créneau</button>
      </div>

      <table v-if="shifts.length" class="data-table">
        <thead><tr><th>Date</th><th>Salarié</th><th>Type</th><th>Horaires</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-for="s in shifts" :key="s.id">
            <td>{{ s.shift_date }}</td>
            <td>{{ s.employee ? `${s.employee.last_name} ${s.employee.first_name}` : `#${s.employee_id}` }}</td>
            <td>{{ shiftTypeLabel[s.shift_type] || s.shift_type }}</td>
            <td>{{ s.start_time }} – {{ s.end_time }}</td>
            <td><span class="status-pill">{{ s.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun créneau de planning enregistré.</p>
    </section>

    <!-- ═══════════ TRAINING ═══════════ -->
    <section v-if="tab === 'training'" class="content-section">
      <div class="section-toolbar">
        <h3>Plans & Sessions de Formation</h3>
        <button class="btn-primary" @click="showCreatePlan = true">+ Nouveau plan</button>
      </div>

      <div v-if="trainingPlans.length" class="plans-list">
        <div v-for="p in trainingPlans" :key="p.id" class="plan-card">
          <div class="plan-head">
            <strong>{{ p.theme }}</strong>
            <span class="badge" :class="p.status">{{ p.status }}</span>
          </div>
          <div class="plan-meta text-sm text-gray-500">
            {{ trainingTypeLabel[p.training_type] || p.training_type }} · {{ p.duration_hours }}h · {{ p.year }}
            <span v-if="p.trainer_organization"> · {{ p.trainer_organization }}</span>
          </div>
          <div v-if="p.sessions?.length" class="sessions-list">
            <div v-for="s in p.sessions" :key="s.id" class="session-item">
              <AppIcon name="calendar" :size="16" /> {{ s.session_date }} {{ s.start_time || '' }}–{{ s.end_time || '' }}
              <span class="badge" :class="s.status">{{ s.status }}</span>
              <span v-if="s.attendances?.length" class="text-xs text-gray-500">({{ s.attendances.length }} participants)</span>
            </div>
          </div>
          <p v-else class="text-xs text-gray-400 mt-2">Aucune session programmée.</p>
        </div>
      </div>
      <p v-else class="empty-state">Aucun plan de formation enregistré.</p>
    </section>

    <!-- ═══════════ REVIEWS ═══════════ -->
    <section v-if="tab === 'reviews'" class="content-section">
      <div class="section-toolbar">
        <h3>Évaluations des compétences</h3>
        <button class="btn-primary" @click="showCreateReview = true">+ Nouvelle évaluation</button>
      </div>

      <table v-if="reviews.length" class="data-table">
        <thead><tr><th>Salarié</th><th>Type</th><th>Période</th><th>Date</th><th>Note</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-for="r in reviews" :key="r.id">
            <td>{{ r.employee ? `${r.employee.last_name} ${r.employee.first_name}` : `#${r.employee_id}` }}</td>
            <td>{{ r.review_type === 'cadre' ? 'Cadre' : 'Non-cadre' }}</td>
            <td>{{ r.review_period }}</td>
            <td>{{ r.review_date }}</td>
            <td><strong>{{ r.overall_score }}/20</strong></td>
            <td><span class="status-pill" :class="r.status">{{ r.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune évaluation enregistrée.</p>
    </section>

    <!-- ═══════════ MODALS ═══════════ -->

    <!-- Modal: Créer Salarié -->
    <AppModal v-model="showCreateEmployee" title="Nouveau salarié">
      <form @submit.prevent="createEmployee" class="modal-form">
        <div class="form-row"><label>Matricule</label><input v-model="empForm.matricule" required /></div>
        <div class="form-row"><label>Prénom</label><input v-model="empForm.first_name" required /></div>
        <div class="form-row"><label>Nom</label><input v-model="empForm.last_name" required /></div>
        <div class="form-row"><label>Email</label><input v-model="empForm.email" type="email" /></div>
        <div class="form-row"><label>Téléphone</label><input v-model="empForm.phone" /></div>
        <div class="form-row"><label>Poste</label><input v-model="empForm.role_title" required /></div>
        <div class="form-row"><label>Type contrat</label>
          <select v-model="empForm.contract_type"><option>CDI</option><option>CDD</option><option>Stage</option><option>Prestataire</option></select>
        </div>
        <div class="form-row"><label>Date embauche</label><input v-model="empForm.hire_date" type="date" required /></div>
        <div class="form-row"><label>N° Ordre B</label><input v-model="empForm.ordre_b_number" /></div>
        <div class="form-row"><label>Expiration Ordre B</label><input v-model="empForm.ordre_b_expiry" type="date" /></div>
        <div class="form-row"><label>Contact urgence</label><input v-model="empForm.emergency_contact" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer</button>
      </form>
    </AppModal>

    <!-- Modal: Créer Demande Congé -->
    <AppModal v-model="showCreateLeave" title="Nouvelle demande de congé">
      <form @submit.prevent="createLeaveRequest" class="modal-form">
        <div class="form-row"><label>Salarié (ID)</label>
          <select v-model.number="leaveForm.employee_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.matricule }} — {{ e.last_name }} {{ e.first_name }}</option>
          </select>
        </div>
        <div class="form-row"><label>Type</label>
          <select v-model="leaveForm.leave_type">
            <option value="conge_annuel">Congé annuel</option><option value="maladie">Maladie</option>
            <option value="maternite">Maternité</option><option value="evenement_familial">Événement familial</option>
            <option value="sans_solde">Sans solde</option>
          </select>
        </div>
        <div class="form-row"><label>Du</label><input v-model="leaveForm.start_date" type="date" required /></div>
        <div class="form-row"><label>Au</label><input v-model="leaveForm.end_date" type="date" required /></div>
        <div class="form-row"><label>Nb jours</label><input v-model.number="leaveForm.days_count" type="number" step="0.5" min="0.5" required /></div>
        <div class="form-row"><label>Motif</label><textarea v-model="leaveForm.reason" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Soumettre la demande</button>
      </form>
    </AppModal>

    <!-- Modal: Créer Créneau -->
    <AppModal v-model="showCreateShift" title="Nouveau créneau de planning">
      <form @submit.prevent="createShift" class="modal-form">
        <div class="form-row"><label>Salarié</label>
          <select v-model.number="shiftForm.employee_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.matricule }} — {{ e.last_name }} {{ e.first_name }}</option>
          </select>
        </div>
        <div class="form-row"><label>Type</label>
          <select v-model="shiftForm.shift_type">
            <option value="jour">Jour</option><option value="garde_nuit">Garde nuit</option>
            <option value="garde_dimanche">Garde dimanche</option><option value="astreinte">Astreinte</option>
          </select>
        </div>
        <div class="form-row"><label>Date</label><input v-model="shiftForm.shift_date" type="date" required /></div>
        <div class="form-row"><label>Début</label><input v-model="shiftForm.start_time" type="time" required /></div>
        <div class="form-row"><label>Fin</label><input v-model="shiftForm.end_time" type="time" required /></div>
        <div class="form-row"><label>Notes</label><textarea v-model="shiftForm.notes" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Planifier</button>
      </form>
    </AppModal>

    <!-- Modal: Créer Plan Formation -->
    <AppModal v-model="showCreatePlan" title="Nouveau plan de formation">
      <form @submit.prevent="createTrainingPlan" class="modal-form">
        <div class="form-row"><label>Année</label><input v-model.number="planForm.year" type="number" required /></div>
        <div class="form-row"><label>Thème</label><input v-model="planForm.theme" required /></div>
        <div class="form-row"><label>Description</label><textarea v-model="planForm.description" rows="2" /></div>
        <div class="form-row"><label>Type</label>
          <select v-model="planForm.training_type">
            <option value="interne_bpd">Interne BPD</option><option value="externe">Externe</option>
            <option value="securite_incendie">Sécurité incendie</option><option value="pharmacovigilance">Pharmacovigilance</option>
          </select>
        </div>
        <div class="form-row"><label>Durée (h)</label><input v-model.number="planForm.duration_hours" type="number" min="1" required /></div>
        <div class="form-row"><label>Organisme</label><input v-model="planForm.trainer_organization" /></div>
        <div class="form-row"><label>Public cible</label><input v-model="planForm.target_audience" /></div>
        <button type="submit" class="btn-primary mt-4">Créer le plan</button>
      </form>
    </AppModal>

    <!-- Modal: Créer Évaluation -->
    <AppModal v-model="showCreateReview" title="Nouvelle évaluation">
      <form @submit.prevent="createReview" class="modal-form">
        <div class="form-row"><label>Salarié</label>
          <select v-model.number="reviewForm.employee_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.matricule }} — {{ e.last_name }} {{ e.first_name }}</option>
          </select>
        </div>
        <div class="form-row"><label>Type grille</label>
          <select v-model="reviewForm.review_type"><option value="cadre">Cadre</option><option value="non_cadre">Non-cadre</option></select>
        </div>
        <div class="form-row"><label>Période</label><input v-model="reviewForm.review_period" required /></div>
        <div class="form-row"><label>Date évaluation</label><input v-model="reviewForm.review_date" type="date" required /></div>
        <div class="form-row"><label>Note globale /20</label><input v-model.number="reviewForm.overall_score" type="number" step="0.1" min="0" max="20" required /></div>
        <div class="form-row"><label>Points forts</label><textarea v-model="reviewForm.strengths" rows="2" /></div>
        <div class="form-row"><label>Axes d'amélioration</label><textarea v-model="reviewForm.improvements" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer l'évaluation</button>
      </form>
    </AppModal>

    <!-- Modal: Détail Salarié -->
    <AppModal v-model="showDetailOpen" :title="showDetail ? `${showDetail.last_name} ${showDetail.first_name}` : ''">
      <div v-if="showDetail" class="detail-content">
        <div class="detail-grid">
          <div><span class="detail-label">Matricule</span><span class="detail-value font-mono">{{ showDetail.matricule }}</span></div>
          <div><span class="detail-label">Poste</span><span class="detail-value">{{ showDetail.role_title }}</span></div>
          <div><span class="detail-label">Contrat</span><span class="detail-value">{{ showDetail.contract_type }}</span></div>
          <div><span class="detail-label">Embauche</span><span class="detail-value">{{ showDetail.hire_date }}</span></div>
          <div><span class="detail-label">Statut</span><span class="status-pill" :style="{ background: statusColor[showDetail.status] + '20', color: statusColor[showDetail.status] }">{{ statusLabel[showDetail.status] }}</span></div>
          <div><span class="detail-label">Ordre B</span><span class="detail-value">{{ showDetail.ordre_b_number || 'N/A' }} {{ showDetail.ordre_b_expiry ? `(exp. ${showDetail.ordre_b_expiry})` : '' }}</span></div>
          <div v-if="showDetail.email"><span class="detail-label">Email</span><span class="detail-value">{{ showDetail.email }}</span></div>
          <div v-if="showDetail.phone"><span class="detail-label">Téléphone</span><span class="detail-value">{{ showDetail.phone }}</span></div>
          <div v-if="showDetail.emergency_contact"><span class="detail-label">Contact urgence</span><span class="detail-value">{{ showDetail.emergency_contact }}</span></div>
        </div>
        <div v-if="showDetail.qualifications?.length" class="mt-4">
          <strong class="text-sm">Qualifications :</strong>
          <ul class="text-sm mt-1"><li v-for="q in showDetail.qualifications" :key="q">{{ q }}</li></ul>
        </div>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.module-page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 1.5rem; }

.section-filter { display:grid; gap:6px; font-weight:700; margin:0 0 16px; max-width:420px; width:100%; }
.section-filter select { min-height:44px; font-size:16px; }
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
.kpi-value { font-size: 1.75rem; font-weight: 700; color: #1f2937; }
.kpi-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }

.alert-box { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 10px; padding: 1.25rem; }
.alert-box h3 { font-size: 0.95rem; margin: 0 0 0.75rem; }
.alert-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0; font-size: 0.85rem; flex-wrap: wrap; }
.badge-warn { background: #fef3c7; color: #92400e; font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 600; }

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

.status-pill { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; background: #f3f4f6; color: #374151; }
.status-pill.brouillon { background: #f3f4f6; color: #6b7280; }
.status-pill.finalise { background: #d1fae5; color: #065f46; }
.status-pill.planifie, .status-pill.planifiee { background: #dbeafe; color: #1e40af; }
.status-pill.en_cours { background: #fef3c7; color: #92400e; }
.status-pill.cloture, .status-pill.realisee { background: #d1fae5; color: #065f46; }
.status-pill.annule, .status-pill.annulee { background: #f3f4f6; color: #6b7280; }

.empty-state { text-align: center; color: #9ca3af; padding: 3rem 1rem; font-size: 0.9rem; }

/* Buttons */
.btn-primary { padding: 0.5rem 1.15rem; background: #1a73e8; color: #fff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; white-space: nowrap; }
.btn-primary:hover { background: #1557b0; }
.btn-sm { padding: 0.25rem 0.6rem; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-right: 0.25rem; }
.btn-green { background: #d1fae5; color: #065f46; }
.btn-green:hover { background: #a7f3d0; }
.btn-red { background: #fee2e2; color: #991b1b; }
.btn-red:hover { background: #fecaca; }

/* Plans / Training */
.plans-list { display: flex; flex-direction: column; gap: 1rem; }
.plan-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; }
.plan-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.plan-meta { margin-bottom: 0.75rem; }
.sessions-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed #e5e7eb; }
.session-item { font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.badge { font-size: 0.7rem; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 600; text-transform: capitalize; }

/* Modal form */
.modal-form { display: flex; flex-direction: column; gap: 0.6rem; max-height: 65vh; overflow-y: auto; }
.form-row { display: flex; flex-direction: column; gap: 0.2rem; }
.form-row label { font-size: 0.75rem; font-weight: 600; color: #374151; }
.form-row input, .form-row select, .form-row textarea { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }

/* Detail */
.detail-content { font-size: 0.85rem; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.detail-label { font-size: 0.7rem; text-transform: uppercase; color: #6b7280; display: block; }
.detail-value { font-weight: 500; }
</style>
