<template>
  <main class="mx-auto max-w-6xl space-y-6 p-6 text-slate-900">
    <header><p class="text-sm font-semibold uppercase tracking-widest text-teal-700">Dispensation · registre interne</p><h1 class="mt-1 text-3xl font-bold">Demandes et délivrances</h1><p class="mt-2 text-sm text-slate-600">La demande n’engage pas le stock. Toute sortie exige une décision humaine et un visa explicite.</p></header>
    <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-800">{{ error }}</p>
    <p v-if="notice" role="status" class="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{{ notice }}</p>
    <section class="rounded-xl border bg-white p-5 shadow-sm">
      <h2 class="text-xl font-semibold">Enregistrer une demande / ordonnance</h2>
      <form class="mt-4 grid gap-4 md:grid-cols-2" @submit.prevent="createRequest">
        <label class="grid gap-1 text-sm">Type<select v-model="form.kind" class="rounded border p-2"><option value="prescription">Ordonnance</option><option value="non_prescription">Autre demande</option></select></label>
        <label class="grid gap-1 text-sm">Produit<select v-model="form.productId" required class="rounded border p-2"><option value="">Choisir un produit</option><option v-for="p in products" :key="p.id" :value="String(p.id)">{{ p.name }} · {{ p.code }}</option></select></label>
        <label v-if="form.kind==='prescription'" class="grid gap-1 text-sm">Référence d’ordonnance (ou date)<input v-model.trim="form.prescriptionReference" maxlength="120" class="rounded border p-2" placeholder="Référence minimale, sans document patient" /></label>
        <label v-if="form.kind==='prescription'" class="grid gap-1 text-sm">Date ordonnance<input v-model="form.prescriptionDate" type="date" class="rounded border p-2" /></label>
        <label class="grid gap-1 text-sm">Quantité demandée<input v-model.number="form.quantity" type="number" min="1" max="1000000" required class="rounded border p-2" /></label>
        <label class="grid gap-1 text-sm">Référence patient facultative<input v-model.trim="form.patientReference" maxlength="120" class="rounded border p-2" placeholder="Ne pas saisir de nom sans nécessité validée" /></label>
        <label class="grid gap-1 text-sm md:col-span-2">Instruction de délivrance recopiée (facultatif)<textarea v-model.trim="form.dosage" maxlength="500" rows="2" class="rounded border p-2" /></label>
        <div class="md:col-span-2"><button :disabled="busy" class="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-50">Enregistrer comme demande à contrôler</button></div>
      </form>
    </section>
    <section class="rounded-xl border bg-white p-5 shadow-sm">
      <h2 class="text-xl font-semibold">Demandes récentes</h2>
      <p v-if="!requests.length" class="mt-3 text-sm text-slate-600">Aucune demande enregistrée.</p>
      <div v-for="request in requests" :key="request.id" class="mt-4 rounded-lg border p-4">
        <div class="flex flex-wrap items-center justify-between gap-2"><div><strong>Demande #{{ request.id }}</strong><span class="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs">{{ request.status==='dispensed'?'Délivrée':'À contrôler' }}</span><p class="mt-1 text-sm text-slate-600">{{ request.kind==='prescription'?'Ordonnance':'Autre demande' }} · {{ request.prescription_reference || request.prescription_date || 'sans référence ordonnance' }}</p></div></div>
        <ul class="mt-2 list-inside list-disc text-sm"><li v-for="line in request.lines||[]" :key="line.id">{{ productName(line.product_id) }} · demandé : {{ line.quantity }}</li></ul>
         <button v-if="canDispense && request.status==='pending_review'" :disabled="busy" class="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" @click="dispense(request.id)">Décision humaine + visa et délivrer</button>
      </div>
    </section>
    <section class="rounded-lg bg-amber-50 p-4 text-sm text-amber-950"><strong>Important :</strong> ce parcours est un outil interne seulement. Il ne valide aucune prescription ni règle clinique automatiquement, ne déclenche ni paiement ni e-MECEF, et ne prétend pas tenir un registre réglementaire officiel.</section>
  </main>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
type Product={id:number|string;name:string;code:string;unit:string}
type RequestRow={id:number;kind:string;status:string;prescription_reference?:string|null;prescription_date?:string|null;lines?:Array<{id:number;product_id:number|string;quantity:number}>}
const products=ref<Product[]>([]),requests=ref<RequestRow[]>([]),canDispense=ref(false),busy=ref(false),error=ref(''),notice=ref('')
const form=reactive({kind:'prescription',productId:'',quantity:1,prescriptionReference:'',prescriptionDate:'',patientReference:'',dosage:''})
function headers(){return {Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${sessionStorage.getItem('bestpharma.token')||''}`,'X-Officine-ID':sessionStorage.getItem('bestpharma.officine')||''}}
async function api(path:string,body?:unknown){const res=await fetch(`/api/v1/dispensation/${path}`,{method:body?'POST':'GET',headers:headers(),...(body?{body:JSON.stringify(body)}:{})});const data=await res.json();if(!res.ok)throw Error(Object.values(data.errors||{}).flat().join(' ')||data.message||'Opération impossible.');return data}
async function load(){try{const data=await api('workspace');products.value=data.products;requests.value=data.requests;canDispense.value=!!data.can_dispense}catch(e){error.value=(e as Error).message}}
function key(){return crypto.randomUUID().replace(/-/g,'')}
function productName(id:number|string){return products.value.find(p=>String(p.id)===String(id))?.name||'Produit'}
async function createRequest(){busy.value=true;error.value='';notice.value='';try{await api('requests',{request_key:key(),kind:form.kind,...(form.prescriptionReference?{prescription_reference:form.prescriptionReference}:{}),...(form.prescriptionDate?{prescription_date:form.prescriptionDate}:{}),...(form.patientReference?{patient_reference:form.patientReference}:{}),lines:[{product_id:Number(form.productId),quantity:form.quantity,...(form.dosage?{dosage_instructions:form.dosage}:{})}]});notice.value='Demande enregistrée. Aucun stock n’a été décrémenté.';form.productId='';form.quantity=1;await load()}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
async function dispense(id:number){if(!window.confirm('Confirmez-vous, après contrôle humain, la décision de délivrer et votre visa explicite ? Cette action décrémente irréversiblement les lots FEFO.'))return;busy.value=true;error.value='';notice.value='';try{await api(`requests/${id}/dispense`,{confirmed:true,decision:'dispense',pharmacist_visa_confirmed:true,dispense_key:key()});notice.value='Délivrance enregistrée; sortie de stock tracée.';await load()}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
onMounted(load)
</script>
