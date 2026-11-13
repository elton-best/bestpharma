<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Réglementaire · Tableau B</span>
        <h1>Registre des Stupéfiants Tableau B</h1>
        <p class="subtitle">Traçabilité nominative des entrées, ordonnances sécurisées et procès-verbaux de destruction scellés SHA-256.</p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" :class="{ active: activeTab === 'registre' }" @click="activeTab = 'registre'">
          Registre Chronologique
        </button>
        <button class="btn-secondary" :class="{ active: activeTab === 'balance' }" @click="activeTab = 'balance'">
          Balance Permanente ({{ balanceData.length }})
        </button>
        <button class="btn-secondary" :class="{ active: activeTab === 'destruction' }" @click="activeTab = 'destruction'">
          Destruction & PV
        </button>
      </div>
    </header>

    <div v-if="error" class="banner error" role="alert">
      <span>{{ error }}</span>
      <button class="btn-link" @click="load">Réessayer</button>
    </div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <!-- 1. VUE BALANCE PERMANENTE -->
    <section v-if="activeTab === 'balance'" class="panel">
      <div class="kpi-grid mb-4">
        <div class="kpi-card">
          <span class="kpi-label">Substances actives</span>
          <span class="kpi-val">{{ balanceSummary.substances_count || 0 }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Entrées</span>
          <span class="kpi-val">{{ balanceSummary.total_entrees || 0 }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Sorties</span>
          <span class="kpi-val">{{ balanceSummary.total_sorties || 0 }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total Destructions</span>
          <span class="kpi-val">{{ balanceSummary.total_destructions || 0 }}</span>
        </div>
        <div class="kpi-card highlight">
          <span class="kpi-label">Solde Théorique Global</span>
          <span class="kpi-val">{{ balanceSummary.solde_global || 0 }}</span>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Substance</th>
            <th>Lots mouvementés</th>
            <th>Unité</th>
            <th>Entrées</th>
            <th>Sorties</th>
            <th>Destructions</th>
            <th>Solde en Stock</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in balanceData" :key="b.substance_name">
            <td><strong>{{ b.substance_name }}</strong></td>
            <td><code>{{ b.lots?.join(', ') || '—' }}</code></td>
            <td>{{ b.unit }}</td>
            <td class="text-right">{{ b.entrees }}</td>
            <td class="text-right text-amber">{{ b.sorties }}</td>
            <td class="text-right text-rose">{{ b.destructions }}</td>
            <td class="text-right"><strong>{{ b.solde }}</strong></td>
          </tr>
          <tr v-if="!balanceData.length">
            <td colspan="7" class="empty-row">Aucune écriture pour calculer la balance permanente.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 2. VUE REGISTRE CHRONOLOGIQUE -->
    <section v-if="activeTab === 'registre'" class="panel">
      <h3 class="panel-title">Nouvelle Inscription au Registre</h3>
      <form class="inline-form mb-4" @submit.prevent="submitEntry">
        <input v-model="form.entry_date" type="date" required title="Date du mouvement" />
        <select v-model="form.movement_type">
          <option value="entree">Entrée (Réception grossiste)</option>
          <option value="sortie">Sortie (Dispensation ordonnance)</option>
        </select>
        <input v-model="form.substance_name" placeholder="Substance (ex: Morphine 10mg/ml)" required />
        <input v-model="form.lot_number" placeholder="N° Lot" required />
        <input v-model.number="form.quantity" type="number" min="0.01" step="0.01" placeholder="Qté" required />
        <input v-model="form.unit" placeholder="Unité (ex: Ampoules, Boîtes)" />
        <input v-model="form.prescription_ref" placeholder="Réf. Ordonnance sécurisée" />
        <input v-model="form.patient_name" placeholder="Nom du Patient" />
        <input v-model="form.prescriber_name" placeholder="Médecin Prescripteur" />
        <button type="submit" class="btn-primary" :disabled="busy">Inscrire & Sceller</button>
      </form>

      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mouvement</th>
            <th>Substance</th>
            <th>Lot</th>
            <th>Qté</th>
            <th>Réf. Ordonnance</th>
            <th>Patient / Prescripteur</th>
            <th>Visa Pharmacien</th>
            <th>Empreinte SHA-256</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.entry_date }}</td>
            <td>
              <span class="badge" :class="r.movement_type">{{ r.movement_type }}</span>
            </td>
            <td><strong>{{ r.substance_name }}</strong></td>
            <td><code>{{ r.lot_number }}</code></td>
            <td>{{ r.quantity }} {{ r.unit }}</td>
            <td>{{ r.prescription_ref || '—' }}</td>
            <td>
              <div>{{ r.patient_name || '—' }}</div>
              <small v-if="r.prescriber_name" class="sub-text">{{ r.prescriber_name }}</small>
            </td>
            <td>{{ r.pharmacist_visa }}</td>
            <td><code class="hash-tag">{{ r.entry_hash?.slice(0, 14) }}…</code></td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="9" class="empty-row">Aucun mouvement inscrit au registre Tableau B.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 3. VUE DESTRUCTION & PV -->
    <section v-if="activeTab === 'destruction'" class="panel">
      <h3 class="panel-title">Émission d'un Procès-Verbal de Destruction (Double Signature)</h3>
      <p class="section-desc">Conformément à la réglementation pharmaceutique, la destruction de stupéfiants requiert la double signature obligatoire du pharmacien titulaire et d'un témoin habilité.</p>
      
      <form class="destruction-form mb-4" @submit.prevent="submitDestruction">
        <div class="form-row">
          <label>Date de destruction :
            <input v-model="destructForm.entry_date" type="date" required />
          </label>
          <label>Substance à détruire :
            <input v-model="destructForm.substance_name" placeholder="Ex: Fentanyl injectable 50mcg" required />
          </label>
          <label>N° Lot concerné :
            <input v-model="destructForm.lot_number" placeholder="Ex: LOT-FEN-2025" required />
          </label>
          <label>Quantité détruite :
            <input v-model.number="destructForm.quantity" type="number" min="0.01" step="0.01" required />
          </label>
          <label>Unité :
            <input v-model="destructForm.unit" placeholder="Ampoules / Flacons" required />
          </label>
        </div>

        <div class="form-row">
          <label>Méthode de destruction agréée :
            <select v-model="destructForm.destruction_method">
              <option value="Dénaturation chimique par oxydation forte">Dénaturation chimique par oxydation forte</option>
              <option value="Incinération en filière agréée DASRI">Incinération en filière agréée DASRI</option>
              <option value="Neutralisation sous constat d huissier">Neutralisation sous constat d huissier</option>
            </select>
          </label>
          <label>Signature Pharmacien Titulaire :
            <input v-model="destructForm.titulaire_visa" placeholder="Dr. Nom du Titulaire" required />
          </label>
          <label>Témoin (Nom & Prénom) :
            <input v-model="destructForm.witness_visa" placeholder="Nom du témoin" required />
          </label>
          <label>Qualité du témoin :
            <select v-model="destructForm.witness_role">
              <option value="Pharmacien Adjoint">Pharmacien Adjoint</option>
              <option value="Inspecteur ABRP / Police Sanitaire">Inspecteur ABRP / Police Sanitaire</option>
              <option value="Huissier de Justice">Huissier de Justice</option>
              <option value="Délégué Régional de l Ordre">Délégué Régional de l Ordre</option>
            </select>
          </label>
        </div>

        <button type="submit" class="btn-primary" :disabled="busy">
          Émettre et Sceller le Procès-Verbal de Destruction
        </button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { request } from '@/services/quality'

const activeTab = ref<'registre' | 'balance' | 'destruction'>('registre')
const rows = ref<any[]>([])
const balanceData = ref<any[]>([])
const balanceSummary = ref<any>({})
const busy = ref(false)
const error = ref('')
const notice = ref('')

const form = reactive({
  entry_date: new Date().toISOString().slice(0, 10),
  movement_type: 'sortie',
  substance_name: '',
  lot_number: '',
  quantity: 1,
  unit: 'Unités',
  prescription_ref: '',
  patient_name: '',
  prescriber_name: '',
})

const destructForm = reactive({
  entry_date: new Date().toISOString().slice(0, 10),
  substance_name: '',
  lot_number: '',
  quantity: 1,
  unit: 'Ampoules',
  destruction_method: 'Dénaturation chimique par oxydation forte',
  titulaire_visa: 'Pharmacien Titulaire Démo',
  witness_visa: 'Dr. Pharmacien Adjoint Démo',
  witness_role: 'Pharmacien Adjoint',
})

async function load() {
  busy.value = true
  error.value = ''
  try {
    const [resEntries, resBalance] = await Promise.all([
      request<{ data: any[] }>('/qualite/cdc-extras/stupefiants'),
      request<{ data: any[]; summary: any }>('/qualite/cdc-extras/stupefiants/balance'),
    ])
    rows.value = resEntries.data || []
    balanceData.value = resBalance.data || []
    balanceSummary.value = resBalance.summary || {}
  } catch (e) {
    error.value = (e as Error).message || 'Erreur lors du chargement des données des stupéfiants.'
  } finally {
    busy.value = false
  }
}

async function submitEntry() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request('/qualite/cdc-extras/stupefiants', 'POST', form)
    notice.value = 'Mouvement Tableau B inscrit et scellé SHA-256 avec succès.'
    form.substance_name = ''
    form.lot_number = ''
    form.prescription_ref = ''
    form.patient_name = ''
    await load()
  } catch (e) {
    error.value = (e as Error).message || 'Échec de l inscription au registre.'
  } finally {
    busy.value = false
  }
}

async function submitDestruction() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const res = await request<{ pv_reference: string; message: string }>('/qualite/cdc-extras/stupefiants/destroy', 'POST', destructForm)
    notice.value = `Procès-verbal de destruction ${res.pv_reference} émis, contresigné et scellé.`
    destructForm.substance_name = ''
    destructForm.lot_number = ''
    activeTab.value = 'registre'
    await load()
  } catch (e) {
    error.value = (e as Error).message || 'Échec de l émission du procès-verbal de destruction.'
  } finally {
    busy.value = false
  }
}

onMounted(load)
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
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
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

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.panel {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  padding: 1.25rem;
}

.panel-title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: #0f3b27;
  font-weight: 700;
}

.section-desc {
  margin: 0 0 1rem;
  font-size: 0.88rem;
  color: #475569;
}

.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.destruction-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.form-row label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #334155;
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

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.kpi-card {
  border: 1px solid #e2e8f0;
  border-radius: 0 !important;
  padding: 1rem;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.kpi-card.highlight {
  border-color: #0f3b27;
  background: #f0fdf4;
}

.kpi-label {
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
}

.kpi-val {
  font-size: 1.4rem;
  font-weight: 800;
  color: #0f3b27;
}

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

.badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 0 !important;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.badge.entree { background: #dcfce7; color: #15803d; }
.badge.sortie { background: #fee2e2; color: #b91c1c; }
.badge.destruction { background: #fef3c7; color: #b45309; }

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

.btn-secondary {
  background: #ffffff;
  color: #0f3b27;
  border: 1px solid #0f3b27;
  border-radius: 0 !important;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
}

.btn-secondary.active {
  background: #0f3b27;
  color: #ffffff;
}

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
.sub-text { font-size: 0.75rem; color: #64748b; }
.hash-tag { font-family: monospace; font-size: 0.78rem; background: #f1f5f9; padding: 0.15rem 0.35rem; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.5rem; }
.text-right { text-align: right; }
.text-amber { color: #d97706; font-weight: 600; }
.text-rose { color: #e11d48; font-weight: 600; }
.mb-4 { margin-bottom: 1rem; }
</style>
