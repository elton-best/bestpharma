<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { request } from '@/services/quality'
type RecordRow={id:number;zone:string;temperature:number;measured_at:string;conformity_status:string;notes?:string|null}
const rows=ref<RecordRow[]>([]),loading=ref(false),error=ref(''),notice=ref(''),allowed=ref(true),busy=ref(false)
const zones=[['refrigeree_2_8','Enceinte réfrigérée'],['magasin_reserve','Magasin / réserve'],['hall_dispensation','Hall de dispensation']]
const form=ref({zone:'refrigeree_2_8',temperature:'',measured_at:'',notes:''})
async function reload(){loading.value=true;error.value='';try{const result=await request<{data:RecordRow[]}>('/locauxequipements/temperatures');rows.value=result.data;allowed.value=true}catch(e){allowed.value=false;error.value=(e as Error).message}finally{loading.value=false}}
async function save(){busy.value=true;error.value='';notice.value='';try{const result=await request<{message:string}>('/locauxequipements/temperatures','POST',{...form.value,temperature:Number(form.value.temperature)});notice.value=result.message;form.value.temperature='';form.value.notes='';await reload()}catch(e){error.value=(e as Error).message}finally{busy.value=false}}
async function upload(event:Event){const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;busy.value=true;error.value='';try{const body=new FormData();body.append('file',file);body.append('zone',form.value.zone);const token=sessionStorage.getItem('bestpharma.token'),tenant=sessionStorage.getItem('bestpharma.officine');const response=await fetch('/api/v1/locauxequipements/temperatures/import',{method:'POST',headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{ }),...(tenant?{'X-Officine-ID':tenant}:{})},body});const result=await response.json();if(!response.ok)throw Error(result.message||'Import impossible.');notice.value=`${result.imported_count} relevé(s) importé(s) · ${result.rejected_count} ligne(s) rejetée(s).`;if(result.rejected_rows?.length)notice.value+=' Lignes invalides : '+result.rejected_rows.map((r:{line:number})=>r.line).join(', ');await reload()}catch(e){error.value=(e as Error).message}finally{busy.value=false;(event.target as HTMLInputElement).value=''}}
onMounted(reload)
</script>
<template>
  <main class="page erp-page">
    <div class="page-heading compact">
      <div>
        <p class="eyebrow">
          LOCAUX & ÉQUIPEMENTS · CONSERVATION
        </p><h1>Températures & chaîne du froid</h1><p class="page-subtitle">
          Relevés horodatés et import des mesures présentes dans un CSV. Seuils à configurer après validation.
        </p>
      </div><button
        class="button secondary"
        :disabled="loading||busy"
        @click="reload"
      >
        Actualiser
      </button>
    </div>
    <p
      class="alert"
      role="note"
    >
      Aucun seuil réglementaire n’est présumé. Un écart éventuel ne vaut ni mise en quarantaine, ni analyse de cause effectuée.
    </p><p
      v-if="loading"
      role="status"
    >
      Chargement des relevés…
    </p><p
      v-if="error"
      class="alert error"
      role="alert"
    >
      {{ error }} <span v-if="!allowed">Vérifiez l’accès à l’officine et les permissions.</span>
    </p><p
      v-if="notice"
      class="alert success"
      role="status"
    >
      {{ notice }}
    </p>
    <section
      v-if="allowed"
      class="panel form-body"
    >
      <h2>Saisir un relevé</h2><form
        class="form-grid"
        @submit.prevent="save"
      >
        <label>Zone<select v-model="form.zone"><option
          v-for="z in zones"
          :key="z[0]"
          :value="z[0]"
        >{{ z[1] }}</option></select></label><label>Température (°C)<input
          v-model="form.temperature"
          type="number"
          step="0.01"
          required
        ></label><label>Date et heure mesurées<input
          v-model="form.measured_at"
          type="datetime-local"
          required
        ></label><label>Notes (facultatif)<input
          v-model="form.notes"
          maxlength="2000"
        ></label><button
          class="button primary"
          :disabled="busy||loading"
        >
          Enregistrer le relevé
        </button>
      </form><hr><h2>Importer un CSV</h2><p>Colonnes acceptées : Date + Heure (ou Date/Heure), Température; minimum, maximum et humidité reconnus si fournis. Les lignes invalides sont rapportées et ne sont pas complétées automatiquement.</p><label>Fichier CSV<input
        type="file"
        accept=".csv,text/csv"
        :disabled="busy"
        @change="upload"
      ></label>
    </section>
    <section class="panel">
      <h2>Historique</h2><p
        v-if="!loading&&!error&&!rows.length"
        class="empty-state"
      >
        Aucun relevé enregistré pour cette officine.
      </p><div
        v-else-if="rows.length"
        class="table-scroll"
      >
        <table>
          <thead><tr><th>Date/heure mesurée</th><th>Zone</th><th>°C</th><th>Évaluation</th><th>Notes</th></tr></thead><tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
            >
              <td>{{ new Date(row.measured_at).toLocaleString('fr-FR',{timeZone:'Africa/Porto-Novo'}) }}</td><td>{{ zones.find(z=>z[0]===row.zone)?.[1]||row.zone }}</td><td>{{ row.temperature }}</td><td>{{ row.conformity_status }}</td><td>{{ row.notes||'—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
