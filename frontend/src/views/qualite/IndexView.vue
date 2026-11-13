<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQualityStore } from '@/stores/qualityStore'
import { type QualityAction, type ActionInput, type Status, demoMode } from '@/services/quality'
import AppModal from '@/components/AppModal.vue'
import AppIcon from '@/components/AppIcon.vue'
const store = useQualityStore(); const route = useRoute(); const router = useRouter()
const search = ref(''); const filter = ref('all'); const modal = ref(false); const saving = ref(false); const error = ref(''); const notice = ref(''); const editing = ref<number>()
const blank = (): ActionInput => ({ title: '', chapter: 'Organisation qualité', severity: 'medium', owner: '', due_date: '', status: 'open', description: '', resolution: '' })
const form = reactive(blank())
const autoEvaluation = ref<{ status: string; available: boolean; reason: string | null } | null>(null)
const chapters = ['Organisation qualité', 'Personnel', 'Locaux et équipements', 'Approvisionnement', 'Stockage', 'Dispensation', 'Vigilance', 'Documentation', 'Auto-inspection', 'Autre / à qualifier']
const labels: Record<Status, string> = { open: 'Ouverte', in_progress: 'En cours', closed: 'Clôturée' }
const severityLabels = { low: 'Faible', medium: 'Modérée', high: 'Élevée' }
const filtered = computed(() => store.actions.filter(a => (filter.value === 'all' || (filter.value === 'overdue' ? store.overdue.some(x => x.id === a.id) : a.status === filter.value)) && `${a.title} ${a.owner} ${a.chapter}`.toLocaleLowerCase('fr').includes(search.value.toLocaleLowerCase('fr'))))
async function open(action?: QualityAction) {
 Object.assign(form, action || blank()); editing.value = action?.id; error.value = ''; modal.value = true
}
function close() { if (saving.value) return; modal.value = false; if (route.query.action || route.query.create) router.replace('/qualite') }
async function submit() {
 error.value = ''
 if (!form.title.trim() || !form.owner.trim() || !form.description.trim()) { error.value = 'Renseignez le titre, le responsable et le constat.'; return }
 if (form.status === 'closed' && !form.resolution.trim()) { error.value = 'Renseignez un bilan de résolution avant de clôturer l’action.'; return }
 saving.value = true
 try { await store.save({ ...form, title: form.title.trim(), owner: form.owner.trim() }, editing.value); saving.value = false; close(); notice.value = editing.value ? 'Action mise à jour.' : 'Action créée.' }
 catch(e) { error.value = (e as Error).message } finally { saving.value = false }
}
onMounted(async () => { await store.load(); if (demoMode) autoEvaluation.value = { status: 'not_available', available: false, reason: 'Démonstration : aucun relevé réel chargé ; aucune campagne réelle vérifiée.' }; else { try { autoEvaluation.value = await (await import('@/services/quality')).qualityService.autoEvaluation() } catch { autoEvaluation.value = { status: 'not_available', available: false, reason: 'État du référentiel indisponible.' } } } if (route.query.create) open(); else if (route.query.action) { const a = store.actions.find(a => a.id === Number(route.query.action)); if (a) open(a) } })
</script>
<template>
 <div class="page">
  <div class="page-heading compact"><div><p class="eyebrow">AMÉLIORATION CONTINUE</p><h1>Qualité <span class="accent-serif">& actions.</span></h1><p class="page-subtitle">Du constat à la résolution, chaque progrès compte.</p></div><button class="button primary" @click="open()"><AppIcon name="plus" :size="18" />Nouvelle action</button></div>
  <section class="panel" aria-labelledby="bpd-heading"><div class="panel-heading"><div><p class="eyebrow">BPD · AUTO-ÉVALUATION</p><h2 id="bpd-heading">Campagnes, évaluations et rapports</h2></div><span class="status-badge" :class="autoEvaluation?.available ? 'in_progress' : 'open'">{{ autoEvaluation?.available ? 'Campagne ouverte' : 'Non disponible' }}</span></div><p role="status">{{ autoEvaluation?.reason || 'Vérification de la disponibilité…' }}</p><p class="muted-note">Aucun score, seuil ni interprétation réglementaire n’est calculé sans référentiel validé et mesures enregistrées. Les écarts ne créent pas automatiquement de CAPA.</p></section>
  <div class="mini-stats"><button @click="filter = 'all'">{{ store.actions.length }} <span>actions au total</span></button><button @click="filter = 'in_progress'">{{ store.actions.filter(a => a.status === 'in_progress').length }} <span>en cours</span></button><button @click="filter = 'overdue'">{{ store.overdue.length }} <span>en retard</span></button></div>
  <p v-if="notice" class="alert success" role="status">{{ notice }}<button @click="notice = ''" aria-label="Masquer la confirmation">×</button></p>
  <p v-if="store.error" class="alert error" role="alert">{{ store.error }}<button @click="store.load">Réessayer</button></p>
  <section class="panel quality-panel">
   <div class="table-toolbar"><label class="section-filter">État<select :value="filter" aria-label="Filtrer par état" @change="filter = ($event.target as HTMLSelectElement).value"><option value="all">Toutes</option><option value="open">Ouvertes</option><option value="in_progress">En cours</option><option value="closed">Clôturées</option><option value="overdue">En retard</option></select></label><label class="search-field"><AppIcon name="search" :size="18" /><input v-model="search" aria-label="Rechercher une action" placeholder="Rechercher une action…" type="search" /></label></div>
   <div v-if="store.loading" class="loading" role="status">Chargement des actions…</div>
   <div v-else-if="!filtered.length" class="empty-state"><AppIcon name="quality" :size="36" /><h3>Aucune action à afficher</h3><p>{{ search || filter !== 'all' ? 'Essayez un autre filtre ou une autre recherche.' : 'Commencez par documenter votre premier constat.' }}</p><button class="button secondary" @click="search = ''; filter = 'all'">Effacer les filtres</button></div>
   <div v-else class="table-scroll"><table><thead><tr><th scope="col">CONSTAT / ACTION</th><th scope="col">PRIORITÉ</th><th scope="col">RESPONSABLE</th><th scope="col">ÉCHÉANCE</th><th scope="col">ÉTAT</th><th scope="col"><span class="sr-only">Modifier</span></th></tr></thead><tbody><tr v-for="action in filtered" :key="action.id"><td><button class="table-title" @click="open(action)">{{ action.title }}</button><small class="table-subtitle">{{ action.chapter }} · #{{ String(action.id).padStart(3, '0') }}</small></td><td><span class="priority-label"><i :class="action.severity"></i>{{ severityLabels[action.severity] }}</span></td><td>{{ action.owner }}</td><td><span :class="{ 'overdue-text': store.overdue.some(a => a.id === action.id) }">{{ action.due_date.split('-').reverse().join('/') }}</span></td><td><span class="status-badge" :class="action.status"><i></i>{{ labels[action.status] }}</span></td><td><button class="icon-button" :aria-label="`Modifier : ${action.title}`" @click="open(action)"><AppIcon name="chevron" :size="17" /></button></td></tr></tbody></table></div>
   <div class="panel-foot">{{ filtered.length }} action(s) affichée(s)<span>Suivi interne · ne vaut pas certification</span></div>
  </section>
  <p class="muted-note"><AppIcon name="info" :size="16" />Les domaines seront ajustés à votre référentiel et à vos documents BestPharma.</p>
 </div>
 <AppModal :model-value="modal" :title="editing ? 'Détail de l’action' : 'Nouvelle action'" eyebrow="SUIVI QUALITÉ" :busy="saving" @update:model-value="close"><form @submit.prevent="submit"><div class="form-body"><p v-if="error" class="alert error" role="alert">{{ error }}</p><label>Titre de l’action *<input v-model="form.title" required maxlength="180" placeholder="Ex. Revoir la procédure de réception" /></label><label>Constat et action proposée *<textarea v-model="form.description" required maxlength="5000" rows="3" placeholder="Décrivez le constat. Aucune donnée de patient." /></label><div class="form-grid"><label>Domaine<select v-model="form.chapter"><option v-for="chapter in chapters" :key="chapter">{{ chapter }}</option></select></label><label>Priorité<select v-model="form.severity"><option value="low">Faible</option><option value="medium">Modérée</option><option value="high">Élevée</option></select></label><label>Responsable *<input v-model="form.owner" required maxlength="120" placeholder="Nom ou fonction" /></label><label>Échéance *<input v-model="form.due_date" type="date" required /></label></div><label>État<select v-model="form.status"><option value="open">Ouverte</option><option value="in_progress">En cours</option><option value="closed">Clôturée</option></select></label><label>Bilan de résolution {{ form.status === 'closed' ? '*' : '' }}<textarea v-model="form.resolution" :required="form.status === 'closed'" maxlength="5000" rows="2" placeholder="Décrivez le résultat obtenu avant de clôturer." /></label></div><div class="modal-footer"><button type="button" class="button secondary" :disabled="saving" @click="close">Annuler</button><button type="submit" class="button primary" :disabled="saving">{{ saving ? 'Enregistrement…' : 'Enregistrer l’action' }}</button></div></form></AppModal>
</template>
