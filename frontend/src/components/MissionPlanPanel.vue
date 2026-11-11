<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { request } from '@/services/quality'

interface PlanItem { source_finding_id: number | null; expected_result: string; owner: string; due_date: string; priority: 'low' | 'normal' | 'high'; evidence_expected: string; effectiveness_criteria: string; comment: string }
interface PlanSnapshot { title: string; objectives: string[]; starts_on: string; ends_on: string; items: PlanItem[] }
interface PlanVersion { id: number; revision: number; state: string; snapshot: PlanSnapshot; decision_reason: string | null }
interface Plan { id: number; status: string; version: number; can_edit: boolean; versions: PlanVersion[] }
const props = defineProps<{ missionId: number; active: boolean }>()
const plan = ref<Plan | null>(null), loading = ref(false), busy = ref(false), error = ref(''), notice = ref('')
const canApprove = ref(false)
const canEdit = ref(false)
const importing = ref(false)
const editor = ref(false), decision = ref(false), decisionType = ref<'approve' | 'request_changes'>('approve'), reason = ref(''), confirmed = ref(false)
const title = ref(''), objectiveText = ref(''), starts = ref(''), ends = ref(''), items = ref<PlanItem[]>([])
const canLead = computed(() => props.active && canEdit.value)
const latest = computed(() => plan.value?.versions?.[0] ?? null)
const labels: Record<string, string> = { draft: 'Brouillon', submitted: 'À valider', approved: 'Approuvé', changes_requested: 'Modifications demandées' }

async function load() {
  loading.value = true; error.value = ''
  try { const response = await request<{ data: Plan | null; can_approve: boolean; can_edit: boolean }>(`/support/missions/${props.missionId}/plan`); plan.value = response.data; canApprove.value = response.can_approve; canEdit.value = response.can_edit }
  catch (e) { error.value = (e as Error).message }
  finally { loading.value = false }
}
function edit() {
  const snapshot = latest.value?.snapshot
  title.value = snapshot?.title ?? ''; objectiveText.value = snapshot?.objectives?.join('\n') ?? ''
  starts.value = snapshot?.starts_on ?? ''; ends.value = snapshot?.ends_on ?? ''
  items.value = snapshot?.items?.map(item => ({ ...item })) ?? []
  if (!items.value.length) addItem()
  editor.value = true
}
function addItem() { items.value.push({ source_finding_id: null, expected_result: '', owner: '', due_date: '', priority: 'normal', evidence_expected: '', effectiveness_criteria: '', comment: '' }) }
function askDecision(type: 'approve' | 'request_changes') { decisionType.value = type; reason.value = ''; confirmed.value = false; decision.value = true }
async function save() {
  busy.value = true; error.value = ''
  try {
    const result = await request<{ data: Plan }>(`/support/missions/${props.missionId}/plan`, 'PUT', {
      version: plan.value?.version ?? 0, title: title.value, objectives: objectiveText.value.split('\n').map(x => x.trim()).filter(Boolean),
      starts_on: starts.value, ends_on: ends.value, items: items.value, confirmed: true,
    })
    plan.value = result.data; canEdit.value = result.data.can_edit; editor.value = false; notice.value = 'Brouillon du plan enregistré.'
  } catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
async function submit() {
  if (!plan.value) return
  busy.value = true; error.value = ''
  try { await request(`/support/missions/${props.missionId}/plan/submit`, 'POST', { version: plan.value.version, confirmed: true }); notice.value = 'Plan soumis pour validation.'; await load() }
  catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
async function decide() {
  if (!plan.value) return
  busy.value = true; error.value = ''
  try { await request(`/support/missions/${props.missionId}/plan/decision`, 'POST', { version: plan.value.version, decision: decisionType.value, reason: reason.value, confirmed: confirmed.value }); decision.value = false; notice.value = 'Décision enregistrée.'; await load() }
  catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
async function importToActions() {
  importing.value = true; error.value = ''
  try { await request(`/qualite/actions-v2/import-mission/${props.missionId}`, 'POST', { confirmed: true }); notice.value = 'Le plan approuvé a été importé dans le registre unique M4.' }
  catch (e) { error.value = (e as Error).message }
  finally { importing.value = false }
}
watch(() => props.missionId, load)
onMounted(load)
</script>

<template>
  <section class="detail-card mission-plan" aria-labelledby="mission-plan-title">
    <div class="panel-heading"><div><h3 id="mission-plan-title">Plan d’accompagnement</h3><p>Versions conservées ; les actions restent la responsabilité du module 04.</p></div>
      <div class="heading-actions" v-if="canLead"><button class="button secondary small" :disabled="busy || loading" @click="edit">{{ plan ? 'Préparer une révision' : 'Créer le plan' }}</button><button v-if="plan?.status==='draft' || plan?.status==='changes_requested'" class="button primary small" :disabled="busy" @click="submit">Soumettre</button></div>
    </div>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p><p v-if="notice" class="alert success" role="status">{{ notice }}</p><p v-if="loading" role="status">Chargement du plan…</p>
    <template v-else-if="plan">
      <p>État : <strong>{{ labels[plan.status] || plan.status }}</strong> · version {{ plan.version }}</p>
      <button v-if="canApprove && plan.status==='approved'" class="button secondary small" :disabled="importing" @click="importToActions">{{ importing ? 'Intégration…' : 'Intégrer au registre M4' }}</button>
      <article v-for="version in plan.versions" :key="version.id" class="detail-card">
        <div class="panel-heading"><strong>Révision {{ version.revision }} · {{ labels[version.state] || version.state }}</strong>
          <div v-if="canApprove && version.state==='submitted'" class="heading-actions"><button class="button primary small" @click="askDecision('approve')">Approuver</button><button class="button secondary small" @click="askDecision('request_changes')">Demander modification</button></div>
        </div>
        <p><strong>{{ version.snapshot.title }}</strong> · {{ version.snapshot.starts_on }} → {{ version.snapshot.ends_on }}</p>
        <ul><li v-for="goal in version.snapshot.objectives" :key="goal">{{ goal }}</li></ul>
        <div class="table-scroll"><table><thead><tr><th>Résultat attendu</th><th>Responsable</th><th>Échéance</th><th>Priorité</th><th>Constat source</th></tr></thead><tbody><tr v-for="(item,index) in version.snapshot.items" :key="index"><td>{{ item.expected_result }}</td><td>{{ item.owner }}</td><td>{{ item.due_date }}</td><td>{{ item.priority }}</td><td>{{ item.source_finding_id ? `Constat #${item.source_finding_id}` : '—' }}</td></tr><tr v-if="!version.snapshot.items.length"><td colspan="5">Aucun élément de plan.</td></tr></tbody></table></div>
        <p v-if="version.decision_reason">Motif communiqué : {{ version.decision_reason }}</p>
      </article>
    </template>
    <p v-else-if="!loading" class="empty-state">Aucun plan visible pour cette mission.</p>
    <p class="module-disclaimer">Les lignes restent des attentes dans M2. Après approbation, un administrateur peut les intégrer au registre unique M4 ; l’exécution n’est jamais dupliquée dans M2.</p>
  </section>
  <AppModal v-model="editor" title="Plan d’accompagnement" size="wide" :busy="busy"><form id="mission-plan-form" class="form-body" @submit.prevent="save"><p v-if="error" class="alert error" role="alert">{{ error }}</p>
    <label>Titre<input v-model="title" required maxlength="180"></label><label>Objectifs (un par ligne)<textarea v-model="objectiveText" required rows="3" maxlength="5000"></textarea></label>
    <div class="form-grid"><label>Début<input v-model="starts" type="date" required></label><label>Fin<input v-model="ends" type="date" required></label></div>
    <div class="panel-heading"><h4>Éléments du plan</h4><button type="button" class="button secondary small" @click="addItem">Ajouter une ligne</button></div>
    <fieldset v-for="(item,index) in items" :key="index" class="detail-card"><legend>Ligne {{ index + 1 }}</legend><div class="form-grid"><label>Résultat attendu<input v-model="item.expected_result" required maxlength="1000"></label><label>Responsable<input v-model="item.owner" required maxlength="160"></label><label>Échéance<input v-model="item.due_date" type="date" required></label><label>Priorité<select v-model="item.priority"><option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option></select></label><label>Constat partagé lié (ID)<input v-model.number="item.source_finding_id" type="number" min="1" placeholder="Facultatif"></label><label>Preuve attendue<input v-model="item.evidence_expected" maxlength="1000"></label></div><label>Critère d’efficacité attendu<input v-model="item.effectiveness_criteria" required maxlength="1000" placeholder="Mesure à vérifier, sans seuil réglementaire présumé"></label><label>Commentaire<textarea v-model="item.comment" rows="2" maxlength="2000"></textarea></label><button v-if="items.length>1" type="button" class="button secondary small" @click="items.splice(index,1)">Retirer la ligne</button></fieldset>
    <p class="module-disclaimer">Le lien au constat est validé côté serveur. Ne saisissez pas de données confidentielles dans un plan partagé.</p></form><template #footer><button class="button secondary" :disabled="busy" @click="editor=false">Annuler</button><button class="button primary" type="submit" form="mission-plan-form" :disabled="busy">Enregistrer le brouillon</button></template></AppModal>
  <AppModal v-model="decision" :title="decisionType==='approve'?'Approuver le plan':'Demander une modification'" :busy="busy"><form id="mission-plan-decision" class="form-body" @submit.prevent="decide"><p v-if="error" class="alert error" role="alert">{{ error }}</p><label v-if="decisionType==='request_changes'">Motif / modifications attendues<textarea v-model="reason" required maxlength="2000" rows="4"></textarea></label><label class="checkbox-label"><input v-model="confirmed" type="checkbox" required>Je confirme cette décision sur la version soumise.</label></form><template #footer><button class="button secondary" :disabled="busy" @click="decision=false">Annuler</button><button class="button primary" type="submit" form="mission-plan-decision" :disabled="busy">Confirmer</button></template></AppModal>
</template>
