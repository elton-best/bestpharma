<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Phase 3 · Gestion Financière</span>
        <h1>Comptabilité SYSCOHADA</h1>
        <p class="subtitle">
          Journaux officinaux, saisie en partie double (Débit = Crédit), scellement SHA-256,
          synchronisation M12/M13, Grand-Livre et Balance Générale.
        </p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" :disabled="busy" @click="bootstrapPlan">
          Initialiser Plan SYSCOHADA
        </button>
        <button class="btn-primary" :disabled="busy" @click="syncOperations">
          Synchroniser Ventes & Dépenses
        </button>
      </div>
    </header>

    <div v-if="error" class="banner error" role="alert">{{ error }}</div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <!-- KPIs -->
    <section v-if="overview" class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Exercices ouverts</span>
        <strong class="kpi-val">{{ overview.kpis.exercices_ouverts }}</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Plan SYSCOHADA</span>
        <strong class="kpi-val">{{ overview.kpis.comptes_actifs }} comptes</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Écritures validées</span>
        <strong class="kpi-val">{{ overview.kpis.ecritures_validees }}</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Brouillons en attente</span>
        <strong class="kpi-val">{{ overview.kpis.ecritures_brouillon }}</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Total Débit validé</span>
        <strong class="kpi-val">{{ formatMoney(overview.kpis.total_debit_valide) }}</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Équilibre Général</span>
        <strong class="kpi-val" :class="overview.kpis.equilibre_general ? 'ok' : 'warn'">
          {{ overview.kpis.equilibre_general ? 'Équilibrée' : 'Déséquilibre' }}
        </strong>
      </div>
    </section>

    <!-- Tabs -->
    <nav class="tab-bar">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="tab-btn"
        :class="{ active: activeTab === t.id }"
        @click="activeTab = t.id"
      >
        {{ t.label }}
      </button>
    </nav>

    <!-- Tab: Écritures & Saisie -->
    <section v-if="activeTab === 'ecritures'" class="panel">
      <div class="panel-head">
        <h2>Écritures comptables</h2>
        <button class="btn-primary" @click="showEntryForm = !showEntryForm">
          {{ showEntryForm ? 'Fermer le formulaire' : '+ Nouvelle écriture (Partie Double)' }}
        </button>
      </div>

      <form v-if="showEntryForm" class="entry-form" @submit.prevent="submitEcriture">
        <div class="form-grid">
          <label>
            Exercice
            <select v-model.number="entryForm.exercice_id" required>
              <option v-for="ex in exercices" :key="ex.id" :value="ex.id">
                {{ ex.code }} — {{ ex.label }} ({{ ex.status }})
              </option>
            </select>
          </label>
          <label>
            Journal
            <select v-model.number="entryForm.journal_id" required>
              <option v-for="j in journaux" :key="j.id" :value="j.id">
                {{ j.code }} — {{ j.name }}
              </option>
            </select>
          </label>
          <label>
            Référence
            <input v-model="entryForm.reference" placeholder="EC-OD-2026-001" required />
          </label>
          <label>
            Date pièce
            <input v-model="entryForm.entry_date" type="date" required />
          </label>
          <label class="span-2">
            Libellé général
            <input v-model="entryForm.label" placeholder="Ex: Apport ou régularisation" required />
          </label>
        </div>

        <div class="lines-box">
          <h3>Lignes de l'écriture (Total Débit = Total Crédit)</h3>
          <div v-for="(l, idx) in entryForm.lignes" :key="idx" class="line-row">
            <select v-model.number="l.compte_id" required>
              <option v-for="c in comptes" :key="c.id" :value="c.id">
                {{ c.code }} — {{ c.label }}
              </option>
            </select>
            <input v-model="l.label" placeholder="Libellé ligne" required />
            <input v-model.number="l.debit" type="number" min="0" step="0.01" placeholder="Débit" />
            <input v-model.number="l.credit" type="number" min="0" step="0.01" placeholder="Crédit" />
            <button
              v-if="entryForm.lignes.length > 2"
              type="button"
              class="btn-link"
              @click="entryForm.lignes.splice(idx, 1)"
            >
              Retirer
            </button>
          </div>
          <div class="line-actions">
            <button
              type="button"
              class="btn-secondary"
              @click="entryForm.lignes.push({ compte_id: comptes[0]?.id || 0, label: '', debit: 0, credit: 0 })"
            >
              + Ajouter une ligne
            </button>
            <span class="balance-preview">
              Débit : {{ formatMoney(entryTotalDebit) }} | Crédit : {{ formatMoney(entryTotalCredit) }}
            </span>
            <button type="submit" class="btn-primary" :disabled="busy">Enregistrer Brouillon</button>
          </div>
        </div>
      </form>

      <table class="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Date</th>
            <th>Journal</th>
            <th>Libellé</th>
            <th>Débit</th>
            <th>Crédit</th>
            <th>Statut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ec in ecritures" :key="ec.id">
            <td><strong>{{ ec.reference }}</strong></td>
            <td>{{ ec.entry_date?.slice(0, 10) }}</td>
            <td>{{ ec.journal?.code }}</td>
            <td>{{ ec.label }}</td>
            <td>{{ formatMoney(ec.total_debit) }}</td>
            <td>{{ formatMoney(ec.total_credit) }}</td>
            <td>
              <span class="badge" :class="ec.status === 'validee' ? 'badge-green' : 'badge-amber'">
                {{ ec.status === 'validee' ? 'Validée SHA-256' : 'Brouillon' }}
              </span>
            </td>
            <td>
              <button
                v-if="ec.status === 'brouillon'"
                class="btn-secondary btn-sm"
                :disabled="busy"
                @click="validateEcriture(ec.id)"
              >
                Valider & Sceller
              </button>
              <code v-else class="hash-short">{{ ec.entry_hash?.slice(0, 12) }}…</code>
            </td>
          </tr>
          <tr v-if="!ecritures.length">
            <td colspan="8" class="empty-row">Aucune écriture comptable enregistrée.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Tab: Balance Générale -->
    <section v-if="activeTab === 'balance'" class="panel">
      <div class="panel-head">
        <h2>Balance Générale SYSCOHADA</h2>
        <button class="btn-secondary" @click="downloadBalanceCsv">Exporter CSV</button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Compte</th>
            <th>Intitulé</th>
            <th>Classe</th>
            <th>Total Débit</th>
            <th>Total Crédit</th>
            <th>Solde Débiteur</th>
            <th>Solde Créditeur</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in balance.rows" :key="row.compte_id">
            <td><strong>{{ row.code }}</strong></td>
            <td>{{ row.label }}</td>
            <td>Classe {{ row.classe }}</td>
            <td>{{ formatMoney(row.total_debit) }}</td>
            <td>{{ formatMoney(row.total_credit) }}</td>
            <td>{{ formatMoney(row.solde_debiteur) }}</td>
            <td>{{ formatMoney(row.solde_crediteur) }}</td>
          </tr>
          <tr v-if="!balance.rows.length">
            <td colspan="7" class="empty-row">Aucune écriture validée dans la balance.</td>
          </tr>
        </tbody>
        <tfoot v-if="balance.rows.length">
          <tr>
            <td colspan="3"><strong>TOTAUX GÉNÉRAUX</strong></td>
            <td><strong>{{ formatMoney(balance.totals.total_debit) }}</strong></td>
            <td><strong>{{ formatMoney(balance.totals.total_credit) }}</strong></td>
            <td><strong>{{ formatMoney(balance.totals.solde_debiteur) }}</strong></td>
            <td><strong>{{ formatMoney(balance.totals.solde_crediteur) }}</strong></td>
          </tr>
        </tfoot>
      </table>
    </section>

    <!-- Tab: Grand-Livre -->
    <section v-if="activeTab === 'grandlivre'" class="panel">
      <div class="panel-head">
        <h2>Grand-Livre (Écritures validées)</h2>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Compte</th>
            <th>Date</th>
            <th>Journal</th>
            <th>Pièce</th>
            <th>Libellé</th>
            <th>Débit</th>
            <th>Crédit</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in grandLivre" :key="l.id">
            <td><strong>{{ l.compte_code }}</strong> · {{ l.compte_label }}</td>
            <td>{{ l.entry_date?.slice(0, 10) }}</td>
            <td>{{ l.journal_code }}</td>
            <td>{{ l.reference }}</td>
            <td>{{ l.label }}</td>
            <td>{{ formatMoney(l.debit) }}</td>
            <td>{{ formatMoney(l.credit) }}</td>
          </tr>
          <tr v-if="!grandLivre.length">
            <td colspan="7" class="empty-row">Aucun mouvement validé dans le grand-livre.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Tab: Plan & Journaux -->
    <section v-if="activeTab === 'plan'" class="panel">
      <div class="split-grid">
        <div>
          <h2>Plan Comptable SYSCOHADA ({{ comptes.length }})</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>N° Compte</th>
                <th>Intitulé</th>
                <th>Classe</th>
                <th>Nature</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in comptes" :key="c.id">
                <td><strong>{{ c.code }}</strong></td>
                <td>{{ c.label }}</td>
                <td>{{ c.classe }}</td>
                <td>{{ c.nature }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h2>Journaux ({{ journaux.length }})</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="j in journaux" :key="j.id">
                <td><strong>{{ j.code }}</strong></td>
                <td>{{ j.name }}</td>
                <td>{{ j.journal_type }}</td>
              </tr>
            </tbody>
          </table>

          <h2 class="mt-6">Exercices ({{ exercices.length }})</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Période</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ex in exercices" :key="ex.id">
                <td><strong>{{ ex.code }}</strong></td>
                <td>{{ ex.start_date?.slice(0, 10) }} → {{ ex.end_date?.slice(0, 10) }}</td>
                <td>{{ ex.status }}</td>
                <td>
                  <button
                    v-if="ex.status === 'ouvert'"
                    class="btn-secondary btn-sm"
                    :disabled="busy"
                    @click="closeExercice(ex.id)"
                  >
                    Clôturer
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { request } from '@/services/quality'

interface OverviewKpis {
  exercices_ouverts: number
  journaux_actifs: number
  comptes_actifs: number
  ecritures_brouillon: number
  ecritures_validees: number
  total_debit_valide: number
  total_credit_valide: number
  equilibre_general: boolean
}

const base = '/comptabilite'
const busy = ref(false)
const error = ref('')
const notice = ref('')
const activeTab = ref<'ecritures' | 'balance' | 'grandlivre' | 'plan'>('ecritures')
const showEntryForm = ref(false)

const tabs = [
  { id: 'ecritures', label: 'Écritures & Saisie' },
  { id: 'balance', label: 'Balance Générale' },
  { id: 'grandlivre', label: 'Grand-Livre' },
  { id: 'plan', label: 'Plan SYSCOHADA, Journaux & Exercices' },
] as const

const overview = ref<{ kpis: OverviewKpis } | null>(null)
const exercices = ref<any[]>([])
const comptes = ref<any[]>([])
const journaux = ref<any[]>([])
const ecritures = ref<any[]>([])
const grandLivre = ref<any[]>([])
const balance = ref<{ rows: any[]; totals: any }>({
  rows: [],
  totals: { total_debit: 0, total_credit: 0, solde_debiteur: 0, solde_crediteur: 0, is_balanced: true },
})

const entryForm = reactive({
  exercice_id: 0,
  journal_id: 0,
  reference: '',
  entry_date: new Date().toISOString().slice(0, 10),
  label: '',
  lignes: [
    { compte_id: 0, label: 'Débit', debit: 0, credit: 0 },
    { compte_id: 0, label: 'Crédit', debit: 0, credit: 0 },
  ],
})

const entryTotalDebit = computed(() =>
  entryForm.lignes.reduce((acc, l) => acc + (Number(l.debit) || 0), 0),
)
const entryTotalCredit = computed(() =>
  entryForm.lignes.reduce((acc, l) => acc + (Number(l.credit) || 0), 0),
)

function formatMoney(v: number | string | undefined) {
  return `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} FCFA`
}

async function loadAll() {
  error.value = ''
  try {
    const [ov, ex, cp, jr, ec, gl, bal] = await Promise.all([
      request<{ kpis: OverviewKpis }>(`${base}/overview`),
      request<{ data: any[] }>(`${base}/exercices`),
      request<{ data: any[] }>(`${base}/comptes`),
      request<{ data: any[] }>(`${base}/journaux`),
      request<{ data: any[] }>(`${base}/ecritures`),
      request<{ data: any[] }>(`${base}/grand-livre`),
      request<{ data: { rows: any[]; totals: any } }>(`${base}/balance`),
    ])
    overview.value = ov
    exercices.value = ex.data || []
    comptes.value = cp.data || []
    journaux.value = jr.data || []
    ecritures.value = ec.data || []
    grandLivre.value = gl.data || []
    balance.value = bal.data?.rows
      ? bal.data
      : { rows: [], totals: { total_debit: 0, total_credit: 0, solde_debiteur: 0, solde_crediteur: 0, is_balanced: true } }

    if (!entryForm.exercice_id && exercices.value.length) entryForm.exercice_id = exercices.value[0].id
    if (!entryForm.journal_id && journaux.value.length) entryForm.journal_id = journaux.value[0].id
    if (comptes.value.length) {
      entryForm.lignes.forEach((l) => {
        if (!l.compte_id) l.compte_id = comptes.value[0].id
      })
    }
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function bootstrapPlan() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/bootstrap`, 'POST')
    notice.value = 'Plan SYSCOHADA, journaux et exercice initialisés.'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function syncOperations() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const res = await request<{ data: { sales_synced: number; expenses_synced: number } }>(`${base}/sync-operations`, 'POST')
    notice.value = `Synchronisation terminée : ${res.data.sales_synced} vente(s) et ${res.data.expenses_synced} dépense(s) comptabilisée(s).`
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function submitEcriture() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/ecritures`, 'POST', entryForm)
    notice.value = 'Écriture enregistrée en brouillon.'
    showEntryForm.value = false
    entryForm.reference = ''
    entryForm.label = ''
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function validateEcriture(id: number) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/ecritures/${id}/validate`, 'POST')
    notice.value = 'Écriture validée et scellée (SHA-256).'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function closeExercice(id: number) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/exercices/${id}/close`, 'POST')
    notice.value = 'Exercice clôturé.'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function downloadBalanceCsv() {
  window.open('/api/v1/comptabilite/balance/export', '_blank')
}

onMounted(loadAll)
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
.module-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.4rem; }
h1 { margin: 0; font-size: 1.6rem; }
.subtitle { margin: 0.25rem 0 0; color: #475569; font-size: 0.92rem; }
.header-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; }
.kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.kpi-label { font-size: 0.78rem; color: #64748b; }
.kpi-val { font-size: 1.15rem; color: #0f172a; }
.kpi-val.ok { color: #15803d; }
.kpi-val.warn { color: #b91c1c; }
.tab-bar { display: flex; gap: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; flex-wrap: wrap; }
.tab-btn { padding: 0.45rem 0.9rem; border-radius: 0.5rem; border: 1px solid transparent; background: transparent; cursor: pointer; font-weight: 500; color: #475569; }
.tab-btn.active { background: #0f172a; color: #fff; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.data-table th, .data-table td { padding: 0.6rem 0.7rem; border-bottom: 1px solid #f1f5f9; text-align: left; }
.data-table th { color: #64748b; font-weight: 600; background: #f8fafc; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.5rem; }
.btn-primary { background: #0f766e; color: #fff; border: none; border-radius: 0.5rem; padding: 0.55rem 0.95rem; cursor: pointer; font-weight: 600; }
.btn-secondary { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem 0.85rem; cursor: pointer; font-weight: 500; }
.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
.btn-link { background: none; border: none; color: #b91c1c; cursor: pointer; }
.banner { padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.9rem; }
.banner.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.banner.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.badge { padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge-green { background: #dcfce7; color: #166534; }
.badge-amber { background: #fef3c7; color: #92400e; }
.entry-form { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 1rem; margin-bottom: 1rem; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem; margin-bottom: 0.85rem; }
.form-grid label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; font-weight: 600; color: #334155; }
.form-grid input, .form-grid select, .line-row input, .line-row select { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 0.4rem; background: #fff; }
.span-2 { grid-column: span 2; }
.line-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr auto; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center; }
.line-actions { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 0.75rem; flex-wrap: wrap; }
.balance-preview { font-weight: 600; color: #0f172a; font-size: 0.88rem; }
.split-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.25rem; }
.mt-6 { margin-top: 1.25rem; }
.hash-short { font-size: 0.75rem; color: #64748b; }
</style>
