<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { request } from '@/services/quality'
interface Comment { id: number; user_id: number; author: string; visibility: 'shared' | 'internal'; message: string; created_at: string }
const props = defineProps<{ missionId: number }>()
const rows = ref<Comment[]>([]), canLead = ref(false), canComment = ref(false), loading = ref(false), busy = ref(false), error = ref(''), message = ref(''), visibility = ref<'shared' | 'internal'>('shared'), confirmed = ref(false)
let pendingKey = ''
async function load() {
  loading.value = true; error.value = ''
  try { const result = await request<{ data: Comment[]; can_lead: boolean; can_comment: boolean }>(`/support/missions/${props.missionId}/comments`); rows.value = result.data; canLead.value = result.can_lead; canComment.value = result.can_comment; if (!result.can_lead) visibility.value = 'shared' }
  catch (e) { error.value = (e as Error).message }
  finally { loading.value = false }
}
async function send() {
  busy.value = true; error.value = ''
  try { pendingKey ||= globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`; await request(`/support/missions/${props.missionId}/comments`, 'POST', { visibility: visibility.value, message: message.value, request_key: pendingKey, confirmed: confirmed.value }); pendingKey = ''; message.value = ''; confirmed.value = false; await load() }
  catch (e) { error.value = (e as Error).message }
  finally { busy.value = false }
}
watch(() => props.missionId, load)
onMounted(load)
</script>

<template>
  <section class="detail-card" aria-labelledby="mission-comments-title">
    <h3 id="mission-comments-title">Échanges de mission</h3>
    <p>Fil de discussion lié à cette mission. Ce canal n’est pas un canal d’urgence et ne transmet rien à l’ABMed.</p>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p><p v-if="loading" role="status">Chargement des échanges…</p>
    <ol v-else class="mission-comments"><li v-for="comment in rows" :key="comment.id" class="detail-card"><div class="panel-heading"><strong>{{ comment.author }}</strong><span>{{ comment.visibility === 'internal' ? 'Note interne' : 'Partagé avec l’officine' }} · {{ comment.created_at }}</span></div><p class="comment-message">{{ comment.message }}</p></li><li v-if="!rows.length" class="empty-state">Aucun échange pour cette mission.</li></ol>
    <form v-if="canComment" class="form-body" @submit.prevent="send"><label>Message<textarea v-model="message" required maxlength="5000" rows="3" placeholder="Rédigez un message lié à cette mission"></textarea></label><label v-if="canLead">Visibilité<select v-model="visibility"><option value="shared">Partagé avec l’officine</option><option value="internal">Note interne (équipe de mission)</option></select></label><label class="checkbox-label"><input v-model="confirmed" type="checkbox" required>Je confirme la visibilité choisie et la publication du message.</label><button class="button primary" :disabled="busy">{{ busy ? 'Publication…' : 'Publier le message' }}</button></form>
    <p v-else class="module-disclaimer">La mission est terminée ; les échanges sont en lecture seule.</p>
    <p class="module-disclaimer">Les pièces jointes et la modification/retrait de messages ne sont pas encore activés. Les messages internes ne sont jamais retournés aux membres de l’officine.</p>
  </section>
</template>
