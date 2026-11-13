<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { demoMode, request as liveRequest } from '@/services/quality'
import { boardRequest } from '@/services/cdcBoardsDemo'
const request = demoMode ? boardRequest : liveRequest

/* ─── Types ─── */
interface SupplierLite { id: number; code: string; name: string }
interface ProductUnitRow { id: number; unit_name: string; conversion_factor: number; is_default_dispense: boolean }
interface ProductRow {
  id: number; code: string; barcode: string | null; name: string; dci: string | null
  dosage: string | null; pharmaceutical_form: string | null; base_unit: string; category: string
  default_supplier_id: number | null; storage_condition: string; is_thermosensitive: boolean
  min_stock_threshold: number; reorder_quantity: number; purchase_price: number; selling_price: number
  amm_number: string | null; amm_source_verified: boolean; amm_source_label: string | null
  sellable_stock?: number; supplier?: SupplierLite; units?: ProductUnitRow[]
}
interface SuggestionRow {
  product_id: number; code: string; name: string; supplier_id: number | null; supplier_name: string | null
  current_sellable_stock: number; min_stock_threshold: number; suggested_qty: number; unit_price: number
  origin_formula: string
}
interface OrderLineRow {
  id: number; product_id: number; ordered_qty: number; received_qty: number; unit_price: number; line_total: number
  product?: { id: number; code: string; name: string; base_unit: string }
}
interface OrderRow {
  id: number; reference: string; supplier_id: number; status: string; order_date: string
  total_estimated_amount: number; supplier?: SupplierLite; lines?: OrderLineRow[]
}
interface ReceiptRow {
  id: number; reference: string; delivery_note_ref: string; parcel_count: number; received_at: string
  has_thermosensitive_items: boolean; arrival_temperature: number | null; cold_chain_compliant: boolean | null
  status: string; created_action_id: number | null; supplier?: SupplierLite
}
interface LotRow {
  id: number; product_id: number; batch_number: string; expiry_date: string; storage_zone: string
  available_qty: number; unit_cost: number; status: string; is_sellable: boolean
  product?: { id: number; code: string; name: string; base_unit: string; is_thermosensitive: boolean }
}
interface MovementRow {
  id: number; movement_type: string; quantity_delta: number; balance_after: number; reason: string; performed_at: string
  product?: { id: number; code: string; name: string }; lot?: { id: number; batch_number: string }; performed_by?: { id: number; name: string }
}
interface InventoryRow {
  id: number; reference: string; inventory_date: string; scope_description: string; status: string
  total_variance_qty: number; lines?: Array<{ id: number; lot_id: number; theoretical_qty: number; counted_qty: number; variance_qty: number; lot?: { batch_number: string } }>
}
interface TempReadingRow {
  id: number; zone_name: string; measured_temperature: number; min_threshold: number; max_threshold: number
  is_excursion: boolean; measured_at: string; effectiveness_status: string; pharmacist_decision: string | null
  created_action_id: number | null; equipment?: { id: number; code: string; designation: string }
}
interface Kpis {
  total_products: number; below_threshold_products: number; pending_orders: number; total_lots_available: number
  expiring_soon_lots: number; quarantine_lots: number; cold_chain_excursions: number; stock_conformity_rate: number | string
}

/* ─── State ─── */
const base = '/stock'
const tab = ref<'overview' | 'catalogue' | 'orders' | 'receipts' | 'lots' | 'inventories' | 'cold'>('overview')
const loading = ref(false)
const error = ref('')

const kpis = ref<Kpis | null>(null)
const products = ref<ProductRow[]>([])
const suppliers = ref<SupplierLite[]>([])
const suggestions = ref<SuggestionRow[]>([])
const orders = ref<OrderRow[]>([])
const receipts = ref<ReceiptRow[]>([])
const lots = ref<LotRow[]>([])
const movements = ref<MovementRow[]>([])
const inventories = ref<InventoryRow[]>([])
const temperatures = ref<TempReadingRow[]>([])

const searchProduct = ref('')
const fefoOnly = ref(false)

// Modals
const showCreateProduct = ref(false)
const showCreateOrder = ref(false)
const showCreateReceipt = ref(false)
const showQuarantineLot = ref<LotRow | null>(null)
const showQuarantineOpen = computed({
  get: () => showQuarantineLot.value !== null,
  set: (v: boolean) => { if (!v) showQuarantineLot.value = null },
})
const showCreateInventory = ref(false)
const showCreateTemp = ref(false)
const showDecideTemp = ref<TempReadingRow | null>(null)
const showDecideTempOpen = computed({
  get: () => showDecideTemp.value !== null,
  set: (v: boolean) => { if (!v) showDecideTemp.value = null },
})

// Forms
const productForm = reactive({
  code: '', barcode: '', name: '', dci: '', dosage: '', pharmaceutical_form: 'Comprimé',
  base_unit: 'Boîte', category: 'medicament', default_supplier_id: null as number | null,
  storage_condition: 'ambiant', is_thermosensitive: false, min_stock_threshold: 10, reorder_quantity: 30,
  purchase_price: 0, selling_price: 0, amm_number: '',
})

const orderForm = reactive({
  reference: '', supplier_id: 0, order_date: new Date().toISOString().slice(0, 10),
  lines: [{ product_id: 0, ordered_qty: 10, unit_price: 0 }],
})

const receiptForm = reactive({
  reference: '', idempotency_key: '', purchase_order_id: null as number | null, supplier_id: 0,
  delivery_note_ref: '', parcel_count: 1, has_thermosensitive_items: false,
  arrival_temperature: 4.5, cold_chain_compliant: true, reserves: '',
  lines: [{ product_id: 0, batch_number: '', expiry_date: '', received_qty: 1, unit_cost: 0 }],
})

const quarantineForm = reactive({
  event_type: 'quarantaine', reason: '', proof_reference: '',
})

const inventoryForm = reactive({
  reference: '', inventory_date: new Date().toISOString().slice(0, 10), scope_description: 'Contrôle périodique',
  lines: [{ lot_id: 0, counted_qty: 0, justification: '' }],
})

const tempForm = reactive({
  zone_name: 'Enceinte 2-8°C Principale', measured_temperature: 4.5, min_threshold: 2.0, max_threshold: 8.0, incident_notes: '',
})

const decideTempForm = reactive({
  pharmacist_decision: '', effectiveness_status: 'resolu',
})

/* ─── API Calls ─── */
async function load(what: string) {
  loading.value = true; error.value = ''
  try {
    if (what === 'overview' || what === 'all') {
      kpis.value = (await request<{ kpis: Kpis }>(`${base}/overview`)).kpis
    }
    if (what === 'catalogue' || what === 'orders' || what === 'receipts' || what === 'all') {
      const q = searchProduct.value ? `?search=${encodeURIComponent(searchProduct.value)}` : ''
      products.value = (await request<{ data: ProductRow[] }>(`${base}/products${q}`)).data
      try {
        suppliers.value = (await request<{ data: SupplierLite[] }>('/achats/suppliers')).data
      } catch { /* ignore if achats module inactive */ }
    }
    if (what === 'orders' || what === 'all') {
      suggestions.value = (await request<{ data: SuggestionRow[] }>(`${base}/order-suggestions`)).data
      orders.value = (await request<{ data: OrderRow[] }>(`${base}/orders`)).data
    }
    if (what === 'receipts' || what === 'all') {
      receipts.value = (await request<{ data: ReceiptRow[] }>(`${base}/receipts`)).data
    }
    if (what === 'lots' || what === 'inventories' || what === 'all') {
      const q = fefoOnly.value ? '?fefo=1' : ''
      lots.value = (await request<{ data: LotRow[] }>(`${base}/lots${q}`)).data
      movements.value = (await request<{ data: MovementRow[] }>(`${base}/movements`)).data
    }
    if (what === 'inventories' || what === 'all') {
      inventories.value = (await request<{ data: InventoryRow[] }>(`${base}/inventories`)).data
    }
    if (what === 'cold' || what === 'all') {
      temperatures.value = (await request<{ data: TempReadingRow[] }>(`${base}/temperatures`)).data
    }
  } catch (e: any) {
    error.value = e.message || 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

async function createProduct() {
  try {
    await request(`${base}/products`, 'POST', productForm)
    showCreateProduct.value = false
    await load('catalogue'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createOrder() {
  try {
    await request(`${base}/orders`, 'POST', orderForm)
    showCreateOrder.value = false
    await load('orders'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function approveOrder(id: number) {
  try {
    await request(`${base}/orders/${id}/approve`, 'POST', { action: 'emis' })
    await load('orders'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

function openReceiptModal() {
  receiptForm.reference = `REC-${Date.now().toString().slice(-6)}`
  receiptForm.idempotency_key = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  showCreateReceipt.value = true
}

async function createReceipt() {
  try {
    await request(`${base}/receipts`, 'POST', receiptForm)
    showCreateReceipt.value = false
    await load('receipts'); await load('lots'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function submitQuarantine() {
  if (!showQuarantineLot.value) return
  try {
    await request(`${base}/lots/${showQuarantineLot.value.id}/quarantine`, 'POST', quarantineForm)
    showQuarantineLot.value = null
    await load('lots'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createInventory() {
  try {
    await request(`${base}/inventories`, 'POST', inventoryForm)
    showCreateInventory.value = false
    await load('inventories')
  } catch (e: any) { error.value = e.message }
}

async function approveInventory(id: number) {
  try {
    await request(`${base}/inventories/${id}/approve`, 'POST', {})
    await load('inventories'); await load('lots'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createTemp() {
  try {
    await request(`${base}/temperatures`, 'POST', tempForm)
    showCreateTemp.value = false
    await load('cold'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function submitDecideTemp() {
  if (!showDecideTemp.value) return
  try {
    await request(`${base}/temperatures/${showDecideTemp.value.id}/decision`, 'POST', decideTempForm)
    showDecideTemp.value = null
    await load('cold'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

const sections: { key: typeof tab.value; label: string }[] = [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'catalogue', label: 'Catalogue Produits' },
  { key: 'orders', label: 'Commandes & Réappro' },
  { key: 'receipts', label: 'Réceptions & BL' },
  { key: 'lots', label: 'Lots FEFO & Quarantaine' },
  { key: 'inventories', label: 'Inventaires Physiques' },
  { key: 'cold', label: 'Chaîne du Froid' },
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
        <h1 class="font-display text-2xl font-bold">Produits, Approvisionnements & Stocks</h1>
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
        <div class="kpi-card"><span class="kpi-value">{{ kpis.total_products }}</span><span class="kpi-label">Références actives</span></div>
        <div class="kpi-card" :class="{ orange: kpis.below_threshold_products > 0 }"><span class="kpi-value">{{ kpis.below_threshold_products }}</span><span class="kpi-label">Sous seuil alerte</span></div>
        <div class="kpi-card blue"><span class="kpi-value">{{ kpis.pending_orders }}</span><span class="kpi-label">Commandes en cours</span></div>
        <div class="kpi-card green"><span class="kpi-value">{{ kpis.total_lots_available }}</span><span class="kpi-label">Lots vendables (FEFO)</span></div>
        <div class="kpi-card" :class="{ orange: kpis.expiring_soon_lots > 0 }"><span class="kpi-value">{{ kpis.expiring_soon_lots }}</span><span class="kpi-label">Péremption ≤ 90j</span></div>
        <div class="kpi-card" :class="{ red: kpis.quarantine_lots > 0 }"><span class="kpi-value">{{ kpis.quarantine_lots }}</span><span class="kpi-label">Lots bloqués / rappelés</span></div>
        <div class="kpi-card" :class="{ red: kpis.cold_chain_excursions > 0 }"><span class="kpi-value">{{ kpis.cold_chain_excursions }}</span><span class="kpi-label">Excursions froid actives</span></div>
        <div class="kpi-card"><span class="kpi-value">{{ kpis.stock_conformity_rate === 'non disponible' ? 'N/D' : `${kpis.stock_conformity_rate}%` }}</span><span class="kpi-label">Taux conformité lots</span></div>
      </div>
    </section>

    <!-- ═══════════ CATALOGUE ═══════════ -->
    <section v-if="tab === 'catalogue'" class="content-section">
      <div class="section-toolbar">
        <input v-model="searchProduct" type="text" placeholder="Rechercher code, DCI, nom…" class="search-input" @input="load('catalogue')" />
        <button class="btn-primary" @click="showCreateProduct = true">+ Nouveau produit</button>
      </div>

      <table v-if="products.length" class="data-table">
        <thead><tr><th>Code</th><th>Désignation / DCI</th><th>Conservation</th><th>Stock vendable</th><th>Seuil</th><th>AMM vérifiée</th></tr></thead>
        <tbody>
          <tr v-for="p in products" :key="p.id">
            <td class="font-mono font-bold">{{ p.code }}</td>
            <td><strong>{{ p.name }}</strong> <span v-if="p.dci" class="text-xs text-gray-500">({{ p.dci }})</span></td>
            <td><span class="badge" :class="p.is_thermosensitive ? 'red' : 'standard'">{{ p.is_thermosensitive ? 'Froid 2-8°C' : p.storage_condition }}</span></td>
            <td><strong :class="{ 'text-red-600': (p.sellable_stock ?? 0) < p.min_stock_threshold }">{{ p.sellable_stock ?? 0 }}</strong> {{ p.base_unit }}</td>
            <td>{{ p.min_stock_threshold }}</td>
            <td><span v-if="p.amm_source_verified" class="badge valide">✓ {{ p.amm_number }}</span><span v-else class="text-xs text-gray-500">Non vérifiée</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Catalogue vide. Cliquez sur « + Nouveau produit ».</p>
    </section>

    <!-- ═══════════ ORDERS ═══════════ -->
    <section v-if="tab === 'orders'" class="content-section">
      <div class="section-toolbar">
        <h3>Commandes & Suggestions de Réapprovisionnement</h3>
        <button class="btn-primary" @click="showCreateOrder = true">+ Nouvelle commande</button>
      </div>

      <div v-if="suggestions.length" class="alert-box">
        <h3><AppIcon name="box" :size="18" /> Suggestions de commande sous seuil ({{ suggestions.length }})</h3>
        <ul class="text-xs mt-2">
          <li v-for="s in suggestions" :key="s.product_id">
            <strong>{{ s.code }} — {{ s.name }}</strong> : Stock {{ s.current_sellable_stock }} / Seuil {{ s.min_stock_threshold }} → Qté suggérée : <strong>{{ s.suggested_qty }}</strong>
          </li>
        </ul>
      </div>

      <table v-if="orders.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Date</th><th>Fournisseur</th><th>Montant est.</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td class="font-mono font-bold">{{ o.reference }}</td>
            <td>{{ o.order_date }}</td>
            <td>{{ o.supplier?.name || '—' }}</td>
            <td>{{ Number(o.total_estimated_amount).toLocaleString() }} FCFA</td>
            <td><span class="badge" :class="o.status">{{ o.status }}</span></td>
            <td><button v-if="o.status === 'a_approuver' || o.status === 'brouillon'" class="btn-sm btn-green" @click="approveOrder(o.id)">Approuver & Émettre</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune commande d'achat enregistrée.</p>
    </section>

    <!-- ═══════════ RECEIPTS ═══════════ -->
    <section v-if="tab === 'receipts'" class="content-section">
      <div class="section-toolbar">
        <h3>Réceptions & Contrôle à l'arrivée</h3>
        <button class="btn-primary" @click="openReceiptModal">+ Réceptionner un BL</button>
      </div>

      <table v-if="receipts.length" class="data-table">
        <thead><tr><th>Réf.</th><th>N° BL</th><th>Fournisseur</th><th>Colis</th><th>Contrôle froid</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-for="r in receipts" :key="r.id">
            <td class="font-mono font-bold">{{ r.reference }}</td>
            <td>{{ r.delivery_note_ref }}</td>
            <td>{{ r.supplier?.name || '—' }}</td>
            <td>{{ r.parcel_count }}</td>
            <td><span v-if="r.has_thermosensitive_items">{{ r.arrival_temperature }}°C ({{ r.cold_chain_compliant ? 'OK' : 'NON CONFORME' }})</span><span v-else>Ambiant</span></td>
            <td><span class="badge" :class="r.status">{{ r.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune réception enregistrée.</p>
    </section>

    <!-- ═══════════ LOTS FEFO ═══════════ -->
    <section v-if="tab === 'lots'" class="content-section">
      <div class="section-toolbar">
        <h3>Gestion des Lots (FEFO, Quarantaine & Rappels)</h3>
        <label class="form-check"><input type="checkbox" v-model="fefoOnly" @change="load('lots')" /> Uniquement lots vendables triés FEFO</label>
      </div>

      <table v-if="lots.length" class="data-table">
        <thead><tr><th>Produit</th><th>N° Lot</th><th>Péremption</th><th>Stock</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="l in lots" :key="l.id">
            <td><strong>{{ l.product?.name }}</strong></td>
            <td class="font-mono font-bold">{{ l.batch_number }}</td>
            <td>{{ l.expiry_date }}</td>
            <td><strong>{{ l.available_qty }}</strong></td>
            <td><span class="badge" :class="l.status">{{ l.status }}</span></td>
            <td>
              <button class="btn-sm btn-blue" @click="showQuarantineLot = l; quarantineForm.event_type = l.status === 'quarantaine' ? 'levee_quarantaine' : 'quarantaine'">Gérer statut</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun lot enregistré.</p>
    </section>

    <!-- ═══════════ INVENTORIES ═══════════ -->
    <section v-if="tab === 'inventories'" class="content-section">
      <div class="section-toolbar">
        <h3>Inventaires Physiques & Régularisation d'écarts</h3>
        <button class="btn-primary" @click="showCreateInventory = true">+ Nouvel inventaire</button>
      </div>

      <table v-if="inventories.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Date</th><th>Périmètre</th><th>Écart total</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="inv in inventories" :key="inv.id">
            <td class="font-mono font-bold">{{ inv.reference }}</td>
            <td>{{ inv.inventory_date }}</td>
            <td>{{ inv.scope_description }}</td>
            <td><strong>{{ inv.total_variance_qty }}</strong></td>
            <td><span class="badge" :class="inv.status">{{ inv.status }}</span></td>
            <td><button v-if="inv.status === 'compte'" class="btn-sm btn-green" @click="approveInventory(inv.id)">Approuver (Titulaire)</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun inventaire physique enregistré.</p>
    </section>

    <!-- ═══════════ COLD CHAIN ═══════════ -->
    <section v-if="tab === 'cold'" class="content-section">
      <div class="section-toolbar">
        <h3>Relevés Horodatés Chaîne du Froid & Excursions</h3>
        <button class="btn-primary" @click="showCreateTemp = true">+ Saisir relevé</button>
      </div>

      <table v-if="temperatures.length" class="data-table">
        <thead><tr><th>Zone / Équipement</th><th>Mesure</th><th>Seuils</th><th>État</th><th>Décision pharmacien</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="tr in temperatures" :key="tr.id">
            <td><strong>{{ tr.zone_name }}</strong></td>
            <td><strong :class="{ 'text-red-600': tr.is_excursion }">{{ tr.measured_temperature }}°C</strong></td>
            <td>{{ tr.min_threshold }}°C – {{ tr.max_threshold }}°C</td>
            <td><span class="badge" :class="tr.effectiveness_status">{{ tr.effectiveness_status }}</span></td>
            <td>{{ tr.pharmacist_decision || '—' }}</td>
            <td><button v-if="tr.is_excursion && tr.effectiveness_status === 'incident_ouvert'" class="btn-sm btn-blue" @click="showDecideTemp = tr">Statuer</button></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun relevé de température enregistré.</p>
    </section>

    <!-- ═══════════ MODALS ═══════════ -->
    <AppModal v-model="showCreateProduct" title="Nouveau produit au catalogue">
      <form @submit.prevent="createProduct" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Code unique</label><input v-model="productForm.code" required placeholder="AMOX-500" /></div>
          <div class="form-row"><label>Désignation</label><input v-model="productForm.name" required /></div>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>DCI</label><input v-model="productForm.dci" /></div>
          <div class="form-row"><label>Unité de base</label><input v-model="productForm.base_unit" required /></div>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>Fournisseur principal</label>
            <select v-model.number="productForm.default_supplier_id">
              <option :value="null">— Aucun —</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div class="form-row"><label>Conservation</label>
            <select v-model="productForm.storage_condition" @change="productForm.is_thermosensitive = productForm.storage_condition === 'froid_2_8'">
              <option value="ambiant">Ambiant (&lt; 25°C)</option>
              <option value="froid_2_8">Chaîne du froid (2°C - 8°C)</option>
              <option value="controle_b">Stupéfiant / Coffre</option>
            </select>
          </div>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>Seuil alerte</label><input v-model.number="productForm.min_stock_threshold" type="number" min="0" /></div>
          <div class="form-row"><label>Qté réappro</label><input v-model.number="productForm.reorder_quantity" type="number" min="1" /></div>
        </div>
        <div class="detail-grid">
          <div class="form-row"><label>Prix achat (FCFA)</label><input v-model.number="productForm.purchase_price" type="number" min="0" /></div>
          <div class="form-row"><label>Prix vente (FCFA)</label><input v-model.number="productForm.selling_price" type="number" min="0" /></div>
        </div>
        <button type="submit" class="btn-primary mt-4">Enregistrer le produit</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateOrder" title="Nouvelle commande d'approvisionnement">
      <form @submit.prevent="createOrder" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Référence</label><input v-model="orderForm.reference" required placeholder="CMD-2026-001" /></div>
          <div class="form-row"><label>Date</label><input v-model="orderForm.order_date" type="date" required /></div>
        </div>
        <div class="form-row"><label>Fournisseur</label>
          <select v-model.number="orderForm.supplier_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div v-for="(l, idx) in orderForm.lines" :key="idx" class="quote-box">
          <div class="form-row"><label>Produit</label>
            <select v-model.number="l.product_id" required>
              <option :value="0" disabled>— Sélectionner —</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
            </select>
          </div>
          <div class="detail-grid">
            <div class="form-row"><label>Quantité</label><input v-model.number="l.ordered_qty" type="number" min="1" required /></div>
            <div class="form-row"><label>Prix unitaire</label><input v-model.number="l.unit_price" type="number" min="0" required /></div>
          </div>
        </div>
        <button type="submit" class="btn-primary mt-4">Soumettre la commande</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateReceipt" title="Réceptionner un Bon de Livraison">
      <form @submit.prevent="createReceipt" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Référence</label><input v-model="receiptForm.reference" required /></div>
          <div class="form-row"><label>N° BL fournisseur</label><input v-model="receiptForm.delivery_note_ref" required /></div>
        </div>
        <div class="form-row"><label>Fournisseur</label>
          <select v-model.number="receiptForm.supplier_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="form-check"><input type="checkbox" v-model="receiptForm.has_thermosensitive_items" id="thermo-chk" /><label for="thermo-chk">Contient des produits thermosensibles (2-8°C)</label></div>
        <div v-if="receiptForm.has_thermosensitive_items" class="detail-grid">
          <div class="form-row"><label>Température arrivée (°C)</label><input v-model.number="receiptForm.arrival_temperature" type="number" step="0.1" /></div>
          <div class="form-check mt-4"><input type="checkbox" v-model="receiptForm.cold_chain_compliant" id="cold-ok" /><label for="cold-ok">Chaîne du froid conforme</label></div>
        </div>
        <div v-for="(l, idx) in receiptForm.lines" :key="idx" class="quote-box">
          <div class="form-row"><label>Produit</label>
            <select v-model.number="l.product_id" required>
              <option :value="0" disabled>— Sélectionner —</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
            </select>
          </div>
          <div class="detail-grid">
            <div class="form-row"><label>N° Lot</label><input v-model="l.batch_number" required /></div>
            <div class="form-row"><label>Date péremption</label><input v-model="l.expiry_date" type="date" required /></div>
            <div class="form-row"><label>Qté reçue</label><input v-model.number="l.received_qty" type="number" min="1" required /></div>
            <div class="form-row"><label>Coût unitaire</label><input v-model.number="l.unit_cost" type="number" min="0" /></div>
          </div>
        </div>
        <button type="submit" class="btn-primary mt-4">Valider la réception</button>
      </form>
    </AppModal>

    <AppModal v-model="showQuarantineOpen" :title="showQuarantineLot ? `Lot ${showQuarantineLot.batch_number}` : ''">
      <form v-if="showQuarantineLot" @submit.prevent="submitQuarantine" class="modal-form">
        <div class="form-row"><label>Action</label>
          <select v-model="quarantineForm.event_type">
            <option value="quarantaine">Mettre en quarantaine</option>
            <option value="levee_quarantaine">Lever la quarantaine (libérer en vente)</option>
            <option value="rappel">Rappel de lot (blocage définitif)</option>
            <option value="retour_fournisseur">Retour fournisseur</option>
            <option value="destruction">Sortie destruction</option>
          </select>
        </div>
        <div class="form-row"><label>Motif / Justification</label><textarea v-model="quarantineForm.reason" required rows="2" /></div>
        <div v-if="quarantineForm.event_type === 'destruction' || quarantineForm.event_type === 'retour_fournisseur'" class="form-row">
          <label>Référence preuve (Bordereau destruction / Avoir)</label><input v-model="quarantineForm.proof_reference" required />
        </div>
        <button type="submit" class="btn-primary mt-4">Confirmer l'action</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateInventory" title="Nouvel inventaire physique">
      <form @submit.prevent="createInventory" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Référence</label><input v-model="inventoryForm.reference" required placeholder="INV-2026-01" /></div>
          <div class="form-row"><label>Date</label><input v-model="inventoryForm.inventory_date" type="date" required /></div>
        </div>
        <div v-for="(l, idx) in inventoryForm.lines" :key="idx" class="quote-box">
          <div class="form-row"><label>Lot</label>
            <select v-model.number="l.lot_id" required>
              <option :value="0" disabled>— Sélectionner —</option>
              <option v-for="lot in lots" :key="lot.id" :value="lot.id">{{ lot.product?.name }} · {{ lot.batch_number }} (Théo: {{ lot.available_qty }})</option>
            </select>
          </div>
          <div class="form-row"><label>Quantité comptée</label><input v-model.number="l.counted_qty" type="number" min="0" required /></div>
          <div class="form-row"><label>Justification écart</label><input v-model="l.justification" /></div>
        </div>
        <button type="submit" class="btn-primary mt-4">Enregistrer comptage</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateTemp" title="Nouveau relevé Chaîne du Froid">
      <form @submit.prevent="createTemp" class="modal-form">
        <div class="form-row"><label>Zone / Enceinte</label><input v-model="tempForm.zone_name" required /></div>
        <div class="detail-grid">
          <div class="form-row"><label>Température (°C)</label><input v-model.number="tempForm.measured_temperature" type="number" step="0.1" required /></div>
          <div class="form-row"><label>Seuil min / max</label><input :value="`${tempForm.min_threshold}°C – ${tempForm.max_threshold}°C`" disabled /></div>
        </div>
        <div class="form-row"><label>Notes / Observations</label><textarea v-model="tempForm.incident_notes" rows="2" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer le relevé</button>
      </form>
    </AppModal>

    <AppModal v-model="showDecideTempOpen" title="Décision Pharmacien — Excursion Froid">
      <form v-if="showDecideTemp" @submit.prevent="submitDecideTemp" class="modal-form">
        <div class="form-row"><label>Statut efficacité</label>
          <select v-model="decideTempForm.effectiveness_status">
            <option value="resolu">Résolu / Stabilité validée</option>
            <option value="a_surveiller">À surveiller</option>
          </select>
        </div>
        <div class="form-row"><label>Décision du Pharmacien Titulaire</label><textarea v-model="decideTempForm.pharmacist_decision" required rows="3" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer la décision</button>
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

.alert-box { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem; }
.alert-box h3 { font-size: 0.95rem; margin: 0; }

.section-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.section-toolbar h3 { margin: 0; font-size: 1rem; flex: 1; }
.search-input { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; min-width: 220px; }

.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 0.6rem; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.data-table td { padding: 0.6rem; border-bottom: 1px solid #f3f4f6; }

.badge { font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600; text-transform: capitalize; }
.badge.disponible, .badge.valide, .badge.recu, .badge.emis, .badge.approuve, .badge.resolu, .badge.conforme { background: #d1fae5; color: #065f46; }
.badge.quarantaine, .badge.partiel, .badge.a_approuver, .badge.compte, .badge.a_surveiller { background: #fef3c7; color: #92400e; }
.badge.rappele, .badge.refuse, .badge.incident_ouvert, .badge.detruit, .badge.red { background: #fee2e2; color: #991b1b; }
.badge.standard { background: #f3f4f6; color: #4b5563; }

.empty-state { text-align: center; color: #9ca3af; padding: 3rem 1rem; font-size: 0.9rem; }
.btn-primary { padding: 0.5rem 1.15rem; background: #1a73e8; color: #fff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-sm { padding: 0.25rem 0.6rem; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
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
