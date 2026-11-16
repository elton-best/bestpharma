<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Réglementaire & Paiements DGI</span>
        <h1>Connecteurs e-MECEF (DGI) & FeexPay</h1>
        <p class="subtitle">
          Certification fiscale des factures normalisées DGI / e-MECEF et encaissements Mobile
          Money via FeexPay (MTN, Moov, Celtiis) avec webhooks signés HMAC-SHA256.
        </p>
      </div>
    </header>

    <div v-if="error" class="banner error" role="alert">
      <span>{{ error }}</span>
      <button class="btn-link" @click="loadAll">Réessayer</button>
    </div>
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
                : 'Mode Démo / Émulateur (MECEF_TOKEN / IFU configurables)'
            }}
          </span>
        </div>
        <p class="connector-meta">
          Factures enregistrées : <strong>{{ overview.kpis.invoices_total }}</strong> · Certifiées DGI :
          <strong>{{ overview.kpis.invoices_certified }}</strong>
        </p>
      </div>

      <div class="connector-card">
        <div class="connector-head">
          <h2>FeexPay Mobile Money & Carte</h2>
          <span
            class="badge"
            :class="overview.connectors?.feexpay?.configured ? 'badge-green' : 'badge-amber'"
          >
            {{
              overview.connectors?.feexpay?.configured
                ? `Configuré (${overview.connectors.feexpay.mode})`
                : 'Mode Démo / Émulateur (MTN / Moov / Celtiis)'
            }}
          </span>
        </div>
        <p class="connector-meta">
          Intentions de paiement : <strong>{{ overview.kpis.feexpay_intents_total }}</strong> · Total
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
        <h2>Factures Normalisées DGI / e-MECEF</h2>
      </div>
      <form class="inline-form mb-4" @submit.prevent="createInvoice">
        <input v-model="invForm.reference" placeholder="Réf (ex: FAC-2026-01)" required />
        <select v-model="invForm.invoice_type">
          <option value="FV">FV — Facture de Vente</option>
          <option value="FA">FA — Facture d'Avoir</option>
        </select>
        <input v-model="invForm.customer_name" placeholder="Nom du Client" required />
        <input v-model="invForm.customer_ifu" placeholder="IFU Client (optionnel)" />
        <input v-model.number="invForm.total_ttc" type="number" min="0" placeholder="Montant TTC (FCFA)" required />
        <button type="submit" class="btn-primary" :disabled="busy">Créer Facture</button>
      </form>

      <table class="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Type</th>
            <th>Client</th>
            <th>Montant TTC</th>
            <th>Statut DGI</th>
            <th>Code MECeF / Sceau</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="inv in invoices" :key="inv.id">
            <td><strong>{{ inv.reference }}</strong></td>
            <td><span class="badge badge-neutral">{{ inv.invoice_type }}</span></td>
            <td>
              <div>{{ inv.customer_name }}</div>
              <small v-if="inv.customer_ifu" class="muted">IFU : {{ inv.customer_ifu }}</small>
            </td>
            <td>{{ formatMoney(inv.total_ttc) }}</td>
            <td>
              <span
                class="badge"
                :class="inv.status === 'certifiee' ? 'badge-green' : 'badge-amber'"
              >
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
                class="btn-primary btn-sm"
                :disabled="busy"
                @click="certifyInvoice(inv.id)"
              >
                Certifier DGI
              </button>
              <span v-else class="ok-text">Certifié DGI</span>
            </td>
          </tr>
          <tr v-if="!invoices.length">
            <td colspan="7" class="empty-row">Aucune facture émise.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Tab: FeexPay -->
    <section v-if="activeTab === 'feexpay'" class="panel">
      <div class="panel-head">
        <h2>Transactions Mobile Money FeexPay</h2>
      </div>
      <form class="inline-form mb-4" @submit.prevent="initiatePayment">
        <input v-model="payForm.reference" placeholder="Réf transaction" required />
        <input v-model.number="payForm.amount" type="number" min="100" placeholder="Montant (FCFA)" required />
        <select v-model="payForm.network">
          <option value="MTN">MTN Mobile Money</option>
          <option value="MOOV">Moov Money</option>
          <option value="CELTIIS">Celtiis Cash</option>
          <option value="CARTE">Carte Bancaire</option>
        </select>
        <input v-model="payForm.phone_number" placeholder="Téléphone (+229...)" required />
        <button type="submit" class="btn-primary" :disabled="busy">Initier Encaissement</button>
      </form>

      <table class="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Réseau</th>
            <th>Montant</th>
            <th>Téléphone</th>
            <th>Statut</th>
            <th>Réf. Opérateur</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="intent in feexpayIntents" :key="intent.id">
            <td><strong>{{ intent.reference }}</strong></td>
            <td><span class="badge badge-neutral">{{ intent.network }}</span></td>
            <td>{{ formatMoney(intent.amount) }}</td>
            <td>{{ intent.phone_number || '—' }}</td>
            <td>
              <span
                class="badge"
                :class="intent.status === 'confirme' ? 'badge-green' : intent.status === 'initie' ? 'badge-amber' : 'badge-red'"
              >
                {{ intent.status }}
              </span>
            </td>
            <td>
              <code>{{ intent.provider_reference || 'En attente' }}</code>
            </td>
          </tr>
          <tr v-if="!feexpayIntents.length">
            <td colspan="6" class="empty-row">Aucune transaction FeexPay.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { request } from '@/services/quality'

interface OverviewData {
  kpis: {
    invoices_total: number
    invoices_certified: number
    feexpay_intents_total: number
    feexpay_confirmed_amount: number
  }
  connectors: {
    mecef?: { configured: boolean; mode: string }
    feexpay?: { configured: boolean; mode: string }
  }
}

const base = '/fiscalite'
const activeTab = ref<'mecef' | 'feexpay'>('mecef')
const busy = ref(false)
const error = ref('')
const notice = ref('')

const overview = ref<OverviewData | null>(null)
const invoices = ref<any[]>([])
const feexpayIntents = ref<any[]>([])

const invForm = reactive({
  reference: '',
  invoice_type: 'FV',
  customer_name: 'Client Comptoir',
  customer_ifu: '',
  total_ttc: 0,
})

const payForm = reactive({
  reference: '',
  amount: 1000,
  network: 'MTN',
  phone_number: '+229',
})

function formatMoney(n: number | string | undefined): string {
  const v = Number(n || 0)
  return new Intl.NumberFormat('fr-FR').format(v) + ' FCFA'
}

async function loadAll() {
  busy.value = true
  error.value = ''
  try {
    const [ov, invs, intents] = await Promise.all([
      request<OverviewData>(`${base}/overview`),
      request<{ data: any[] }>(`${base}/invoices`),
      request<{ data: any[] }>(`${base}/feexpay/intents`),
    ])
    overview.value = ov
    invoices.value = invs.data || []
    feexpayIntents.value = intents.data || []
  } catch (e) {
    error.value = (e as Error).message || 'Erreur lors du chargement des connecteurs fiscaux.'
  } finally {
    busy.value = false
  }
}

async function createInvoice() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const ttc = Number(invForm.total_ttc)
    const ht = Math.round((ttc / 1.18) * 100) / 100
    const tva = Math.round((ttc - ht) * 100) / 100

    await request(`${base}/invoices`, 'POST', {
      reference: invForm.reference,
      invoice_type: invForm.invoice_type,
      customer_name: invForm.customer_name,
      customer_ifu: invForm.customer_ifu || null,
      total_ht: ht,
      total_tva: tva,
      total_ttc: ttc,
    })
    notice.value = 'Facture enregistrée en brouillon avec succès.'
    invForm.reference = ''
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message || 'Échec de la création de facture.'
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
    notice.value = 'Facture certifiée par e-MECEF / DGI avec QR code généré.'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message || 'Échec de la certification e-MECEF.'
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
    notice.value = 'Demande de paiement FeexPay initiée avec succès.'
    payForm.reference = ''
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message || 'Échec de l initiation FeexPay.'
  } finally {
    busy.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped>
.module-shell {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background: #f8fafc;
}

.module-header {
  border-bottom: 2px solid #0f3b27;
  padding-bottom: 1rem;
}

.phase-pill {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 0 !important;
  background: #0f3b27;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

h1 {
  margin: 0.35rem 0 0;
  font-size: 1.6rem;
  color: #0f3b27;
  font-weight: 800;
}

.subtitle {
  margin: 0.2rem 0 0;
  color: #475569;
  font-size: 0.9rem;
}

.connector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.connector-card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  padding: 1.25rem;
}

.connector-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.connector-head h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #0f3b27;
  font-weight: 700;
}

.connector-meta {
  margin: 0;
  font-size: 0.88rem;
  color: #475569;
}

.tab-bar {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #cbd5e1;
  padding-bottom: 0.5rem;
}

.tab-btn {
  padding: 0.5rem 1rem;
  border-radius: 0 !important;
  border: 1px solid #0f3b27;
  background: #ffffff;
  color: #0f3b27;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
}

.tab-btn.active {
  background: #0f3b27;
  color: #ffffff;
}

.panel {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  padding: 1.25rem;
}

.panel-head {
  margin-bottom: 1rem;
}

.panel-head h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f3b27;
  font-weight: 700;
}

.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

input, select {
  padding: 0.5rem 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  outline: none !important;
  font-size: 0.88rem;
  background: #ffffff;
  color: #0f172a;
}

input:focus, select:focus {
  border-color: #0f3b27 !important;
  outline: none !important;
  box-shadow: none !important;
}

.mb-4 { margin-bottom: 1rem; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
}

.data-table th, .data-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 0 !important;
  text-align: left;
}

.data-table th {
  background: #0f3b27;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.empty-row {
  text-align: center;
  color: #94a3b8;
  padding: 1.5rem;
}

.btn-primary {
  background: #0f3b27;
  color: #ffffff;
  border: none;
  border-radius: 0 !important;
  padding: 0.55rem 1rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.88rem;
}

.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 0 !important;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.badge-green { background: #dcfce7; color: #166534; }
.badge-amber { background: #fef3c7; color: #92400e; }
.badge-red { background: #fee2e2; color: #991b1b; }
.badge-neutral { background: #f1f5f9; color: #475569; }

.muted { color: #94a3b8; font-size: 0.82rem; }
.ok-text { color: #15803d; font-weight: 700; font-size: 0.82rem; }

.btn-link {
  background: none;
  border: none;
  color: #0f3b27;
  text-decoration: underline;
  cursor: pointer;
  font-weight: 700;
  margin-left: 0.5rem;
}

.banner {
  padding: 0.75rem 1rem;
  border-radius: 0 !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.banner.error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
.banner.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
</style>
