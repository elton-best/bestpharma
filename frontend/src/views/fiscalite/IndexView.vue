<template>
  <main class="mx-auto max-w-5xl space-y-6 p-6">
    <header>
      <p class="text-sm font-semibold uppercase tracking-wide text-emerald-800">Facturation</p>
      <h1 class="mt-1 font-display text-3xl font-bold">Factures et conformité fiscale</h1>
      <p class="mt-2 max-w-3xl text-gray-600">Cette page ne produit aucun document fiscal. La facturation DGI n’est pas configurée dans cette application.</p>
    </header>

    <section aria-labelledby="invoices-title" class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="invoices-title" class="text-xl font-semibold">Factures</h2>
          <p class="mt-1 text-sm text-gray-600">État de consultation de l’API de facturation.</p>
        </div>
        <button type="button" :disabled="loading" class="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50" @click="loadInvoices">
          {{ loading ? 'Vérification…' : 'Vérifier l’API' }}
        </button>
      </div>
      <p v-if="loading" role="status" class="mt-5 rounded-lg bg-slate-50 p-4 text-slate-700">Vérification de la disponibilité de l’API…</p>
      <p v-else-if="error" role="alert" class="mt-5 rounded-lg bg-amber-50 p-4 text-amber-900">API de facturation indisponible : {{ error }} Aucune facture n’a pu être vérifiée.</p>
      <p v-else-if="checked && invoices.length === 0" role="status" class="mt-5 rounded-lg bg-slate-50 p-4 text-slate-700">Aucune facture enregistrée dans la réponse de l’API.</p>
      <p v-else-if="checked" role="status" class="mt-5 rounded-lg bg-slate-50 p-4 text-slate-700">{{ invoices.length }} facture(s) retournée(s) par l’API. Aucun reçu fiscal ne peut être généré depuis cette page.</p>
      <p v-else role="status" class="mt-5 rounded-lg bg-slate-50 p-4 text-slate-700">API non vérifiée. Aucune donnée de facture affichée.</p>
    </section>

    <section aria-labelledby="dgi-title" aria-disabled="true" class="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div class="flex flex-wrap items-center gap-3">
        <h2 id="dgi-title" class="text-xl font-semibold">Certification DGI / e-MECEF</h2>
        <span class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Désactivé</span>
      </div>
      <p class="mt-3 text-gray-700">Aucune certification, connexion DGI/e-MECEF, numérotation fiscale, taux fiscal ou génération de QR code n’est configuré ici.</p>
      <p class="mt-2 text-sm font-medium text-gray-800">Ne pas présenter un document créé hors de ce système comme une facture certifiée.</p>
    </section>

    <section aria-labelledby="payment-title" aria-disabled="true" class="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div class="flex flex-wrap items-center gap-3">
        <h2 id="payment-title" class="text-xl font-semibold">Paiement FeexPay</h2>
        <span class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">Désactivé</span>
      </div>
      <p class="mt-3 text-gray-700">Aucune intégration FeexPay ni aucun paiement en ligne n’est configuré. Aucun bouton de paiement n’est disponible.</p>
    </section>

    <aside class="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950" role="note">
      <strong>Important :</strong> cette page ne permet ni de créer, ni d’imprimer, ni de télécharger un reçu fiscal. Ne pas confondre un reçu interne avec une facture certifiée.
    </aside>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { request } from '@/services/quality'

type Invoice = Record<string, unknown>
const invoices = ref<Invoice[]>([])
const loading = ref(false)
const checked = ref(false)
const error = ref('')

async function loadInvoices() {
  loading.value = true
  checked.value = false
  error.value = ''
  invoices.value = []
  try {
    const response = await request<{ data: Invoice[] }>('/facturation/invoices')
    if (!response || !Array.isArray(response.data)) throw new Error('Réponse API invalide.')
    invoices.value = response.data
    checked.value = true
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Connexion impossible.'
  } finally {
    loading.value = false
  }
}

onMounted(loadInvoices)
</script>
