<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Phase 3 · Paie & Social</span>
        <h1>Paie, Bulletins & Déclarations</h1>
        <p class="subtitle">
          Barèmes datés (CNSS / ITS / Heures sup.), saisie des variables mensuelles, calcul et
          scellement SHA-256 des bulletins, et états préparatoires CNSS & ITS.
        </p>
      </div>
      <div class="header-actions">
        <button class="btn-secondary" :disabled="busy" @click="bootstrapBareme">
          Initialiser Barème BJ 2026
        </button>
        <button class="btn-primary" @click="downloadDeclarationsCsv">
          Exporter États CNSS / ITS (CSV)
        </button>
      </div>
    </header>

    <div v-if="error" class="banner error" role="alert">{{ error }}</div>
    <div v-if="notice" class="banner success" role="status">{{ notice }}</div>

    <!-- KPIs -->
    <section v-if="overview" class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Barèmes actifs</span>
        <strong class="kpi-val">{{ overview.kpis.baremes_actifs }}</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Bulletins brouillon</span>
        <strong class="kpi-val">{{ overview.kpis.bulletins_brouillon }}</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Bulletins validés / payés</span>
        <strong class="kpi-val">{{ overview.kpis.bulletins_valides }}</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Masse brute validée</span>
        <strong class="kpi-val">{{ formatMoney(overview.kpis.masse_brute_validee) }}</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Masse nette à payer</span>
        <strong class="kpi-val">{{ formatMoney(overview.kpis.masse_nette_validee) }}</strong>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">CNSS + ITS dus</span>
        <strong class="kpi-val">
          {{ formatMoney((overview.kpis.total_cnss_due || 0) + (overview.kpis.total_its_du || 0)) }}
        </strong>
      </div>
    </section>

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

    <!-- Tab: Bulletins -->
    <section v-if="activeTab === 'bulletins'" class="panel">
      <div class="panel-head">
        <h2>Bulletins de paie</h2>
        <div class="inline-form">
          <input v-model="genForm.employee_id" type="number" min="1" placeholder="ID Employé" />
          <input v-model="genForm.period_month" placeholder="YYYY-MM" />
          <button class="btn-primary" :disabled="busy" @click="generateBulletin">
            Générer Bulletin
          </button>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Période</th>
            <th>Employé</th>
            <th>Brut</th>
            <th>CNSS Sal.</th>
            <th>ITS</th>
            <th>Net à payer</th>
            <th>Statut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in bulletins" :key="b.id">
            <td><strong>{{ b.reference }}</strong></td>
            <td>{{ b.period_month }}</td>
            <td>
              {{ b.employee ? `${b.employee.first_name} ${b.employee.last_name}` : `#${b.employee_id}` }}
            </td>
            <td>{{ formatMoney(b.gross_salary) }}</td>
            <td>{{ formatMoney(b.cnss_employee) }}</td>
            <td>{{ formatMoney(b.its_tax) }}</td>
            <td><strong>{{ formatMoney(b.net_salary) }}</strong></td>
            <td>
              <span class="badge" :class="b.status === 'brouillon' ? 'badge-amber' : 'badge-green'">
                {{ b.status }}
              </span>
            </td>
            <td>
              <button
                v-if="b.status === 'brouillon'"
                class="btn-secondary btn-sm"
                :disabled="busy"
                @click="validateBulletin(b.id)"
              >
                Valider SHA-256
              </button>
              <button
                v-else-if="b.status === 'valide'"
                class="btn-primary btn-sm"
                :disabled="busy"
                @click="markPaid(b.id)"
              >
                Marquer Payé
              </button>
              <code v-else class="hash-short">{{ b.bulletin_hash?.slice(0, 12) }}…</code>
            </td>
          </tr>
          <tr v-if="!bulletins.length">
            <td colspan="9" class="empty-row">Aucun bulletin généré.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Tab: Variables -->
    <section v-if="activeTab === 'variables'" class="panel">
      <div class="panel-head">
        <h2>Variables mensuelles</h2>
      </div>
      <form class="var-form" @submit.prevent="submitVariable">
        <input v-model.number="varForm.employee_id" type="number" min="1" placeholder="ID Employé" required />
        <input v-model="varForm.period_month" placeholder="YYYY-MM" required />
        <input v-model.number="varForm.base_salary" type="number" min="0" placeholder="Salaire base" required />
        <input v-model.number="varForm.primes" type="number" min="0" placeholder="Primes" />
        <input v-model.number="varForm.overtime_hours" type="number" min="0" step="0.5" placeholder="Heures sup" />
        <input v-model.number="varForm.overtime_hourly_rate" type="number" min="0" placeholder="Taux horaire" />
        <input v-model.number="varForm.absences_deduction" type="number" min="0" placeholder="Retenues absences" />
        <button type="submit" class="btn-primary" :disabled="busy">Enregistrer Variables</button>
      </form>

      <table class="data-table">
        <thead>
          <tr>
            <th>Période</th>
            <th>Employé</th>
            <th>Salaire base</th>
            <th>Primes</th>
            <th>Heures sup.</th>
            <th>Retenues</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in variables" :key="v.id">
            <td>{{ v.period_month }}</td>
            <td>{{ v.employee ? `${v.employee.first_name} ${v.employee.last_name}` : `#${v.employee_id}` }}</td>
            <td>{{ formatMoney(v.base_salary) }}</td>
            <td>{{ formatMoney(v.primes) }}</td>
            <td>{{ v.overtime_hours }}h × {{ formatMoney(v.overtime_hourly_rate) }}</td>
            <td>{{ formatMoney(v.absences_deduction) }}</td>
          </tr>
          <tr v-if="!variables.length">
            <td colspan="6" class="empty-row">Aucune variable enregistrée.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Tab: Déclarations CNSS & ITS -->
    <section v-if="activeTab === 'declarations'" class="panel">
      <div class="panel-head">
        <h2>États préparatoires CNSS & ITS</h2>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Période</th>
            <th>Bulletins</th>
            <th>Masse Brute</th>
            <th>CNSS Salariale</th>
            <th>CNSS Patronale</th>
            <th>Total CNSS</th>
            <th>Total ITS</th>
            <th>Net à payer</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in declarations" :key="d.period_month">
            <td><strong>{{ d.period_month }}</strong></td>
            <td>{{ d.bulletins_count }}</td>
            <td>{{ formatMoney(d.total_gross) }}</td>
            <td>{{ formatMoney(d.total_cnss_employee) }}</td>
            <td>{{ formatMoney(d.total_cnss_employer) }}</td>
            <td><strong>{{ formatMoney(d.total_cnss_due) }}</strong></td>
            <td><strong>{{ formatMoney(d.total_its) }}</strong></td>
            <td>{{ formatMoney(d.total_net) }}</td>
          </tr>
          <tr v-if="!declarations.length">
            <td colspan="8" class="empty-row">Aucun état préparatoire disponible.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Tab: Barèmes -->
    <section v-if="activeTab === 'baremes'" class="panel">
      <div class="panel-head">
        <h2>Barèmes datés CNSS / ITS</h2>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Libellé</th>
            <th>Effet du</th>
            <th>CNSS Sal.</th>
            <th>CNSS Pat.</th>
            <th>ITS</th>
            <th>Coef HS</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in baremes" :key="b.id">
            <td><strong>{{ b.code }}</strong></td>
            <td>{{ b.label }}</td>
            <td>{{ b.effective_from }}</td>
            <td>{{ (b.cnss_employee_rate * 100).toFixed(2) }}%</td>
            <td>{{ (b.cnss_employer_rate * 100).toFixed(2) }}%</td>
            <td>{{ (b.its_rate * 100).toFixed(2) }}%</td>
            <td>×{{ b.overtime_multiplier }}</td>
          </tr>
          <tr v-if="!baremes.length">
            <td colspan="7" class="empty-row">Aucun barème configuré.</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { request } from '@/services/quality'

const base = '/paie'
const busy = ref(false)
const error = ref('')
const notice = ref('')
const activeTab = ref<'bulletins' | 'variables' | 'declarations' | 'baremes'>('bulletins')

const tabs = [
  { id: 'bulletins', label: 'Bulletins de paie' },
  { id: 'variables', label: 'Variables mensuelles' },
  { id: 'declarations', label: 'États CNSS & ITS' },
  { id: 'baremes', label: 'Barèmes datés' },
] as const

const overview = ref<{ kpis: Record<string, number> } | null>(null)
const bulletins = ref<any[]>([])
const variables = ref<any[]>([])
const declarations = ref<any[]>([])
const baremes = ref<any[]>([])

const currentMonth = new Date().toISOString().slice(0, 7)
const genForm = reactive({ employee_id: 1, period_month: currentMonth })
const varForm = reactive({
  employee_id: 1,
  period_month: currentMonth,
  base_salary: 0,
  primes: 0,
  overtime_hours: 0,
  overtime_hourly_rate: 0,
  absences_deduction: 0,
})

function formatMoney(v: number | string | undefined) {
  return `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} FCFA`
}

async function loadAll() {
  error.value = ''
  try {
    const [ov, bul, vars, decl, bar] = await Promise.all([
      request<{ kpis: Record<string, number> }>(`${base}/overview`),
      request<{ data: any[] }>(`${base}/bulletins`),
      request<{ data: any[] }>(`${base}/variables`),
      request<{ data: any[] }>(`${base}/declarations`),
      request<{ data: any[] }>(`${base}/baremes`),
    ])
    overview.value = ov
    bulletins.value = bul.data || []
    variables.value = vars.data || []
    declarations.value = decl.data || []
    baremes.value = bar.data || []
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function bootstrapBareme() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/bootstrap-bareme`, 'POST')
    notice.value = 'Barème Bénin 2026 initialisé.'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function submitVariable() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/variables`, 'POST', varForm)
    notice.value = 'Variables de paie enregistrées.'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function generateBulletin() {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/bulletins/generate`, 'POST', genForm)
    notice.value = 'Bulletin calculé et généré en brouillon.'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function validateBulletin(id: number) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/bulletins/${id}/validate`, 'POST')
    notice.value = 'Bulletin validé et scellé (SHA-256).'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

async function markPaid(id: number) {
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    await request(`${base}/bulletins/${id}/pay`, 'POST')
    notice.value = 'Bulletin marqué payé.'
    await loadAll()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}

function downloadDeclarationsCsv() {
  window.open('/api/v1/paie/declarations/export', '_blank')
}

onMounted(loadAll)
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
.module-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #ede9fe; color: #5b21b6; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.4rem; }
h1 { margin: 0; font-size: 1.6rem; }
.subtitle { margin: 0.25rem 0 0; color: #475569; font-size: 0.92rem; }
.header-actions, .inline-form { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; }
.inline-form input, .var-form input { padding: 0.45rem 0.6rem; border: 1px solid #cbd5e1; border-radius: 0.45rem; }
.var-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.5rem; margin-bottom: 1rem; }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; }
.kpi-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.85rem 1rem; display: flex; flex-direction: column; gap: 0.25rem; }
.kpi-label { font-size: 0.78rem; color: #64748b; }
.kpi-val { font-size: 1.1rem; color: #0f172a; }
.tab-bar { display: flex; gap: 0.5rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; flex-wrap: wrap; }
.tab-btn { padding: 0.45rem 0.9rem; border-radius: 0.5rem; border: 1px solid transparent; background: transparent; cursor: pointer; font-weight: 500; color: #475569; }
.tab-btn.active { background: #0f172a; color: #fff; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
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
.hash-short { font-size: 0.75rem; color: #64748b; }
</style>
