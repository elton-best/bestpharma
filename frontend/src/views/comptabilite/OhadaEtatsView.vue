<template>
  <div class="module-shell">
    <header class="module-header">
      <div>
        <span class="phase-pill">États Financiers · OHADA</span>
        <h1>États Financiers OHADA (Bilan & Résultat)</h1>
        <p class="subtitle">Synthèse en temps réel du Bilan (Actif / Passif) et du Compte de Résultat (Charges / Produits) d'après la balance SYSCOHADA validée.</p>
      </div>
    </header>
    <div v-if="error" class="banner error" role="alert">{{ error }}</div>

    <section class="split-grid">
      <div class="panel">
        <h2>Bilan Synthétique (Classes 1 à 5)</h2>
        <p><strong>Total Actif :</strong> {{ formatMoney(totalActif) }}</p>
        <p><strong>Total Passif :</strong> {{ formatMoney(totalPassif) }}</p>
      </div>
      <div class="panel">
        <h2>Compte de Résultat (Classes 6 & 7)</h2>
        <p><strong>Total Produits (Cl. 7) :</strong> {{ formatMoney(totalProduits) }}</p>
        <p><strong>Total Charges (Cl. 6) :</strong> {{ formatMoney(totalCharges) }}</p>
        <p><strong>Résultat Net :</strong> {{ formatMoney(totalProduits - totalCharges) }}</p>
      </div>
    </section>

    <section class="panel">
      <h2>Détail des comptes OHADA</h2>
      <table class="data-table">
        <thead>
          <tr><th>Code</th><th>Compte</th><th>Nature</th><th>Solde Débiteur</th><th>Solde Créditeur</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.compte_id">
            <td><strong>{{ r.code }}</strong></td>
            <td>{{ r.label }}</td>
            <td>{{ r.nature }}</td>
            <td>{{ formatMoney(r.solde_debiteur) }}</td>
            <td>{{ formatMoney(r.solde_crediteur) }}</td>
          </tr>
          <tr v-if="!rows.length"><td colspan="5" class="empty-row">Aucune écriture validée pour générer les états OHADA.</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { request } from '@/services/quality'

const rows = ref<any[]>([])
const error = ref('')

const totalActif = computed(() => rows.value.filter((r) => r.nature === 'actif').reduce((a, r) => a + Number(r.solde_debiteur || 0), 0))
const totalPassif = computed(() => rows.value.filter((r) => r.nature === 'passif').reduce((a, r) => a + Number(r.solde_crediteur || 0), 0))
const totalCharges = computed(() => rows.value.filter((r) => r.classe === 6).reduce((a, r) => a + Number(r.solde_debiteur || 0), 0))
const totalProduits = computed(() => rows.value.filter((r) => r.classe === 7).reduce((a, r) => a + Number(r.solde_crediteur || 0), 0))

function formatMoney(v: number) {
  return `${Number(v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} FCFA`
}

onMounted(async () => {
  try {
    const res = await request<{ data: { rows?: any[] } }>('/comptabilite/balance')
    rows.value = Array.isArray(res.data?.rows) ? res.data.rows : []
  } catch (e) { error.value = (e as Error).message }
})
</script>

<style scoped>
.module-shell { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.phase-pill { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 0.75rem; font-weight: 600; }
h1 { margin: 0.25rem 0 0; font-size: 1.55rem; }
.subtitle { margin: 0.2rem 0 0; color: #475569; font-size: 0.9rem; }
.split-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
.panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.data-table th, .data-table td { padding: 0.55rem 0.7rem; border-bottom: 1px solid #f1f5f9; text-align: left; }
.data-table th { background: #f8fafc; color: #64748b; }
.empty-row { text-align: center; color: #94a3b8; padding: 1.25rem; }
.banner.error { padding: 0.75rem 1rem; border-radius: 0.5rem; background: #fef2f2; color: #991b1b; }
</style>
