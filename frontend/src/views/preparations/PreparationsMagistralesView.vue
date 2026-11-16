<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Préparatoire · BPD ABMed</span>
        <h1>Préparations Magistrales & Officinales</h1>
        <p class="subtitle">Ordonnancier des préparations, décompte des matières premières, contrôle libératoire et étiquetage scellé SHA-256.</p>
      </div>
    </header>

    <div v-if="error" class="banner error" role="alert">
      <span>{{ error }}</span>
      <button class="btn-link" @click="load">Réessayer</button>
    </div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <!-- NOUVELLE PRÉPARATION -->
    <section class="panel">
      <h3 class="panel-title">Enregistrer une Préparation Magistrale</h3>
      <form class="inline-form mb-4" @submit.prevent="submitPrep">
        <input v-model="form.reference" placeholder="Réf (ex: PREP-2026-03)" required />
        <input v-model="form.formula_name" placeholder="Formule magistrale (ex: Pommade Salicylée 5%)" required />
        <input v-model="form.patient_name" placeholder="Nom du Patient" />
        <input v-model="form.prescriber_name" placeholder="Médecin Prescripteur" />
        <input v-model="form.quantity_prepared" placeholder="Quantité (ex: 100g, 30 gélules)" required />
        <input v-model="form.expiry_date" type="date" required title="Date Limite d Utilisation (DLU)" />
        <button type="submit" class="btn-primary" :disabled="busy">Enregistrer à l Ordonnancier</button>
      </form>

      <!-- TABLEAU DES PRÉPARATIONS -->
      <table class="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Formule Magistrale</th>
            <th>Patient</th>
            <th>Prescripteur</th>
            <th>Quantité</th>
            <th>DLU</th>
            <th>Statut</th>
            <th>Contrôle Pharmacien</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id">
            <td><strong>{{ p.reference }}</strong></td>
            <td>{{ p.formula_name }}</td>
            <td>{{ p.patient_name || '—' }}</td>
            <td>{{ p.prescriber_name || '—' }}</td>
            <td>{{ p.quantity_prepared }}</td>
            <td>{{ p.expiry_date }}</td>
            <td>
              <span class="badge" :class="p.status">{{ p.status }}</span>
            </td>
            <td>
              <code v-if="p.control_hash" class="hash-tag">{{ p.control_hash.slice(0, 12) }}…</code>
              <span v-else class="text-muted">En attente libération</span>
            </td>
            <td class="table-actions">
              <button
                v-if="p.status !== 'delivree'"
                class="btn-action release"
                :disabled="busy"
                @click="openReleaseModal(p)"
              >
                Libérer & Sceller
              </button>
              <button
                class="btn-action label"
                :disabled="busy"
                @click="viewLabel(p.id)"
              >
                Étiquette
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="9" class="empty-row">Aucune préparation magistrale enregistrée.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- MODALE LIBÉRATION PHARMACEUTIQUE -->
    <div v-if="showReleaseModal" class="modal-backdrop">
      <div class="modal-card">
        <h3 class="modal-title">Contrôle Libératoire — {{ selectedPrep?.reference }}</h3>
        <p class="modal-desc">{{ selectedPrep?.formula_name }} ({{ selectedPrep?.quantity_prepared }})</p>

        <div class="checklist">
          <label class="check-item">
            <input v-model="releaseChecks.posology_verified" type="checkbox" />
            <span>Vérification de la posologie et de la conformité de l ordonnance</span>
          </label>
          <label class="check-item">
            <input v-model="releaseChecks.organoleptic_check" type="checkbox" />
            <span>Contrôle organoleptique et homogénéité de la formule</span>
          </label>
          <label class="check-item">
            <input v-model="releaseChecks.packaging_compliant" type="checkbox" />
            <span>Conditionnement étanche et étiquetage conforme</span>
          </label>
        </div>

        <div class="form-group mt-3">
          <label>Visa du Pharmacien Responsable :</label>
          <input v-model="releaseVisa" placeholder="Dr. Nom du Pharmacien" required />
        </div>

        <div class="modal-actions">
          <button class="btn-secondary" @click="showReleaseModal = false">Annuler</button>
          <button
            class="btn-primary"
            :disabled="!canRelease || busy"
            @click="confirmRelease"
          >
            Signer & Sceller SHA-256
          </button>
        </div>
      </div>
    </div>

    <!-- MODALE ÉTIQUETTE RÉGLEMENTAIRE IMPRIMABLE -->
    <div v-if="showLabelModal" class="modal-backdrop">
      <div class="modal-card label-preview-card">
        <h3 class="modal-title">Étiquette Réglementaire Officinale</h3>
        
        <div class="label-box">
          <div class="label-header">
            <strong>{{ currentLabel?.officine_name }}</strong>
            <small>{{ currentLabel?.officine_city }}</small>
          </div>
          <div class="label-body">
            <div class="label-line"><strong>Réf :</strong> {{ currentLabel?.reference }}</div>
            <div class="label-line"><strong>Formule :</strong> {{ currentLabel?.formula_name }}</div>
            <div class="label-line"><strong>Patient :</strong> {{ currentLabel?.patient_name }}</div>
            <div class="label-line"><strong>Quantité :</strong> {{ currentLabel?.quantity_prepared }}</div>
            <div class="label-line"><strong>DLU :</strong> {{ currentLabel?.expiry_date }}</div>
            <div class="label-line"><strong>Prescripteur :</strong> {{ currentLabel?.prescriber_name }}</div>
            <hr class="label-sep" />
            <ul class="label-warnings">
              <li v-for="(m, idx) in currentLabel?.regulatory_mentions" :key="idx">{{ m }}</li>
            </ul>
          </div>
          <div v-if="currentLabel?.control_hash" class="label-footer">
            <span>Sceau SHA-256 : {{ currentLabel?.control_hash.slice(0, 16) }}…</span>
          </div>
        </div>

        <div class="modal-actions mt-3">
          <button class="btn-secondary" @click="showLabelModal = false">Fermer</button>
          <button class="btn-primary" @click="windowPrint">Imprimer Étiquette</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { request } from '@/services/quality'

const rows = ref<any[]>([])
const busy = ref(false)
const error = ref('')
const notice = ref('')

const showReleaseModal = ref(false)
const selectedPrep = ref<any>(null)
const releaseVisa = ref('Pharmacien Titulaire Démo')
const releaseChecks = reactive({
  posology_verified: true,
  organoleptic_check: true,
  packaging_compliant: true,
})

const showLabelModal = ref(false)
const currentLabel = ref<any>(null)

const canRelease = computed(() => {
  return releaseChecks.posology_verified && releaseChecks.organoleptic_check && releaseChecks.packaging_compliant && releaseVisa.value.trim().length > 0
})

const form = reactive({
  reference: '',
  formula_name: '',
  patient_name: '',
  prescriber_name: '',
  quantity_prepared: '',
  expiry_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
})

async function load() {
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: any[] }>('/qualite/cdc-extras/preparations')
    rows.value = res.data || []
  } catch (e) {
    error.value = (e as Error).message || 'Erreur lors du chargement des préparations.'
  } finally {
    busy.value = false
  }
}

async function submitPrep() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request('/qualite/cdc-extras/preparations', 'POST', form)
    notice.value = 'Préparation magistrale inscrite à l ordonnancier avec succès.'
    form.reference = ''
    form.formula_name = ''
    form.patient_name = ''
    form.prescriber_name = ''
    form.quantity_prepared = ''
    await load()
  } catch (e) {
    error.value = (e as Error).message || 'Échec de l enregistrement de la préparation.'
  } finally {
    busy.value = false
  }
}

function openReleaseModal(p: any) {
  selectedPrep.value = p
  releaseChecks.posology_verified = true
  releaseChecks.organoleptic_check = true
  releaseChecks.packaging_compliant = true
  showReleaseModal.value = true
}

async function confirmRelease() {
  if (!selectedPrep.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const res = await request<{ data: any; control_hash: string }>(
      `/qualite/cdc-extras/preparations/${selectedPrep.value.id}/release`,
      'POST',
      {
        pharmacist_visa: releaseVisa.value,
        posology_verified: releaseChecks.posology_verified,
        organoleptic_check: releaseChecks.organoleptic_check,
        packaging_compliant: releaseChecks.packaging_compliant,
      }
    )
    notice.value = `Préparation ${selectedPrep.value.reference} libérée par ${releaseVisa.value} et scellée SHA-256.`
    showReleaseModal.value = false
    await load()
  } catch (e) {
    error.value = (e as Error).message || 'Échec du contrôle libératoire.'
  } finally {
    busy.value = false
  }
}

async function viewLabel(id: number) {
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: any }>(`/qualite/cdc-extras/preparations/${id}/label`)
    currentLabel.value = res.data
    showLabelModal.value = true
  } catch (e) {
    error.value = (e as Error).message || 'Impossible de générer l étiquette réglementaire.'
  } finally {
    busy.value = false
  }
}

function windowPrint() {
  window.print()
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

.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

input {
  padding: 0.5rem 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  outline: none !important;
  font-size: 0.88rem;
  background: #ffffff;
  color: #0f172a;
}

input:focus {
  border-color: #0f3b27 !important;
  outline: none !important;
  box-shadow: none !important;
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

.badge.en_preparation { background: #fef3c7; color: #b45309; }
.badge.controle_pharmacien { background: #e0f2fe; color: #0369a1; }
.badge.delivree { background: #dcfce7; color: #15803d; }

.table-actions {
  display: flex;
  gap: 0.35rem;
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

.btn-action {
  padding: 0.3rem 0.6rem;
  border-radius: 0 !important;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
}

.btn-action.release {
  background: #0f3b27;
  color: #ffffff;
  border: none;
}

.btn-action.label {
  background: #f1f5f9;
  color: #0f3b27;
  border: 1px solid #cbd5e1;
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
.hash-tag { font-family: monospace; font-size: 0.78rem; background: #f1f5f9; padding: 0.15rem 0.35rem; }
.text-muted { color: #94a3b8; font-size: 0.82rem; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.5rem; }
.mb-4 { margin-bottom: 1rem; }
.mt-3 { margin-top: 0.75rem; }

/* MODALES */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: #ffffff;
  border: 2px solid #0f3b27;
  border-radius: 0 !important;
  padding: 1.5rem;
  width: 90%;
  max-width: 500px;
}

.modal-title {
  margin: 0 0 0.25rem;
  color: #0f3b27;
  font-size: 1.2rem;
  font-weight: 800;
}

.modal-desc {
  margin: 0 0 1rem;
  color: #475569;
  font-size: 0.88rem;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 1rem 0;
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: #1e293b;
  cursor: pointer;
}

.check-item input {
  margin-top: 0.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

/* ÉTIQUETTE */
.label-preview-card {
  max-width: 420px;
}

.label-box {
  border: 2px solid #0f3b27;
  border-radius: 0 !important;
  padding: 1rem;
  background: #ffffff;
  font-family: sans-serif;
}

.label-header {
  border-bottom: 1px solid #0f3b27;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  flex-direction: column;
}

.label-header strong {
  color: #0f3b27;
  font-size: 1rem;
}

.label-body {
  font-size: 0.85rem;
  line-height: 1.4;
}

.label-line {
  margin-bottom: 0.25rem;
}

.label-sep {
  border: none;
  border-top: 1px dashed #cbd5e1;
  margin: 0.5rem 0;
}

.label-warnings {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.75rem;
  color: #dc2626;
  font-weight: 600;
}

.label-footer {
  margin-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 0.35rem;
  font-size: 0.72rem;
  color: #64748b;
  font-family: monospace;
}
</style>
