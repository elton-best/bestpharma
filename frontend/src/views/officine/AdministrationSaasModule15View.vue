<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
import { demoMode, request as liveRequest } from '@/services/quality'
import { boardRequest } from '@/services/cdcBoardsDemo'
const request = demoMode ? boardRequest : liveRequest

/* ─── Types ─── */
interface PlanFeatureRow { id: number; module_key: string; feature_label: string; is_included: boolean }
interface PlanRow { id: number; code: string; name: string; description: string | null; price_label: string | null; features?: PlanFeatureRow[] }
interface SubscriptionRow {
  id: number; reference: string; status: string; suspension_reason: string | null; data_retained: boolean
  started_at: string | null; plan?: PlanRow
}
interface TicketRow {
  id: number; reference: string; subject: string; description: string; priority: string; status: string
  opened_by?: { name: string }
}
interface AccessRequestRow {
  id: number; reason: string; requested_scope: string[]; duration_hours: number; status: string
  expires_at: string | null; requester?: { name: string; email: string }
}
interface SettingRow { id: number; setting_key: string; setting_value: Record<string, any> }
interface AuditRow { id: number; event_type: string; target_type: string | null; occurred_at: string; actor?: { name: string } }
interface Kpis {
  active_plans: number; total_subscriptions: number; active_subscriptions: number; suspended_subscriptions: number
  open_tickets: number; pending_access_requests: number; audit_events_count: number; subscription_active_rate: number | string
}

/* ─── State ─── */
const base = '/platformadmin'
const tab = ref<'overview' | 'subscriptions' | 'support' | 'settings'>('overview')
const loading = ref(false)
const error = ref('')

const kpis = ref<Kpis | null>(null)
const plans = ref<PlanRow[]>([])
const subscriptions = ref<SubscriptionRow[]>([])
const tickets = ref<TicketRow[]>([])
const accessRequests = ref<AccessRequestRow[]>([])
const settings = ref<SettingRow[]>([])
const auditEvents = ref<AuditRow[]>([])

// Modals
const showCreatePlan = ref(false)
const showCreateSub = ref(false)
const showStateSub = ref<SubscriptionRow | null>(null)
const showStateOpen = computed({ get: () => showStateSub.value !== null, set: (v: boolean) => { if (!v) showStateSub.value = null } })
const showCreateTicket = ref(false)
const showCreateSetting = ref(false)

const planForm = reactive({ code: '', name: '', description: '', module_key: 'qualite', feature_label: 'Conformité BPD' })
const subForm = reactive({ plan_id: 0, reference: '' })
const stateForm = reactive({ action: 'suspendre', reason: '' })
const ticketForm = reactive({ reference: '', subject: '', description: '', priority: 'normale' })
const settingForm = reactive({ setting_key: 'mfa_policy', value_json: '{"enforce_titulaire":true}' })

/* ─── API Calls ─── */
async function load(what: string) {
  loading.value = true; error.value = ''
  try {
    if (what === 'overview' || what === 'all') {
      kpis.value = (await request<{ kpis: Kpis }>(`${base}/overview`)).kpis
    }
    if (what === 'subscriptions' || what === 'all') {
      plans.value = (await request<{ data: PlanRow[] }>(`${base}/plans`)).data
      subscriptions.value = (await request<{ data: SubscriptionRow[] }>(`${base}/subscriptions`)).data
    }
    if (what === 'support' || what === 'all') {
      tickets.value = (await request<{ data: TicketRow[] }>(`${base}/tickets`)).data
      accessRequests.value = (await request<{ data: AccessRequestRow[] }>(`${base}/support-access-requests`)).data
    }
    if (what === 'settings' || what === 'all') {
      settings.value = (await request<{ data: SettingRow[] }>(`${base}/settings`)).data
      auditEvents.value = (await request<{ data: AuditRow[] }>(`${base}/audit-events`)).data
    }
  } catch (e: any) {
    error.value = e.message || 'Erreur de chargement'
  } finally {
    loading.value = false
  }
}

async function createPlan() {
  try {
    await request(`${base}/plans`, 'POST', {
      code: planForm.code,
      name: planForm.name,
      description: planForm.description,
      features: [{ module_key: planForm.module_key, feature_label: planForm.feature_label }],
    })
    showCreatePlan.value = false
    await load('subscriptions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createSub() {
  try {
    await request(`${base}/subscriptions`, 'POST', subForm)
    showCreateSub.value = false
    await load('subscriptions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function submitStateSub() {
  if (!showStateSub.value) return
  try {
    await request(`${base}/subscriptions/${showStateSub.value.id}/state`, 'POST', stateForm)
    showStateSub.value = null; stateForm.reason = ''
    await load('subscriptions'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function createTicket() {
  try {
    await request(`${base}/tickets`, 'POST', ticketForm)
    showCreateTicket.value = false
    await load('support'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function decideAccess(id: number, decision: 'approuve' | 'refuse' | 'revoque') {
  try {
    await request(`${base}/support-access-requests/${id}/decision`, 'POST', { decision })
    await load('support'); await load('overview')
  } catch (e: any) { error.value = e.message }
}

async function saveSetting() {
  try {
    const parsed = JSON.parse(settingForm.value_json)
    await request(`${base}/settings`, 'POST', { setting_key: settingForm.setting_key, setting_value: parsed })
    showCreateSetting.value = false
    await load('settings')
  } catch (e: any) { error.value = e.message }
}

const sections: { key: typeof tab.value; label: string }[] = [
  { key: 'overview', label: "Vue d'ensemble" },
  { key: 'subscriptions', label: 'Forfaits & Souscriptions' },
  { key: 'support', label: 'Assistance & Accès Support' },
  { key: 'settings', label: "Paramètres & Journal d'Audit" },
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
        <h1 class="font-display text-2xl font-bold">Administration SaaS & Abonnements</h1>
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
        <div class="kpi-card"><span class="kpi-value">{{ kpis.active_plans }}</span><span class="kpi-label">Forfaits configurés</span></div>
        <div class="kpi-card green"><span class="kpi-value">{{ kpis.active_subscriptions }}</span><span class="kpi-label">Souscriptions actives</span></div>
        <div class="kpi-card" :class="{ red: kpis.suspended_subscriptions > 0 }"><span class="kpi-value">{{ kpis.suspended_subscriptions }}</span><span class="kpi-label">Suspendues (données gardées)</span></div>
        <div class="kpi-card" :class="{ orange: kpis.open_tickets > 0 }"><span class="kpi-value">{{ kpis.open_tickets }}</span><span class="kpi-label">Tickets ouverts</span></div>
        <div class="kpi-card" :class="{ orange: kpis.pending_access_requests > 0 }"><span class="kpi-value">{{ kpis.pending_access_requests }}</span><span class="kpi-label">Accès support à approuver</span></div>
        <div class="kpi-card blue"><span class="kpi-value">{{ kpis.audit_events_count }}</span><span class="kpi-label">Événements d'audit</span></div>
      </div>
    </section>

    <!-- ═══════════ SUBSCRIPTIONS ═══════════ -->
    <section v-if="tab === 'subscriptions'" class="content-section">
      <div class="section-toolbar">
        <h3>Forfaits & Souscriptions de l'Officine</h3>
        <button class="btn-secondary" @click="showCreatePlan = true">+ Nouveau forfait</button>
        <button class="btn-primary" @click="showCreateSub = true">+ Associer un forfait</button>
      </div>

      <table v-if="subscriptions.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Forfait</th><th>Statut</th><th>Données conservées</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="sub in subscriptions" :key="sub.id">
            <td class="font-mono font-bold">{{ sub.reference }}</td>
            <td><strong>{{ sub.plan?.name }}</strong> ({{ sub.plan?.code }})</td>
            <td><span class="badge" :class="sub.status">{{ sub.status }}</span></td>
            <td>{{ sub.data_retained ? '✓ Oui (aucune suppression)' : 'Non' }}</td>
            <td>
              <button class="btn-sm btn-blue" @click="showStateSub = sub; stateForm.action = sub.status === 'suspendue' ? 'reactiver' : 'suspendre'">
                {{ sub.status === 'suspendue' ? 'Réactiver' : 'Suspendre' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucune souscription enregistrée.</p>
    </section>

    <!-- ═══════════ SUPPORT & ACCESS ═══════════ -->
    <section v-if="tab === 'support'" class="content-section">
      <div class="section-toolbar">
        <h3>Demandes d'Accès Temporaire Support & Tickets</h3>
        <button class="btn-primary" @click="ticketForm.reference = `TKT-${Date.now().toString().slice(-5)}`; showCreateTicket = true">+ Ouvrir un ticket</button>
      </div>

      <h4 class="subhead">Demandes d'accès support à valider par l'officine</h4>
      <table v-if="accessRequests.length" class="data-table mb-6">
        <thead><tr><th>Agent Support</th><th>Motif</th><th>Périmètre</th><th>Durée</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="req in accessRequests" :key="req.id">
            <td><strong>{{ req.requester?.name }}</strong><div class="text-xs text-gray-500">{{ req.requester?.email }}</div></td>
            <td>{{ req.reason }}</td>
            <td class="font-mono text-xs">{{ req.requested_scope?.join(', ') }}</td>
            <td>{{ req.duration_hours }}h</td>
            <td><span class="badge" :class="req.status">{{ req.status }}</span></td>
            <td>
              <button v-if="req.status === 'en_attente'" class="btn-sm btn-green" @click="decideAccess(req.id, 'approuve')">Approuver</button>
              <button v-if="req.status === 'en_attente'" class="btn-sm btn-red" @click="decideAccess(req.id, 'refuse')">Refuser</button>
              <button v-if="req.status === 'approuve'" class="btn-sm btn-red" @click="decideAccess(req.id, 'revoque')">Révoquer</button>
            </td>
          </tr>
        </tbody>
      </table>

      <h4 class="subhead">Tickets d'assistance</h4>
      <table v-if="tickets.length" class="data-table">
        <thead><tr><th>Réf.</th><th>Objet</th><th>Priorité</th><th>Statut</th></tr></thead>
        <tbody>
          <tr v-for="tk in tickets" :key="tk.id">
            <td class="font-mono font-bold">{{ tk.reference }}</td>
            <td><strong>{{ tk.subject }}</strong><div class="text-xs text-gray-500">{{ tk.description }}</div></td>
            <td>{{ tk.priority }}</td>
            <td><span class="badge" :class="tk.status">{{ tk.status }}</span></td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-state">Aucun ticket d'assistance ouvert.</p>
    </section>

    <!-- ═══════════ SETTINGS & AUDIT ═══════════ -->
    <section v-if="tab === 'settings'" class="content-section">
      <div class="section-toolbar">
        <h3>Paramètres de Sécurité & Journal d'Audit SaaS</h3>
        <button class="btn-primary" @click="showCreateSetting = true">+ Configurer un paramètre</button>
      </div>

      <table v-if="settings.length" class="data-table mb-6">
        <thead><tr><th>Clé</th><th>Configuration</th></tr></thead>
        <tbody>
          <tr v-for="st in settings" :key="st.id">
            <td class="font-mono font-bold">{{ st.setting_key }}</td>
            <td class="font-mono text-xs">{{ JSON.stringify(st.setting_value) }}</td>
          </tr>
        </tbody>
      </table>

      <h4 class="subhead">Journal d'Audit Administration (sans secrets)</h4>
      <table v-if="auditEvents.length" class="data-table">
        <thead><tr><th>Date</th><th>Acteur</th><th>Événement</th><th>Cible</th></tr></thead>
        <tbody>
          <tr v-for="ev in auditEvents" :key="ev.id">
            <td class="text-xs">{{ ev.occurred_at.slice(0, 19).replace('T', ' ') }}</td>
            <td>{{ ev.actor?.name || 'Système / Webhook' }}</td>
            <td class="font-mono text-xs font-bold">{{ ev.event_type }}</td>
            <td>{{ ev.target_type || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ═══════════ MODALS ═══════════ -->
    <AppModal v-model="showCreatePlan" title="Nouveau forfait SaaS">
      <form @submit.prevent="createPlan" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Code</label><input v-model="planForm.code" required placeholder="PACK-BPD" /></div>
          <div class="form-row"><label>Nom</label><input v-model="planForm.name" required /></div>
        </div>
        <div class="form-row"><label>Description</label><input v-model="planForm.description" /></div>
        <div class="detail-grid">
          <div class="form-row"><label>Module inclus</label><input v-model="planForm.module_key" required /></div>
          <div class="form-row"><label>Libellé droit</label><input v-model="planForm.feature_label" required /></div>
        </div>
        <button type="submit" class="btn-primary mt-4">Créer le forfait</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateSub" title="Associer un forfait à l'officine">
      <form @submit.prevent="createSub" class="modal-form">
        <div class="form-row"><label>Forfait</label>
          <select v-model.number="subForm.plan_id" required>
            <option :value="0" disabled>— Sélectionner —</option>
            <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
          </select>
        </div>
        <div class="form-row"><label>Référence</label><input v-model="subForm.reference" required placeholder="SUB-2026-001" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer la souscription</button>
      </form>
    </AppModal>

    <AppModal v-model="showStateOpen" :title="showStateSub ? `Gestion souscription — ${showStateSub.reference}` : ''">
      <form v-if="showStateSub" @submit.prevent="submitStateSub" class="modal-form">
        <div class="form-row"><label>Motif obligatoire</label><textarea v-model="stateForm.reason" required minlength="5" rows="2" /></div>
        <p class="text-xs text-gray-500">ℹ️ La suspension conserve intégralement toutes les données métier de l'officine (aucune suppression automatique).</p>
        <button type="submit" class="btn-primary mt-4">Confirmer l'action</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateTicket" title="Ouvrir un ticket d'assistance">
      <form @submit.prevent="createTicket" class="modal-form">
        <div class="detail-grid">
          <div class="form-row"><label>Référence</label><input v-model="ticketForm.reference" required /></div>
          <div class="form-row"><label>Priorité</label><select v-model="ticketForm.priority"><option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option><option value="critique">Critique</option></select></div>
        </div>
        <div class="form-row"><label>Objet</label><input v-model="ticketForm.subject" required /></div>
        <div class="form-row"><label>Description</label><textarea v-model="ticketForm.description" required rows="3" /></div>
        <button type="submit" class="btn-primary mt-4">Envoyer le ticket</button>
      </form>
    </AppModal>

    <AppModal v-model="showCreateSetting" title="Configurer paramètre plateforme">
      <form @submit.prevent="saveSetting" class="modal-form">
        <div class="form-row"><label>Clé</label><input v-model="settingForm.setting_key" required /></div>
        <div class="form-row"><label>Valeur JSON</label><textarea v-model="settingForm.value_json" required rows="3" /></div>
        <button type="submit" class="btn-primary mt-4">Enregistrer</button>
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
.kpi-value { font-size: 1.75rem; font-weight: 700; color: #1f2937; }
.kpi-label { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
.subhead { font-size: 0.9rem; font-weight: 600; color: #374151; margin: 1rem 0 0.5rem; }
.section-toolbar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
.section-toolbar h3 { margin: 0; font-size: 1rem; flex: 1; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.data-table th { text-align: left; padding: 0.6rem; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; }
.data-table td { padding: 0.6rem; border-bottom: 1px solid #f3f4f6; }
.badge { font-size: 0.7rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600; text-transform: capitalize; }
.badge.active, .badge.approuve, .badge.resolu { background: #d1fae5; color: #065f46; }
.badge.en_attente, .badge.en_attente_paiement, .badge.ouvert { background: #fef3c7; color: #92400e; }
.badge.suspendue, .badge.revoque, .badge.refuse { background: #fee2e2; color: #991b1b; }
.empty-state { text-align: center; color: #9ca3af; padding: 3rem 1rem; font-size: 0.9rem; }
.btn-primary { padding: 0.5rem 1.15rem; background: #1a73e8; color: #fff; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-secondary { padding: 0.5rem 1rem; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
.btn-sm { padding: 0.25rem 0.6rem; border: none; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-right: 0.25rem; }
.btn-green { background: #d1fae5; color: #065f46; }
.btn-blue { background: #dbeafe; color: #1e40af; }
.btn-red { background: #fee2e2; color: #991b1b; }
.modal-form { display: flex; flex-direction: column; gap: 0.6rem; }
.form-row { display: flex; flex-direction: column; gap: 0.2rem; }
.form-row label { font-size: 0.75rem; font-weight: 600; color: #374151; }
.form-row input, .form-row select, .form-row textarea { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.85rem; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
</style>
