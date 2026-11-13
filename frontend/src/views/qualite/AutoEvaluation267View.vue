<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Qualité · BPD ABMed</span>
        <h1>Auto-évaluation Officinale — 267 Articles BPD</h1>
        <p class="subtitle">Grille d'auto-inspection réglementaire ABMed, calcul dynamique du taux de conformité par chapitre et ouverture immédiate de CAPA.</p>
      </div>
    </header>

    <div v-if="error" class="banner error" role="alert">
      <span>{{ error }}</span>
      <button class="btn-link" @click="load">Réessayer</button>
    </div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <!-- SYNTHÈSE DES 10 CHAPITRES BPD -->
    <section class="panel mb-4">
      <h3 class="panel-title">Répartition des 267 Articles par Chapitre BPD ABMed</h3>
      <div class="chapters-grid">
        <div v-for="ch in chapters" :key="ch.num" class="chapter-card">
          <div class="chapter-top">
            <span class="chapter-num">Ch. {{ ch.num }}</span>
            <span class="chapter-count">{{ ch.articles }} arts</span>
          </div>
          <div class="chapter-name">{{ ch.title }}</div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: ch.rate + '%' }"></div>
          </div>
          <div class="chapter-footer">
            <span>Conformité</span>
            <strong>{{ ch.rate }}%</strong>
          </div>
        </div>
      </div>
    </section>

    <!-- NOUVELLE CAMPAGNE D'AUTO-ÉVALUATION -->
    <section class="panel">
      <h3 class="panel-title">Enregistrer une Campagne d'Auto-Évaluation</h3>
      <form class="inline-form mb-4" @submit.prevent="submitEval">
        <input v-model="form.reference" placeholder="Réf (ex: AUTO-2026-Q4)" required />
        <input v-model="form.title" placeholder="Intitulé de la campagne" required />
        <input v-model.number="form.compliant_count" type="number" min="0" max="267" placeholder="Articles conformes" required />
        <input v-model.number="form.non_compliant_count" type="number" min="0" max="267" placeholder="Écarts / Non-conformités" required />
        <button type="submit" class="btn-primary" :disabled="busy">Enregistrer Campagne</button>
      </form>

      <!-- TABLEAU DES CAMPAGNES -->
      <table class="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Campagne</th>
            <th>Conformes / 267</th>
            <th>Écarts</th>
            <th>Taux Global</th>
            <th>Statut</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c.id">
            <td><strong>{{ c.reference }}</strong></td>
            <td>{{ c.title }}</td>
            <td>{{ c.compliant_count }} / {{ c.total_articles }}</td>
            <td :class="{ 'text-rose': c.non_compliant_count > 0 }">
              <strong>{{ c.non_compliant_count }}</strong>
            </td>
            <td>
              <span class="score-badge" :class="scoreClass(c.score_percent)">
                {{ c.score_percent }}%
              </span>
            </td>
            <td>
              <span class="status-badge" :class="c.status">{{ c.status }}</span>
            </td>
            <td>
              <button
                v-if="c.non_compliant_count > 0"
                class="btn-action capa"
                :disabled="busy"
                @click="openCapaModal(c)"
              >
                + Ouvrir CAPA
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="7" class="empty-row">Aucune campagne d'auto-évaluation enregistrée.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- MODALE CRÉATION ACTION CORRECTIVE CAPA -->
    <div v-if="showCapaModal" class="modal-backdrop">
      <div class="modal-card">
        <h3 class="modal-title">Créer une Action Corrective (CAPA) — {{ selectedCampaign?.reference }}</h3>
        <p class="modal-desc">Passerelle automatique d'un écart d'auto-évaluation vers le système de management de la qualité.</p>

        <form class="capa-form" @submit.prevent="submitCapa">
          <div class="form-group">
            <label>Article BPD concerné :</label>
            <input v-model="capaForm.article_code" placeholder="Ex: Art. 5.2 (Traçabilité FEFO)" required />
          </div>

          <div class="form-group">
            <label>Chapitre BPD :</label>
            <select v-model="capaForm.chapter" required>
              <option v-for="ch in chapters" :key="ch.num" :value="ch.title">{{ ch.title }}</option>
            </select>
          </div>

          <div class="form-group">
            <label>Gravité de l'écart :</label>
            <select v-model="capaForm.severity" required>
              <option value="low">Faible</option>
              <option value="medium">Moyenne</option>
              <option value="high">Élevée</option>
              <option value="critical">Critique</option>
            </select>
          </div>

          <div class="form-group">
            <label>Description du constat et action corrective :</label>
            <textarea v-model="capaForm.description" rows="3" placeholder="Constat de l auditeur et action corrective requise..." required></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Responsable de l'action :</label>
              <input v-model="capaForm.owner" placeholder="Nom du responsable" required />
            </div>
            <div class="form-group">
              <label>Échéance de résolution :</label>
              <input v-model="capaForm.due_date" type="date" required />
            </div>
          </div>

          <div class="modal-actions mt-3">
            <button type="button" class="btn-secondary" @click="showCapaModal = false">Annuler</button>
            <button type="submit" class="btn-primary" :disabled="busy">Créer la CAPA</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { request } from '@/services/quality'

const rows = ref<any[]>([])
const busy = ref(false)
const error = ref('')
const notice = ref('')

const showCapaModal = ref(false)
const selectedCampaign = ref<any>(null)

const chapters = [
  { num: 1, title: 'Système Qualité & Audits', articles: 25, rate: 92 },
  { num: 2, title: 'Personnel & Qualifications', articles: 30, rate: 88 },
  { num: 3, title: 'Locaux & Environnement', articles: 35, rate: 94 },
  { num: 4, title: 'Matériels & Équipements', articles: 25, rate: 90 },
  { num: 5, title: 'Approvisionnements & Stocks', articles: 32, rate: 85 },
  { num: 6, title: 'Stockage & Chaîne du Froid', articles: 30, rate: 87 },
  { num: 7, title: 'Dispensation & Conseil', articles: 35, rate: 96 },
  { num: 8, title: 'Préparations Magistrales', articles: 20, rate: 90 },
  { num: 9, title: 'Pharmacovigilance & Alertes', articles: 20, rate: 82 },
  { num: 10, title: 'Auto-inspection & Amélioration', articles: 15, rate: 89 },
]

const form = reactive({
  reference: '',
  title: '',
  total_articles: 267,
  compliant_count: 245,
  non_compliant_count: 22,
})

const capaForm = reactive({
  article_code: '',
  chapter: chapters[0].title,
  severity: 'high',
  description: '',
  owner: 'Pharmacien Titulaire',
  due_date: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
})

function scoreClass(score: number): string {
  if (score >= 90) return 'score-high'
  if (score >= 75) return 'score-medium'
  return 'score-low'
}

async function load() {
  busy.value = true
  error.value = ''
  try {
    const res = await request<{ data: any[] }>('/qualite/cdc-extras/autoeval')
    rows.value = res.data || []
  } catch (e) {
    error.value = (e as Error).message || 'Erreur lors du chargement des auto-évaluations.'
  } finally {
    busy.value = false
  }
}

async function submitEval() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request('/qualite/cdc-extras/autoeval', 'POST', form)
    notice.value = 'Campagne d auto-évaluation 267 articles enregistrée.'
    form.reference = ''
    form.title = ''
    await load()
  } catch (e) {
    error.value = (e as Error).message || 'Échec de l enregistrement de la campagne.'
  } finally {
    busy.value = false
  }
}

function openCapaModal(c: any) {
  selectedCampaign.value = c
  capaForm.article_code = 'Art. 5.2'
  capaForm.description = `Écart relevé lors de la campagne ${c.reference}. Nécessite mise en conformité BPD.`
  showCapaModal.value = true
}

async function submitCapa() {
  if (!selectedCampaign.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const res = await request<{ message: string }>(
      `/qualite/cdc-extras/autoeval/${selectedCampaign.value.id}/capa`,
      'POST',
      capaForm
    )
    notice.value = res.message || 'Action corrective CAPA créée avec succès.'
    showCapaModal.value = false
  } catch (e) {
    error.value = (e as Error).message || 'Échec de la création de la CAPA.'
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

.chapters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 0.75rem;
}

.chapter-card {
  border: 1px solid #e2e8f0;
  border-radius: 0 !important;
  padding: 0.75rem;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.chapter-top {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 700;
}

.chapter-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f3b27;
  min-height: 2rem;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 0 !important;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #0f3b27;
}

.chapter-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #475569;
}

.inline-form {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

input, select, textarea {
  padding: 0.5rem 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 0 !important;
  outline: none !important;
  font-size: 0.88rem;
  background: #ffffff;
  color: #0f172a;
}

input:focus, select:focus, textarea:focus {
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

.score-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 0 !important;
  font-size: 0.82rem;
  font-weight: 800;
}

.score-high { background: #dcfce7; color: #15803d; }
.score-medium { background: #fef3c7; color: #b45309; }
.score-low { background: #fee2e2; color: #b91c1c; }

.status-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 0 !important;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.status-badge.en_cours { background: #e0f2fe; color: #0369a1; }
.status-badge.cloturee { background: #f1f5f9; color: #475569; }

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

.btn-action.capa {
  background: #0f3b27;
  color: #ffffff;
  border: none;
  border-radius: 0 !important;
  padding: 0.3rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
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
.empty-row { text-align: center; color: #94a3b8; padding: 1.5rem; }
.text-rose { color: #e11d48; }
.mb-4 { margin-bottom: 1rem; }
.mt-3 { margin-top: 0.75rem; }

/* MODALE */
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
  max-width: 520px;
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

.capa-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #334155;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
