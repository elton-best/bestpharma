<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">Sécurité · Intégrité</span>
        <h1>Journal d'Audit SHA-256</h1>
        <p class="subtitle">Piste d'audit immuable des événements critiques et empreintes cryptographiques SHA-256.</p>
      </div>
    </header>
    <div v-if="error" class="banner error" role="alert">{{ error }}</div>

    <section class="panel">
      <table class="data-table">
        <thead>
          <tr><th>Horodatage</th><th>Action</th><th>Catégorie</th><th>Acteur</th><th>Empreinte SHA-256</th></tr>
        </thead>
        <tbody>
          <tr v-for="ev in events" :key="ev.id">
            <td>{{ ev.occurred_at || ev.created_at }}</td>
            <td><strong>{{ ev.action }}</strong></td>
            <td>{{ ev.category || ev.entity_type || 'system' }}</td>
            <td>{{ ev.actor_user_id ? `User #${ev.actor_user_id}` : 'Système' }}</td>
            <td><code>{{ ev.event_hash?.slice(0, 16) || '—' }}</code></td>
          </tr>
          <tr v-if="!events.length"><td colspan="5" class="empty-row">Aucun événement d'audit enregistré.</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { request } from '@/services/quality'

const events = ref<any[]>([])
const error = ref('')

onMounted(async () => {
  try {
    const res = await request<{ data: any[] }>('/platformadmin/audit-events')
    events.value = res.data || []
  } catch (e) { error.value = (e as Error).message }
})
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #ede9fe; color: #5b21b6; font-size: 0.75rem; font-weight: 600; }
h1 { margin: 0.25rem 0 0; font-size: 1.55rem; }
.subtitle { margin: 0.2rem 0 0; color: #475569; font-size: 0.9rem; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.data-table th, .data-table td { padding: 0.55rem 0.7rem; border-bottom: 1px solid #f1f5f9; text-align: left; }
.data-table th { background: #f8fafc; color: #64748b; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.25rem; }
.banner.error { padding: 0.75rem 1rem; border-radius: 0.5rem; background: #fef2f2; color: #991b1b; }
</style>
