<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { demoMode, request } from '@/services/quality'

interface ProgramRow {
  id: number
  title: string
  year_start: number
  year_end: number
  objective: string
  status: string
  inspections_count?: number
}

interface InspectorItem {
  user_id: number
  role: 'lead' | 'inspector' | 'observer'
  regular_service: string
  conflict_check_passed: boolean
  conflict_notes?: string
}

interface ChecklistItem {
  id: number
  bpd_reference: string
  chapter: string
  requirement: string
  sort_order: number
  response?: {
    id: number
    status: 'conforme' | 'non_conforme' | 'non_applicable' | 'non_evalue'
    observed_facts: string | null
    evidence_notes: string | null
    finding_type: 'none' | 'strength' | 'weakness' | 'non_conformity'
  }
}

interface InspectionReportRow {
  id: number
  reference: string
  methodology: string
  summary_findings: string
  strengths: string | null
  weaknesses: string | null
  conclusions: string
  recommendations: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  rejection_reason?: string
  sha256_hash?: string
  approved_by?: number
  approved_at?: string
  approver?: { id: number; name: string; email: string }
}

interface InspectionRow {
  id: number
  reference: string
  title: string
  process_scope: string
  scope_description: string | null
  objective: string
  planned_date: string
  realized_date: string | null
  status: 'draft' | 'planned' | 'in_progress' | 'completed' | 'approved' | 'closed'
  version: number
  program_id: number | null
  lead_inspector_id: number
  program?: ProgramRow
  lead_inspector?: { id: number; name: string; email: string }
  inspectors?: { id: number; user_id: number; role: string; regular_service: string; conflict_check_passed: boolean; user?: { id: number; name: string } }[]
  items?: ChecklistItem[]
  report?: InspectionReportRow
  action_links?: { id: number; action_id: number; action?: { id: number; title: string; status: string } }[]
}

interface OverviewData {
  indicators: {
    total: number
    overdue: number
    coverage_rate: number
    coverage_label: string
    by_status: Record<string, number>
    definition: string
    updated_at: string
  }
  core_processes: string[]
  covered_processes: string[]
}

interface TeamMember {
  id: number
  name: string
  email: string
}

const route = useRoute()
const base = '/qualite/inspections'

const loading = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')

const overview = ref<OverviewData | null>(null)
const programs = ref<ProgramRow[]>([])
const inspections = ref<InspectionRow[]>([])
const selectedInspection = ref<InspectionRow | null>(null)
const teamMembers = ref<TeamMember[]>([])

const activeTab = ref<'list' | 'programs' | 'audit' | 'report'>('list')
const filterStatus = ref('all')
const searchQuery = ref('')

// Modals
const createInspectionModal = ref(false)
const createProgramModal = ref(false)
const createCapaModal = ref(false)
const evaluateInspectorModal = ref(false)

// Forms
const inspectionForm = reactive({
  program_id: null as number | null,
  title: '',
  process_scope: 'Locaux & Chaîne du Froid',
  scope_description: '',
  objective: '',
  planned_date: '',
  lead_inspector_id: 1,
  regular_service: 'Qualité & Réglementaire',
  conflict_check_passed: true,
  conflict_notes: 'Indépendance certifiée conforme CDC ABMed',
})

const programForm = reactive({
  title: '',
  year_start: new Date().getFullYear(),
  year_end: new Date().getFullYear() + 1,
  objective: '',
})

const capaForm = reactive({
  response_id: null as number | null,
  title: '',
  description: '',
  owner_id: 1,
  due_date: '',
  priority: 'high',
  effectiveness_criteria: '',
})

const evalForm = reactive({
  inspector_id: 1,
  methodology_score: 5,
  objectivity_score: 5,
  reporting_score: 5,
  comments: '',
})

const reportForm = reactive({
  methodology: 'Auto-inspection contradictoire sur pièces et sur place selon le référentiel BPD ABMed.',
  summary_findings: '',
  strengths: '',
  weaknesses: '',
  conclusions: '',
  recommendations: '',
})

// Checklist edit buffer
const responsesBuffer = ref<Record<number, {
  status: 'conforme' | 'non_conforme' | 'non_applicable' | 'non_evalue'
  observed_facts: string
  evidence_notes: string
  finding_type: 'none' | 'strength' | 'weakness' | 'non_conformity'
}>>({})

const coreProcessesList = [
  'Organisation Qualité',
  'Personnel & Habilitations',
  'Locaux & Chaîne du Froid',
  'Approvisionnement & Stockage',
  'Dispensation & Stupéfiants',
]

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  planned: 'Planifiée',
  in_progress: 'En cours terrain',
  completed: 'Réalisée',
  approved: 'Approuvée & Scellée',
  closed: 'Clôturée',
}

const filteredInspections = computed(() => {
  return inspections.value.filter((i) => {
    const matchStatus = filterStatus.value === 'all' || i.status === filterStatus.value
    const matchSearch =
      !searchQuery.value ||
      `${i.reference} ${i.title} ${i.process_scope}`
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase())
    return matchStatus && matchSearch
  })
})

async function loadData() {
  if (demoMode) {
    error.value = 'Le Module 05 Auto-inspections requiert le mode API connecté.'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const [ovRes, progRes, listRes, teamRes] = await Promise.all([
      request<OverviewData>(`${base}/overview`),
      request<{ data: ProgramRow[] }>(`${base}/programs`),
      request<{ data: { data: InspectionRow[] } }>(`${base}?per_page=50`),
      request<{ members: TeamMember[] }>('/team').catch(() => ({ members: [] })),
    ])
    overview.value = ovRes
    programs.value = progRes.data
    inspections.value = listRes.data.data
    teamMembers.value = teamRes.members?.length
      ? teamRes.members
      : [{ id: 1, name: 'Pharmacien Titulaire', email: 'titulaire@bestpharma.bj' }]

    if (selectedInspection.value) {
      await selectInspection(selectedInspection.value.id)
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function selectInspection(id: number) {
  try {
    const res = await request<{ data: InspectionRow }>(`${base}/${id}`)
    selectedInspection.value = res.data

    // Pré-remplir le buffer de réponses
    responsesBuffer.value = {}
    if (res.data.items) {
      for (const it of res.data.items) {
        responsesBuffer.value[it.id] = {
          status: it.response?.status || 'non_evalue',
          observed_facts: it.response?.observed_facts || '',
          evidence_notes: it.response?.evidence_notes || '',
          finding_type: it.response?.finding_type || 'none',
        }
      }
    }

    // Pré-remplir le rapport si existant
    if (res.data.report) {
      reportForm.methodology = res.data.report.methodology
      reportForm.summary_findings = res.data.report.summary_findings
      reportForm.strengths = res.data.report.strengths || ''
      reportForm.weaknesses = res.data.report.weaknesses || ''
      reportForm.conclusions = res.data.report.conclusions
      reportForm.recommendations = res.data.report.recommendations
    } else {
      reportForm.summary_findings = `Auto-inspection du processus ${res.data.process_scope} menée le ${res.data.planned_date}.`
      reportForm.strengths = 'Personnel coopératif, conformité aux procédures affichées.'
      reportForm.weaknesses = 'Points d’amélioration relevés sur la traçabilité continue.'
      reportForm.conclusions = 'Les exigences fondamentales BPD sont globalement respectées sous réserve des actions correctives.'
      reportForm.recommendations = 'Mettre en œuvre les actions CAPA Module 04 et réévaluer lors du prochain cycle.'
    }
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function saveNewInspection() {
  if (!inspectionForm.conflict_check_passed) {
    error.value = 'Règle BPD : Vous devez attester de l’absence de conflit d’indépendance de l’inspecteur.'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await request(base, 'POST', {
      program_id: inspectionForm.program_id,
      title: inspectionForm.title,
      process_scope: inspectionForm.process_scope,
      scope_description: inspectionForm.scope_description,
      objective: inspectionForm.objective,
      planned_date: inspectionForm.planned_date,
      lead_inspector_id: inspectionForm.lead_inspector_id,
      inspectors: [
        {
          user_id: inspectionForm.lead_inspector_id,
          role: 'lead',
          regular_service: inspectionForm.regular_service,
          conflict_check_passed: true,
          conflict_notes: inspectionForm.conflict_notes,
        },
      ],
    })
    notice.value = 'Nouvelle auto-inspection planifiée avec succès.'
    createInspectionModal.value = false
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function saveNewProgram() {
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/programs`, 'POST', programForm)
    notice.value = 'Programme pluriannuel créé avec succès.'
    createProgramModal.value = false
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function saveResponses() {
  if (!selectedInspection.value || !selectedInspection.value.items) return
  busy.value = true
  error.value = ''
  try {
    const payload = selectedInspection.value.items.map((it) => ({
      item_id: it.id,
      status: responsesBuffer.value[it.id]?.status || 'non_evalue',
      observed_facts: responsesBuffer.value[it.id]?.observed_facts || null,
      evidence_notes: responsesBuffer.value[it.id]?.evidence_notes || null,
      finding_type: responsesBuffer.value[it.id]?.finding_type || 'none',
    }))

    await request(`${base}/${selectedInspection.value.id}/responses`, 'POST', {
      responses: payload,
    })
    notice.value = 'Constats et évaluations terrain enregistrés avec succès.'
    await selectInspection(selectedInspection.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function triggerTransition(transition: 'start' | 'complete' | 'close') {
  if (!selectedInspection.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/${selectedInspection.value.id}/transition/${transition}`, 'POST')
    notice.value = `Transition de statut (${transition}) exécutée.`
    await selectInspection(selectedInspection.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function submitReport() {
  if (!selectedInspection.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/${selectedInspection.value.id}/report`, 'POST', reportForm)
    notice.value = 'Rapport formel d’auto-inspection soumis pour approbation.'
    await selectInspection(selectedInspection.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function signReport(decision: 'approve' | 'reject') {
  if (!selectedInspection.value) return
  const reason = decision === 'reject' ? window.prompt('Motif du rejet :') : null
  if (decision === 'reject' && !reason) return

  busy.value = true
  error.value = ''
  try {
    await request(`${base}/${selectedInspection.value.id}/sign`, 'POST', {
      decision,
      reason,
    })
    notice.value =
      decision === 'approve'
        ? 'Rapport approuvé et scellé avec l’empreinte cryptographique SHA-256.'
        : 'Rapport rejeté avec demande de révision.'
    await selectInspection(selectedInspection.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function openCapaBridge(item: ChecklistItem) {
  capaForm.response_id = item.response?.id || null
  capaForm.title = `CAPA M5 : ${item.bpd_reference} - ${item.requirement.slice(0, 50)}...`
  capaForm.description = `Constat lors de l'auto-inspection ${selectedInspection.value?.reference} (${selectedInspection.value?.process_scope}) :\n` +
    `Écart : ${item.requirement}\n` +
    `Faits observés : ${responsesBuffer.value[item.id]?.observed_facts || 'Non-conformité relevée sur le terrain.'}`
  capaForm.owner_id = selectedInspection.value?.lead_inspector_id || 1
  capaForm.due_date = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  capaForm.effectiveness_criteria = `Contrôle de conformité de l’exigence ${item.bpd_reference} avec preuve documentaire horodatée.`
  createCapaModal.value = true
}

async function submitCapaBridge() {
  if (!selectedInspection.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: { action: { id: number } } }>(
      `${base}/${selectedInspection.value.id}/actions`,
      'POST',
      capaForm
    )
    notice.value = `Action CAPA #${res.data.action.id} créée avec succès dans le Module 04.`
    createCapaModal.value = false
    await selectInspection(selectedInspection.value.id)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function submitInspectorEvaluation() {
  if (!selectedInspection.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/${selectedInspection.value.id}/evaluate-inspector`, 'POST', evalForm)
    notice.value = 'Évaluation de compétence de l’inspecteur enregistrée.'
    evaluateInspectorModal.value = false
    await selectInspection(selectedInspection.value.id)
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
        <p class="eyebrow">MODULE 05 · BONNES PRATIQUES DE DISPENSATION (BPD)</p>
        <h1>Auto-inspections <span class="accent-serif">& Conformité.</span></h1>
        <p class="page-subtitle">
          Programmes pluriannuels, audits terrain indépendants, grille BPD ABMed, rapports scellés SHA-256 et boucle CAPA.
        </p>
      </div>
      <div class="heading-actions">
        <button class="button secondary" @click="createProgramModal = true">
          <AppIcon name="plus" :size="16" /> Nouveau programme
        </button>
        <button class="button primary" @click="createInspectionModal = true">
          <AppIcon name="calendar" :size="16" /> Planifier auto-inspection
        </button>
      </div>
    </div>

    <!-- Bannière de notifications et d'erreurs -->
    <p v-if="demoMode" class="alert">Connectez-vous au mode API pour utiliser le Module 05.</p>
    <p v-if="error" class="alert error" role="alert">
      {{ error }} <button @click="loadData">Réessayer</button>
    </p>
    <p v-if="notice" class="alert success" role="status">
      {{ notice }} <button @click="notice = ''">×</button>
    </p>

    <!-- KPI Couverture BPD 2 ans (CDC 05) -->
    <section v-if="overview" class="panel bpd-coverage-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">EXIGENCE RÉGLEMENTAIRE BPD (CDC 5 & 6)</p>
          <h2>Taux de couverture des processus (cycle 2 ans)</h2>
        </div>
        <div class="coverage-badge" :class="overview.indicators.coverage_rate >= 100 ? 'conforme' : 'progress'">
          <strong>{{ overview.indicators.coverage_rate }}%</strong>
          <span>{{ overview.indicators.coverage_label }}</span>
        </div>
      </div>
      <div class="coverage-processes-grid">
        <div
          v-for="proc in coreProcessesList"
          :key="proc"
          class="proc-chip"
          :class="{ covered: overview.covered_processes.includes(proc) }"
        >
          <span class="proc-icon">
            <AppIcon :name="overview.covered_processes.includes(proc) ? 'check' : 'clock'" :size="15" />
          </span>
          <span class="proc-name">{{ proc }}</span>
          <span class="proc-tag">
            {{ overview.covered_processes.includes(proc) ? 'Audité < 24 mois' : 'À planifier' }}
          </span>
        </div>
      </div>
    </section>

    <!-- Mini stats récapitulatives -->
    <div v-if="overview" class="mini-stats">
      <span>{{ overview.indicators.total }} <small>inspections au total</small></span>
      <span>{{ overview.indicators.by_status.in_progress || 0 }} <small>en cours terrain</small></span>
      <span :class="{ 'overdue-text': overview.indicators.overdue > 0 }">
        {{ overview.indicators.overdue }} <small>en retard de réalisation</small>
      </span>
      <span>{{ overview.indicators.by_status.approved || 0 }} <small>rapports scellés</small></span>
    </div>

    <!-- Navigation par onglets -->
    <div class="tabs-nav">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'list' }"
        @click="activeTab = 'list'"
      >
        <AppIcon name="calendar" :size="16" /> Registre des auto-inspections ({{ inspections.length }})
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'programs' }"
        @click="activeTab = 'programs'"
      >
        <AppIcon name="documents" :size="16" /> Programmes pluriannuels ({{ programs.length }})
      </button>
      <button
        v-if="selectedInspection"
        class="tab-btn highlight"
        :class="{ active: activeTab === 'audit' }"
        @click="activeTab = 'audit'"
      >
        <AppIcon name="quality" :size="16" /> Pointage Terrain : {{ selectedInspection.reference }}
      </button>
      <button
        v-if="selectedInspection"
        class="tab-btn highlight"
        :class="{ active: activeTab === 'report' }"
        @click="activeTab = 'report'"
      >
        <AppIcon name="documents" :size="16" /> Rapport & Scellement SHA-256
      </button>
    </div>

    <!-- TAB 1: LISTE DES INSPECTIONS -->
    <section v-if="activeTab === 'list'" class="panel">
      <div class="table-toolbar">
        <div class="tabs">
          <button
            v-for="st in [
              { id: 'all', label: 'Toutes' },
              { id: 'planned', label: 'Planifiées' },
              { id: 'in_progress', label: 'En cours' },
              { id: 'completed', label: 'Réalisées' },
              { id: 'approved', label: 'Approuvées' },
              { id: 'closed', label: 'Clôturées' },
            ]"
            :key="st.id"
            :class="{ selected: filterStatus === st.id }"
            @click="filterStatus = st.id"
          >
            {{ st.label }}
          </button>
        </div>
        <label class="search-field">
          <AppIcon name="search" :size="16" />
          <input v-model="searchQuery" placeholder="Rechercher par référence, domaine..." />
        </label>
      </div>

      <p v-if="loading" role="status">Chargement des auto-inspections…</p>
      <div v-else-if="!filteredInspections.length" class="empty-state">
        <AppIcon name="quality" :size="36" />
        <h3>Aucune auto-inspection trouvée</h3>
        <p>Commencez par planifier votre première auto-inspection conformément au référentiel BPD.</p>
        <button class="button primary" @click="createInspectionModal = true">Planifier maintenant</button>
      </div>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>RÉFÉRENCE & TITRE</th>
              <th>PROCESSUS AUDITÉ</th>
              <th>DATE PRÉVUE</th>
              <th>LEAD INSPECTEUR</th>
              <th>STATUT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="insp in filteredInspections" :key="insp.id">
              <td>
                <button class="table-title" @click="selectInspection(insp.id); activeTab = 'audit'">
                  <strong>{{ insp.reference }}</strong> — {{ insp.title }}
                </button>
                <small v-if="insp.program" class="table-subtitle">
                  Programme {{ insp.program.year_start }}-{{ insp.program.year_end }}
                </small>
              </td>
              <td>
                <span class="scope-tag">{{ insp.process_scope }}</span>
              </td>
              <td>{{ insp.planned_date }}</td>
              <td>
                <span class="user-pill">{{ insp.lead_inspector?.name || 'ID #' + insp.lead_inspector_id }}</span>
              </td>
              <td>
                <span class="status-badge" :class="insp.status">
                  {{ statusLabels[insp.status] || insp.status }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button
                    class="button small secondary"
                    title="Ouvrir le pointage terrain"
                    @click="selectInspection(insp.id); activeTab = 'audit'"
                  >
                    Pointage
                  </button>
                  <button
                    class="button small primary"
                    title="Consulter le rapport"
                    @click="selectInspection(insp.id); activeTab = 'report'"
                  >
                    Rapport
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB 2: PROGRAMMES PLURIANNUELS -->
    <section v-if="activeTab === 'programs'" class="panel">
      <div class="panel-heading">
        <div>
          <h2>Programmes pluriannuels d'auto-inspection</h2>
          <p class="muted-note">Le programme formalise le cycle de couverture complet de l’officine sur 2 ans (CDC 3.1).</p>
        </div>
        <button class="button primary small" @click="createProgramModal = true">
          <AppIcon name="plus" :size="14" /> Nouveau programme
        </button>
      </div>

      <div v-if="!programs.length" class="empty-state">
        <p>Aucun programme pluriannuel enregistré.</p>
      </div>
      <div v-else class="programs-grid">
        <div v-for="prog in programs" :key="prog.id" class="program-card">
          <div class="card-header">
            <h3>{{ prog.title }}</h3>
            <span class="period-pill">{{ prog.year_start }} — {{ prog.year_end }}</span>
          </div>
          <p class="card-desc">{{ prog.objective }}</p>
          <div class="card-footer">
            <span class="counter">
              <strong>{{ prog.inspections_count || 0 }}</strong> inspection(s) rattachée(s)
            </span>
            <span class="status-badge active">{{ prog.status }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 3: POINTAGE TERRAIN & GRILLE BPD -->
    <section v-if="activeTab === 'audit' && selectedInspection" class="panel audit-section">
      <div class="panel-heading audit-header">
        <div>
          <span class="eyebrow">DÉROULEMENT TERRAIN · {{ selectedInspection.reference }}</span>
          <h2>{{ selectedInspection.title }}</h2>
          <p class="muted-note">
            Domaine : <strong>{{ selectedInspection.process_scope }}</strong> ·
            Lead : <strong>{{ selectedInspection.lead_inspector?.name || '#' + selectedInspection.lead_inspector_id }}</strong> ·
            Statut actuel : <span class="status-badge" :class="selectedInspection.status">{{ statusLabels[selectedInspection.status] }}</span>
          </p>
        </div>
        <div class="heading-actions">
          <button
            v-if="['draft', 'planned'].includes(selectedInspection.status)"
            class="button secondary"
            :disabled="busy"
            @click="triggerTransition('start')"
          >
            Démarrer l’audit terrain
          </button>
          <button
            v-if="selectedInspection.status === 'in_progress'"
            class="button primary"
            :disabled="busy"
            @click="triggerTransition('complete')"
          >
            Marquer terrain réalisé
          </button>
          <button
            class="button secondary"
            @click="evaluateInspectorModal = true"
          >
            Évaluer l’inspecteur
          </button>
          <button
            class="button primary"
            :disabled="busy"
            @click="saveResponses"
          >
            Enregistrer les constats
          </button>
        </div>
      </div>

      <!-- Avertissement Indépendance BPD -->
      <div class="info-banner">
        <AppIcon name="quality" :size="18" />
        <div>
          <strong>Garantie d'indépendance de l'équipe d'audit (CDC 3.1 & 7)</strong>
          <p>Les auditeurs n'inspectent pas leur propre service. Toute non-conformité relevée peut être transformée en action CAPA sans ressaisie.</p>
        </div>
      </div>

      <!-- Grille des questions BPD -->
      <div class="checklist-container">
        <div
          v-for="item in selectedInspection.items"
          :key="item.id"
          class="checklist-card"
          :class="responsesBuffer[item.id]?.status"
        >
          <div class="card-top">
            <span class="bpd-ref">{{ item.bpd_reference }}</span>
            <div class="evaluation-radios">
              <label class="radio-label conforme">
                <input
                  v-model="responsesBuffer[item.id].status"
                  type="radio"
                  value="conforme"
                />
                Conforme
              </label>
              <label class="radio-label non_conforme">
                <input
                  v-model="responsesBuffer[item.id].status"
                  type="radio"
                  value="non_conforme"
                />
                Non conforme
              </label>
              <label class="radio-label non_applicable">
                <input
                  v-model="responsesBuffer[item.id].status"
                  type="radio"
                  value="non_applicable"
                />
                Non applicable
              </label>
              <label class="radio-label non_evalue">
                <input
                  v-model="responsesBuffer[item.id].status"
                  type="radio"
                  value="non_evalue"
                />
                Non évalué
              </label>
            </div>
          </div>

          <p class="requirement-text">{{ item.requirement }}</p>

          <div class="findings-grid">
            <label>
              Faits observés et constats précis sur place :
              <textarea
                v-model="responsesBuffer[item.id].observed_facts"
                rows="2"
                placeholder="Ex: Température relevée à 5.4°C, conforme au carnet..."
              ></textarea>
            </label>
            <label>
              Preuves documentaires / Références vérifiées :
              <input
                v-model="responsesBuffer[item.id].evidence_notes"
                placeholder="Ex: Registre R-2026-04 p.12, fiche SOP-LOC-01"
              />
            </label>
          </div>

          <!-- Passerelle CAPA si non-conforme -->
          <div v-if="responsesBuffer[item.id]?.status === 'non_conforme'" class="capa-bridge-alert">
            <span>Point non conforme relevé sur le terrain.</span>
            <button
              type="button"
              class="button small danger"
              @click="openCapaBridge(item)"
            >
              Créer action CAPA (Module 04)
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 4: RAPPORT FORMEL & SCELLEMENT SHA-256 -->
    <section v-if="activeTab === 'report' && selectedInspection" class="panel report-section">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">RAPPORT FORMEL · {{ selectedInspection.reference }}</span>
          <h2>Rapport d'auto-inspection & Traçabilité</h2>
          <p class="muted-note">Conformité CDC 3.4 : Le rapport approuvé par le Titulaire est immuable et scellé par empreinte SHA-256.</p>
        </div>
        <div class="heading-actions">
          <button
            v-if="selectedInspection.report?.status !== 'approved'"
            class="button secondary"
            :disabled="busy"
            @click="submitReport"
          >
            Soumettre pour approbation
          </button>
          <button
            v-if="selectedInspection.report?.status === 'submitted'"
            class="button primary"
            :disabled="busy"
            @click="signReport('approve')"
          >
            Approuver & Sceller (SHA-256)
          </button>
          <button
            v-if="selectedInspection.report?.status === 'submitted'"
            class="button danger small"
            :disabled="busy"
            @click="signReport('reject')"
          >
            Demander révision
          </button>
        </div>
      </div>

      <!-- Tampon d'intégrité SHA-256 si scellé -->
      <div v-if="selectedInspection.report?.status === 'approved'" class="tamper-seal-box">
        <div class="seal-header">
          <AppIcon name="quality" :size="24" />
          <div>
            <h3>Rapport Scellé et Immuable (SHA-256)</h3>
            <p>
              Signé par <strong>{{ selectedInspection.report.approver?.name || 'Pharmacien Titulaire' }}</strong>
              le {{ selectedInspection.report.approved_at }}.
            </p>
          </div>
        </div>
        <div class="seal-hash">
          <code>SHA-256: {{ selectedInspection.report.sha256_hash }}</code>
        </div>
        <p class="seal-note">Ce document fait foi auprès des autorités ABMed lors des audits externes de conformité.</p>
      </div>

      <!-- Formulaire du rapport -->
      <div class="report-form">
        <label>
          Méthodologie d'inspection :
          <textarea
            v-model="reportForm.methodology"
            :disabled="selectedInspection.report?.status === 'approved'"
            rows="2"
          ></textarea>
        </label>
        <label>
          Synthèse des constats :
          <textarea
            v-model="reportForm.summary_findings"
            :disabled="selectedInspection.report?.status === 'approved'"
            rows="3"
          ></textarea>
        </label>
        <div class="form-grid">
          <label>
            Points forts identifiés :
            <textarea
              v-model="reportForm.strengths"
              :disabled="selectedInspection.report?.status === 'approved'"
              rows="3"
            ></textarea>
          </label>
          <label>
            Faiblesses et risques d'écart :
            <textarea
              v-model="reportForm.weaknesses"
              :disabled="selectedInspection.report?.status === 'approved'"
              rows="3"
            ></textarea>
          </label>
        </div>
        <label>
          Conclusions générales :
          <textarea
            v-model="reportForm.conclusions"
            :disabled="selectedInspection.report?.status === 'approved'"
            rows="2"
          ></textarea>
        </label>
        <label>
          Recommandations et suites à donner :
          <textarea
            v-model="reportForm.recommendations"
            :disabled="selectedInspection.report?.status === 'approved'"
            rows="2"
          ></textarea>
        </label>
      </div>

      <!-- Actions CAPA rattachées au rapport -->
      <div class="linked-capas-panel">
        <h3>Actions CAPA liées (Module 04)</h3>
        <p v-if="!selectedInspection.action_links?.length" class="muted-note">
          Aucune action CAPA n'a encore été rattachée à cette auto-inspection.
        </p>
        <ul v-else class="capa-links-list">
          <li v-for="l in selectedInspection.action_links" :key="l.id">
            Action #{{ l.action_id }} : <strong>{{ l.action?.title }}</strong>
            <span class="status-badge" :class="l.action?.status">{{ l.action?.status }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- MODAL 1: PLANIFIER UNE AUTO-INSPECTION -->
    <AppModal
      v-model="createInspectionModal"
      title="Planifier une auto-inspection BPD"
      :busy="busy"
      size="wide"
    >
      <form id="form-plan-insp" class="form-body" @submit.prevent="saveNewInspection">
        <div class="form-grid">
          <label>
            Titre de la mission *
            <input
              v-model="inspectionForm.title"
              required
              maxlength="180"
              placeholder="Ex: Audit semestriel Chaîne du froid et locaux"
            />
          </label>
          <label>
            Domaine / Processus BPD *
            <select v-model="inspectionForm.process_scope">
              <option v-for="proc in coreProcessesList" :key="proc" :value="proc">{{ proc }}</option>
            </select>
          </label>
          <label>
            Programme pluriannuel
            <select v-model="inspectionForm.program_id">
              <option :value="null">-- Aucun (Hors programme) --</option>
              <option v-for="p in programs" :key="p.id" :value="p.id">
                {{ p.title }} ({{ p.year_start }}-{{ p.year_end }})
              </option>
            </select>
          </label>
          <label>
            Date prévue *
            <input v-model="inspectionForm.planned_date" type="date" required />
          </label>
        </div>

        <label>
          Objectif de l'auto-inspection *
          <textarea
            v-model="inspectionForm.objective"
            required
            rows="2"
            maxlength="2000"
            placeholder="Vérifier la conformité continue aux exigences BPD ABMed..."
          ></textarea>
        </label>

        <!-- RÈGLE STRICTE D'INDÉPENDANCE -->
        <fieldset class="independence-box">
          <legend>Contrôle d'indépendance de l'auditeur (CDC 3.1 & 7)</legend>
          <div class="form-grid">
            <label>
              Lead inspecteur désigné *
              <select v-model="inspectionForm.lead_inspector_id">
                <option v-for="m in teamMembers" :key="m.id" :value="m.id">{{ m.name }} ({{ m.email }})</option>
              </select>
            </label>
            <label>
              Service régulier de l'inspecteur
              <input v-model="inspectionForm.regular_service" placeholder="Ex: Qualité, Dispensation..." />
            </label>
          </div>
          <label class="checkbox-row">
            <input v-model="inspectionForm.conflict_check_passed" type="checkbox" required />
            <span>
              <strong>Attestation d'absence de conflit d'intérêt :</strong> L'inspecteur n'est pas le responsable
              direct des opérations auditées pour ce domaine.
            </span>
          </label>
        </fieldset>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="createInspectionModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-plan-insp" :disabled="busy">Planifier l’inspection</button>
      </template>
    </AppModal>

    <!-- MODAL 2: CRÉER UN PROGRAMME PLURIANNUEL -->
    <AppModal
      v-model="createProgramModal"
      title="Nouveau programme pluriannuel BPD"
      :busy="busy"
    >
      <form id="form-prog" class="form-body" @submit.prevent="saveNewProgram">
        <label>
          Titre du programme *
          <input
            v-model="programForm.title"
            required
            placeholder="Ex: Programme d’auto-inspection 2026-2027"
          />
        </label>
        <div class="form-grid">
          <label>
            Année début *
            <input v-model.number="programForm.year_start" type="number" min="2020" max="2050" required />
          </label>
          <label>
            Année fin *
            <input v-model.number="programForm.year_end" type="number" min="2020" max="2055" required />
          </label>
        </div>
        <label>
          Objectif de couverture *
          <textarea
            v-model="programForm.objective"
            required
            rows="3"
            placeholder="Couvrir les 5 processus fondamentaux BPD de l’officine sur un cycle de 24 mois..."
          ></textarea>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="createProgramModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-prog" :disabled="busy">Enregistrer le programme</button>
      </template>
    </AppModal>

    <!-- MODAL 3: PASSERELLE 1-CLIC CAPA MODULE 04 -->
    <AppModal
      v-model="createCapaModal"
      title="Créer une action CAPA liée (Module 04)"
      :busy="busy"
    >
      <form id="form-capa" class="form-body" @submit.prevent="submitCapaBridge">
        <label>
          Titre de l'action CAPA *
          <input v-model="capaForm.title" required maxlength="180" />
        </label>
        <label>
          Description de l'écart constaté *
          <textarea v-model="capaForm.description" required rows="3"></textarea>
        </label>
        <label>
          Critère d'efficacité attendu (CDC 04) *
          <textarea
            v-model="capaForm.effectiveness_criteria"
            required
            minlength="8"
            rows="2"
            placeholder="Critère mesurable d'efficacité (minimum 8 caractères)..."
          ></textarea>
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
        <button class="button primary" type="submit" form="form-capa" :disabled="busy">Créer l’action CAPA</button>
      </template>
    </AppModal>

    <!-- MODAL 4: ÉVALUATION DE L'INSPECTEUR -->
    <AppModal
      v-model="evaluateInspectorModal"
      title="Évaluation de la compétence de l'inspecteur"
      :busy="busy"
    >
      <form id="form-eval" class="form-body" @submit.prevent="submitInspectorEvaluation">
        <div class="form-grid">
          <label>
            Score Méthodologie (1-5) *
            <input v-model.number="evalForm.methodology_score" type="number" min="1" max="5" required />
          </label>
          <label>
            Score Objectivité (1-5) *
            <input v-model.number="evalForm.objectivity_score" type="number" min="1" max="5" required />
          </label>
          <label>
            Score Rédaction rapport (1-5) *
            <input v-model.number="evalForm.reporting_score" type="number" min="1" max="5" required />
          </label>
        </div>
        <label>
          Observations & axes de perfectionnement :
          <textarea v-model="evalForm.comments" rows="3"></textarea>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="evaluateInspectorModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-eval" :disabled="busy">Enregistrer l’évaluation</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.bpd-coverage-panel {
  background: linear-gradient(135deg, rgba(20, 60, 40, 0.04), rgba(40, 140, 90, 0.08));
  border: 1px solid rgba(40, 140, 90, 0.25);
  margin-bottom: 1.5rem;
}

.coverage-badge {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: var(--surface-card, #fff);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.coverage-badge strong {
  font-size: 1.6rem;
  color: #107548;
}

.coverage-badge span {
  font-size: 0.8rem;
  color: var(--text-color-secondary, #666);
}

.coverage-processes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.proc-chip {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: var(--surface-card, #fff);
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.proc-chip.covered {
  border-color: #2bb673;
  background: #f0faf5;
}

.proc-chip .proc-name {
  font-weight: 600;
  font-size: 0.85rem;
  margin: 0.35rem 0;
}

.proc-chip .proc-tag {
  font-size: 0.75rem;
  color: #888;
}

.proc-chip.covered .proc-tag {
  color: #107548;
  font-weight: 500;
}

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

.scope-tag {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.row-actions {
  display: flex;
  gap: 0.4rem;
}

.programs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.program-card {
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 8px;
  padding: 1.25rem;
  background: var(--surface-card, #fff);
  display: flex;
  flex-direction: column;
}

.program-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.period-pill {
  font-size: 0.8rem;
  font-weight: 600;
  background: #eef3fc;
  color: #1a73e8;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.card-desc {
  font-size: 0.85rem;
  color: #555;
  flex-grow: 1;
}

.card-footer {
  margin-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
}

.info-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: #eef6ff;
  border-left: 4px solid #1a73e8;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 4px;
}

.checklist-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checklist-card {
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 8px;
  padding: 1rem;
  background: var(--surface-card, #fff);
  transition: all 0.2s ease;
}

.checklist-card.non_conforme {
  border-left: 5px solid #d93025;
  background: #fffafa;
}

.checklist-card.conforme {
  border-left: 5px solid #188038;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.bpd-ref {
  font-weight: 700;
  color: #1a73e8;
  background: rgba(26, 115, 232, 0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
}

.evaluation-radios {
  display: flex;
  gap: 0.75rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.radio-label.conforme { color: #188038; }
.radio-label.non_conforme { color: #d93025; font-weight: 600; }
.radio-label.non_applicable { color: #666; }
.radio-label.non_evalue { color: #888; }

.requirement-text {
  font-size: 0.95rem;
  font-weight: 500;
  margin: 0.5rem 0 1rem;
  color: #222;
}

.findings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.findings-grid label {
  font-size: 0.8rem;
  color: #555;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.capa-bridge-alert {
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: #fde8e8;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #9b1c1c;
  font-size: 0.85rem;
}

.tamper-seal-box {
  background: #f0fdf4;
  border: 2px solid #22c55e;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.seal-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #15803d;
}

.seal-hash {
  margin: 0.75rem 0;
  padding: 0.5rem;
  background: #fff;
  border: 1px dashed #22c55e;
  border-radius: 4px;
}

.seal-hash code {
  font-family: monospace;
  font-size: 0.85rem;
  color: #166534;
  word-break: break-all;
}

.seal-note {
  font-size: 0.8rem;
  color: #4b5563;
  margin: 0;
}

.report-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.report-form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-weight: 500;
  font-size: 0.9rem;
}

.linked-capas-panel {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--surface-border, #e0e0e0);
}

.capa-links-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}

.capa-links-list li {
  padding: 0.5rem;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.independence-box {
  border: 1px solid #c7d2fe;
  background: #f5f7ff;
  border-radius: 6px;
  padding: 1rem;
  margin-top: 1rem;
}

.independence-box legend {
  font-weight: 600;
  color: #3730a3;
  padding: 0 0.5rem;
}

.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  cursor: pointer;
}
</style>
