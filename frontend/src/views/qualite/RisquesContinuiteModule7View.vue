<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { demoMode, request as liveRequest } from '@/services/quality'
import { boardRequest } from '@/services/cdcBoardsDemo'
const request = demoMode ? boardRequest : liveRequest

interface AssessmentRow {
  id: number
  assessment_type: 'initial' | 'residual'
  probability: number
  impact: number
  score: number
  criticality_level: 'faible' | 'modere' | 'eleve' | 'critique'
  grid_version: string
  rationale: string | null
  evaluated_at: string
  evaluator?: { id: number; name: string }
}

interface RiskRow {
  id: number
  reference: string
  type: 'risk' | 'opportunity'
  process_scope: string
  title: string
  description: string
  causes: string | null
  consequences: string | null
  owner_id: number
  status: 'identified' | 'evaluated' | 'mitigated' | 'accepted' | 'closed'
  version: number
  owner?: { id: number; name: string }
  initial_assessment?: AssessmentRow
  residual_assessment?: AssessmentRow
  action_links?: { id: number; action_id: number; mitigation_strategy: string }[]
}

interface CrisisContact {
  role: string
  name: string
  phone: string
}

interface ContinuityExerciseRow {
  id: number
  title: string
  test_type: 'simulation' | 'reel' | 'revue_sur_table'
  exercise_date: string
  measured_recovery_minutes: number | null
  is_successful: boolean
  findings: string | null
  improvement_points: string | null
  conductor?: { id: number; name: string }
}

interface ContinuityScenarioRow {
  id: number
  reference: string
  title: string
  threat_type: string
  trigger_events: string
  immediate_actions: string
  alternative_operations: string
  rto_hours: number
  coordinator_id: number
  crisis_contacts: CrisisContact[]
  status: 'draft' | 'active' | 'under_revision' | 'archived'
  version: number
  coordinator?: { id: number; name: string }
  exercises?: ContinuityExerciseRow[]
}

interface OverviewData {
  indicators: {
    total_risks: number
    total_opportunities: number
    by_criticality: Record<string, number>
    pca_active_scenarios: number
    pca_exercises_conducted: number
    pca_average_rto_hours: number | null
    definition: string
    updated_at: string
  }
}

interface TeamMember {
  id: number
  name: string
  email: string
}

const base = '/qualite/risques'

const loading = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')

const overview = ref<OverviewData | null>(null)
const risks = ref<RiskRow[]>([])
const scenarios = ref<ContinuityScenarioRow[]>([])
const selectedRisk = ref<RiskRow | null>(null)
const selectedScenario = ref<ContinuityScenarioRow | null>(null)
const teamMembers = ref<TeamMember[]>([])

const activeTab = ref<'risks' | 'pca' | 'risk_detail' | 'scenario_detail'>('risks')
const sections = computed(() => {
  const items: { key: typeof activeTab.value; label: string }[] = [
    { key: 'risks', label: `Cartographie des Risques & Opportunités (${risks.value.length})` },
    { key: 'pca', label: `Plan de Continuité d’Activité (${scenarios.value.length})` },
  ]
  if (selectedRisk.value) {
    items.push({ key: 'risk_detail', label: `Détail : ${selectedRisk.value.reference}` })
  }
  if (selectedScenario.value) {
    items.push({ key: 'scenario_detail', label: `Scénario PCA : ${selectedScenario.value.reference}` })
  }
  return items
})
function onTab(value: string) {
  activeTab.value = value as typeof activeTab.value
}
const filterType = ref<'all' | 'risk' | 'opportunity'>('all')
const filterCriticality = ref('all')
const searchQuery = ref('')

// Modals
const createRiskModal = ref(false)
const assessModal = ref(false)
const createCapaModal = ref(false)
const createScenarioModal = ref(false)
const logExerciseModal = ref(false)

// Forms
const riskForm = reactive({
  type: 'risk' as 'risk' | 'opportunity',
  process_scope: 'Locaux & Matériel',
  title: '',
  description: '',
  causes: '',
  consequences: '',
  owner_id: 1,
  initial_probability: 2,
  initial_impact: 3,
  rationale: '',
})

const assessForm = reactive({
  assessment_type: 'residual' as 'initial' | 'residual',
  probability: 1,
  impact: 2,
  rationale: '',
})

const capaForm = reactive({
  title: '',
  description: '',
  owner_id: 1,
  due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
  priority: 'high',
  mitigation_strategy: 'reduce',
  effectiveness_criteria: '',
})

const scenarioForm = reactive({
  title: '',
  threat_type: 'coupure_energie',
  trigger_events: '',
  immediate_actions: '',
  alternative_operations: '',
  rto_hours: 4,
  coordinator_id: 1,
  contacts_text: 'Technicien Groupe: M. Dossou (+229 97 11 22 33)\nPharmacien Astreinte: Dr Mensah (+229 95 44 55 66)',
})

const exerciseForm = reactive({
  title: '',
  test_type: 'simulation' as 'simulation' | 'reel' | 'revue_sur_table',
  exercise_date: new Date().toISOString().split('T')[0],
  measured_recovery_minutes: 15,
  is_successful: true,
  findings: '',
  improvement_points: '',
})

const processScopes = [
  'Locaux & Matériel',
  'Chaîne du froid',
  'Dispensation & Comptoir',
  'Approvisionnement & Stockage',
  'Personnel & Habilitations',
  'Système Informatique & Données',
  'Organisation Qualité',
]

const threatTypes = [
  { id: 'coupure_energie', label: 'Coupure d’énergie électrique prolongée' },
  { id: 'rupture_stock', label: 'Rupture d’approvisionnement médicaments vitaux' },
  { id: 'sinistre_inondation', label: 'Sinistre, inondation ou dégât des eaux' },
  { id: 'panne_informatique', label: 'Panne système informatique ou cyberattaque' },
  { id: 'indisponibilite_personnel', label: 'Indisponibilité soudaine de personnel clé' },
  { id: 'autre', label: 'Autre événement de force majeure' },
]

const calculatedScore = computed(() => assessForm.probability * assessForm.impact)
const calculatedLevel = computed(() => {
  const s = calculatedScore.value
  if (s >= 13) return 'critique'
  if (s >= 9) return 'eleve'
  if (s >= 5) return 'modere'
  return 'faible'
})

const filteredRisks = computed(() => {
  return risks.value.filter((r) => {
    const matchType = filterType.value === 'all' || r.type === filterType.value
    const currentLevel = r.residual_assessment?.criticality_level || r.initial_assessment?.criticality_level || 'non_evalue'
    const matchCrit = filterCriticality.value === 'all' || currentLevel === filterCriticality.value
    const matchSearch =
      !searchQuery.value ||
      `${r.reference} ${r.title} ${r.process_scope}`
        .toLowerCase()
        .includes(searchQuery.value.toLowerCase())
    return matchType && matchCrit && matchSearch
  })
})

async function loadData() {
  loading.value = true
  error.value = ''
  try {
    const [ovRes, risksRes, scenRes, teamRes] = await Promise.all([
      request<OverviewData>(`${base}/overview`),
      request<{ data: { data: RiskRow[] } }>(`${base}?per_page=50`),
      request<{ data: ContinuityScenarioRow[] }>(`${base}/pca/scenarios`),
      request<{ members: TeamMember[] }>('/team').catch(() => ({ members: [] })),
    ])
    overview.value = ovRes
    risks.value = risksRes.data.data
    scenarios.value = scenRes.data
    teamMembers.value = teamRes.members?.length
      ? teamRes.members
      : [{ id: 1, name: 'Pharmacien Titulaire', email: 'titulaire@bestpharma.bj' }]

    if (selectedRisk.value) {
      await selectRisk(selectedRisk.value.id)
    }
    if (selectedScenario.value) {
      await selectScenario(selectedScenario.value.id)
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function selectRisk(id: number) {
  try {
    const res = await request<{ data: RiskRow }>(`${base}/${id}`)
    selectedRisk.value = res.data
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function selectScenario(id: number) {
  try {
    const res = await request<{ data: ContinuityScenarioRow }>(`${base}/pca/scenarios/${id}`)
    selectedScenario.value = res.data
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function saveNewRisk() {
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: RiskRow }>(base, 'POST', riskForm)
    notice.value = `${riskForm.type === 'risk' ? 'Risque' : 'Opportunité'} ${res.data.reference} enregistré(e).`
    createRiskModal.value = false
    await loadData()
    await selectRisk(res.data.id)
    activeTab.value = 'risk_detail'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function openAssessModal(type: 'initial' | 'residual') {
  assessForm.assessment_type = type
  if (type === 'residual') {
    assessForm.probability = selectedRisk.value?.residual_assessment?.probability || 1
    assessForm.impact = selectedRisk.value?.residual_assessment?.impact || 2
    assessForm.rationale = selectedRisk.value?.residual_assessment?.rationale || ''
  } else {
    assessForm.probability = selectedRisk.value?.initial_assessment?.probability || 2
    assessForm.impact = selectedRisk.value?.initial_assessment?.impact || 3
    assessForm.rationale = selectedRisk.value?.initial_assessment?.rationale || ''
  }
  assessModal.value = true
}

async function submitAssessment() {
  if (!selectedRisk.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/${selectedRisk.value.id}/assess`, 'POST', assessForm)
    notice.value = `Évaluation ${assessForm.assessment_type === 'initial' ? 'initiale (brute)' : 'résiduelle (nette)'} enregistrée.`
    assessModal.value = false
    await selectRisk(selectedRisk.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function openCapaModal() {
  if (!selectedRisk.value) return
  capaForm.title = `Mesure de maîtrise : ${selectedRisk.value.title.slice(0, 50)}...`
  capaForm.description = `Traitement du risque ${selectedRisk.value.reference} (${selectedRisk.value.process_scope}) :\n` +
    `Causes : ${selectedRisk.value.causes || 'Non spécifiées'}\n` +
    `Conséquences : ${selectedRisk.value.consequences || 'Non spécifiées'}`
  capaForm.priority = selectedRisk.value.initial_assessment?.criticality_level === 'critique' ? 'high' : 'normal'
  capaForm.effectiveness_criteria = `Réduction de la criticité du risque ${selectedRisk.value.reference} à un niveau résiduel maîtrisé (score ≤ 4).`
  createCapaModal.value = true
}

async function submitCapaAction() {
  if (!selectedRisk.value) return
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: { action: { id: number } } }>(
      `${base}/${selectedRisk.value.id}/actions`,
      'POST',
      capaForm
    )
    notice.value = `Action CAPA #${res.data.action.id} créée avec succès dans le Module 04.`
    createCapaModal.value = false
    await selectRisk(selectedRisk.value.id)
    await loadData()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function saveNewScenario() {
  busy.value = true
  error.value = ''
  try {
    // Parse contacts texte
    const parsedContacts = scenarioForm.contacts_text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(':')
        const role = parts[0]?.trim() || 'Contact d’urgence'
        const rest = parts[1]?.trim() || ''
        const matchPhone = rest.match(/(\+?[0-9\s-]{6,})/)
        const phone = matchPhone ? matchPhone[1].trim() : 'Non renseigné'
        const name = rest.replace(phone, '').replace(/[()]/g, '').trim() || 'Référent'
        return { role, name, phone }
      })

    const payload = {
      title: scenarioForm.title,
      threat_type: scenarioForm.threat_type,
      trigger_events: scenarioForm.trigger_events,
      immediate_actions: scenarioForm.immediate_actions,
      alternative_operations: scenarioForm.alternative_operations,
      rto_hours: scenarioForm.rto_hours,
      coordinator_id: scenarioForm.coordinator_id,
      crisis_contacts: parsedContacts,
    }

    const res = await request<{ data: ContinuityScenarioRow }>(`${base}/pca/scenarios`, 'POST', payload)
    notice.value = `Scénario PCA ${res.data.reference} créé avec succès.`
    createScenarioModal.value = false
    await loadData()
    await selectScenario(res.data.id)
    activeTab.value = 'scenario_detail'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function submitExercise() {
  if (!selectedScenario.value) return
  busy.value = true
  error.value = ''
  try {
    await request(`${base}/pca/scenarios/${selectedScenario.value.id}/exercises`, 'POST', exerciseForm)
    notice.value = 'Exercice de test PCA consigné avec succès.'
    logExerciseModal.value = false
    await selectScenario(selectedScenario.value.id)
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
        <p class="eyebrow">MAÎTRISE DES RISQUES</p>
        <h1>Risques, Opportunités <span class="accent-serif">& Continuité (PCA).</span></h1>
        <p class="page-subtitle">
          Cotation matricielle 4×4 (initiale vs résiduelle), plans de traitement CAPA et Plan de Continuité d’Activité officinal.
        </p>
      </div>
      <div class="heading-actions">
        <button class="button secondary" @click="createScenarioModal = true">
          <AppIcon name="clock" :size="16" /> Nouveau scénario PCA
        </button>
        <button class="button primary" @click="createRiskModal = true">
          <AppIcon name="plus" :size="16" /> Identifier risque / opportunité
        </button>
      </div>
    </div>

    <!-- Alertes -->
    <p v-if="error" class="alert error" role="alert">
      {{ error }} <button @click="loadData">Réessayer</button>
    </p>
    <p v-if="notice" class="alert success" role="status">
      {{ notice }} <button @click="notice = ''">×</button>
    </p>

    <!-- Mini-Stats récapitulatives -->
    <div v-if="overview" class="mini-stats">
      <span>{{ overview.indicators.total_risks }} <small>risques cartographiés</small></span>
      <span>{{ overview.indicators.total_opportunities }} <small>opportunités</small></span>
      <span class="badge-red">{{ overview.indicators.by_criticality.critique || 0 }} <small>risques critiques</small></span>
      <span class="badge-orange">{{ overview.indicators.by_criticality.eleve || 0 }} <small>risques élevés</small></span>
      <span>{{ overview.indicators.pca_active_scenarios }} <small>scénarios PCA actifs</small></span>
      <span>{{ overview.indicators.pca_exercises_conducted }} <small>exercices réalisés</small></span>
    </div>

    <!-- MATRICE DE CRITICITÉ 4x4 (CDC 3.2 & 7) -->
    <section class="panel matrix-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">RÉFÉRENTIEL MATRICIEL BPD 4×4</p>
          <h2>Matrice Criticité : Probabilité (1 à 4) × Gravité (1 à 4)</h2>
        </div>
        <div class="matrix-legend">
          <span class="leg critique">Critique (13-16)</span>
          <span class="leg eleve">Élevé (9-12)</span>
          <span class="leg modere">Modéré (5-8)</span>
          <span class="leg faible">Faible (1-4)</span>
        </div>
      </div>

      <div class="matrix-grid-container">
        <div class="y-axis-label">Probabilité (Fréquence d'occurrence)</div>
        <div class="matrix-board">
          <!-- Lignes de Probabilité P4 à P1 -->
          <div v-for="p in [4, 3, 2, 1]" :key="'p-' + p" class="matrix-row">
            <div class="row-header">P{{ p }}</div>
            <div
              v-for="g in [1, 2, 3, 4]"
              :key="'cell-' + p + '-' + g"
              class="matrix-cell"
              :class="{
                critique: p * g >= 13,
                eleve: p * g >= 9 && p * g < 13,
                modere: p * g >= 5 && p * g < 9,
                faible: p * g < 5,
              }"
            >
              <div class="cell-score">{{ p * g }}</div>
              <div class="cell-items">
                <span
                  v-for="r in risks.filter(
                    (x) =>
                      (x.residual_assessment?.probability || x.initial_assessment?.probability) === p &&
                      (x.residual_assessment?.impact || x.initial_assessment?.impact) === g
                  )"
                  :key="r.id"
                  class="risk-chip"
                  :title="r.reference + ' - ' + r.title"
                  @click="selectRisk(r.id); activeTab = 'risk_detail'"
                >
                  {{ r.reference }}
                </span>
              </div>
            </div>
          </div>
          <div class="x-axis-row">
            <div class="corner-spacer"></div>
            <div class="col-header">G1 (Faible)</div>
            <div class="col-header">G2 (Modéré)</div>
            <div class="col-header">G3 (Grave)</div>
            <div class="col-header">G4 (Catastrophique)</div>
          </div>
        </div>
      </div>
      <div class="x-axis-label">Gravité / Impact sur l'officine & la santé publique</div>
    </section>

    <label class="section-filter">Section
      <select :value="activeTab" @change="onTab(($event.target as HTMLSelectElement).value)">
        <option v-for="t in sections" :key="t.key" :value="t.key">{{ t.label }}</option>
      </select>
    </label>

    <!-- TAB 1: CARTOGRAPHIE DES RISQUES -->
    <section v-if="activeTab === 'risks'" class="panel">
      <div class="table-toolbar">
        <label class="section-filter">Type
          <select :value="filterType" @change="filterType = ($event.target as HTMLSelectElement).value as typeof filterType">
            <option value="all">Tous</option>
            <option value="risk">Risques</option>
            <option value="opportunity">Opportunités</option>
          </select>
        </label>
        <div class="filters-right">
          <select v-model="filterCriticality" class="select-inline">
            <option value="all">Toutes criticités</option>
            <option value="critique">Critique (13-16)</option>
            <option value="eleve">Élevé (9-12)</option>
            <option value="modere">Modéré (5-8)</option>
            <option value="faible">Faible (1-4)</option>
          </select>
          <label class="search-field">
            <AppIcon name="search" :size="16" />
            <input v-model="searchQuery" placeholder="Rechercher référence, libellé..." />
          </label>
        </div>
      </div>

      <p v-if="loading" role="status">Chargement de la cartographie…</p>
      <div v-else-if="!filteredRisks.length" class="empty-state">
        <AppIcon name="quality" :size="36" />
        <h3>Aucun élément répertorié</h3>
        <p>Identifiez les risques et opportunités propres à votre pratique officinale.</p>
        <button class="button primary" @click="createRiskModal = true">Identifier un risque</button>
      </div>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>RÉFÉRENCE & LIBELLÉ</th>
              <th>PROCESSUS BPD</th>
              <th>CRITICITÉ INITIALE</th>
              <th>CRITICITÉ RÉSIDUELLE</th>
              <th>STATUT</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filteredRisks" :key="r.id">
              <td>
                <button class="table-title" @click="selectRisk(r.id); activeTab = 'risk_detail'">
                  <strong>{{ r.reference }}</strong> — {{ r.title }}
                </button>
                <small class="table-subtitle">{{ r.type === 'risk' ? 'Risque' : 'Opportunité' }} · {{ r.owner?.name }}</small>
              </td>
              <td>
                <span class="process-pill">{{ r.process_scope }}</span>
              </td>
              <td>
                <span v-if="r.initial_assessment" class="crit-badge" :class="r.initial_assessment.criticality_level">
                  {{ r.initial_assessment.score }}/16 ({{ r.initial_assessment.criticality_level }})
                </span>
                <span v-else class="muted-note">Non évalué</span>
              </td>
              <td>
                <span v-if="r.residual_assessment" class="crit-badge" :class="r.residual_assessment.criticality_level">
                  {{ r.residual_assessment.score }}/16 ({{ r.residual_assessment.criticality_level }})
                </span>
                <span v-else class="muted-note">À réévaluer</span>
              </td>
              <td>
                <span class="status-badge" :class="r.status">{{ r.status }}</span>
              </td>
              <td>
                <button
                  class="button small secondary"
                  @click="selectRisk(r.id); activeTab = 'risk_detail'"
                >
                  Maîtriser
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB 2: PLAN DE CONTINUITÉ D'ACTIVITÉ (PCA) -->
    <section v-if="activeTab === 'pca'" class="panel">
      <div class="panel-heading">
        <div>
          <h2>Scénarios de Continuité d’Activité (PCA)</h2>
          <p class="muted-note">Définition des modes dégradés et délais maximum d'interruption admissible (RTO) en cas de crise majeure (CDC 3.5).</p>
        </div>
        <button class="button primary small" @click="createScenarioModal = true">
          <AppIcon name="plus" :size="14" /> Nouveau scénario
        </button>
      </div>

      <div v-if="!scenarios.length" class="empty-state">
        <p>Aucun scénario PCA formalisé.</p>
        <button class="button primary" @click="createScenarioModal = true">Créer un premier plan de secours</button>
      </div>
      <div v-else class="scenarios-grid">
        <div v-for="sc in scenarios" :key="sc.id" class="scenario-card">
          <div class="sc-header">
            <span class="ref-badge">{{ sc.reference }}</span>
            <span class="rto-badge">RTO : {{ sc.rto_hours }}h max</span>
          </div>
          <h3>{{ sc.title }}</h3>
          <p class="sc-threat"><strong>Menace :</strong> {{ sc.threat_type }}</p>
          <div class="sc-actions-preview">
            <strong>Réflexe d'urgence :</strong>
            <p>{{ sc.immediate_actions.slice(0, 100) }}...</p>
          </div>
          <div class="sc-footer">
            <span class="contact-count">
              <strong>{{ sc.crisis_contacts?.length || 0 }}</strong> contact(s) d'urgence
            </span>
            <button
              class="button small secondary"
              @click="selectScenario(sc.id); activeTab = 'scenario_detail'"
            >
              Voir scénario & tests
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 3: DÉTAIL DU RISQUE & COTATIONS DISTINCTES -->
    <section v-if="activeTab === 'risk_detail' && selectedRisk" class="panel">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">{{ selectedRisk.type === 'risk' ? 'FICHE DE RISQUE' : 'FICHE D’OPPORTUNITÉ' }} · {{ selectedRisk.reference }}</span>
          <h2>{{ selectedRisk.title }}</h2>
          <p class="muted-note">
            Processus : <strong>{{ selectedRisk.process_scope }}</strong> ·
            Pilote : <strong>{{ selectedRisk.owner?.name }}</strong> ·
            Statut : <span class="status-badge" :class="selectedRisk.status">{{ selectedRisk.status }}</span>
          </p>
        </div>
        <div class="heading-actions">
          <button class="button secondary" @click="openAssessModal('initial')">
            Cotation Initiale
          </button>
          <button class="button secondary" @click="openAssessModal('residual')">
            Cotation Résiduelle (Nette)
          </button>
          <button class="button primary" @click="openCapaModal">
            Créer mesure CAPA (M4)
          </button>
        </div>
      </div>

      <!-- Description, Causes et Conséquences -->
      <div class="risk-summary-grid">
        <div class="summary-card">
          <h4>Causes profondes & Déclencheurs</h4>
          <p>{{ selectedRisk.causes || 'Non documenté' }}</p>
        </div>
        <div class="summary-card">
          <h4>Conséquences potentielles / Impacts</h4>
          <p>{{ selectedRisk.consequences || 'Non documenté' }}</p>
        </div>
      </div>

      <!-- COMPARAISON STRICTE INITIALE vs RÉSIDUELLE (CDC 3.4 & 7) -->
      <div class="scoring-comparison-panel">
        <div class="score-card init">
          <div class="card-head">
            <span class="eyebrow">ÉVALUATION INITIALE (BRUTE)</span>
            <span v-if="selectedRisk.initial_assessment" class="crit-badge" :class="selectedRisk.initial_assessment.criticality_level">
              {{ selectedRisk.initial_assessment.criticality_level }}
            </span>
          </div>
          <div v-if="!selectedRisk.initial_assessment" class="empty-inline">
            <p>Non coté initialement.</p>
            <button class="button small secondary" @click="openAssessModal('initial')">Évaluer</button>
          </div>
          <div v-else class="score-content">
            <div class="metric-big">
              <strong>{{ selectedRisk.initial_assessment.score }}</strong>
              <span>/ 16</span>
            </div>
            <p>Probabilité : <strong>{{ selectedRisk.initial_assessment.probability }}/4</strong> · Gravité : <strong>{{ selectedRisk.initial_assessment.impact }}/4</strong></p>
            <p class="rationale-text" v-if="selectedRisk.initial_assessment.rationale">
              <em>« {{ selectedRisk.initial_assessment.rationale }} »</em>
            </p>
          </div>
        </div>

        <div class="score-arrow">
          <AppIcon name="arrow" :size="24" />
          <span>Mesures de maîtrise CAPA</span>
        </div>

        <div class="score-card residual">
          <div class="card-head">
            <span class="eyebrow">ÉVALUATION RÉSIDUELLE (NETTE)</span>
            <span v-if="selectedRisk.residual_assessment" class="crit-badge" :class="selectedRisk.residual_assessment.criticality_level">
              {{ selectedRisk.residual_assessment.criticality_level }}
            </span>
          </div>
          <div v-if="!selectedRisk.residual_assessment" class="empty-inline">
            <p>Pas encore réévalué après mesures.</p>
            <button class="button small primary" @click="openAssessModal('residual')">Réévaluer après actions</button>
          </div>
          <div v-else class="score-content">
            <div class="metric-big success">
              <strong>{{ selectedRisk.residual_assessment.score }}</strong>
              <span>/ 16</span>
            </div>
            <p>Probabilité : <strong>{{ selectedRisk.residual_assessment.probability }}/4</strong> · Gravité : <strong>{{ selectedRisk.residual_assessment.impact }}/4</strong></p>
            <p class="rationale-text" v-if="selectedRisk.residual_assessment.rationale">
              <em>« {{ selectedRisk.residual_assessment.rationale }} »</em>
            </p>
          </div>
        </div>
      </div>

      <!-- Actions CAPA Module 04 liées -->
      <div class="capa-links-box">
        <div class="box-header">
          <h3>Actions de maîtrise enregistrées (Module 04)</h3>
          <button class="button small primary" @click="openCapaModal">Ajouter action CAPA</button>
        </div>
        <p v-if="!selectedRisk.action_links?.length" class="muted-note">
          Aucune action de réduction n'a encore été rattachée.
        </p>
        <ul v-else class="capa-links-list">
          <li v-for="l in selectedRisk.action_links" :key="l.id">
            <span>Action M4 liée : <strong>#{{ l.action_id }}</strong> (Stratégie : <em>{{ l.mitigation_strategy }}</em>)</span>
            <span class="status-badge in_progress">En suivi M4</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- TAB 4: DÉTAIL DU SCÉNARIO PCA & EXERCICES -->
    <section v-if="activeTab === 'scenario_detail' && selectedScenario" class="panel">
      <div class="panel-heading">
        <div>
          <span class="eyebrow">PLAN DE CONTINUITÉ D'ACTIVITÉ · {{ selectedScenario.reference }}</span>
          <h2>{{ selectedScenario.title }}</h2>
          <p class="muted-note">
            Menace : <strong>{{ selectedScenario.threat_type }}</strong> ·
            Coordinateur : <strong>{{ selectedScenario.coordinator?.name }}</strong> ·
            Délai cible (RTO) : <strong>{{ selectedScenario.rto_hours }} heures</strong>
          </p>
        </div>
        <div class="heading-actions">
          <button class="button primary" @click="logExerciseModal = true">
            <AppIcon name="clock" :size="16" /> Consigner un exercice / test
          </button>
        </div>
      </div>

      <div class="pca-cards-grid">
        <div class="pca-card">
          <h4>1. Déclencheurs / Seuils d'activation</h4>
          <p>{{ selectedScenario.trigger_events }}</p>
        </div>
        <div class="pca-card urgent">
          <h4>2. Mesures réflexes d'urgence immédiates</h4>
          <p>{{ selectedScenario.immediate_actions }}</p>
        </div>
        <div class="pca-card">
          <h4>3. Mode de fonctionnement dégradé (Secours)</h4>
          <p>{{ selectedScenario.alternative_operations }}</p>
        </div>
      </div>

      <!-- Contacts de crise (CDC 7 : accès contrôlé) -->
      <div class="crisis-contacts-box">
        <h3>Annuaire d'urgence & Contacts de crise</h3>
        <div class="contacts-table">
          <table>
            <thead>
              <tr>
                <th>RÔLE / FONCTION</th>
                <th>NOM DU RÉFÉRENT</th>
                <th>TÉLÉPHONE D'ASTREINTE</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in selectedScenario.crisis_contacts" :key="c.phone">
                <td><strong>{{ c.role }}</strong></td>
                <td>{{ c.name }}</td>
                <td><a :href="'tel:' + c.phone" class="phone-link">{{ c.phone }}</a></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historique des exercices et simulations PCA (CDC 3.5 & 7) -->
      <div class="exercises-history-box">
        <div class="box-header">
          <h3>Historique des exercices et tests de continuité</h3>
          <button class="button small secondary" @click="logExerciseModal = true">
            Nouveau test
          </button>
        </div>
        <div v-if="!selectedScenario.exercises?.length" class="empty-inline">
          <p>Aucun test de continuité consigné pour ce scénario.</p>
        </div>
        <div v-else class="exercises-list">
          <div
            v-for="ex in selectedScenario.exercises"
            :key="ex.id"
            class="exercise-item"
            :class="{ success: ex.is_successful }"
          >
            <div class="ex-head">
              <strong>{{ ex.title }} ({{ ex.test_type }})</strong>
              <span class="ex-status-pill" :class="ex.is_successful ? 'ok' : 'ko'">
                {{ ex.is_successful ? 'Test probant' : 'Échec / À revoir' }}
              </span>
            </div>
            <p class="muted-note">
              Date : {{ ex.exercise_date }} · Durée constatée : <strong>{{ ex.measured_recovery_minutes || 'N/A' }} min</strong> ·
              Conduit par {{ ex.conductor?.name }}
            </p>
            <p v-if="ex.findings"><strong>Constats :</strong> {{ ex.findings }}</p>
            <p v-if="ex.improvement_points"><strong>Points d’amélioration :</strong> {{ ex.improvement_points }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- MODAL 1: IDENTIFIER RISQUE / OPPORTUNITÉ -->
    <AppModal v-model="createRiskModal" title="Identifier un risque ou une opportunité" :busy="busy" size="wide">
      <form id="form-risk" class="form-body" @submit.prevent="saveNewRisk">
        <div class="form-grid">
          <label>
            Type *
            <select v-model="riskForm.type">
              <option value="risk">Risque (Événement redouté)</option>
              <option value="opportunity">Opportunité (Bénéfice potentiel)</option>
            </select>
          </label>
          <label>
            Processus BPD concerné *
            <select v-model="riskForm.process_scope">
              <option v-for="p in processScopes" :key="p" :value="p">{{ p }}</option>
            </select>
          </label>
          <label>
            Pilote désigné *
            <select v-model="riskForm.owner_id">
              <option v-for="m in teamMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
          <label>
            Titre de l'événement *
            <input v-model="riskForm.title" required maxlength="180" placeholder="Ex: Rupture chaîne du froid chambre positive" />
          </label>
        </div>
        <label>
          Description factuelle de la situation *
          <textarea v-model="riskForm.description" required rows="2"></textarea>
        </label>
        <div class="form-grid">
          <label>
            Causes probables
            <textarea v-model="riskForm.causes" rows="2" placeholder="Facteurs déclenchants..."></textarea>
          </label>
          <label>
            Conséquences redoutées
            <textarea v-model="riskForm.consequences" rows="2" placeholder="Impact sur le patient, le stock..."></textarea>
          </label>
        </div>

        <fieldset class="scoring-box">
          <legend>Cotation initiale matricielle (Optionnelle)</legend>
          <div class="form-grid">
            <label>
              Probabilité (1: Très rare à 4: Fréquent)
              <select v-model.number="riskForm.initial_probability">
                <option :value="1">1 - Très rare / Improbable</option>
                <option :value="2">2 - Rare / Occasionnel</option>
                <option :value="3">3 - Possible / Récurrent</option>
                <option :value="4">4 - Fréquent / Permanent</option>
              </select>
            </label>
            <label>
              Gravité / Impact (1: Faible à 4: Critique)
              <select v-model.number="riskForm.initial_impact">
                <option :value="1">1 - Mineur / Sans conséquence</option>
                <option :value="2">2 - Modéré / Gêne opérationnelle</option>
                <option :value="3">3 - Grave / Non-conformité majeure</option>
                <option :value="4">4 - Critique / Danger santé publique</option>
              </select>
            </label>
          </div>
        </fieldset>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="createRiskModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-risk" :disabled="busy">Enregistrer la fiche</button>
      </template>
    </AppModal>

    <!-- MODAL 2: ÉVALUER CRITICITÉ MATRICIELLE -->
    <AppModal v-model="assessModal" :title="assessForm.assessment_type === 'initial' ? 'Cotation Initiale (Brute)' : 'Cotation Résiduelle (Nette après actions)'" :busy="busy">
      <form id="form-assess" class="form-body" @submit.prevent="submitAssessment">
        <div class="metric-score-preview" :class="calculatedLevel">
          <strong>{{ calculatedScore }} / 16</strong>
          <span>Criticité : {{ calculatedLevel.toUpperCase() }}</span>
        </div>
        <div class="form-grid">
          <label>
            Probabilité (1 à 4) *
            <select v-model.number="assessForm.probability">
              <option :value="1">1 - Très rare (quasi-nul)</option>
              <option :value="2">2 - Rare (annuel)</option>
              <option :value="3">3 - Possible (mensuel)</option>
              <option :value="4">4 - Fréquent (hebdomadaire)</option>
            </select>
          </label>
          <label>
            Gravité / Pertinence (1 à 4) *
            <select v-model.number="assessForm.impact">
              <option :value="1">1 - Faible (impact négligeable)</option>
              <option :value="2">2 - Modéré (écart récupérable)</option>
              <option :value="3">3 - Grave (altération médicament)</option>
              <option :value="4">4 - Critique (mise en jeu pronostic vital)</option>
            </select>
          </label>
        </div>
        <label>
          Justification de la cotation
          <textarea v-model="assessForm.rationale" rows="3" placeholder="Éléments factuels ayant motivé ces notes..."></textarea>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="assessModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-assess" :disabled="busy">Valider l'évaluation</button>
      </template>
    </AppModal>

    <!-- MODAL 3: CRÉER ACTION CAPA (M4) -->
    <AppModal v-model="createCapaModal" title="Créer une action de maîtrise (Module 04)" :busy="busy">
      <form id="form-capa-m7" class="form-body" @submit.prevent="submitCapaAction">
        <label>
          Titre de l'action *
          <input v-model="capaForm.title" required maxlength="180" />
        </label>
        <div class="form-grid">
          <label>
            Stratégie de traitement *
            <select v-model="capaForm.mitigation_strategy">
              <option value="reduce">Réduire (mesure barrière)</option>
              <option value="avoid">Éviter (supprimer l’activité)</option>
              <option value="transfer">Transférer (assurance, tiers)</option>
              <option value="accept">Accepter (risque résiduel faible)</option>
            </select>
          </label>
          <label>
            Responsable *
            <select v-model="capaForm.owner_id">
              <option v-for="m in teamMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
        </div>
        <label>
          Critère d'efficacité attendu (CDC 04 & 07) *
          <textarea v-model="capaForm.effectiveness_criteria" required minlength="8" rows="2"></textarea>
        </label>
        <div class="form-grid">
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
        <button class="button primary" type="submit" form="form-capa-m7" :disabled="busy">Créer l’action CAPA</button>
      </template>
    </AppModal>

    <!-- MODAL 4: CRÉER SCÉNARIO PCA -->
    <AppModal v-model="createScenarioModal" title="Nouveau scénario du Plan de Continuité (PCA)" :busy="busy" size="wide">
      <form id="form-pca" class="form-body" @submit.prevent="saveNewScenario">
        <div class="form-grid">
          <label>
            Titre du scénario *
            <input v-model="scenarioForm.title" required maxlength="180" placeholder="Ex: Panne secteur prolongée avec groupe secours" />
          </label>
          <label>
            Menace couverte *
            <select v-model="scenarioForm.threat_type">
              <option v-for="t in threatTypes" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
          </label>
          <label>
            Délai max d'interruption (RTO en heures) *
            <input v-model.number="scenarioForm.rto_hours" type="number" min="1" max="72" required />
          </label>
          <label>
            Coordinateur de crise *
            <select v-model="scenarioForm.coordinator_id">
              <option v-for="m in teamMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </label>
        </div>
        <label>
          Événements déclencheurs *
          <textarea v-model="scenarioForm.trigger_events" required rows="2" placeholder="Quand le plan est-il immédiatement déclenché ?"></textarea>
        </label>
        <label>
          Mesures réflexes d'urgence immédiates *
          <textarea v-model="scenarioForm.immediate_actions" required rows="3" placeholder="Actions réflexes dans les 15 premières minutes..."></textarea>
        </label>
        <label>
          Fonctionnement dégradé & procédure de secours *
          <textarea v-model="scenarioForm.alternative_operations" required rows="3" placeholder="Organisation temporaire pour maintenir les ordonnances prioritaires..."></textarea>
        </label>
        <label>
          Contacts de crise & astreintes (Un par ligne : Rôle : Nom (Téléphone))
          <textarea v-model="scenarioForm.contacts_text" rows="3"></textarea>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="createScenarioModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-pca" :disabled="busy">Créer le scénario PCA</button>
      </template>
    </AppModal>

    <!-- MODAL 5: CONSIGNER UN EXERCICE PCA -->
    <AppModal v-model="logExerciseModal" title="Consigner un exercice ou test PCA" :busy="busy">
      <form id="form-ex" class="form-body" @submit.prevent="submitExercise">
        <label>
          Titre de l'exercice *
          <input v-model="exerciseForm.title" required placeholder="Ex: Simulation coupure et démarrage groupe" />
        </label>
        <div class="form-grid">
          <label>
            Type de test *
            <select v-model="exerciseForm.test_type">
              <option value="simulation">Simulation grandeur réelle</option>
              <option value="revue_sur_table">Revue sur table (Walkthrough)</option>
              <option value="reel">Événement réel survenu</option>
            </select>
          </label>
          <label>
            Date de réalisation *
            <input v-model="exerciseForm.exercise_date" type="date" required />
          </label>
          <label>
            Temps de reprise constaté (minutes)
            <input v-model.number="exerciseForm.measured_recovery_minutes" type="number" min="1" />
          </label>
          <label class="checkbox-row" style="margin-top: 1.5rem">
            <input v-model="exerciseForm.is_successful" type="checkbox" />
            <span><strong>Test concluant / Réussi</strong></span>
          </label>
        </div>
        <label>
          Constats et déroulement
          <textarea v-model="exerciseForm.findings" rows="2"></textarea>
        </label>
        <label>
          Points d’amélioration identifiés
          <textarea v-model="exerciseForm.improvement_points" rows="2"></textarea>
        </label>
      </form>
      <template #footer>
        <button class="button secondary" :disabled="busy" @click="logExerciseModal = false">Annuler</button>
        <button class="button primary" type="submit" form="form-ex" :disabled="busy">Enregistrer le test</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.matrix-panel {
  background: var(--surface-card, #fff);
  margin-bottom: 1.5rem;
}

.matrix-legend {
  display: flex;
  gap: 0.5rem;
}

.matrix-legend .leg {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
}

.matrix-legend .leg.critique { background: #fee2e2; color: #b91c1c; }
.matrix-legend .leg.eleve { background: #ffedd5; color: #c2410c; }
.matrix-legend .leg.modere { background: #fef9c3; color: #854d0e; }
.matrix-legend .leg.faible { background: #dcfce7; color: #15803d; }

.matrix-grid-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.y-axis-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-weight: 600;
  font-size: 0.8rem;
  color: #555;
  text-align: center;
}

.matrix-board {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.matrix-row {
  display: grid;
  grid-template-columns: 40px repeat(4, 1fr);
  gap: 4px;
}

.row-header {
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  color: #666;
}

.matrix-cell {
  min-height: 55px;
  border-radius: 6px;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.matrix-cell.critique { background: #fee2e2; border-color: #fca5a5; }
.matrix-cell.eleve { background: #ffedd5; border-color: #fed7aa; }
.matrix-cell.modere { background: #fef9c3; border-color: #fef08a; }
.matrix-cell.faible { background: #dcfce7; border-color: #bbf7d0; }

.cell-score {
  font-weight: 700;
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
}

.cell-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.risk-chip {
  font-size: 0.7rem;
  font-weight: 700;
  background: #fff;
  color: #111;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.risk-chip:hover {
  background: #1a73e8;
  color: #fff;
}

.x-axis-row {
  display: grid;
  grid-template-columns: 40px repeat(4, 1fr);
  gap: 4px;
  margin-top: 4px;
}

.col-header {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #666;
}

.x-axis-label {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
  margin-top: 0.5rem;
}

.section-filter { display:grid; gap:6px; font-weight:700; margin:0 0 16px; max-width:420px; width:100%; }
.section-filter select { min-height:44px; font-size:16px; }

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

.process-pill {
  font-size: 0.8rem;
  background: #f3f4f6;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.crit-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.crit-badge.critique { background: #fee2e2; color: #b91c1c; }
.crit-badge.eleve { background: #ffedd5; color: #c2410c; }
.crit-badge.modere { background: #fef9c3; color: #854d0e; }
.crit-badge.faible { background: #dcfce7; color: #15803d; }

.scoring-comparison-panel {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.score-card {
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 8px;
  padding: 1.25rem;
  background: var(--surface-card, #fff);
}

.score-card .card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.metric-big {
  font-size: 2rem;
  font-weight: 800;
  color: #111;
}

.metric-big span {
  font-size: 1rem;
  color: #888;
}

.metric-big.success {
  color: #107548;
}

.score-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  color: #1a73e8;
  font-weight: 600;
  font-size: 0.8rem;
}

.scenarios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.scenario-card {
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 8px;
  padding: 1rem;
  background: var(--surface-card, #fff);
  display: flex;
  flex-direction: column;
}

.sc-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.ref-badge {
  font-weight: 700;
  font-size: 0.85rem;
  color: #1a73e8;
}

.rto-badge {
  font-size: 0.75rem;
  background: #fef3c7;
  color: #92400e;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}

.sc-footer {
  margin-top: auto;
  padding-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pca-cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.pca-card {
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 8px;
  padding: 1rem;
  background: #fff;
}

.pca-card.urgent {
  border-left: 5px solid #d93025;
  background: #fffafa;
}

.pca-card h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.crisis-contacts-box,
.exercises-history-box,
.capa-links-box {
  background: var(--surface-card, #fff);
  border: 1px solid var(--surface-border, #e0e0e0);
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.phone-link {
  color: #1a73e8;
  font-weight: 600;
  text-decoration: none;
}

.exercises-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.exercise-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 0.75rem;
  background: #fff;
}

.exercise-item.success {
  border-left: 4px solid #10b981;
}

.ex-head {
  display: flex;
  justify-content: space-between;
}

.ex-status-pill.ok { background: #d1fae5; color: #065f46; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600; }
.ex-status-pill.ko { background: #fee2e2; color: #991b1b; font-size: 0.75rem; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600; }

.metric-score-preview {
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.metric-score-preview.critique { background: #fee2e2; color: #b91c1c; }
.metric-score-preview.eleve { background: #ffedd5; color: #c2410c; }
.metric-score-preview.modere { background: #fef9c3; color: #854d0e; }
.metric-score-preview.faible { background: #dcfce7; color: #15803d; }

.badge-red { color: #dc2626; }
.badge-orange { color: #ea580c; }
</style>
