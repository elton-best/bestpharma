<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { request } from '@/services/quality'

/* ─── Types ─── */
interface SupplierContact {
  id: number; name: string; role_title: string | null; email: string | null; phone: string | null; is_primary: boolean
}
interface SupplierRow {
  id: number; code: string; name: string; type: string; category: string
  ifu: string | null; rccm: string | null; email: string | null; phone: string | null
  address: string | null; city: string | null; country: string; status: string
  average_rating: string | number; notes: string | null; version: number
  contacts?: SupplierContact[]
  evaluations?: EvaluationRow[]
  complaints?: ComplaintRow[]
  contracts?: ContractRow[]
}
interface QuoteRow {
  id: number; supplier_id: number; amount: string | number; delivery_days: number | null
  technical_score: string | number; financial_score: string | number; total_score: string | number
  is_retained: boolean; supplier?: { id: number; code: string; name: string }
}
interface SelectionRow {
  id: number; reference: string; title: string; need_description: string; status: string
  selected_supplier_id: number | null; selection_justification: string | null
  validated_at: string | null; quotes?: QuoteRow[]
  selected_supplier?: { id: number; code: string; name: string }
}
interface EvaluationRow {
  id: number; supplier_id: number; period: string; evaluation_date: string
  overall_score_on_5: string | number; percentage_score: string | number
  decision: string; strengths: string | null; weaknesses: string | null
  action_required: string | null; created_action_id: number | null
  supplier?: { id: number; code: string; name: string; type: string }
  evaluator?: { id: number; name: string }
}
interface ComplaintRow {
  id: number; supplier_id: number; reference: string; claim_type: string; claim_date: string
  order_reference: string | null; delivery_note_ref: string | null; description: string
  status: string; supplier_response: string | null; response_received_at: string | null
  refund_or_credit_amount: string | number; created_action_id: number | null
  supplier?: { id: number; code: string; name: string }
}
interface ContractRow {
  id: number; supplier_id: number; contract_ref: string; title: string
  start_date: string; end_date: string; auto_renewal: boolean; notice_days: number
  status: string; terms_summary: string | null
  supplier?: { id: number; code: string; name: string }
}
interface Kpis {
  total_suppliers: number; active_suppliers: number; qualified_suppliers: number
  pending_selections: number; pending_evaluations: number; open_complaints: number
  expiring_contracts: number; average_score: number | string
}

/* ─── State ─── */
const base = '/achats'
const tab = ref<'overview' | 'suppliers' | 'selections' | 'evaluations' | 'complaints' | 'contracts'>('overview')
const loading = ref(false)
const error = ref('')

const kpis = ref<Kpis | null>(null)
const suppliers = ref<SupplierRow[]>([])
const selections = ref<SelectionRow[]>([])
const evaluations = ref<EvaluationRow[]>([])
const complaints = ref<ComplaintRow[]>([])
const contracts = ref<ContractRow[]>([])

// Filters
const searchSupplier = ref('')
const typeFilter = ref('')
const statusFilter = ref('')

// Modals
const showCreateSupplier = ref(false)
const showCreateSelection = ref(false)
const showValidateSelection = ref<SelectionRow | null>(null)
const showValidateSelectionOpen = computed({
  get: () => showValidateSelection.value !== null,
  set: (v: boolean) => { if (!v) showValidateSelection.value = null },
})
const showCreateEvaluation = ref(false)
const showCreateComplaint = ref(false)
const showResolveComplaint = ref<ComplaintRow | null>(null)
const showResolveComplaintOpen = computed({
  get: () => showResolveComplaint.value !== null,
  set: (v: boolean) => { if (!v) showResolveComplaint.value = null },
})
const showCreateContract = ref(false)
const showDetail = ref<SupplierRow | null>(null)
const showDetailOpen = computed({
  get: () => showDetail.value !== null,
  set: (v: boolean) => { if (!v) showDetail.value = null },
})

// Forms
const supplierForm = reactive({
  code: '', name: '', type: 'grossiste', category: 'produits_sante',
  ifu: '', rccm: '', email: '', phone: '', address: '', city: 'Cotonou',
  primary_contact_name: '', primary_contact_phone: '', primary_contact_email: '', notes: '',
})

const selectionForm = reactive({
  reference: '', title: '', need_description: '',
  quotes: [{ supplier_id: 0, amount: 0, delivery_days: 2, technical_score: 80, financial_score: 80, total_score: 80 }],
})

const validateForm = reactive({
  decision: 'valide' as 'valide' | 'rejete',
  selected_supplier_id: 0,
  selection_justification: '',
})

const evaluationForm = reactive({
  supplier_id: 0, period: '2026-T1', evaluation_date: new Date().toISOString().slice(0, 10),
  score_qualite: 4, score_delai: 4, score_prix: 4, score_sav: 4,
  decision: 'qualifie', strengths: '', weaknesses: '', action_required: '',
})

const complaintForm = reactive({
  supplier_id: 0, reference: '', claim_type: 'livraison_non_conforme',
  claim_date: new Date().toISOString().slice(0, 10), order_reference: '', delivery_note_ref: '', description: '',
})

const resolveForm = reactive({
  status: 'avoir_emis', supplier_response: '', refund_or_credit_amount: 0,
})

const contractForm = reactive({
  supplier_id: 0, contract_ref: '', title: '',
  start_date: new Date().toISOString().slice(0, 10), end_date: '',
  auto_renewal: true, notice_days: 60, terms_summary: '',
})

/* ─── API Calls ─── */
async function load(what: string) {
  loading.value = true; error.value = ''
  try {
    if (what === 'overview' || what === 'all') {
      const res = await request<{ kpis: Kpis }>(`${base}/overview`)
      kpis.value = res.kpis
    }
    if (what === 'suppliers' || what === 'selections' || what === 'evaluations' || what === 'complaints' || what === 'contracts' || what === 'all') {
      const params = new URLSearchParams()
      if (searchSupplier.value) params.set('search', searchSupplier.value)
      if (typeFilter.value) params.set('type', typeFilter.value)
      if (statusFilter.value) params.set('status', statusFilter.value)
      const q = params.toString() ? `?${params.toString()}` : ''
      suppliers.value = (await request<{ data: SupplierRow[] }>(`${base}/suppliers${q}`)).data
    }
    if (what === 'selections' || what === 'all') {
      selections.value = (await request<{ data: SelectionRow[] }>(`${base}/selections`)).data
    }
    if (what === 'evaluations' || what === 'all') {
      evaluations.value = (await request<{ data: EvaluationRow[] }>(`${base}/evaluations`)).data
    }
    if (what === 'complaints' || what === 'all') {
      complaints.value = (await request<{ data: ComplaintRow[] }>(`${base}/complaints`)).data
    }
    if (what === 'contracts' || what === 'all') {
      contracts.value = (await request<{ data: ContractRow[] }>(`${base}/contracts`)).data
    }
  } catch (e: any) {
    error.value = e.message || 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

async function createSupplier() {
  try {
    await request(`${base}/suppliers`, 'POST', supplierForm)
    showCreateSupplier.value = false
    Object.assign(supplierForm, {
      code: '', name: '', type: 'grossiste', category: 'produits_sante',
      ifu: '', rccm: '', email: '', phone: '', address: '', city: 'Cotonou',
      primary_contact_name: '', primary_contact_phone: '', primary_contact_email: '', notes: '',
    })
    await load('suppliers'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

function addQuoteRow() {
  selectionForm.quotes.push({ supplier_id: 0, amount: 0, delivery_days: 2, technical_score: 80, financial_score: 80, total_score: 80 })
}

async function createSelection() {
  try {
    const validQuotes = selectionForm.quotes.filter(q => q.supplier_id > 0).map(q => ({
      ...q,
      total_score: Math.round(((q.technical_score + q.financial_score) / 2) * 10) / 10,
    }))
    await request(`${base}/selections`, 'POST', {
      reference: selectionForm.reference,
      title: selectionForm.title,
      need_description: selectionForm.need_description,
      quotes: validQuotes,
    })
    showCreateSelection.value = false
    selectionForm.reference = ''; selectionForm.title = ''; selectionForm.need_description = ''
    selectionForm.quotes = [{ supplier_id: 0, amount: 0, delivery_days: 2, technical_score: 80, financial_score: 80, total_score: 80 }]
    await load('selections'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

function openValidateModal(s: SelectionRow) {
  validateForm.decision = 'valide'
  validateForm.selected_supplier_id = s.quotes?.[0]?.supplier_id || 0
  validateForm.selection_justification = ''
  showValidateSelection.value = s
}

async function submitValidateSelection() {
  if (!showValidateSelection.value) return
  try {
    await request(`${base}/selections/${showValidateSelection.value.id}/validate`, 'POST', {
      decision: validateForm.decision,
      selected_supplier_id: validateForm.decision === 'valide' ? validateForm.selected_supplier_id : null,
      selection_justification: validateForm.selection_justification,
    })
    showValidateSelection.value = null
    await load('selections'); await load('suppliers'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createEvaluation() {
  try {
    const criteriaScores = [
      { key: 'qualite', label: 'Qualité & Conformité BPD', score: evaluationForm.score_qualite },
      { key: 'delai', label: 'Respect des délais', score: evaluationForm.score_delai },
      { key: 'prix', label: 'Compétitivité / Facturation', score: evaluationForm.score_prix },
      { key: 'sav', label: 'Réactivité SAV & Litiges', score: evaluationForm.score_sav },
    ]
    const avg = Math.round(((evaluationForm.score_qualite + evaluationForm.score_delai + evaluationForm.score_prix + evaluationForm.score_sav) / 4) * 100) / 100
    await request(`${base}/evaluations`, 'POST', {
      supplier_id: evaluationForm.supplier_id,
      period: evaluationForm.period,
      evaluation_date: evaluationForm.evaluation_date,
      criteria_scores: criteriaScores,
      overall_score_on_5: avg,
      decision: evaluationForm.decision,
      strengths: evaluationForm.strengths,
      weaknesses: evaluationForm.weaknesses,
      action_required: evaluationForm.action_required,
    })
    showCreateEvaluation.value = false
    await load('evaluations'); await load('suppliers'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createComplaint() {
  try {
    await request(`${base}/complaints`, 'POST', complaintForm)
    showCreateComplaint.value = false
    Object.assign(complaintForm, {
      supplier_id: 0, reference: '', claim_type: 'livraison_non_conforme',
      claim_date: new Date().toISOString().slice(0, 10), order_reference: '', delivery_note_ref: '', description: '',
    })
    await load('complaints'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

function openResolveModal(c: ComplaintRow) {
  resolveForm.status = 'avoir_emis'
  resolveForm.supplier_response = ''
  resolveForm.refund_or_credit_amount = 0
  showResolveComplaint.value = c
}

async function submitResolveComplaint() {
  if (!showResolveComplaint.value) return
  try {
    await request(`${base}/complaints/${showResolveComplaint.value.id}/resolve`, 'POST', resolveForm)
    showResolveComplaint.value = null
    await load('complaints'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createContract() {
  try {
    await request(`${base}/contracts`, 'POST', contractForm)
    showCreateContract.value = false
    Object.assign(contractForm, {
      supplier_id: 0, contract_ref: '', title: '',
      start_date: new Date().toISOString().slice(0, 10), end_date: '',
      auto_renewal: true, notice_days: 60, terms_summary: '',
    })
    await load('contracts'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function openDetail(s: SupplierRow) {
  try {
    showDetail.value = (await request<{ data: SupplierRow }>(`${base}/suppliers/${s.id}`)).data
  } catch {
    showDetail.value = s
  }
}

/* ─── Helpers ─── */
const typeLabel: Record<string, string> = {
  grossiste: 'Grossiste répartiteur', fabricant: 'Fabricant / Labo',
  prestataire_service: 'Prestataire service', transporteur: 'Transporteur',
  maintenance: 'Maintenance / Métrologie', autre: 'Autre',
}
const statusLabel: Record<string, string> = {
  actif: 'Actif', a_evaluer: 'À évaluer', qualifie: 'Qualifié BPD', suspendu: 'Suspendu', radie: 'Radié',
}
const statusColor: Record<string, string> = {
  actif: '#3b82f6', a_evaluer: '#f59e0b', qualifie: '#10b981', suspendu: '#ef4444', radie: '#6b7280',
}
const decisionLabel: Record<string, string> = {
  qualifie: 'Qualifié / Reconduit', sous_reserve: 'Sous réserve', a_ameliorer: 'À améliorer (CAPA)', non_reconduit: 'Non reconduit (CAPA)',
}

function isExpiringSoon(endDate: string): boolean {
  const diff = (new Date(endDate).getTime() - Date.now()) / (1000 * 86400)
  return diff >= 0 && diff <= 30
}

function onTab(t: typeof tab.value) { tab.value = t; load(t) }

onMounted(() => load('overview'))
</script>

<template>
  <div class="module-page">
    <header class="page-header">
      <div>
        <h1 class="font-display text-2xl font-bold">Prestataires & Fournisseurs</h1>
        <p class="accent-serif text-gray-500">Module 10 — Référentiel qualifié, comparaison de devis, évaluations BPD, litiges & contrats</p>
      </div>
    </header>

    <nav class="tab-bar">
      <button v-for="t in [
        { key: 'overview', label: 'Vue d\'ensemble', icon: 'dashboard' },
        { key: 'suppliers', label: 'Référentiel Fournisseurs', icon: 'team' },
        { key: 'selections', label: 'Sélections & Devis', icon: 'check' },
        { key: 'evaluations', label: 'Évaluations (1-5)', icon: 'quality' },
        { key: 'complaints', label: 'Réclamations & Litiges', icon: 'info' },
        { key: 'contracts', label: 'Contrats & Échéances', icon: 'documents' },
      ]" :key="t.key" :class="['tab-btn', { active: tab === t.key }]" @click="onTab(t.key as any)">
        <AppIcon :name="t.icon" class="tab-icon" /> {{ t.label }}
      </button>
    </nav>

    <div v-if="error" class="err-banner" @click="error = ''">⚠️ {{ error }}</div>
    <div v-if="loading" class="loading-bar"><div class="loading-track" /></div>

    <!-- ═══════════ OVERVIEW ═══════════ -->
    <section v-if="tab === 'overview'" class="content-section">
      <div v-if="kpis" class="kpi-grid">
        <div class="kpi-card"><span class="kpi-value">{{ kpis.total_suppliers }}</span><span class="kpi-label">Total fournisseurs</span></div>
        <div class="kpi-card green"><span class="kpi-value">{{ kpis.qualified_suppliers }}</span><span class="kpi-label">Qualifiés BPD</span></div>
        <div class="kpi-card blue"><span class="kpi-value">{{ kpis.active_suppliers }}</span><span class="kpi-label">Actifs</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ kpis.average_score }}</span><span class="kpi-label">Note moyenne / 5</span></div>
        <div class="kpi-card" :class="{ orange: kpis.pending_selections > 0 }"><span class="kpi-value">{{ kpis.pending_selections }}</span><span class="kpi-label">Sélections en cours</span></div>
        <div class="kpi-card" :class="{ red: kpis.open_complaints > 0 }"><span class="kpi-value">{{ kpis.open_complaints }}</span><span class="kpi-label">Litiges ouverts</span></div>
        <div class="kpi-card" :class="{ orange: kpis.expiring_contracts > 0 }"><span class="kpi-value">{{ kpis.expiring_contracts }}</span><span class="kpi-label">Contrats &lt; 30 jours</span></div>
      </div>

      <div v-if="kpis && (kpis.open_complaints > 0 || kpis.expiring_contracts > 0)" class="alert-box">
        <h3>🔔 Alertes Achats & Qualité</h3>
        <p v-if="kpis.open_complaints > 0" class="text-sm">• <strong>{{ kpis.open_complaints }}</strong> réclamation(s) fournisseur(s) ouverte(s) liée(s) à des actions CAPA.</p>
        <p v-if="kpis.expiring_contracts > 0" class="text-sm">• <strong>{{ kpis.expiring_contracts }}</strong> contrat(s) prestataire(s) arrivant à échéance dans les 30 prochains jours.</p>
      </div>
    </section>

    <!-- ═══════════ SUPPLIERS ═══════════ -->
    <section v-if="tab === 'suppliers'" class="content-section">
      <div class="section-toolbar">
        <input v-model="searchSupplier" type="text" placeholder="Rechercher code, nom, IFU…" class="search-input" @input="load('suppliers')" />
        <select v-model="typeFilter" class="filter-select" @change="load('suppliers')">
          <option value="">Tous types</option>
          <option value="grossiste">Grossiste</option>
          <option value="fabricant">Fabricant</option>
          <option value="maintenance">Maintenance</option>
          <option value="transporteur">Transporteur</option>
          <option value="prestataire_service">Prestataire service</option>
        </select>
        <select v-model="statusFilter" class="filter-select" @change="load('suppliers')">
          <option value="">Tous statuts</option>
          <option value="qualifie">Qualifié BPD</option>
          <option value="actif">Actif</option>
          <option value="a_evaluer">À évaluer</option>
          <option value="suspendu">Suspendu</option>
        </select>
        <button class="btn-primary" @click="showCreateSupplier = true">+ Nouveau fournisseur</button>
      </div>

      <table v-if="suppliers.length" class="data-table">
        <thead><tr><th>Code</th><th>Raison sociale</th><th>Type</th><th>Ville</th><th>Note / 5</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-for="s in suppliers" :key="s.id" class="clickable-row" @click="openDetail(s)">
            <td class="font-mono text-sm font-bold">{{ s.code }}</td>
            <td><strong>{{ s.name }}</strong> <span v-if="s.ifu" class="text-xs text-gray-500">IFU {{ s.ifu }}</span></td>
            <td>{{ typeLabel[s.type] || s.type }}</td>
            <td>{{ s.city || '—' }}</td>
            <td><strong>{{ Number(s.average_rating) > 0 ? `${s.average_rating} / 5` : '—' }}</strong></td>
            <td><span class="status-pill" :style="{ background: (statusColor[s.status] || '#6b7280') + '20', color: statusColor[s.status] || '#6b7280' }">{{ statusLabel[s.status] || s.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun fournisseur enregistré. Cliquez sur « + Nouveau fournisseur ».</p>
    </section>

    <!-- ═══════════ SELECTIONS ═══════════ -->
    <section v-if="tab === 'selections'" class="content-section">
      <div class="section-toolbar">
        <h3>Appels d'offres & Comparatif Devis</h3>
        <button class="btn-primary" @click="showCreateSelection = true">+ Nouvelle sélection</button>
      </div>

      <table v-if="selections.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Objet</th><th>Devis comparés</th><th>Statut</th><th>Fournisseur retenu</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="sel in selections" :key="sel.id">
            <td class="font-mono font-bold">{{ sel.reference }}</td>
            <td><strong>{{ sel.title }}</strong><div class="text-xs text-gray-500">{{ sel.need_description }}</div></td>
            <td>
              <div v-for="q in sel.quotes" :key="q.id" class="text-xs">
                <span :class="{ 'font-bold text-emerald-700': q.is_retained }">
                  {{ q.supplier?.name || `#${q.supplier_id}` }} : {{ Number(q.amount).toLocaleString() }} FCFA (Score {{ q.total_score }})
                </span>
              </div>
            </td>
            <td><span class="badge" :class="sel.status">{{ sel.status }}</span></td>
            <td>{{ sel.selected_supplier?.name || '—' }}</td>
            <td>
              <button v-if="sel.status === 'comparaison'" class="btn-sm btn-green" @click="openValidateModal(sel)">Statuer (Titulaire)</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune procédure de sélection enregistrée.</p>
    </section>

    <!-- ═══════════ EVALUATIONS ═══════════ -->
    <section v-if="tab === 'evaluations'" class="content-section">
      <div class="section-toolbar">
        <h3>Évaluations périodiques des prestataires (Grille 1 à 5)</h3>
        <button class="btn-primary" @click="showCreateEvaluation = true">+ Évaluer un fournisseur</button>
      </div>

      <table v-if="evaluations.length" class="data-table">
        <thead><tr><th>Date</th><th>Période</th><th>Fournisseur</th><th>Score / 5</th><th>Décision</th><th>CAPA M4</th></tr></thead>
        <tbody>
          <tr v-for="ev in evaluations" :key="ev.id">
            <td>{{ ev.evaluation_date }}</td>
            <td>{{ ev.period }}</td>
            <td><strong>{{ ev.supplier?.name }}</strong></td>
            <td><strong>{{ ev.overall_score_on_5 }} / 5</strong> ({{ ev.percentage_score }}%)</td>
            <td><span class="badge" :class="ev.decision">{{ decisionLabel[ev.decision] || ev.decision }}</span></td>
            <td><span v-if="ev.created_action_id" class="badge red">Action #{{ ev.created_action_id }}</span><span v-else>—</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune évaluation enregistrée.</p>
    </section>

    <!-- ═══════════ COMPLAINTS ═══════════ -->
    <section v-if="tab === 'complaints'" class="content-section">
      <div class="section-toolbar">
        <h3>Réclamations & Litiges Fournisseurs</h3>
        <button class="btn-primary" @click="showCreateComplaint = true">+ Déclarer un litige</button>
      </div>

      <table v-if="complaints.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Date</th><th>Fournisseur</th><th>Motif</th><th>Statut</th><th>Avoir / Remb.</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="c in complaints" :key="c.id">
            <td class="font-mono font-bold">{{ c.reference }}</td>
            <td>{{ c.claim_date }}</td>
            <td><strong>{{ c.supplier?.name }}</strong></td>
            <td>{{ c.claim_type }}</td>
            <td><span class="badge" :class="c.status">{{ c.status }}</span></td>
            <td>{{ Number(c.refund_or_credit_amount) > 0 ? `${Number(c.refund_or_credit_amount).toLocaleString()} FCFA` : '—' }}</td>
            <td>
              <button v-if="c.status === 'ouvert' || c.status === 'transmis'" class="btn-sm btn-blue" @click="openResolveModal(c)">Résoudre / Clôturer</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune réclamation fournisseur enregistrée.</p>
    </section>

    <!-- ═══════════ CONTRACTS ═══════════ -->
    <section v-if="tab === 'contracts'" class="content-section">
      <div class="section-toolbar">
        <h3>Contrats & Suivi des Échéances</h3>
        <button class="btn-primary" @click="showCreateContract = true">+ Nouveau contrat</button>
      </div>

      <table v-if="contracts.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Intitulé</th><th>Fournisseur</th><th>Début</th><th>Échéance</th><th>Préavis</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-for="ct in contracts" :key="ct.id">
            <td class="font-mono font-bold">{{ ct.contract_ref }}</td>
            <td><strong>{{ ct.title }}</strong></td>
            <td>{{ ct.supplier?.name }}</td>
            <td>{{ ct.start_date }}</td>
            <td>
              <strong :class="{ 'text-red-600': isExpiringSoon(ct.end_date) }">{{ ct.end_date }}</strong>
              <span v-if="isExpiringSoon(ct.end_date)" class="badge red ml-1">Échéance &lt; 30j</span>
            </td>
            <td>{{ ct.notice_days }} jours</td>
            <td><span class="badge" :class="ct.status">{{ ct.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun contrat enregistré.</p>
    </section>

    <!-- ═══════════ MODALS ═══════════ -->
    <AppModal v-model="showCreateSupplier" title="Nouveau fournisseur / prestataire">
      <form @submit.prevent="createSupplier" class="modal-form">
        <div class="form-row"><label>Code unique</label><input v-model="supplierForm.code" required placeholder="ex: FRN-UBPHAR" /></div>
        <div class="form-row"><label>Raison sociale</label><input v-model="supplierForm.name" required /></div>
        <div class="form-row"><label>Type</label>
          <select v-model="supplierForm.type">
            <option value="grossiste">Grossiste répartiteur</option>
            <option value="fabricant">Fabricant / Laboratoire</option>
            <option value="maintenance">Maintenance / Métrologie</option>
            <option value="transporteur">Transporteur</option>
            <option value="prestataire_service">Prestataire service</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="form-row"><label>Catégorie</label>
          <select v-model="supplierForm.category">
            <option value="produits_sante">Produits de santé</option>
            <option value="chaine_froid">Chaîne du froid</option>
            <option value="securite">Sécurité</option>
            <option value="locaux">Locaux & Hygiène</option>
            <option value="informatique">Informatique</option>
            <option value="divers">Divers</option>
          </select>
        </div>
        <div class="form-row"><label>IFU / RCCM</label><input v-model="supplierForm.ifu" placeholder="IFU (optionnel)" /></div>
        <div class="form-row"><label>Email</label><input v-model="supplierForm.email" type="email" /></div>
        <div class="form-row"><label>Téléphone</label><input v-model="supplierForm.phone" /></div>
        <div class="form-row"><label>Contact principal</label><input v-model="supplierForm.primary_contact_name" placeholder="Nom du contact dédié" /></div>
        <div class="form-row"><label>Tél. contact principal</label><input v-model="supplierForm.primary_contact_phone" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer le fournisseur</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateSelection" title="Nouvel appel d'offres / Comparatif devis">
      <form @submit.prevent="createSelection" class="modal-form">
        <div class="form-row"><label>Référence</label><input v-model="selectionForm.reference" required placeholder="ex: AO-2026-001" /></div>
        <div class="form-row"><label>Objet</label><input v-model="selectionForm.title" required /></div>
        <div class="form-row"><label>Expression du besoin</label><textarea v-model="selectionForm.need_description" required rows="2" /></div>
        <div class="subhead mt-2">Devis reçus</div>
        <div v-for="(q, idx) in selectionForm.quotes" :key="idx" class="quote-box">
          <div class="form-row"><label>Fournisseur #{{ idx + 1 }}</label>
            <select v-model.number="q.supplier_id" required>
              <option :value="0" disabled>— Sélectionner —</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.code }} — {{ s.name }}</option>
            </select>
          </div>
          <div class="detail-grid">
            <div class="form-row"><label>Montant (FCFA)</label><input v-model.number="q.amount" type="number" min="0" required /></div>
            <div class="form-row"><label>Délai (jours)</label><input v-model.number="q.delivery_days" type="number" min="0" /></div>
            <div class="form-row"><label>Score tech. (/100)</label><input v-model.number="q.technical_score" type="number" min="0" max="100" /></div>
            <div class="form-row"><label>Score fin. (/100)</label><input v-model.number="q.financial_score" type="number" min="0" max="100" /></div>
          </div>
        </div>
        <button type="button" class="btn-secondary mt-2" @click="addQuoteRow">+ Ajouter un devis</button>
        <button type="submit" class="btn-primary mt-4">Enregistrer le comparatif</button>
      </form>
    </AppModal>

    <AppModal v-model="showValidateSelectionOpen" :title="showValidateSelection ? `Validation Titulaire — ${showValidateSelection.reference}` : ''">
      <form v-if="showValidateSelection" @submit.prevent="submitValidateSelection" class="modal-form">
        <div class="form-row"><label>Décision</label>
          <select v-model="validateForm.decision">
            <option value="valide">Valider et qualifier le fournisseur retenu</option>
            <option value="rejete">Rejeter l'appel d'offres</option>
          </select>
        </div>
        <div v-if="validateForm.decision === 'valide'" class="form-row"><label>Fournisseur retenu</label>
          <select v-model.number="validateForm.selected_supplier_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="q in showValidateSelection.quotes" :key="q.id" :value="q.supplier_id">
              {{ q.supplier?.name || `#${q.supplier_id}` }} — {{ Number(q.amount).toLocaleString() }} FCFA (Score {{ q.total_score }})
            </option>
          </select>
        </div>
        <div class="form-row"><label>Justification de la décision</label><textarea v-model="validateForm.selection_justification" required rows="3" /></div>
        <button type="submit" class="btn-primary mt-4">Confirmer la décision</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateEvaluation" title="Évaluation périodique fournisseur (1 à 5)">
      <form @submit.prevent="createEvaluation" class="modal-form">
        <div class="form-row"><label>Fournisseur</label>
          <select v-model.number="evaluationForm.supplier_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.code }} — {{ s.name }}</option>
          </select>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>Période</label><input v-model="evaluationForm.period" required placeholder="ex: 2026-T1" /></div>
          <div class="form-row"><label>Date</label><input v-model="evaluationForm.evaluation_date" type="date" required /></div>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>Qualité / BPD (1-5)</label><input v-model.number="evaluationForm.score_qualite" type="number" min="1" max="5" required /></div>
          <div class="form-row"><label>Respect délais (1-5)</label><input v-model.number="evaluationForm.score_delai" type="number" min="1" max="5" required /></div>
          <div class="form-row"><label>Conditions / Prix (1-5)</label><input v-model.number="evaluationForm.score_prix" type="number" min="1" max="5" required /></div>
          <div class="form-row"><label>Réactivité SAV (1-5)</label><input v-model.number="evaluationForm.score_sav" type="number" min="1" max="5" required /></div>
        </div>
        <div class="form-row"><label>Décision</label>
          <select v-model="evaluationForm.decision">
            <option value="qualifie">Qualifié / Reconduit</option>
            <option value="sous_reserve">Sous réserve</option>
            <option value="a_ameliorer">À améliorer (déclenche CAPA M4)</option>
            <option value="non_reconduit">Non reconduit (déclenche CAPA M4 + suspension)</option>
          </select>
        </div>
        <div class="form-row"><label>Points forts</label><textarea v-model="evaluationForm.strengths" rows="2" /></div>
        <div class="form-row"><label>Faiblesses / Écarts</label><textarea v-model="evaluationForm.weaknesses" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer l'évaluation</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateComplaint" title="Déclarer une réclamation / litige fournisseur">
      <form @submit.prevent="createComplaint" class="modal-form">
        <div class="form-row"><label>Fournisseur</label>
          <select v-model.number="complaintForm.supplier_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.code }} — {{ s.name }}</option>
          </select>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>Référence</label><input v-model="complaintForm.reference" required placeholder="LIT-2026-001" /></div>
          <div class="form-row"><label>Date</label><input v-model="complaintForm.claim_date" type="date" required /></div>
        </div>
        <div class="form-row"><label>Type de litige</label>
          <select v-model="complaintForm.claim_type">
            <option value="livraison_non_conforme">Livraison non conforme</option>
            <option value="retard_critique">Retard critique</option>
            <option value="produit_endommage">Produit endommagé / Chaîne du froid</option>
            <option value="ecart_facturation">Écart de facturation</option>
            <option value="rupture_brutale">Rupture brutale</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>N° Commande</label><input v-model="complaintForm.order_reference" /></div>
          <div class="form-row"><label>N° BL</label><input v-model="complaintForm.delivery_note_ref" /></div>
        </div>
        <div class="form-row"><label>Description détaillée</label><textarea v-model="complaintForm.description" required rows="3" /></div>
        <p class="text-xs text-gray-500">ℹ️ Une action qualité CAPA (Module 04) est automatiquement créée lors de l'enregistrement.</p>
        <button type="submit" class="btn-primary mt-4">Enregistrer le litige</button>
      </form>
    </AppModal>

    <AppModal v-model="showResolveComplaintOpen" :title="showResolveComplaint ? `Résolution — ${showResolveComplaint.reference}` : ''">
      <form v-if="showResolveComplaint" @submit.prevent="submitResolveComplaint" class="modal-form">
        <div class="form-row"><label>Statut final</label>
          <select v-model="resolveForm.status">
            <option value="reponse_recue">Réponse fournisseur reçue</option>
            <option value="avoir_emis">Avoir commercial émis</option>
            <option value="resolu">Résolu</option>
            <option value="cloture">Clôturé</option>
          </select>
        </div>
        <div class="form-row"><label>Montant avoir / remboursement (FCFA)</label><input v-model.number="resolveForm.refund_or_credit_amount" type="number" min="0" /></div>
        <div class="form-row"><label>Réponse / Justificatif fournisseur</label><textarea v-model="resolveForm.supplier_response" required rows="3" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer la résolution</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateContract" title="Nouveau contrat fournisseur">
      <form @submit.prevent="createContract" class="modal-form">
        <div class="form-row"><label>Fournisseur</label>
          <select v-model.number="contractForm.supplier_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.code }} — {{ s.name }}</option>
          </select>
        </div>
        <div class="form-row"><label>Référence contrat</label><input v-model="contractForm.contract_ref" required placeholder="CTR-2026-001" /></div>
        <div class="form-row"><label>Intitulé</label><input v-model="contractForm.title" required /></div>
        <div class="detail-grid">
          <div class="form-row"><label>Date début</label><input v-model="contractForm.start_date" type="date" required /></div>
          <div class="form-row"><label>Date échéance</label><input v-model="contractForm.end_date" type="date" required /></div>
        </div>
        <div class="form-row"><label>Préavis résiliation (jours)</label><input v-model.number="contractForm.notice_days" type="number" min="0" max="180" /></div>
        <div class="form-check"><input type="checkbox" v-model="contractForm.auto_renewal" id="auto-ren" /><label for="auto-ren">Reconduction tacite</label></div>
        <div class="form-row"><label>Résumé des clauses</label><textarea v-model="contractForm.terms_summary" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer le contrat</button>
      </form>
    </AppModal>

    <AppModal v-model="showDetailOpen" :title="showDetail ? `${showDetail.code} — ${showDetail.name}` : ''">
      <div v-if="showDetail" class="detail-content">
        <div class="detail-grid">
          <div><span class="detail-label">Type</span><span class="detail-value">{{ typeLabel[showDetail.type] || showDetail.type }}</span></div>
          <div><span class="detail-label">Statut</span><span class="status-pill" :style="{ background: (statusColor[showDetail.status] || '#6b7280') + '20', color: statusColor[showDetail.status] || '#6b7280' }">{{ statusLabel[showDetail.status] || showDetail.status }}</span></div>
          <div><span class="detail-label">IFU / RCCM</span><span class="detail-value">{{ showDetail.ifu || '—' }} / {{ showDetail.rccm || '—' }}</span></div>
          <div><span class="detail-label">Note moyenne</span><span class="detail-value">{{ Number(showDetail.average_rating) > 0 ? `${showDetail.average_rating} / 5` : 'Non évalué' }}</span></div>
          <div><span class="detail-label">Email</span><span class="detail-value">{{ showDetail.email || '—' }}</span></div>
          <div><span class="detail-label">Téléphone</span><span class="detail-value">{{ showDetail.phone || '—' }}</span></div>
        </div>

        <div v-if="showDetail.contacts?.length" class="mt-4">
          <strong class="text-sm">Contacts :</strong>
          <ul class="text-sm mt-1 history-list">
            <li v-for="ct in showDetail.contacts" :key="ct.id">
              👤 <strong>{{ ct.name }}</strong> <span v-if="ct.is_primary" class="badge conformed">Principal</span>
              <span class="text-xs text-gray-500"> — {{ ct.phone || '' }} {{ ct.email || '' }}</span>
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
.subhead { font-size: 0.9rem; font-weight: 600; color: #374151; }

.section-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.section-toolbar h3 { margin: 0; font-size: 1rem; flex: 1; }
.search-input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; min-width: 200px; }
.filter-select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }

.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 0.6rem; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.data-table td { padding: 0.6rem; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; transition: background 0.1s; }
.clickable-row:hover { background: #f9fafb; }

.status-pill { display: inline-block; padding: 0.15rem 0.55rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
.badge { font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600; text-transform: capitalize; }
.badge.valide, .badge.qualifie, .badge.resolu, .badge.cloture, .badge.avoir_emis, .badge.actif, .badge.conformed { background: #d1fae5; color: #065f46; }
.badge.rejete, .badge.non_reconduit, .badge.ouvert, .badge.red { background: #fee2e2; color: #991b1b; }
.badge.comparaison, .badge.sous_reserve, .badge.a_ameliorer, .badge.transmis { background: #fef3c7; color: #92400e; }
.badge.reponse_recue { background: #dbeafe; color: #1e40af; }

.empty-state { text-align: center; color: #9ca3af; padding: 3rem 1rem; font-size: 0.9rem; }

.btn-primary { padding: 0.5rem 1.15rem; background: #1a73e8; color: #fff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: #1557b0; }
.btn-secondary { padding: 0.5rem 1rem; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-secondary:hover { background: #e5e7eb; }
.btn-sm { padding: 0.25rem 0.6rem; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
.btn-green { background: #d1fae5; color: #065f46; }
.btn-blue { background: #dbeafe; color: #1e40af; }

.modal-form { display: flex; flex-direction: column; gap: 0.6rem; max-height: 65vh; overflow-y: auto; }
.form-row { display: flex; flex-direction: column; gap: 0.2rem; }
.form-row label { font-size: 0.75rem; font-weight: 600; color: #374151; }
.form-row input, .form-row select, .form-row textarea { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }
.form-check { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
.quote-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; background: #f9fafb; display: flex; flex-direction: column; gap: 0.5rem; }

.detail-content { font-size: 0.85rem; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.detail-label { font-size: 0.7rem; text-transform: uppercase; color: #6b7280; display: block; }
.detail-value { font-weight: 500; }
.history-list { list-style: none; padding: 0; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 0.4rem; }
</style>
