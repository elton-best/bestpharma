<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { demoMode, request } from '@/services/quality'

interface ComplaintRow {
  id: number
  reference: string
  channel: string
  complainant_type: string
  complainant_name: string | null
  complainant_contact: string | null
  is_anonymous: boolean
  category: string
  title: string
  description: string
  desired_solution: string | null
  received_date: string
  status: 'received' | 'under_review' | 'action_required' | 'resolved' | 'closed' | 'rejected'
  version: number
  assigned_to: number | null
  creator?: { id: number; name: string }
  assigned_user?: { id: number; name: string }
  responses?: {
    id: number
    response_channel: string
    response_content: string
    decision_type: string
    communicated_at: string
    communicator?: { id: number; name: string }
  }[]
  nonconformities?: { id: number; reference: string; title: string; status: string }[]
}

interface RootCauseRow {
  id: number
  method: string
  why_1: string | null
  why_2: string | null
  why_3: string | null
  why_4: string | null
  why_5: string | null
  main_cause: string
  analyzed_at: string
  analyst?: { id: number; name: string }
}

interface EffectivenessReviewRow {
  id: number
  criteria_evaluated: string
  is_effective: boolean
  observations: string | null
  decision: 'approve_closure' | 'require_additional_actions'
  reviewed_at: string
  reviewer?: { id: number; name: string }
}

interface NonconformityRow {
  id: number
  reference: string
  source_type: string
  complaint_id: number | null
  activity_domain: string
  title: string
  description: string
  detection_date: string
  detected_by: number
  nature: 'ecart' | 'non_conformite'
  severity: 'mineure' | 'majeure' | 'critique'
  immediate_actions: string | null
  status: 'declared' | 'analyzed' | 'action_in_progress' | 'effectiveness_review' | 'closed'
  version: number
  detector?: { id: number; name: string }
  complaint?: { id: number; reference: string; title: string; status: string }
  root_cause?: RootCauseRow
  action_links?: { id: number; action_id: number }[]
  effectiveness_reviews?: EffectivenessReviewRow[]
}

interface OverviewData {
  indicators: {
    complaints_total: number
    complaints_pending: number
    complaints_overdue_72h: number
    nc_total: number
    nc_open: number
    nc_closed: number
    nc_overdue_30d: number
    by_severity: Record<string, number>
    by_status: Record<string, number>
    resolution_rate: string
    definition: string
    updated_at: string
  }
}

interface TeamMember {
  id: number
  name: string
  email: string
}

const base = '/qualite/nonconformites'

const loading = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')

const overview = ref<OverviewData | null>(null)
const complaints = ref<ComplaintRow[]>([])
const nonconformities = ref<NonconformityRow[]>([])
const selectedNc = ref<NonconformityRow | null>(null)
const selectedComplaint = ref<ComplaintRow | null>(null)
const teamMembers = ref<TeamMember[]>([])

const activeTab = ref<'ncs' | 'complaints' | 'nc_detail' | 'complaint_detail'>('ncs')
const filterNcStatus = ref('all')
const filterSeverity = ref('all')
const filterComplaintStatus = ref('all')
const searchQuery = ref('')

// Modals
const createNcModal = ref(false)
const createComplaintModal = ref(false)
const createCapaModal = ref(false)
const rootCauseModal = ref(false)
const effectivenessModal = ref(false)
const complaintResponseModal = ref(false)
const convertToNcModal = ref(false)

// Forms
const ncForm = reactive({
  source_type: 'internal_detection',
  activity_domain: 'dispensation',
  title: '',
  description: '',
  detection_date: new Date().toISOString().split('T')[0],
  detected_by: 1,
  nature: 'non_conformite' as 'ecart' | 'non_conformite',
  severity: 'majeure' as 'mineure' | 'majeure' | 'critique',
  immediate_actions: '',
})

const complaintForm = reactive({
  channel: 'comptoir',
  complainant_type: 'patient',
  complainant_name: '',
  complainant_contact: '',
  is_anonymous: false,
  category: 'dispensation',
  title: '',
  description: '',
  desired_solution: '',
  received_date: new Date().toISOString().split('T')[0],
  assigned_to: null as number | null,
})

const rootCauseForm = reactive({
  method: '5_why',
  why_1: '',
  why_2: '',
  why_3: '',
  why_4: '',
  why_5: '',
  main_cause: '',
})

const capaForm = reactive({
  title: '',
  description: '',
  owner_id: 1,
  due_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
  priority: 'high',
  effectiveness_criteria: '',
})

const effectivenessForm = reactive({
  criteria_evaluated: '',
  is_effective: true,
  observations: '',
  decision: 'approve_closure' as 'approve_closure' | 'require_additional_actions',
})

const complaintResponseForm = reactive({
  response_channel: 'oral_comptoir',
  response_content: '',
  decision_type: 'favorable',
})

const convertToNcForm = reactive({
  activity_domain: 'dispensation',
  severity: 'majeure' as 'mineure' | 'majeure' | 'critique',
  immediate_actions: '',
})

const activityDomains = [
  { id: 'dispensation', label: 'Dispensation & Comptoir' },
  { id: 'stockage', label: 'Stockage & FEFO' },
  { id: 'approvisionnement', label: 'Approvisionnement & Réception grossistes' },
  { id: 'chaine_du_froid', label: 'Chaîne du froid & Enceintes 2-8°C' },
  { id: 'hygiene_locaux', label: 'Hygiène & Maintenance des locaux' },
  { id: 'stupefiants', label: 'Stupéfiants & Substances contrôlées' },
  { id: 'organisation_qualite', label: 'Organisation qualité & Traçabilité' },
]

const severityLabels: Record<string, string> = {
  mineure: 'Mineure',
  majeure: 'Majeure',
  critique: 'Critique',
}

const ncStatusLabels: Record<string, string> = {
  declared: 'Déclarée',
  analyzed: 'Analysée (Causes)',
  action_in_progress: 'Actions en cours',
  effectiveness_review: 'Revue efficacité',
  closed: 'Clôturée',
}

const complaintStatusLabels: Record<string, string> = {
  received: 'Reçue',
  under_review: 'En analyse',
  action_required: 'Non-conformité liée',
  resolved: 'Réponse transmise',
  closed: 'Clôturée',
  rejected: 'Sans suite',
}

const filteredNcs = computed(() => {
  return nonconformities.value.filter((nc) => {
    const matchStatus = filterNcStatus.value === 'all' || nc.status === filterNcStatus.value
    const matchSev = filterSeverity.value === 'all' || nc.severity === filterSeverity.value
    const matchSearch =
      !searchQuery.value ||
      `${nc.reference} ${nc.title} ${nc.activity_domain}`
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase())
    return matchStatus && matchSev && matchSearch
  })
})

const filteredComplaints = computed(() => {
  return complaints.value.filter((c) => {
    const matchStatus = filterComplaintStatus.value === 'all' || c.status === filterComplaintStatus.value
    const matchSearch =
      !searchQuery.value ||
      `${c.reference} ${c.title} ${c.complainant_name || ''}`
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase())
    return matchStatus && matchSearch
  })
})

async function loadData() {
  if (demoMode) {
    error.value = 'Le module requiert le mode API connecté.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const [ovRes, ncsRes, compRes, teamRes] = await Promise.all([
      request<OverviewData>(`${base}/overview`),
      request<{ data: { data: NonconformityRow[] } }>(`${base}/nc?per_page=50`),
      request<{ data: { data: ComplaintRow[] } }>(`${base}/complaints?per_page=50`),
      request<{ members: TeamMember[] }>('/team').catch(() => ({ members: [] })),
    ])
    overview.value = ovRes
    nonconformities.value = ncsRes.data.data
    complaints.value = compRes.data.data
    teamMembers.value = teamRes.members?.length
      ? teamRes.members
      : [{ id: 1, name: 'Pharmacien Titulaire', email: 'titulaire@bestpharma.bj' }]

    if (selectedNc.value) {
      await selectNc(selectedNc.value.id)
    }
    if (selectedComplaint.value) {
      await selectComplaint(selectedComplaint.value.id)
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function selectNc(id: number) {
  try {
    const res = await request<{ data: NonconformityRow }>(`${base}/nc/${id}`)
    selectedNc.value = res.data

    if (res.data.root_cause) {
      rootCauseForm.method = res.data.root_cause.method || '5_why'
      rootCauseForm.why_1 = res.data.root_cause.why_1 || ''
      rootCauseForm.why_2 = res.data.root_cause.why_2 || ''
      rootCauseForm.why_3 = res.data.root_cause.why_3 || ''
      rootCauseForm.why_4 = res.data.root_cause.why_4 || ''
      rootCauseForm.why_5 = res.data.root_cause.why_5 || ''
      rootCauseForm.main_cause = res.data.root_cause.main_cause || ''
    } else {
      rootCauseForm.method = '5_why'
      rootCauseForm.why_1 = ''
      rootCauseForm.why_2 = ''
      rootCauseForm.why_3 = ''
      rootCauseForm.why_4 = ''
      rootCauseForm.why_5 = ''
      rootCauseForm.main_cause = ''
    }
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function selectComplaint(id: number) {
  try {
    const res = await request<{ data: ComplaintRow }>(`${base}/complaints/${id}`)
    selectedComplaint.value = res.data
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function saveNewNc() {
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: NonconformityRow }>(`${base}/nc`, 'POST', ncForm)
    notice.value = `Fiche de non-conformité ${res.data.reference} déclarée avec succès.`
    createNcModal.value = false
    await loadData()
    await selectNc(res.data.id)
    activeTab.value = 'nc_detail'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function saveNewComplaint() {
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: ComplaintRow }>(`${base}/complaints`, 'POST', complaintForm)
    notice.value = `Réclamation ${res.data.reference} enregistrée avec succès.`
    createComplaintModal.value = false
    await loadData()
    await selectComplaint(res.data.id)
    activeTab.value = 'complaint_detail'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function saveRootCauses() {
  if (!selectedNc.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/nc/${selectedNc.value.id}/root-cause`, 'POST', rootCauseForm)
    notice.value = 'Analyse des causes racines (5 Pourquoi) enregistrée.'
    rootCauseModal.value = false
    await selectNc(selectedNc.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function openCapaModal() {
  if (!selectedNc.value) return
  capaForm.title = `CAPA ${selectedNc.value.reference} : ${selectedNc.value.title.slice(0, 50)}...`
  capaForm.description = `Écart constaté : ${selectedNc.value.description}\n` +
    `Cause racine : ${selectedNc.value.root_cause?.main_cause || 'À documenter'}`
  capaForm.priority = selectedNc.value.severity === 'critique' ? 'high' : 'normal'
  capaForm.effectiveness_criteria = `Contrôle de non-récurrence de l’écart ${selectedNc.value.reference} sur 30 jours consécutifs.`
  createCapaModal.value = true
}

async function submitCapaAction() {
  if (!selectedNc.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: { action: { id: number } } }>(
      `${base}/nc/${selectedNc.value.id}/actions`,
      'POST',
      capaForm
    )
    notice.value = `Action CAPA #${res.data.action.id} créée avec succès dans le Module 04.`
    createCapaModal.value = false
    await selectNc(selectedNc.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function submitEffectivenessReview() {
  if (!selectedNc.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/nc/${selectedNc.value.id}/effectiveness`, 'POST', effectivenessForm)
    notice.value = 'Revue d’efficacité enregistrée avec succès.'
    effectivenessModal.value = false
    await selectNc(selectedNc.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function closeNcFormally() {
  if (!selectedNc.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/nc/${selectedNc.value.id}/close`, 'POST')
    notice.value = `Non-conformité ${selectedNc.value.reference} clôturée formellement.`
    await selectNc(selectedNc.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function submitComplaintResponse() {
  if (!selectedComplaint.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/complaints/${selectedComplaint.value.id}/responses`, 'POST', complaintResponseForm)
    notice.value = 'Réponse consignée et communiquée au réclamant.'
    complaintResponseModal.value = false
    await selectComplaint(selectedComplaint.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function convertComplaintToNc() {
  if (!selectedComplaint.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: NonconformityRow }>(
      `${base}/complaints/${selectedComplaint.value.id}/create-nc`,
      'POST',
      convertToNcForm
    )
    notice.value = `Fiche de non-conformité ${res.data.reference} créée depuis la réclamation.`
    convertToNcModal.value = false
    await selectComplaint(selectedComplaint.value.id)
    await selectNc(res.data.id)
    await loadData()
    activeTab.value = 'nc_detail'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function closeComplaintFormally() {
  if (!selectedComplaint.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/complaints/${selectedComplaint.value.id}/close`, 'POST')
    notice.value = `Réclamation ${selectedComplaint.value.reference} clôturée avec succès.`
    await selectComplaint(selectedComplaint.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="page">
    <div class="page-heading compact">
      <div>
        <p class="eyebrow">MODULE 06 · GESTION DE LA QUALITÉ & ÉCARTS</p>
        <h1>Non-conformités <span class="accent-serif">& Réclamations.</span></h1>
        <p class="page-subtitle">
          Déclaration d'écarts, réclamations patients et tiers, analyse des causes racines (5 Pourquoi), boucle CAPA et revues d’efficacité.
        </p>
      </div>
      <div class="heading-actions">
        <button class="button secondary" @click="createComplaintModal = true">
          <AppIcon name="support" :size="16" /> Nouvelle réclamation
        </button>
        <button class="button primary" @click="createNcModal = true">
          <AppIcon name="plus" :size="16" /> Déclarer non-conformité
        </button>
      </div>
    </div>

    <!-- Alertes -->
    <p v-if="demoMode" class="alert">Connectez-vous au mode API pour utiliser ce module.</p>
    <p v-if="error" class="alert error" role="alert">
      {{ error }} <button @click="loadData">Réessayer</button>
    </p>
    <p v-if="notice" class="alert success" role="status">
      {{ notice }} <button @click="notice = ''">×</button>
    </p>

    <!-- Mini-Stats & Indicateurs (CDC 6) -->
    <div v-if="overview" class="mini-stats">
      <span>{{ overview.indicators.nc_total }} <small>non-conformités totales</small></span>
      <span>{{ overview.indicators.nc_open }} <small>en cours de traitement</small></span>
      <span :class="{ 'overdue-text': overview.indicators.nc_overdue_30d > 0 }">
        {{ overview.indicators.nc_overdue_30d }} <small>NC en retard (> 30j)</small>
      </span>
      <span>{{ overview.indicators.complaints_total }} <small>réclamations totales</small></span>
      <span :class="{ 'overdue-text': overview.indicators.complaints_overdue_72h > 0 }">
        {{ overview.indicators.complaints_overdue_72h }} <small>sans réponse (> 72h)</small>
      </span>
      <span><strong>{{ overview.indicators.resolution_rate }}</strong> <small>taux de résolution</small></span>
    </div>

    <!-- Puces de répartition par sévérité -->
    <div v-if="overview" class="severity-chips-bar">
      <div class="sev-chip critique">
        <span class="dot"></span>
        <strong>{{ overview.indicators.by_severity.critique || 0 }}</strong>
        <span>Critiques</span>
      </div>
      <div class="sev-chip majeure">
        <span class="dot"></span>
        <strong>{{ overview.indicators.by_severity.majeure || 0 }}</strong>
        <span>Majeures</span>
      </div>
      <div class="sev-chip mineure">
        <span class="dot"></span>
        <strong>{{ overview.indicators.by_severity.mineure || 0 }}</strong>
        <span>Mineures</span>
      </div>
    </div>

    <!-- Onglets de navigation -->
    <div class="tabs-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'ncs' }"
        @click="activeTab = 'ncs'"
      >
        <AppIcon name="quality" :size="16" /> Registre des Non-conformités ({{ nonconformities.length }})
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'complaints' }"
        @click="activeTab = 'complaints'"
      >
        <AppIcon name="support" :size="16" /> Réclamations Patients & Tiers ({{ complaints.length }})
      </button>
      <button
        v-if="selectedNc"
        class="tab-btn highlight"
        :class="{ active: activeTab === 'nc_detail' }"
        @click="activeTab = 'nc_detail'"
      >
        <AppIcon name="chevron" :size="16" /> Détail NC : {{ selectedNc.reference }}
      </button>
      <button
        v-if="selectedComplaint"
        class="tab-btn highlight"
        :class="{ active: activeTab === 'complaint_detail' }"
        @click="activeTab = 'complaint_detail'"
      >
        <AppIcon name="chevron" :size="16" /> Traitement Réclamation : {{ selectedComplaint.reference }}
      </button>
    </div>

    <!-- TAB 1: REGISTRE DES NON-CONFORMITÉS -->
    <section v-if="activeTab === 'ncs'" class="panel">
      <div class="table-toolbar">
        <div class="tabs">
          <button
            v-for="st in [
              { id: 'all', label: 'Toutes' },
              { id: 'declared', label: 'Déclarées' },
              { id: 'analyzed', label: 'Analysées' },
              { id: 'action_in_progress', label: 'Actions CAPA' },
              { id: 'closed', label: 'Clôturées' },
            ]"
            :key="st.id"
            :class="{ selected: filterNcStatus === st.id }"
            @click="filterNcStatus = st.id"
          >
            {{ st.label }}
          </button>
        </div>
        <div class="filters-right">
          <select v-model="filterSeverity" class="select-inline">
            <option value="all">Toutes sévérités</option>
            <option value="critique">Critique</option>
            <option value="majeure">Majeure</option>
            <option value="mineure">Mineure</option>
          </select>
          <label class="search-field">
            <AppIcon name="search" :size="16" />
            <input v-model="searchQuery" placeholder="Rechercher par référence, titre..." />
          </label>
        </div>
      </div>

      <p v-if="loading" role="status">Chargement des non-conformités…</p>
      <div v-else-if="!filteredNcs.length" class="empty-state">
        <AppIcon name="quality" :size="36" />
        <h3>Aucune non-conformité répertoriée</h3>
        <p>Documentez immédiatement tout écart ou incident constaté dans votre officine.</p>
        <button class="button primary" @click="createNcModal = true">Déclarer un écart</button>
      </div>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>RÉFÉRENCE & TITRE</th>
              <th>DOMAINE D'ACTIVITÉ</th>
              <th>SÉVÉRITÉ</th>
              <th>DATE DÉTECTION</th>
              <th>STATUT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="nc in filteredNcs" :key="nc.id">
              <td>
                <button class="table-title" @click="selectNc(nc.id); activeTab = 'nc_detail'">
                  <strong>{{ nc.reference }}</strong> — {{ nc.title }}
                </button>
                <small v-if="nc.complaint" class="table-subtitle">
                  Origine réclamation : {{ nc.complaint.reference }}
                </small>
              </td>
              <td>
                <span class="domain-tag">{{ nc.activity_domain }}</span>
              </td>
              <td>
                <span class="severity-badge" :class="nc.severity">
                  {{ severityLabels[nc.severity] }}
                </span>
              </td>
              <td>{{ nc.detection_date }}</td>
              <td>
                <span class="status-badge" :class="nc.status">
                  {{ ncStatusLabels[nc.status] || nc.status }}
                </span>
              </td>
              <td>
                <button
                  class="button small secondary"
                  @click="selectNc(nc.id); activeTab = 'nc_detail'"
                >
                  Instruire
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB 2: RÉCLAMATIONS PATIENTS & TIERS -->
    <section v-if="activeTab === 'complaints'" class="panel">
      <div class="table-toolbar">
        <div class="tabs">
          <button
            v-for="st in [
              { id: 'all', label: 'Toutes' },
              { id: 'received', label: 'Reçues' },
              { id: 'under_review', label: 'En cours' },
              { id: 'resolved', label: 'Répondues' },
              { id: 'closed', label: 'Clôturées' },
            ]"
            :key="st.id"
            :class="{ selected: filterComplaintStatus === st.id }"
            @click="filterComplaintStatus = st.id"
          >
            {{ st.label }}
          </button>
        </div>
        <label class="search-field">
          <AppIcon name="search" :size="16" />
          <input v-model="searchQuery" placeholder="Rechercher réclamation, patient..." />
        </label>
      </div>

      <p v-if="loading" role="status">Chargement des réclamations…</p>
      <div v-else-if="!filteredComplaints.length" class="empty-state">
        <AppIcon name="support" :size="36" />
        <h3>Aucune réclamation enregistrée</h3>
        <p>Toute plainte ou réclamation orale/écrite doit être consignée pour traçabilité (CDC 3.3).</p>
        <button class="button secondary" @click="createComplaintModal = true">Enregistrer une réclamation</button>
      </div>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>RÉFÉRENCE & MOTIF</th>
              <th>RÉCLAMANT</th>
              <th>CANAL</th>
              <th>DATE RÉCEPTION</th>
              <th>STATUT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filteredComplaints" :key="c.id">
              <td>
                <button class="table-title" @click="selectComplaint(c.id); activeTab = 'complaint_detail'">
                  <strong>{{ c.reference }}</strong> — {{ c.title }}
                </button>
                <small class="table-subtitle">{{ c.category }}</small>
              </td>
              <td>
                <span v-if="c.is_anonymous" class="anon-pill">Anonyme</span>
                <span v-else>{{ c.complainant_name || 'Non précisé' }}</span>
              </td>
              <td>
                <span class="channel-pill">{{ c.channel }}</span>
              </td>
              <td>{{ c.received_date }}</td>
              <td>
                <span class="status-badge" :class="c.status">
                  {{ complaintStatusLabels[c.status] || c.status }}
                </span>
              </td>
              <td>
                <button
                  class="button small secondary"
                  @click="selectComplaint(c.id); activeTab = 'complaint_detail'"
                >
                  Traiter
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB 3: DÉTAIL NON-CONFORMITÉ & CAUSES RACINES -->
    <section v-if="activeTab === 'nc_detail' && selectedNc" class="panel">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">INSTRUCTION NC · {{ selectedNc.reference }}</span>
          <h2>{{ selectedNc.title }}</h2>
          <p class="muted-note">
            Domaine : <strong>{{ selectedNc.activity_domain }}</strong> ·
            Gravité : <span class="severity-badge" :class="selectedNc.severity">{{ severityLabels[selectedNc.severity] }}</span> ·
            Détecté le {{ selectedNc.detection_date }} par <strong>{{ selectedNc.detector?.name || 'Membre équipe' }}</strong>
          </p>
        </div>
        <div class="heading-actions">
          <button class="button secondary" @click="rootCauseModal = true">
            <AppIcon name="search" :size="15" /> Analyse 5 Pourquoi
          </button>
          <button class="button primary" @click="openCapaModal">
            <AppIcon name="plus" :size="15" /> Créer action CAPA (M4)
          </button>
          <button class="button secondary" @click="effectivenessModal = true">
            Revue d'efficacité
          </button>
          <button
            class="button success"
            :disabled="busy || selectedNc.status === 'closed'"
            @click="closeNcFormally"
          >
            Clôturer la NC
          </button>
        </div>
      </div>

      <!-- Description et mesures d'urgence -->
      <div class="nc-summary-grid">
        <div class="summary-card">
          <h4>Description précise des faits constatés</h4>
          <p>{{ selectedNc.description }}</p>
        </div>
        <div class="summary-card">
          <h4>Mesures conservatoires immédiates</h4>
          <p>{{ selectedNc.immediate_actions || 'Aucune mesure d’urgence consignée.' }}</p>
        </div>
      </div>

      <!-- Analyse des Causes Racines (5 Pourquoi - CDC 3.2) -->
      <div class="root-cause-box">
        <div class="box-header">
          <h3>Analyse des causes profondes (Méthode des 5 Pourquoi)</h3>
          <button class="button small secondary" @click="rootCauseModal = true">
            {{ selectedNc.root_cause ? 'Modifier l’analyse' : 'Effectuer l’analyse' }}
          </button>
        </div>
        <div v-if="!selectedNc.root_cause" class="empty-inline">
          <p>Aucune analyse de cause racine n’a encore été formalisée.</p>
        </div>
        <div v-else class="whys-stepper">
          <div v-if="selectedNc.root_cause.why_1" class="why-step">
            <span class="why-badge">Pourquoi 1</span>
            <p>{{ selectedNc.root_cause.why_1 }}</p>
          </div>
          <div v-if="selectedNc.root_cause.why_2" class="why-step">
            <span class="why-badge">Pourquoi 2</span>
            <p>{{ selectedNc.root_cause.why_2 }}</p>
          </div>
          <div v-if="selectedNc.root_cause.why_3" class="why-step">
            <span class="why-badge">Pourquoi 3</span>
            <p>{{ selectedNc.root_cause.why_3 }}</p>
          </div>
          <div v-if="selectedNc.root_cause.why_4" class="why-step">
            <span class="why-badge">Pourquoi 4</span>
            <p>{{ selectedNc.root_cause.why_4 }}</p>
          </div>
          <div v-if="selectedNc.root_cause.why_5" class="why-step">
            <span class="why-badge">Pourquoi 5</span>
            <p>{{ selectedNc.root_cause.why_5 }}</p>
          </div>
          <div class="cause-conclusion">
            <strong>Cause Racine Retenue :</strong>
            <p>{{ selectedNc.root_cause.main_cause }}</p>
          </div>
        </div>
      </div>

      <!-- Actions CAPA liées dans Module 04 -->
      <div class="linked-capas-section">
        <div class="box-header">
          <h3>Actions correctives & préventives liées (Module 04)</h3>
          <button class="button small primary" @click="openCapaModal">
            Ajouter une action CAPA
          </button>
        </div>
        <p v-if="!selectedNc.action_links?.length" class="muted-note">
          Aucune action du Module 04 n'est encore liée à cette non-conformité.
        </p>
        <ul v-else class="capa-list">
          <li v-for="l in selectedNc.action_links" :key="l.id">
            <span>Action M4 rattachée : <strong>#{{ l.action_id }}</strong></span>
            <span class="status-badge in_progress">En suivi M4</span>
          </li>
        </ul>
      </div>

      <!-- Revues d'efficacité & Clôture (CDC 3.5 & 7) -->
      <div class="effectiveness-section">
        <div class="box-header">
          <h3>Revues d'efficacité & Clôture (Contrôle strict CDC 3.5)</h3>
          <button class="button small secondary" @click="effectivenessModal = true">
            Nouvelle évaluation
          </button>
        </div>
        <div v-if="!selectedNc.effectiveness_reviews?.length" class="empty-inline alert-warn">
          <strong>Contrôle de clôture :</strong> Une revue d'efficacité probante est strictement obligatoire avant clôture.
        </div>
        <div v-else class="reviews-list">
          <div
            v-for="r in selectedNc.effectiveness_reviews"
            :key="r.id"
            class="review-item"
            :class="{ effective: r.is_effective }"
          >
            <div class="rev-header">
              <span class="rev-badge" :class="r.is_effective ? 'ok' : 'fail'">
                {{ r.is_effective ? 'Efficacité démontrée' : 'Non probant' }}
              </span>
              <small>{{ r.reviewed_at }} par {{ r.reviewer?.name || 'Responsable qualité' }}</small>
            </div>
            <p><strong>Critères :</strong> {{ r.criteria_evaluated }}</p>
            <p v-if="r.observations"><strong>Observations :</strong> {{ r.observations }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 4: TRAITEMENT RÉCLAMATION -->
    <section v-if="activeTab === 'complaint_detail' && selectedComplaint" class="panel">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">INSTRUCTION RÉCLAMATION · {{ selectedComplaint.reference }}</span>
          <h2>{{ selectedComplaint.title }}</h2>
          <p class="muted-note">
            Reçue le {{ selectedComplaint.received_date }} via <strong>{{ selectedComplaint.channel }}</strong> ·
            Catégorie : <strong>{{ selectedComplaint.category }}</strong> ·
            Statut : <span class="status-badge" :class="selectedComplaint.status">{{ complaintStatusLabels[selectedComplaint.status] }}</span>
          </p>
        </div>
        <div class="heading-actions">
          <button class="button secondary" @click="complaintResponseModal = true">
            Consigner réponse réclamant
          </button>
          <button class="button primary" @click="convertToNcModal = true">
            Convertir en Non-conformité (1-clic)
          </button>
          <button
            class="button success"
            :disabled="busy || selectedComplaint.status === 'closed'"
            @click="closeComplaintFormally"
          >
            Clôturer réclamation
          </button>
        </div>
      </div>

      <div class="nc-summary-grid">
        <div class="summary-card">
          <h4>Faits exposés par le réclamant</h4>
          <p>{{ selectedComplaint.description }}</p>
          <p v-if="selectedComplaint.desired_solution">
            <strong>Solution souhaitée :</strong> {{ selectedComplaint.desired_solution }}
          </p>
        </div>
        <div class="summary-card">
          <h4>Coordonnées & protection des données (CDC 3.3)</h4>
          <p v-if="selectedComplaint.is_anonymous">
            <em>Le réclamant a souhaité conserver l’anonymat. Aucune donnée nominative enregistrée.</em>
          </p>
          <div v-else>
            <p><strong>Nom :</strong> {{ selectedComplaint.complainant_name || 'Non renseigné' }}</p>
            <p><strong>Contact :</strong> {{ selectedComplaint.complainant_contact || 'Non renseigné' }}</p>
          </div>
        </div>
      </div>

      <!-- Historique des réponses transmises -->
      <div class="complaint-responses-box">
        <h3>Réponses & décisions communiquées au réclamant (CDC 3.3)</h3>
        <div v-if="!selectedComplaint.responses?.length" class="empty-inline">
          <p>Aucune réponse officielle n'a encore été consignée pour ce dossier.</p>
        </div>
        <div v-else class="responses-timeline">
          <div v-for="resp in selectedComplaint.responses" :key="resp.id" class="resp-bubble">
            <div class="bubble-header">
              <span class="decision-pill" :class="resp.decision_type">{{ resp.decision_type }}</span>
              <small>{{ resp.communicated_at }} via {{ resp.response_channel }}</small>
            </div>
            <p>{{ resp.response_content }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- MODAL 1: DÉCLARER UNE NON-CONFORMITÉ -->
    <AppModal v-model="createNcModal" title="Déclarer une non-conformité ou un écart" :busy="busy" size="wide">
      <form id="form-nc" class="form-body" @submit.prevent="saveNewNc">
        <div class="form-grid">
          <label>
            Titre de l'écart constaté *
            <input v-model="ncForm.title" required maxlength="180" placeholder="Ex: Erreur d’étiquetage lot B-442" />
          </label>
          <label>
            Domaine d'activité *
            <select v-model="ncForm.activity_domain">
              <option v-for="dom in activityDomains" :key="dom.id" :value="dom.id">{{ dom.label }}</option>
            </select>
          </label>
          <label>
            Gravité / Sévérité *
            <select v-model="ncForm.severity">
              <option value="mineure">Mineure (pas d’impact direct patient)</option>
              <option value="majeure">Majeure (défaillance procédure BPD)</option>
              <option value="critique">Critique (risque santé ou chaîne froid)</option>
            </select>
          </label>
          <label>
            Date de détection *
            <input v-model="ncForm.detection_date" type="date" required />
          </label>
        </div>
        <label>
          Description détaillée des faits *
          <textarea v-model="ncForm.description" required rows="3" placeholder="Circonstances précises sans données médicales nominatives..."></textarea>
        </label>
        <label>
          Mesures conservatoires immédiates prises
          <textarea v-model="ncForm.immediate_actions" rows="2" placeholder="Ex: Quarantaine du lot, rappel temporaire, substitution..."></textarea>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="createNcModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-nc" :disabled="busy">Enregistrer la déclaration</button>
      </template>
    </AppModal>

    <!-- MODAL 2: NOUVELLE RÉCLAMATION -->
    <AppModal v-model="createComplaintModal" title="Enregistrer une réclamation" :busy="busy" size="wide">
      <form id="form-complaint" class="form-body" @submit.prevent="saveNewComplaint">
        <div class="form-grid">
          <label>
            Canal de réception *
            <select v-model="complaintForm.channel">
              <option value="comptoir">Oral au comptoir</option>
              <option value="telephone">Appel téléphonique</option>
              <option value="email">Courrier électronique</option>
              <option value="courrier">Courrier postal</option>
              <option value="autre">Autre</option>
            </select>
          </label>
          <label>
            Type de réclamant *
            <select v-model="complaintForm.complainant_type">
              <option value="patient">Patient / Client</option>
              <option value="fournisseur">Fournisseur / Grossiste</option>
              <option value="prescripteur">Médecin / Prescripteur</option>
              <option value="autre">Autre tiers</option>
            </select>
          </label>
          <label>
            Catégorie de motif *
            <select v-model="complaintForm.category">
              <option value="dispensation">Dispensation ordonnance</option>
              <option value="produit_defectueux">Produit défectueux / avarié</option>
              <option value="facturation">Facturation / Prix / Tiers-payant</option>
              <option value="accueil_service">Qualité de l'accueil / Service</option>
              <option value="retard_livraison">Délai / Rupture de stock</option>
              <option value="autre">Autre motif</option>
            </select>
          </label>
          <label>
            Date de réception *
            <input v-model="complaintForm.received_date" type="date" required />
          </label>
        </div>
        <label>
          Objet de la réclamation *
          <input v-model="complaintForm.title" required maxlength="180" placeholder="Ex: Problème d'opercule sur boîte de gélules" />
        </label>
        <label>
          Description des faits signalés *
          <textarea v-model="complaintForm.description" required rows="3"></textarea>
        </label>
        <label>
          Solution ou compensation souhaitée par le réclamant
          <input v-model="complaintForm.desired_solution" placeholder="Ex: Remplacement du produit, explication pharmaceutique..." />
        </label>
        <fieldset class="anon-fieldset">
          <label class="checkbox-row">
            <input v-model="complaintForm.is_anonymous" type="checkbox" />
            <span>Réclamation anonyme (ne pas consigner le nom)</span>
          </label>
          <div v-if="!complaintForm.is_anonymous" class="form-grid">
            <label>
              Nom du réclamant
              <input v-model="complaintForm.complainant_name" placeholder="Nom et prénom" />
            </label>
            <label>
              Téléphone ou Email
              <input v-model="complaintForm.complainant_contact" placeholder="+229 ... ou email" />
            </label>
          </div>
        </fieldset>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="createComplaintModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-complaint" :disabled="busy">Enregistrer la réclamation</button>
      </template>
    </AppModal>

    <!-- MODAL 3: ANALYSE 5 POURQUOI (CDC 3.2) -->
    <AppModal v-model="rootCauseModal" title="Analyse des causes racines (5 Pourquoi)" :busy="busy" size="wide">
      <form id="form-root-cause" class="form-body" @submit.prevent="saveRootCauses">
        <p class="muted-note">Remontez la chaîne causale pour identifier le problème organisationnel sous-jacent.</p>
        <label>
          Pourquoi ? (1er niveau : fait immédiat)
          <input v-model="rootCauseForm.why_1" placeholder="Pourquoi l'écart s'est-il produit ?" />
        </label>
        <label>
          Pourquoi ? (2ème niveau)
          <input v-model="rootCauseForm.why_2" placeholder="Pourquoi cela s'est-il passé ?" />
        </label>
        <label>
          Pourquoi ? (3ème niveau)
          <input v-model="rootCauseForm.why_3" placeholder="Pourquoi ?" />
        </label>
        <label>
          Pourquoi ? (4ème niveau)
          <input v-model="rootCauseForm.why_4" placeholder="Pourquoi ?" />
        </label>
        <label>
          Pourquoi ? (5ème niveau : cause organisationnelle)
          <input v-model="rootCauseForm.why_5" placeholder="Pourquoi ?" />
        </label>
        <label>
          Cause racine fondamentale identifiée *
          <textarea v-model="rootCauseForm.main_cause" required rows="2" placeholder="Ex: Absence de double contrôle systématique lors de la mise en rayon..."></textarea>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="rootCauseModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-root-cause" :disabled="busy">Valider l'analyse</button>
      </template>
    </AppModal>

    <!-- MODAL 4: CRÉER ACTION CAPA (MODULE 04) -->
    <AppModal v-model="createCapaModal" title="Créer une action CAPA liée (Module 04)" :busy="busy">
      <form id="form-capa-m6" class="form-body" @submit.prevent="submitCapaAction">
        <label>
          Titre de l'action CAPA *
          <input v-model="capaForm.title" required maxlength="180" />
        </label>
        <label>
          Description de l'action corrective / préventive *
          <textarea v-model="capaForm.description" required rows="3"></textarea>
        </label>
        <label>
          Critère d'efficacité attendu (CDC 04 & 06) *
          <textarea v-model="capaForm.effectiveness_criteria" required minlength="8" rows="2" placeholder="Ex: Zéro récidive sur les 3 prochains inventaires tournants..."></textarea>
        </label>
        <div class="form-grid">
          <label>
            Responsable désigné *
            <select v-model="capaForm.owner_id">
              <option v-for="m in teamMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
          <label>
            Échéance *
            <input v-model="capaForm.due_date" type="date" required />
          </label>
          <label>
            Priorité
            <select v-model="capaForm.priority">
              <option value="low">Faible</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
            </select>
          </label>
        </div>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="createCapaModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-capa-m6" :disabled="busy">Créer l’action CAPA</button>
      </template>
    </AppModal>

    <!-- MODAL 5: REVUE D'EFFICACITÉ (CDC 3.5 & 7) -->
    <AppModal v-model="effectivenessModal" title="Revue d'efficacité avant clôture" :busy="busy">
      <form id="form-eff" class="form-body" @submit.prevent="submitEffectivenessReview">
        <label>
          Critères d'évaluation vérifiés *
          <textarea v-model="effectivenessForm.criteria_evaluated" required minlength="8" rows="2" placeholder="Mesures constatées sur pièces ou sur place..."></textarea>
        </label>
        <label class="checkbox-row">
          <input v-model="effectivenessForm.is_effective" type="checkbox" />
          <span><strong>L'action a éliminé la cause racine (efficacité démontrée)</strong></span>
        </label>
        <label>
          Observations & preuves observées
          <textarea v-model="effectivenessForm.observations" rows="2"></textarea>
        </label>
        <label>
          Décision
          <select v-model="effectivenessForm.decision">
            <option value="approve_closure">Approuver la clôture définitive</option>
            <option value="require_additional_actions">Exiger des actions complémentaires</option>
          </select>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="effectivenessModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-eff" :disabled="busy">Enregistrer la revue</button>
      </template>
    </AppModal>

    <!-- MODAL 6: CONSIGNER RÉPONSE RÉCLAMANT -->
    <AppModal v-model="complaintResponseModal" title="Consigner la réponse apportée au réclamant" :busy="busy">
      <form id="form-resp" class="form-body" @submit.prevent="submitComplaintResponse">
        <div class="form-grid">
          <label>
            Canal de communication *
            <select v-model="complaintResponseForm.response_channel">
              <option value="oral_comptoir">Oral au comptoir</option>
              <option value="telephone">Téléphone</option>
              <option value="email">Courrier électronique</option>
              <option value="courrier">Courrier postal</option>
            </select>
          </label>
          <label>
            Décision prise *
            <select v-model="complaintResponseForm.decision_type">
              <option value="favorable">Favorable (échange, remboursement, accord)</option>
              <option value="partielle">Partielle avec explications</option>
              <option value="defavorable">Défavorable motivée</option>
              <option value="sans_suite">Sans suite</option>
            </select>
          </label>
        </div>
        <label>
          Contenu de la réponse communiquée *
          <textarea v-model="complaintResponseForm.response_content" required rows="4" placeholder="Explications fournies et engagements pris..."></textarea>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="complaintResponseModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-resp" :disabled="busy">Enregistrer la réponse</button>
      </template>
    </AppModal>

    <!-- MODAL 7: CONVERTIR RÉCLAMATION EN NC -->
    <AppModal v-model="convertToNcModal" title="Générer une non-conformité depuis la réclamation" :busy="busy">
      <form id="form-conv-nc" class="form-body" @submit.prevent="convertComplaintToNc">
        <p class="muted-note">Crée une fiche de non-conformité liée sans ressaisie des données du patient (CDC 7).</p>
        <div class="form-grid">
          <label>
            Domaine d'activité *
            <select v-model="convertToNcForm.activity_domain">
              <option v-for="dom in activityDomains" :key="dom.id" :value="dom.id">{{ dom.label }}</option>
            </select>
          </label>
          <label>
            Gravité / Sévérité *
            <select v-model="convertToNcForm.severity">
              <option value="mineure">Mineure</option>
              <option value="majeure">Majeure</option>
              <option value="critique">Critique</option>
            </select>
          </label>
        </div>
        <label>
          Mesures conservatoires immédiates
          <textarea v-model="convertToNcForm.immediate_actions" rows="2" placeholder="Ex: Retrait du lot incriminé, rappel grossiste..."></textarea>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="convertToNcModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-conv-nc" :disabled="busy">Générer la non-conformité</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.severity-chips-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.sev-chip {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  background: var(--surface-card, #fff);
  border: 1px solid var(--surface-border, #e0e0e0);
  font-size: 0.85rem;
}

.sev-chip .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.sev-chip.critique .dot { background: #d93025; }
.sev-chip.critique { border-color: #fca5a5; }

.sev-chip.majeure .dot { background: #f59e0b; }
.sev-chip.majeure { border-color: #fde68a; }

.sev-chip.mineure .dot { background: #10b981; }
.sev-chip.mineure { border-color: #a7f3d0; }

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--surface-border, #e0e0e0);
  padding-bottom: 0.25rem;
}

.tab-btn {
  background: none;
  border: none;
  padding: 0.6rem 1rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-color-secondary, #666);
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tab-btn.active {
  color: var(--primary-color, #1a73e8);
  border-bottom: 2px solid var(--primary-color, #1a73e8);
  font-weight: 600;
}

.tab-btn.highlight {
  background: rgba(26, 115, 232, 0.08);
}

.filters-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.select-inline {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--surface-border, #ccc);
  border-radius: 6px;
  font-size: 0.85rem;
}

.domain-tag {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-size: 0.8rem;
}

.severity-badge {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.severity-badge.critique { background: #fee2e2; color: #b91c1c; }
.severity-badge.majeure { background: #fef3c7; color: #b45309; }
.severity-badge.mineure { background: #d1fae5; color: #047857; }

.anon-pill {
  font-size: 0.75rem;
  background: #f3f4f6;
  color: #4b5563;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.channel-pill {
  font-size: 0.8rem;
  color: #555;
  background: #eef2ff;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.nc-summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--surface-card, #fff);
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 8px;
  padding: 1rem;
}

.summary-card h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: var(--text-color-secondary, #666);
}

.root-cause-box {
  background: #f9fafb;
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.box-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.whys-stepper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.why-step {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.why-badge {
  font-size: 0.75rem;
  font-weight: 700;
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  min-width: 90px;
}

.cause-conclusion {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  border-radius: 4px;
}

.linked-capas-section,
.effectiveness-section,
.complaint-responses-box {
  background: var(--surface-card, #fff);
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.capa-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}

.capa-list li {
  padding: 0.6rem;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.review-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  background: #fff;
}

.review-item.effective {
  border-left: 4px solid #10b981;
}

.rev-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.rev-badge.ok {
  background: #d1fae5;
  color: #065f46;
  font-weight: 600;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.rev-badge.fail {
  background: #fee2e2;
  color: #991b1b;
  font-weight: 600;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.responses-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.resp-bubble {
  border: 1px solid #e0e7ff;
  background: #f5f7ff;
  border-radius: 6px;
  padding: 0.75rem;
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}

.decision-pill {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.decision-pill.favorable { background: #d1fae5; color: #047857; }
.decision-pill.partielle { background: #fef3c7; color: #b45309; }
.decision-pill.defavorable { background: #fee2e2; color: #b91c1c; }

.anon-fieldset {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  margin-top: 0.75rem;
}

.empty-inline {
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 6px;
}

.alert-warn {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}
</style>
