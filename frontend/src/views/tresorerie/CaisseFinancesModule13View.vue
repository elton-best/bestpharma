<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { demoMode, request as liveRequest } from '@/services/quality'
import { boardRequest } from '@/services/cdcBoardsDemo'
const request = demoMode ? boardRequest : liveRequest

/* ─── Types ─── */
interface RegisterRow { id: number; code: string; name: string; location_label: string | null; discrepancy_alert_threshold: number }
interface SessionRow {
  id: number; session_ref: string; cash_register_id: number; opened_at: string; closed_at: string | null
  opening_float: number; expected_closing_balance: number; actual_closing_balance: number | null
  discrepancy_amount: number; status: string; register?: { code: string; name: string }; cashier?: { name: string }
}
interface TransactionRow {
  id: number; transaction_ref: string; transaction_type: string; payment_method: string; amount: number
  status: string; reversal_reason: string | null; occurred_at: string; session?: { session_ref: string }
}
interface ExpenseRow {
  id: number; reference: string; category: string; amount: number; reason: string; status: string
  requested_by?: { name: string }
}
interface HandoverRow {
  id: number; theoretical_cash: number; counted_cash: number; variance_amount: number; status: string
  anomalies_notes: string | null; outgoing_signed_at: string; session?: { session_ref: string }
  outgoing_user?: { name: string }; incoming_user?: { name: string }
}
interface ReconciliationRow {
  id: number; reference: string; period_date: string; total_expected: number; total_declared: number
  total_variance: number; status: string; created_action_id: number | null
}
interface Kpis {
  open_sessions: number; today_receipts_total: number; pending_expenses: number
  open_handovers: number; reconciliations_with_variance: number; session_conformity_rate: number | string
}

/* ─── State ─── */
const base = '/tresorerie'
const tab = ref<'overview' | 'sessions' | 'transactions' | 'expenses' | 'handovers' | 'reconciliations'>('overview')
const loading = ref(false)
const error = ref('')

const kpis = ref<Kpis | null>(null)
const registers = ref<RegisterRow[]>([])
const sessions = ref<SessionRow[]>([])
const transactions = ref<TransactionRow[]>([])
const expenses = ref<ExpenseRow[]>([])
const handovers = ref<HandoverRow[]>([])
const reconciliations = ref<ReconciliationRow[]>([])

// Modals
const showCreateRegister = ref(false)
const showOpenSession = ref(false)
const showCloseSession = ref<SessionRow | null>(null)
const showCloseOpen = computed({ get: () => showCloseSession.value !== null, set: (v: boolean) => { if (!v) showCloseSession.value = null } })
const showCreateTx = ref(false)
const showReverseTx = ref<TransactionRow | null>(null)
const showReverseOpen = computed({ get: () => showReverseTx.value !== null, set: (v: boolean) => { if (!v) showReverseTx.value = null } })
const showCreateExpense = ref(false)
const showCreateHandover = ref(false)
const showCreateReconciliation = ref(false)

// Forms
const registerForm = reactive({ code: '', name: '', location_label: 'Comptoir Principal', discrepancy_alert_threshold: 1000 })
const sessionForm = reactive({ cash_register_id: 0, session_ref: '', opening_float: 0 })
const closeForm = reactive({ actual_closing_balance: 0, discrepancy_justification: '' })
const txForm = reactive({
  cash_session_id: 0, transaction_ref: '', idempotency_key: '',
  transaction_type: 'encaissement', payment_method: 'especes', amount: 0,
})
const reverseReason = ref('')
const expenseForm = reactive({ cash_session_id: null as number | null, reference: '', category: 'fournitures', amount: 0, reason: '' })
const handoverForm = reactive({ cash_session_id: 0, counted_cash: 0, anomalies_notes: '' })
const reconForm = reactive({
  reference: '', period_date: new Date().toISOString().slice(0, 10),
  declared_especes: 0, declared_mobile: 0, declared_carte: 0, justification: '',
})

/* ─── API Calls ─── */
async function load(what: string) {
  loading.value = true; error.value = ''
  try {
    if (what === 'overview' || what === 'all') {
      kpis.value = (await request<{ kpis: Kpis }>(`${base}/overview`)).kpis
    }
    if (what === 'sessions' || what === 'transactions' || what === 'expenses' || what === 'handovers' || what === 'all') {
      registers.value = (await request<{ data: RegisterRow[] }>(`${base}/registers`)).data
      sessions.value = (await request<{ data: SessionRow[] }>(`${base}/sessions`)).data
    }
    if (what === 'transactions' || what === 'all') {
      transactions.value = (await request<{ data: TransactionRow[] }>(`${base}/transactions`)).data
    }
    if (what === 'expenses' || what === 'all') {
      expenses.value = (await request<{ data: ExpenseRow[] }>(`${base}/expenses`)).data
    }
    if (what === 'handovers' || what === 'all') {
      handovers.value = (await request<{ data: HandoverRow[] }>(`${base}/handovers`)).data
    }
    if (what === 'reconciliations' || what === 'all') {
      reconciliations.value = (await request<{ data: ReconciliationRow[] }>(`${base}/reconciliations`)).data
    }
  } catch (e: any) {
    error.value = e.message || 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

async function createRegister() {
  try {
    await request(`${base}/registers`, 'POST', registerForm)
    showCreateRegister.value = false
    await load('sessions')
  } catch (e: any) { error.value = e.message }
}

async function openSession() {
  try {
    await request(`${base}/sessions/open`, 'POST', sessionForm)
    showOpenSession.value = false
    await load('sessions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function submitCloseSession() {
  if (!showCloseSession.value) return
  try {
    await request(`${base}/sessions/${showCloseSession.value.id}/close`, 'POST', closeForm)
    showCloseSession.value = null
    await load('sessions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

function openTxModal() {
  txForm.transaction_ref = `TX-${Date.now().toString().slice(-6)}`
  txForm.idempotency_key = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  showCreateTx.value = true
}

async function createTx() {
  try {
    await request(`${base}/transactions`, 'POST', txForm)
    showCreateTx.value = false
    await load('transactions'); await load('sessions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function submitReverse() {
  if (!showReverseTx.value) return
  try {
    await request(`${base}/transactions/${showReverseTx.value.id}/reverse`, 'POST', { reversal_reason: reverseReason.value })
    showReverseTx.value = null; reverseReason.value = ''
    await load('transactions'); await load('sessions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createExpense() {
  try {
    await request(`${base}/expenses`, 'POST', expenseForm)
    showCreateExpense.value = false
    await load('expenses'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function decideExpense(id: number, decision: 'approuvee' | 'decaissee' | 'rejetee') {
  try {
    await request(`${base}/expenses/${id}/decision`, 'POST', { decision })
    await load('expenses'); await load('sessions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createHandover() {
  try {
    await request(`${base}/handovers`, 'POST', handoverForm)
    showCreateHandover.value = false
    await load('handovers'); await load('sessions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function signIncoming(id: number) {
  try {
    await request(`${base}/handovers/${id}/sign-incoming`, 'POST', {})
    await load('handovers'); await load('sessions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createReconciliation() {
  try {
    await request(`${base}/reconciliations`, 'POST', {
      reference: reconForm.reference,
      period_date: reconForm.period_date,
      lines: [
        { payment_method: 'especes', declared_amount: reconForm.declared_especes, justification: reconForm.justification },
        { payment_method: 'mobile_money', declared_amount: reconForm.declared_mobile, justification: reconForm.justification },
        { payment_method: 'carte', declared_amount: reconForm.declared_carte, justification: reconForm.justification },
      ],
    })
    showCreateReconciliation.value = false
    await load('reconciliations'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

const sections: { key: typeof tab.value; label: string }[] = [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'sessions', label: 'Caisses & Sessions' },
  { key: 'transactions', label: 'Encaissements & Contrepassations' },
  { key: 'expenses', label: 'Dépenses Caisse' },
  { key: 'handovers', label: 'Passations Conjointes' },
  { key: 'reconciliations', label: 'Rapprochements Journaliers' },
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
    <header class="page-header">
      <div>
        <h1 class="font-display text-2xl font-bold">Caisse & Finances</h1>
      </div>
    </header>

    <label class="section-filter">Section
      <select :value="tab" @change="onTab(($event.target as HTMLSelectElement).value)">
        <option v-for="t in sections" :key="t.key" :value="t.key">{{ t.label }}</option>
      </select>
    </label>

    <div v-if="error" class="err-banner" @click="error = ''"><AppIcon name="warning" :size="16" /> {{ error }}</div>
    <div v-if="loading" class="loading-bar"><div class="loading-track" /></div>

    <!-- ═══════════ OVERVIEW ═══════════ -->
    <section v-if="tab === 'overview'" class="content-section">
      <div v-if="kpis" class="kpi-grid">
        <div class="kpi-card green"><span class="kpi-value">{{ kpis.open_sessions }}</span><span class="kpi-label">Sessions ouvertes</span></div>
        <div class="kpi-card blue"><span class="kpi-value">{{ Number(kpis.today_receipts_total).toLocaleString() }} FCFA</span><span class="kpi-label">Recettes du jour</span></div>
        <div class="kpi-card" :class="{ orange: kpis.pending_expenses > 0 }"><span class="kpi-value">{{ kpis.pending_expenses }}</span><span class="kpi-label">Dépenses en attente</span></div>
        <div class="kpi-card" :class="{ orange: kpis.open_handovers > 0 }"><span class="kpi-value">{{ kpis.open_handovers }}</span><span class="kpi-label">Passations à signer</span></div>
        <div class="kpi-card" :class="{ red: kpis.reconciliations_with_variance > 0 }"><span class="kpi-value">{{ kpis.reconciliations_with_variance }}</span><span class="kpi-label">Rapprochements en écart</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ kpis.session_conformity_rate === 'non disponible' ? 'N/D' : `${kpis.session_conformity_rate}%` }}</span><span class="kpi-label">Clôtures sans écart</span></div>
      </div>
    </section>

    <!-- ═══════════ SESSIONS ═══════════ -->
    <section v-if="tab === 'sessions'" class="content-section">
      <div class="section-toolbar">
        <h3>Postes de Caisse & Sessions</h3>
        <button class="btn-secondary" @click="showCreateRegister = true">+ Nouvelle caisse</button>
        <button class="btn-primary" @click="showOpenSession = true">+ Ouvrir une session</button>
      </div>

      <table v-if="sessions.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Caisse</th><th>Caissier</th><th>Fond init.</th><th>Attendu</th><th>Écart</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="s in sessions" :key="s.id">
            <td class="font-mono font-bold">{{ s.session_ref }}</td>
            <td>{{ s.register?.name }}</td>
            <td>{{ s.cashier?.name }}</td>
            <td>{{ Number(s.opening_float).toLocaleString() }}</td>
            <td><strong>{{ Number(s.expected_closing_balance).toLocaleString() }} FCFA</strong></td>
            <td :class="{ 'text-red-600': Math.abs(s.discrepancy_amount) > 0 }">{{ Number(s.discrepancy_amount).toLocaleString() }}</td>
            <td><span class="badge" :class="s.status">{{ s.status }}</span></td>
            <td><button v-if="s.status !== 'cloturee'" class="btn-sm btn-blue" @click="showCloseSession = s; closeForm.actual_closing_balance = s.expected_closing_balance">Clôturer</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune session de caisse enregistrée.</p>
    </section>

    <!-- ═══════════ TRANSACTIONS ═══════════ -->
    <section v-if="tab === 'transactions'" class="content-section">
      <div class="section-toolbar">
        <h3>Encaissements, Remboursements & Contrepassations</h3>
        <button class="btn-primary" @click="openTxModal">+ Nouveau paiement / remboursement</button>
      </div>

      <table v-if="transactions.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Session</th><th>Type</th><th>Mode</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="tx in transactions" :key="tx.id">
            <td class="font-mono font-bold">{{ tx.transaction_ref }}</td>
            <td>{{ tx.session?.session_ref }}</td>
            <td>{{ tx.transaction_type }}</td>
            <td>{{ tx.payment_method }}</td>
            <td><strong>{{ Number(tx.amount).toLocaleString() }} FCFA</strong></td>
            <td><span class="badge" :class="tx.status">{{ tx.status }}</span></td>
            <td><button v-if="tx.status === 'confirme' && tx.transaction_type !== 'contrepassation'" class="btn-sm btn-red" @click="showReverseTx = tx">Contrepasser</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune transaction enregistrée.</p>
    </section>

    <!-- ═══════════ EXPENSES ═══════════ -->
    <section v-if="tab === 'expenses'" class="content-section">
      <div class="section-toolbar">
        <h3>Demandes de Dépenses & Décaissements Caisse</h3>
        <button class="btn-primary" @click="showCreateExpense = true">+ Demande de dépense</button>
      </div>

      <table v-if="expenses.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Catégorie</th><th>Motif</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="e in expenses" :key="e.id">
            <td class="font-mono font-bold">{{ e.reference }}</td>
            <td>{{ e.category }}</td>
            <td>{{ e.reason }}</td>
            <td><strong>{{ Number(e.amount).toLocaleString() }} FCFA</strong></td>
            <td><span class="badge" :class="e.status">{{ e.status }}</span></td>
            <td>
              <button v-if="e.status === 'soumise'" class="btn-sm btn-green" @click="decideExpense(e.id, 'decaissee')">Approuver & Décaisser</button>
              <button v-if="e.status === 'soumise'" class="btn-sm btn-red" @click="decideExpense(e.id, 'rejetee')">Rejeter</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune demande de dépense enregistrée.</p>
    </section>

    <!-- ═══════════ HANDOVERS ═══════════ -->
    <section v-if="tab === 'handovers'" class="content-section">
      <div class="section-toolbar">
        <h3>Passations Conjointes de Caisse</h3>
        <button class="btn-primary" @click="showCreateHandover = true">+ Initier passation</button>
      </div>

      <table v-if="handovers.length" class="data-table">
        <thead><tr><th>Session</th><th>Sortant</th><th>Théorique</th><th>Compté</th><th>Écart conservé</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="h in handovers" :key="h.id">
            <td class="font-mono font-bold">{{ h.session?.session_ref }}</td>
            <td>{{ h.outgoing_user?.name }}</td>
            <td>{{ Number(h.theoretical_cash).toLocaleString() }}</td>
            <td>{{ Number(h.counted_cash).toLocaleString() }}</td>
            <td><strong :class="{ 'text-red-600': Math.abs(h.variance_amount) > 0 }">{{ Number(h.variance_amount).toLocaleString() }} FCFA</strong></td>
            <td><span class="badge" :class="h.status">{{ h.status }}</span></td>
            <td><button v-if="h.status === 'en_attente_entrant' || h.status === 'ecart_signale'" class="btn-sm btn-green" @click="signIncoming(h.id)">Signer (Entrant)</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune passation de caisse enregistrée.</p>
    </section>

    <!-- ═══════════ RECONCILIATIONS ═══════════ -->
    <section v-if="tab === 'reconciliations'" class="content-section">
      <div class="section-toolbar">
        <h3>Rapprochements Journaliers des Recettes</h3>
        <button class="btn-primary" @click="showCreateReconciliation = true">+ Rapprocher une journée</button>
      </div>

      <table v-if="reconciliations.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Date</th><th>Attendu</th><th>Déclaré</th><th>Écart</th><th>Statut</th><th>CAPA M4</th></tr></thead>
        <tbody>
          <tr v-for="r in reconciliations" :key="r.id">
            <td class="font-mono font-bold">{{ r.reference }}</td>
            <td>{{ r.period_date }}</td>
            <td>{{ Number(r.total_expected).toLocaleString() }}</td>
            <td>{{ Number(r.total_declared).toLocaleString() }}</td>
            <td><strong :class="{ 'text-red-600': Math.abs(r.total_variance) > 0 }">{{ Number(r.total_variance).toLocaleString() }} FCFA</strong></td>
            <td><span class="badge" :class="r.status">{{ r.status }}</span></td>
            <td><span v-if="r.created_action_id" class="badge red">Action #{{ r.created_action_id }}</span><span v-else>—</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun rapprochement journalier enregistré.</p>
    </section>

    <!-- ═══════════ MODALS ═══════════ -->
    <AppModal v-model="showCreateRegister" title="Nouvelle caisse physique">
      <form @submit.prevent="createRegister" class="modal-form">
        <div class="form-row"><label>Code</label><input v-model="registerForm.code" required placeholder="CAISSE-01" /></div>
        <div class="form-row"><label>Libellé</label><input v-model="registerForm.name" required /></div>
        <div class="form-row"><label>Seuil d'alerte écart (FCFA)</label><input v-model.number="registerForm.discrepancy_alert_threshold" type="number" min="0" required /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer caisse</button>
      </form>
    </AppModal>

    <AppModal v-model="showOpenSession" title="Ouvrir une session de caisse">
      <form @submit.prevent="openSession" class="modal-form">
        <div class="form-row"><label>Caisse</label>
          <select v-model.number="sessionForm.cash_register_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="reg in registers" :key="reg.id" :value="reg.id">{{ reg.code }} — {{ reg.name }}</option>
          </select>
        </div>
        <div class="form-row"><label>Référence session</label><input v-model="sessionForm.session_ref" required placeholder="SES-2026-001" /></div>
        <div class="form-row"><label>Fond de caisse initial (FCFA)</label><input v-model.number="sessionForm.opening_float" type="number" min="0" required /></div>
        <button type="submit" class="btn-primary mt-4">Ouvrir la session</button>
      </form>
    </AppModal>

    <AppModal v-model="showCloseOpen" :title="showCloseSession ? `Clôturer — ${showCloseSession.session_ref}` : ''">
      <form v-if="showCloseSession" @submit.prevent="submitCloseSession" class="modal-form">
        <p class="text-sm">Solde théorique attendu : <strong>{{ Number(showCloseSession.expected_closing_balance).toLocaleString() }} FCFA</strong></p>
        <div class="form-row"><label>Montant réel compté (FCFA)</label><input v-model.number="closeForm.actual_closing_balance" type="number" min="0" required /></div>
        <div class="form-row"><label>Justification écart (si écart &gt; seuil)</label><textarea v-model="closeForm.discrepancy_justification" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Clôturer la session</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateTx" title="Nouvel encaissement / remboursement">
      <form @submit.prevent="createTx" class="modal-form">
        <div class="form-row"><label>Session ouverte</label>
          <select v-model.number="txForm.cash_session_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="s in sessions.filter(x => x.status !== 'cloturee')" :key="s.id" :value="s.id">{{ s.session_ref }}</option>
          </select>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>Type</label>
            <select v-model="txForm.transaction_type"><option value="encaissement">Encaissement</option><option value="remboursement">Remboursement</option></select>
          </div>
          <div class="form-row"><label>Mode</label>
            <select v-model="txForm.payment_method"><option value="especes">Espèces</option><option value="mobile_money">Mobile Money</option><option value="carte">Carte</option></select>
          </div>
        </div>
        <div class="form-row"><label>Montant (FCFA)</label><input v-model.number="txForm.amount" type="number" min="1" required /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer transaction</button>
      </form>
    </AppModal>

    <AppModal v-model="showReverseOpen" title="Contrepassation traçable">
      <form v-if="showReverseTx" @submit.prevent="submitReverse" class="modal-form">
        <p class="text-sm">Contrepassation de <strong>{{ showReverseTx.transaction_ref }}</strong> ({{ Number(showReverseTx.amount).toLocaleString() }} FCFA).</p>
        <div class="form-row"><label>Motif obligatoire (min 5 car.)</label><textarea v-model="reverseReason" required minlength="5" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Confirmer contrepassation</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateExpense" title="Nouvelle demande de dépense">
      <form @submit.prevent="createExpense" class="modal-form">
        <div class="form-row"><label>Session caisse (optionnelle)</label>
          <select v-model.number="expenseForm.cash_session_id">
            <option :value="null">— Hors session —</option>
            <option v-for="s in sessions.filter(x => x.status !== 'cloturee')" :key="s.id" :value="s.id">{{ s.session_ref }}</option>
          </select>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>Référence</label><input v-model="expenseForm.reference" required placeholder="DEP-2026-01" /></div>
          <div class="form-row"><label>Catégorie</label>
            <select v-model="expenseForm.category"><option value="fournitures">Fournitures</option><option value="transport">Transport</option><option value="entretien">Entretien</option><option value="urgence_bpd">Urgence BPD</option></select>
          </div>
        </div>
        <div class="form-row"><label>Montant (FCFA)</label><input v-model.number="expenseForm.amount" type="number" min="1" required /></div>
        <div class="form-row"><label>Motif</label><textarea v-model="expenseForm.reason" required rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Soumettre la dépense</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateHandover" title="Passation conjointe de caisse">
      <form @submit.prevent="createHandover" class="modal-form">
        <div class="form-row"><label>Session</label>
          <select v-model.number="handoverForm.cash_session_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="s in sessions.filter(x => x.status === 'ouverte')" :key="s.id" :value="s.id">{{ s.session_ref }} (Théo: {{ Number(s.expected_closing_balance).toLocaleString() }})</option>
          </select>
        </div>
        <div class="form-row"><label>Espèces comptées conjointement (FCFA)</label><input v-model.number="handoverForm.counted_cash" type="number" min="0" required /></div>
        <div class="form-row"><label>Anomalies / Observations</label><textarea v-model="handoverForm.anomalies_notes" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer passation</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateReconciliation" title="Rapprochement journalier des recettes">
      <form @submit.prevent="createReconciliation" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Référence</label><input v-model="reconForm.reference" required placeholder="RAP-2026-01" /></div>
          <div class="form-row"><label>Date journée</label><input v-model="reconForm.period_date" type="date" required /></div>
        </div>
        <div class="form-row"><label>Espèces déclarées (FCFA)</label><input v-model.number="reconForm.declared_especes" type="number" min="0" required /></div>
        <div class="form-row"><label>Mobile Money déclaré (FCFA)</label><input v-model.number="reconForm.declared_mobile" type="number" min="0" required /></div>
        <div class="form-row"><label>Carte bancaire déclarée (FCFA)</label><input v-model.number="reconForm.declared_carte" type="number" min="0" required /></div>
        <div class="form-row"><label>Observations / Justificatifs</label><textarea v-model="reconForm.justification" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Exécuter le rapprochement</button>
      </form>
    </AppModal>
  </div>
</template>

<style scoped>
.module-page { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
.page-header { margin-bottom: 1.5rem; }
.section-filter { display:grid; gap:6px; font-weight:700; margin:0 0 16px; max-width:420px; width:100%; }
.section-filter select { min-height:44px; font-size:16px; }
.tab-bar { display: flex; gap: 0.25rem; border-bottom: 2px solid #e5e7eb; margin-bottom: 1.5rem; overflow-x: auto; }
.tab-btn { padding: 0.6rem 1rem; border: none; background: none; cursor: pointer; font-size: 0.85rem; color: #6b7280; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; border-bottom: 2px solid transparent; margin-bottom: -2px; }
.tab-btn.active { color: #1a73e8; border-bottom-color: #1a73e8; font-weight: 600; }
.tab-icon { width: 16px; height: 16px; }
.err-banner { background: #fef2f2; color: #991b1b; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; cursor: pointer; font-size: 0.875rem; }
.loading-bar { height: 3px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 1rem; }
.loading-track { width: 30%; height: 100%; background: #1a73e8; animation: load 1s infinite ease-in-out; }
@keyframes load { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; align-items: center; text-align: center; }
.kpi-card.green { border-left: 4px solid #10b981; }
.kpi-card.blue { border-left: 4px solid #3b82f6; }
.kpi-card.orange { border-left: 4px solid #f59e0b; }
.kpi-card.red { border-left: 4px solid #ef4444; }
.kpi-value { font-size: 1.5rem; font-weight: 700; color: #1f2937; }
.kpi-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
.section-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.section-toolbar h3 { margin: 0; font-size: 1rem; flex: 1; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 0.6rem; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.data-table td { padding: 0.6rem; border-bottom: 1px solid #f3f4f6; }
.badge { font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600; text-transform: capitalize; }
.badge.ouverte, .badge.confirme, .badge.signee, .badge.cloture, .badge.decaissee, .badge.approuvee { background: #d1fae5; color: #065f46; }
.badge.passation_en_cours, .badge.en_attente_entrant, .badge.soumise { background: #fef3c7; color: #92400e; }
.badge.contrepasse, .badge.ecart_signale, .badge.ecart_a_justifier, .badge.rejetee, .badge.red { background: #fee2e2; color: #991b1b; }
.badge.cloturee { background: #f3f4f6; color: #4b5563; }
.empty-state { text-align: center; color: #9ca3af; padding: 3rem 1rem; font-size: 0.9rem; }
.btn-primary { padding: 0.5rem 1.15rem; background: #1a73e8; color: #fff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-secondary { padding: 0.5rem 1rem; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-sm { padding: 0.25rem 0.6rem; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-right: 0.25rem; }
.btn-green { background: #d1fae5; color: #065f46; }
.btn-blue { background: #dbeafe; color: #1e40af; }
.btn-red { background: #fee2e2; color: #991b1b; }
.modal-form { display: flex; flex-direction: column; gap: 0.6rem; max-height: 65vh; overflow-y: auto; }
.form-row { display: flex; flex-direction: column; gap: 0.2rem; }
.form-row label { font-size: 0.75rem; font-weight: 600; color: #374151; }
.form-row input, .form-row select, .form-row textarea { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
</style>
