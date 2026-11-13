<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Phase 3 · Réglementaire & Paiements</span>
        <h1>Connecteurs e-MECEF (DGI) & FeexPay</h1>
        <p class="subtitle">
          Certification fiscale des factures normalisées DGI / e-MECEF et encaissements Mobile
          Money via FeexPay (MTN, Moov, Celtiis) avec webhooks signés HMAC-SHA256.
        </p>
      </div>
    </header>

    <div v-if="error" class="banner error" role="alert">{{ error }}</div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <!-- État des connecteurs -->
    <section v-if="overview" class="connector-grid">
      <div class="connector-card">
        <div class="connector-head">
          <h2>DGI / e-MECEF (Bénin)</h2>
          <span
            class="badge"
            :class="overview.connectors?.mecef?.configured ? 'badge-green' : 'badge-amber'"
          >
            {{
              overview.connectors?.mecef?.configured
                ? `Configuré (${overview.connectors.mecef.mode})`
                : 'Non configuré (MECEF_TOKEN / MECEF_IFU requis)'
            }}
          </span>
        </div>
        <p class="connector-meta">
          Factures : <strong>{{ overview.kpis.invoices_total }}</strong> · Certifiées DGI :
          <strong>{{ overview.kpis.invoices_certified }}</strong>
        </p>
      </div>

      <div class="connector-card">
        <div class="connector-head">
          <h2>FeexPay Mobile Money</h2>
          <span
            class="badge"
            :class="overview.connectors?.feexpay?.configured ? 'badge-green' : 'badge-amber'"
          >
            {{
              overview.connectors?.feexpay?.configured
                ? `Configuré (${overview.connectors.feexpay.mode})`
                : 'Non configuré (FEEXPAY_SHOP_ID / API_KEY requis)'
            }}
          </span>
        </div>
        <p class="connector-meta">
          Intentions : <strong>{{ overview.kpis.feexpay_intents_total }}</strong> · Encaissé
          confirmé : <strong>{{ formatMoney(overview.kpis.feexpay_confirmed_amount) }}</strong>
        </p>
      </div>
    </section>

    <nav class="tab-bar">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'mecef' }"
        @click="activeTab = 'mecef'"
      >
        Factures normalisées e-MECEF
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'feexpay' }"
        @click="activeTab = 'feexpay'"
      >
        Paiements FeexPay
      </button>
    </nav>

    <!-- Tab: e-MECEF -->
    <section v-if="activeTab === 'mecef'" class="panel">
      <div class="panel-head">
        <h2>Factures DGI / e-MECEF</h2>
      </div>
      <form class="inline-form mb-4" @submit.prevent="createInvoice">
        <input v-model="invForm.reference" placeholder="Réf (ex: FAC-2026-01)" required />
        <select v-model="invForm.invoice_type">
          <option value="FV">FV — Facture de Vente</option>
          <option value="FA">FA — Facture d'Avoir</option>
        </select>
        <input v-model="invForm.customer_name" placeholder="Client" required />
        <input v-model="invForm.customer_ifu" placeholder="IFU Client (optionnel)" />
        <input v-model.number="invForm.total_ttc" type="number" min="0" placeholder="Montant TTC" required />
        <button type="submit" class="btn-primary" :disabled="busy">Créer Brouillon</button>
      </form>

      <table class="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Type</th>
            <th>Client</th>
            <th>Montant TTC</th>
            <th>Statut</th>
            <th>Code MECeF / DGI</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in invoices" :key="inv.id">
            <td><strong>{{ inv.reference }}</strong></td>
            <td>{{ inv.invoice_type }}</td>
            <td>{{ inv.customer_name }}</td>
            <td>{{ formatMoney(inv.total_ttc) }}</td>
            <td>
              <span class="badge" :class="inv.status === 'certifiee' ? 'badge-green' : 'badge-amber'">
                {{ inv.status }}
              </span>
            </td>
            <td>
              <code v-if="inv.mecef_code">{{ inv.mecef_code }}</code>
              <span v-else class="muted">—</span>
            </td>
            <td>
              <button
                v-if="inv.status !== 'certifiee'"
                class="btn-secondary btn-sm"
                :disabled="busy"
                @click="certifyInvoice(inv.id)"
              >
                Certifier e-MECEF
              </button>
              <span v-else class="ok-text">Certifiée DGI</span>
            </td>
          </tr>
          <tr v-if="!invoices.length">
            <td colspan="7" class="empty-row">Aucune facture e-MECEF enregistrée.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Tab: FeexPay -->
    <section v-if="activeTab === 'feexpay'" class="panel">
      <div class="panel-head">
        <h2>Transactions FeexPay Mobile Money</h2>
      </div>
      <form class="inline-form mb-4" @submit.prevent="initiatePayment">
        <input v-model="payForm.reference" placeholder="Réf (ex: FP-2026-01)" required />
        <select v-model="payForm.network">
          <option value="MTN">MTN Mobile Money</option>
          <option value="MOOV">Moov Money</option>
          <option value="CELTIIS">Celtiis Cash</option>
          <option value="CARTE">Carte Bancaire</option>
        </select>
        <input v-model="payForm.phone_number" placeholder="Téléphone (229...)" required />
        <input v-model.number="payForm.amount" type="number" min="100" placeholder="Montant XOF" required />
        <button type="submit" class="btn-primary" :disabled="busy">Initier Paiement</button>
      </form>

      <table class="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Réseau</th>
            <th>Téléphone</th>
            <th>Montant</th>
            <th>Réf. Prestataire</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in intents" :key="tx.id">
            <td><strong>{{ tx.reference }}</strong></td>
            <td>{{ tx.network }}</td>
            <td>{{ tx.phone_number || '—' }}</td>
            <td>{{ formatMoney(tx.amount) }}</td>
            <td><code>{{ tx.provider_reference || '—' }}</code></td>
            <td>
              <span class="badge" :class="tx.status === 'confirme' ? 'badge-green' : 'badge-amber'">
                {{ tx.status }}
              </span>
            </td>
          </tr>
          <tr v-if="!intents.length">
            <td colspan="6" class="empty-row">Aucune transaction FeexPay enregistrée.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { request } from '@/services/quality'

const base = '/fiscalite'
const busy = ref(false)
const error = ref('')
const notice = ref('')
const activeTab = ref<'mecef' | 'feexpay'>('mecef')

const overview = ref<any>(null)
const invoices = ref<any[]>([])
const intents = ref<any[]>([])

const invForm = reactive({
  reference: '',
  invoice_type: 'FV',
  customer_name: 'Client Comptoir',
  customer_ifu: '',
  total_ttc: 0,
})

const payForm = reactive({
  reference: '',
  network: 'MTN',
  phone_number: '',
  amount: 1000,
})

function formatMoney(v: number | string | undefined) {
  return `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} FCFA`
}

async function loadAll() {
  error.value = ''
  try {
    const [ov, inv, fp] = await Promise.all([
      request<any>(`${base}/overview`),
      request<{ data: any[] }>(`${base}/invoices`),
      request<{ data: any[] }>(`${base}/feexpay/intents`),
    ])
    overview.value = ov
    invoices.value = inv.data || []
    intents.value = fp.data || []
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function createInvoice() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/invoices`, 'POST', {
      ...invForm,
      total_ht: invForm.total_ttc,
      total_tva: 0,
    })
    notice.value = 'Facture enregistrée en brouillon.'
    invForm.reference = ''
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function certifyInvoice(id: number) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/invoices/${id}/certify`, 'POST')
    notice.value = 'Facture certifiée par e-MECEF / DGI.'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function initiatePayment() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/feexpay/intents`, 'POST', payForm)
    notice.value = 'Demande de paiement FeexPay envoyée.'
    payForm.reference = ''
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #dcfce7; color: #166534; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.4rem; }
h1 { margin: 0; font-size: 1.6rem; }
.subtitle { margin: 0.25rem 0 0; color: #475569; font-size: 0.92rem; }
.connector-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.9rem; }
.connector-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
.connector-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.connector-head h2 { margin: 0; font-size: 1.05rem; }
.connector-meta { margin: 0; font-size: 0.88rem; color: #475569; }
.tab-bar { display: flex; gap: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; }
.tab-btn { padding: 0.45rem 0.9rem; border-radius: 0.5rem; border: 1px solid transparent; background: transparent; cursor: pointer; font-weight: 500; color: #475569; }
.tab-btn.active { background: #0f172a; color: #fff; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
.panel-head { margin-bottom: 0.75rem; }
.inline-form { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
.inline-form input, .inline-form select { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 0.45rem; }
.mb-4 { margin-bottom: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.data-table th, .data-table td { padding: 0.6rem 0.7rem; border-bottom: 1px solid #f1f5f9; text-align: left; }
.data-table th { color: #64748b; font-weight: 600; background: #f8fafc; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.5rem; }
.btn-primary { background: #0f766e; color: #fff; border: none; border-radius: 0.5rem; padding: 0.5rem 0.95rem; cursor: pointer; font-weight: 600; }
.btn-secondary { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem 0.85rem; cursor: pointer; font-weight: 500; }
.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
.banner { padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.9rem; }
.banner.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.banner.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.badge { padding: 0.2rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge-green { background: #dcfce7; color: #166534; }
.badge-amber { background: #fef3c7; color: #92400e; }
.muted { color: #94a3b8; }
.ok-text { color: #15803d; font-weight: 600; font-size: 0.82rem; }
</style>
