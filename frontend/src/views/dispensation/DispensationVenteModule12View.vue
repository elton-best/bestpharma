<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { demoMode, request as liveRequest } from '@/services/quality'
import { boardRequest } from '@/services/cdcBoardsDemo'
const request = demoMode ? boardRequest : liveRequest

/* ─── Types ─── */
interface ProductLite { id: number; code: string; name: string; selling_price: number; sellable_stock?: number }
interface LotLite { id: number; product_id: number; batch_number: string; expiry_date: string; available_qty: number }
interface SaleLineRow {
  id: number; product_id: number; lot_id: number | null; quantity: number; unit_price: number; line_total: number
  dispensing_advice: string | null; product?: { id: number; code: string; name: string }; lot?: { batch_number: string }
}
interface SaleRow {
  id: number; reference: string; sale_type: string; status: string; patient_minimized_ref: string | null
  total_amount: number; payment_status: string; payment_method: string | null
  lines?: SaleLineRow[]; prescription?: { prescription_ref: string; prescriber_name: string | null }
}
interface ReturnRow {
  id: number; reference: string; sale_id: number; product_id: number; quantity_returned: number; reason: string
  pharmacist_decision: string; status: string; created_action_id: number | null
  sale?: { reference: string; total_amount: number }; product?: { name: string }
}
interface CreditRow {
  id: number; credit_ref: string; amount: number; status: string; reason: string; issued_at: string
  sale?: { reference: string }
}
interface SafetyReportRow {
  id: number; reference: string; report_type: string; severity: string; description: string
  external_transmission_status: string; external_ack_ref: string | null; created_action_id: number | null
  product?: { name: string }; lot?: { batch_number: string }
}
interface Kpis {
  total_sales: number; paid_sales: number; pending_sales: number; cancelled_sales: number
  total_returns: number; pending_returns: number; safety_reports_count: number; review_approval_rate: number | string
}

/* ─── State ─── */
const base = '/dispensation'
const tab = ref<'overview' | 'sales' | 'returns' | 'credits' | 'safety'>('overview')
const loading = ref(false)
const error = ref('')

const kpis = ref<Kpis | null>(null)
const sales = ref<SaleRow[]>([])
const returns = ref<ReturnRow[]>([])
const credits = ref<CreditRow[]>([])
const safetyReports = ref<SafetyReportRow[]>([])
const products = ref<ProductLite[]>([])
const lots = ref<LotLite[]>([])

// Modals
const showCreateSale = ref(false)
const showReviewSale = ref<SaleRow | null>(null)
const showReviewOpen = computed({ get: () => showReviewSale.value !== null, set: (v: boolean) => { if (!v) showReviewSale.value = null } })
const showConfirmSale = ref<SaleRow | null>(null)
const showConfirmOpen = computed({ get: () => showConfirmSale.value !== null, set: (v: boolean) => { if (!v) showConfirmSale.value = null } })
const showCreateReturn = ref(false)
const showEvalReturn = ref<ReturnRow | null>(null)
const showEvalReturnOpen = computed({ get: () => showEvalReturn.value !== null, set: (v: boolean) => { if (!v) showEvalReturn.value = null } })
const showCreateSafety = ref(false)

// Forms
const saleForm = reactive({
  reference: '', idempotency_key: '', sale_type: 'comptoir_libre', patient_minimized_ref: '',
  prescription_ref: '', prescription_date: new Date().toISOString().slice(0, 10), prescriber_name: '',
  lines: [{ product_id: 0, quantity: 1, dispensing_advice: '' }],
})
const reviewForm = reactive({
  decision: 'approuve', posology_checked: true, interactions_checked: true, contraindications_checked: true, clinical_notes: '',
})
const confirmForm = reactive({
  payment_status: 'confirme', payment_method: 'especes', counsel_given: '',
})
const returnForm = reactive({
  reference: '', sale_id: 0, product_id: 0, lot_id: null as number | null, quantity_returned: 1, reason: '',
})
const evalReturnForm = reactive({
  pharmacist_decision: 'quarantaine', issue_credit_amount: 0,
})
const safetyForm = reactive({
  reference: '', product_id: null as number | null, lot_id: null as number | null,
  report_type: 'defaut_qualite', severity: 'modere', description: '', external_ack_ref: '',
})

/* ─── API Calls ─── */
async function load(what: string) {
  loading.value = true; error.value = ''
  try {
    if (what === 'overview' || what === 'all') {
      kpis.value = (await request<{ kpis: Kpis }>(`${base}/overview`)).kpis
    }
    if (what === 'sales' || what === 'returns' || what === 'safety' || what === 'all') {
      sales.value = (await request<{ data: SaleRow[] }>(`${base}/sales`)).data
      try {
        products.value = (await request<{ data: ProductLite[] }>('/stock/products')).data
        lots.value = (await request<{ data: LotLite[] }>('/stock/lots?fefo=1')).data
      } catch { /* fallback if stock inactive */ }
    }
    if (what === 'returns' || what === 'all') {
      returns.value = (await request<{ data: ReturnRow[] }>(`${base}/returns`)).data
    }
    if (what === 'credits' || what === 'all') {
      credits.value = (await request<{ data: CreditRow[] }>(`${base}/credits`)).data
    }
    if (what === 'safety' || what === 'all') {
      safetyReports.value = (await request<{ data: SafetyReportRow[] }>(`${base}/safety-reports`)).data
    }
  } catch (e: any) {
    error.value = e.message || 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

function openCreateSale() {
  saleForm.reference = `VTE-${Date.now().toString().slice(-6)}`
  saleForm.idempotency_key = `sale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  showCreateSale.value = true
}

async function createSale() {
  try {
    const payload: any = {
      reference: saleForm.reference,
      idempotency_key: saleForm.idempotency_key,
      sale_type: saleForm.sale_type,
      patient_minimized_ref: saleForm.patient_minimized_ref || null,
      lines: saleForm.lines,
    }
    if (saleForm.sale_type === 'ordonnance' && saleForm.prescription_ref) {
      payload.prescription = {
        prescription_ref: saleForm.prescription_ref,
        prescription_date: saleForm.prescription_date,
        prescriber_name: saleForm.prescriber_name || null,
      }
    }
    await request(`${base}/sales`, 'POST', payload)
    showCreateSale.value = false
    await load('sales'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function submitReview() {
  if (!showReviewSale.value) return
  try {
    await request(`${base}/sales/${showReviewSale.value.id}/review`, 'POST', reviewForm)
    showReviewSale.value = null
    await load('sales'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function submitConfirm() {
  if (!showConfirmSale.value) return
  try {
    await request(`${base}/sales/${showConfirmSale.value.id}/confirm`, 'POST', confirmForm)
    showConfirmSale.value = null
    await load('sales'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createReturn() {
  try {
    await request(`${base}/returns`, 'POST', returnForm)
    showCreateReturn.value = false
    await load('returns'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function submitEvalReturn() {
  if (!showEvalReturn.value) return
  try {
    await request(`${base}/returns/${showEvalReturn.value.id}/evaluate`, 'POST', evalReturnForm)
    showEvalReturn.value = null
    await load('returns'); await load('credits'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createSafety() {
  try {
    await request(`${base}/safety-reports`, 'POST', safetyForm)
    showCreateSafety.value = false
    await load('safety'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

const sections: { key: typeof tab.value; label: string }[] = [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'sales', label: 'Ventes & Ordonnances' },
  { key: 'returns', label: 'Retours Clients' },
  { key: 'credits', label: 'Avoirs Commerciaux' },
  { key: 'safety', label: 'Signalements & Vigilance' },
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
        <h1 class="font-display text-2xl font-bold">Dispensation & Vente Comptoir</h1>
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
        <div class="kpi-card"><span class="kpi-value">{{ kpis.total_sales }}</span><span class="kpi-label">Total ventes</span></div>
        <div class="kpi-card green"><span class="kpi-value">{{ kpis.paid_sales }}</span><span class="kpi-label">Délivrées / Payées</span></div>
        <div class="kpi-card orange"><span class="kpi-value">{{ kpis.pending_sales }}</span><span class="kpi-label">En attente / Analyse</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ kpis.cancelled_sales }}</span><span class="kpi-label">Annulées</span></div>
        <div class="kpi-card" :class="{ orange: kpis.pending_returns > 0 }"><span class="kpi-value">{{ kpis.pending_returns }}</span><span class="kpi-label">Retours à évaluer</span></div>
        <div class="kpi-card" :class="{ red: kpis.safety_reports_count > 0 }"><span class="kpi-value">{{ kpis.safety_reports_count }}</span><span class="kpi-label">Signalements qualité</span></div>
        <div class="kpi-card blue"><span class="kpi-value">{{ kpis.review_approval_rate === 'non disponible' ? 'N/D' : `${kpis.review_approval_rate}%` }}</span><span class="kpi-label">Taux validation pharma</span></div>
      </div>
    </section>

    <!-- ═══════════ SALES ═══════════ -->
    <section v-if="tab === 'sales'" class="content-section">
      <div class="section-toolbar">
        <h3>Dossiers Comptoir & Ordonnances</h3>
        <button class="btn-primary" @click="openCreateSale">+ Nouvelle vente / dispensation</button>
      </div>

      <table v-if="sales.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Type</th><th>Ordonnance</th><th>Montant TTC</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="s in sales" :key="s.id">
            <td class="font-mono font-bold">{{ s.reference }}</td>
            <td>{{ s.sale_type }}</td>
            <td>{{ s.prescription ? s.prescription.prescription_ref : '—' }}</td>
            <td><strong>{{ Number(s.total_amount).toLocaleString() }} FCFA</strong></td>
            <td><span class="badge" :class="s.status">{{ s.status }}</span></td>
            <td>
              <button v-if="s.status === 'brouillon' || s.status === 'en_analyse'" class="btn-sm btn-blue" @click="showReviewSale = s">Analyse Pharma</button>
              <button v-if="s.status !== 'payee' && s.status !== 'annulee'" class="btn-sm btn-green" @click="showConfirmSale = s">Encaisser / Délivrer</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune vente enregistrée.</p>
    </section>

    <!-- ═══════════ RETURNS ═══════════ -->
    <section v-if="tab === 'returns'" class="content-section">
      <div class="section-toolbar">
        <h3>Retours Clients (Quarantaine & Évaluation Pharmacien)</h3>
        <button class="btn-primary" @click="showCreateReturn = true">+ Enregistrer un retour</button>
      </div>

      <table v-if="returns.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Vente</th><th>Produit</th><th>Qté</th><th>Décision Pharmacien</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="r in returns" :key="r.id">
            <td class="font-mono font-bold">{{ r.reference }}</td>
            <td>{{ r.sale?.reference }}</td>
            <td>{{ r.product?.name }}</td>
            <td>{{ r.quantity_returned }}</td>
            <td><span class="badge" :class="r.pharmacist_decision">{{ r.pharmacist_decision }}</span></td>
            <td><span class="badge" :class="r.status">{{ r.status }}</span></td>
            <td><button v-if="r.status === 'demande'" class="btn-sm btn-blue" @click="showEvalReturn = r">Évaluer</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun retour enregistré.</p>
    </section>

    <!-- ═══════════ CREDITS ═══════════ -->
    <section v-if="tab === 'credits'" class="content-section">
      <div class="section-toolbar"><h3>Avoirs Commerciaux émis</h3></div>
      <table v-if="credits.length" class="data-table">
        <thead><tr><th>Réf. Avoir</th><th>Vente d'origine</th><th>Montant</th><th>Motif</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-for="c in credits" :key="c.id">
            <td class="font-mono font-bold">{{ c.credit_ref }}</td>
            <td>{{ c.sale?.reference }}</td>
            <td><strong>{{ Number(c.amount).toLocaleString() }} FCFA</strong></td>
            <td>{{ c.reason }}</td>
            <td><span class="badge" :class="c.status">{{ c.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun avoir commercial émis.</p>
    </section>

    <!-- ═══════════ SAFETY ═══════════ -->
    <section v-if="tab === 'safety'" class="content-section">
      <div class="section-toolbar">
        <h3>Signalements Défauts Qualité & Pharmacovigilance</h3>
        <button class="btn-primary" @click="showCreateSafety = true">+ Nouveau signalement</button>
      </div>

      <table v-if="safetyReports.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Type</th><th>Gravité</th><th>Transmission externe</th><th>CAPA M4</th></tr></thead>
        <tbody>
          <tr v-for="sr in safetyReports" :key="sr.id">
            <td class="font-mono font-bold">{{ sr.reference }}</td>
            <td>{{ sr.report_type }}</td>
            <td><span class="badge" :class="sr.severity">{{ sr.severity }}</span></td>
            <td>{{ sr.external_transmission_status === 'transmis_avec_accuse' ? `Transmis (${sr.external_ack_ref})` : 'Local uniquement (sans accusé ABMed)' }}</td>
            <td><span v-if="sr.created_action_id" class="badge red">Action #{{ sr.created_action_id }}</span><span v-else>—</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun signalement enregistré.</p>
    </section>

    <!-- ═══════════ MODALS ═══════════ -->
    <AppModal v-model="showCreateSale" title="Nouvelle vente / dispensation">
      <form @submit.prevent="createSale" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Référence</label><input v-model="saleForm.reference" required /></div>
          <div class="form-row"><label>Parcours</label>
            <select v-model="saleForm.sale_type">
              <option value="comptoir_libre">Comptoir libre</option>
              <option value="ordonnance">Sur ordonnance</option>
              <option value="conseil">Conseil pharmaceutique</option>
            </select>
          </div>
        </div>
        <div v-if="saleForm.sale_type === 'ordonnance'" class="quote-box">
          <div class="detail-grid">
            <div class="form-row"><label>N° Ordonnance</label><input v-model="saleForm.prescription_ref" required /></div>
            <div class="form-row"><label>Date ordonnance</label><input v-model="saleForm.prescription_date" type="date" required /></div>
          </div>
          <div class="form-row"><label>Prescripteur</label><input v-model="saleForm.prescriber_name" placeholder="Optionnel" /></div>
        </div>
        <div v-for="(l, idx) in saleForm.lines" :key="idx" class="quote-box">
          <div class="form-row"><label>Produit</label>
            <select v-model.number="l.product_id" required>
              <option :value="0" disabled>— Sélectionner —</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }} ({{ Number(p.selling_price).toLocaleString() }} FCFA · Dispo: {{ p.sellable_stock ?? 0 }})</option>
            </select>
          </div>
          <div class="detail-grid">
            <div class="form-row"><label>Quantité</label><input v-model.number="l.quantity" type="number" min="1" required /></div>
            <div class="form-row"><label>Conseil de dispensation</label><input v-model="l.dispensing_advice" /></div>
          </div>
        </div>
        <button type="submit" class="btn-primary mt-4">Enregistrer le dossier</button>
      </form>
    </AppModal>

    <AppModal v-model="showReviewOpen" :title="showReviewSale ? `Analyse Pharmaceutique — ${showReviewSale.reference}` : ''">
      <form v-if="showReviewSale" @submit.prevent="submitReview" class="modal-form">
        <div class="form-row"><label>Décision du pharmacien</label>
          <select v-model="reviewForm.decision">
            <option value="approuve">Approuvé pour délivrance</option>
            <option value="substitution">Substitution validée</option>
            <option value="reserve">Avec réserve / conseil renforcé</option>
            <option value="refuse">Refus de délivrance (annule vente)</option>
          </select>
        </div>
        <div class="form-check"><input type="checkbox" v-model="reviewForm.posology_checked" id="chk-poso" /><label for="chk-poso">Posologie vérifiée</label></div>
        <div class="form-check"><input type="checkbox" v-model="reviewForm.interactions_checked" id="chk-inter" /><label for="chk-inter">Interactions vérifiées</label></div>
        <div class="form-row"><label>Notes cliniques</label><textarea v-model="reviewForm.clinical_notes" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Valider l'analyse</button>
      </form>
    </AppModal>

    <AppModal v-model="showConfirmOpen" :title="showConfirmSale ? `Encaissement & Sortie FEFO — ${showConfirmSale.reference}` : ''">
      <form v-if="showConfirmSale" @submit.prevent="submitConfirm" class="modal-form">
        <p class="text-sm">Montant total : <strong>{{ Number(showConfirmSale.total_amount).toLocaleString() }} FCFA</strong></p>
        <div class="form-row"><label>Statut paiement</label>
          <select v-model="confirmForm.payment_status">
            <option value="confirme">Paiement confirmé (décrémente stock FEFO)</option>
            <option value="annule">Annuler paiement (aucune sortie stock)</option>
          </select>
        </div>
        <div v-if="confirmForm.payment_status === 'confirme'" class="form-row"><label>Mode de règlement</label>
          <select v-model="confirmForm.payment_method">
            <option value="especes">Espèces</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="carte">Carte bancaire</option>
          </select>
        </div>
        <button type="submit" class="btn-primary mt-4">Confirmer</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateReturn" title="Demande de retour client">
      <form @submit.prevent="createReturn" class="modal-form">
        <div class="form-row"><label>Référence retour</label><input v-model="returnForm.reference" required placeholder="RET-2026-001" /></div>
        <div class="form-row"><label>Vente payée d'origine</label>
          <select v-model.number="returnForm.sale_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="s in sales.filter(x => x.status === 'payee')" :key="s.id" :value="s.id">{{ s.reference }} ({{ Number(s.total_amount).toLocaleString() }} FCFA)</option>
          </select>
        </div>
        <div class="form-row"><label>Produit</label>
          <select v-model.number="returnForm.product_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-row"><label>Quantité retournée</label><input v-model.number="returnForm.quantity_returned" type="number" min="1" required /></div>
        <div class="form-row"><label>Motif du retour</label><textarea v-model="returnForm.reason" required rows="2" /></div>
        <p class="text-xs text-gray-500">ℹ️ Le retour ne réintègre pas automatiquement le stock vendable ; il reste en attente d'évaluation pharmacien.</p>
        <button type="submit" class="btn-primary mt-4">Enregistrer la demande</button>
      </form>
    </AppModal>

    <AppModal v-model="showEvalReturnOpen" :title="showEvalReturn ? `Évaluation Retour — ${showEvalReturn.reference}` : ''">
      <form v-if="showEvalReturn" @submit.prevent="submitEvalReturn" class="modal-form">
        <div class="form-row"><label>Décision sur le produit</label>
          <select v-model="evalReturnForm.pharmacist_decision">
            <option value="quarantaine">Mise en quarantaine (CAPA M4)</option>
            <option value="destruction">Destruction</option>
            <option value="reintegration_validee">Réintégration validée (scellé intact vérifié)</option>
          </select>
        </div>
        <div class="form-row"><label>Montant avoir à émettre (FCFA, optionnel)</label><input v-model.number="evalReturnForm.issue_credit_amount" type="number" min="0" /></div>
        <button type="submit" class="btn-primary mt-4">Valider décision</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateSafety" title="Déclarer un signalement qualité / vigilance">
      <form @submit.prevent="createSafety" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Référence</label><input v-model="safetyForm.reference" required placeholder="SIG-2026-001" /></div>
          <div class="form-row"><label>Type</label>
            <select v-model="safetyForm.report_type">
              <option value="defaut_qualite">Défaut qualité</option>
              <option value="effet_indesirable">Effet indésirable (PV)</option>
              <option value="erreur_dispensation">Erreur de dispensation</option>
              <option value="contrefacon_suspectee">Contrefaçon suspectée</option>
            </select>
          </div>
        </div>
        <div class="form-row"><label>Gravité</label>
          <select v-model="safetyForm.severity">
            <option value="faible">Faible</option>
            <option value="modere">Modérée</option>
            <option value="grave">Grave (CAPA critique)</option>
          </select>
        </div>
        <div class="form-row"><label>Description</label><textarea v-model="safetyForm.description" required rows="3" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer le signalement</button>
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
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.kpi-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; align-items: center; text-align: center; }
.kpi-card.green { border-left: 4px solid #10b981; }
.kpi-card.blue { border-left: 4px solid #3b82f6; }
.kpi-card.orange { border-left: 4px solid #f59e0b; }
.kpi-card.red { border-left: 4px solid #ef4444; }
.kpi-value { font-size: 1.75rem; font-weight: 700; color: #1f2937; }
.kpi-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
.section-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.section-toolbar h3 { margin: 0; font-size: 1rem; flex: 1; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 0.6rem; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.data-table td { padding: 0.6rem; border-bottom: 1px solid #f3f4f6; }
.badge { font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600; text-transform: capitalize; }
.badge.payee, .badge.validee, .badge.emis, .badge.evalue, .badge.reintegration_validee { background: #d1fae5; color: #065f46; }
.badge.en_analyse, .badge.brouillon, .badge.demande, .badge.quarantaine, .badge.modere { background: #fef3c7; color: #92400e; }
.badge.annulee, .badge.grave, .badge.destruction, .badge.red { background: #fee2e2; color: #991b1b; }
.empty-state { text-align: center; color: #9ca3af; padding: 3rem 1rem; font-size: 0.9rem; }
.btn-primary { padding: 0.5rem 1.15rem; background: #1a73e8; color: #fff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-sm { padding: 0.25rem 0.6rem; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-right: 0.25rem; }
.btn-green { background: #d1fae5; color: #065f46; }
.btn-blue { background: #dbeafe; color: #1e40af; }
.modal-form { display: flex; flex-direction: column; gap: 0.6rem; max-height: 65vh; overflow-y: auto; }
.form-row { display: flex; flex-direction: column; gap: 0.2rem; }
.form-row label { font-size: 0.75rem; font-weight: 600; color: #374151; }
.form-row input, .form-row select, .form-row textarea { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }
.form-check { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
.quote-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; background: #f9fafb; display: flex; flex-direction: column; gap: 0.5rem; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
</style>
