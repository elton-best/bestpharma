<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { notify } from '@/services/notify'
import { useRoute, useRouter } from 'vue-router'
import AppModal from '@/components/AppModal.vue'

interface Person {
  id: string
  name: string
  poste: string
  matricule: string
  ordre: string
  echeance: string
  enRegle: boolean
  apte: string
  visite: string
  formation: string
  entretien: string
}
const route = useRoute()
const router = useRouter()
const sections = [
  { id: 'equipe', label: 'Équipe' },
  { id: 'dossier', label: 'Dossier individuel' },
  { id: 'ordre', label: 'Ordre section B' },
  { id: 'postes', label: 'Postes et habilitations' },
  { id: 'organigramme', label: 'Organigramme' },
  { id: 'formations', label: 'Formations' },
  { id: 'entretiens', label: 'Entretiens' },
  { id: 'conges', label: 'Congés' },
  { id: 'hygiene', label: 'Suivi médical' },
]
const tab = computed(() => sections.some(s => s.id === route.query.tab) ? String(route.query.tab) : 'equipe')
function setTab(id: string) { router.replace({ path: '/dashboard/personnel', query: { tab: id } }) }

const people = reactive<Person[]>([
  { id: 'e1', name: 'Amina Dossou', poste: 'Pharmacien titulaire', matricule: 'EMP-2026-0001', ordre: 'OB-2021-014', echeance: '31/12/2026', enRegle: true, apte: 'Apte', visite: '04/03/2026', formation: 'Réalisée', entretien: '12/02/2026' },
  { id: 'e2', name: 'Yves Koffi', poste: 'Préparateur', matricule: 'EMP-2026-0002', ordre: '', echeance: '', enRegle: false, apte: 'Apte', visite: '18/06/2026', formation: 'Planifiée', entretien: '03/03/2026' },
  { id: 'e3', name: 'Sena Agbodjan', poste: 'Caissier', matricule: 'EMP-2026-0003', ordre: '', echeance: '', enRegle: false, apte: 'À renouveler', visite: '02/11/2025', formation: 'Planifiée', entretien: '' },
])
const selected = ref('e1')
const current = computed(() => people.find(p => p.id === selected.value) || people[0])
const modal = ref(false)
const form = reactive({ ordre: '', echeance: '' })
const aptes = computed(() => people.filter(p => p.apte === 'Apte').length)
const formationsFaites = computed(() => people.filter(p => p.formation === 'Réalisée').length)

function saveOrdre() {
  if (!form.ordre.trim() || !form.echeance) {
    notify('error', 'Le numéro d’Ordre et l’échéance sont obligatoires.')
    return
  }
  current.value.ordre = form.ordre.trim()
  current.value.echeance = form.echeance
  current.value.enRegle = true
  modal.value = false
  notify('success', 'Inscription enregistrée.')
}
</script>

<template>
  <div class="page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">PERSONNEL</p>
        <h1>Dossiers du personnel</h1>
        <p class="page-subtitle">Fiches, inscription à l’Ordre, formations et suivi. La consultation d’une fiche est conservée dans le journal.</p>
      </div>
    </div>
    <section class="panel">
      <div class="panel-heading">
        <h2>{{ sections.find(s => s.id === tab)?.label }}</h2>
        <label class="section-filter">Section
          <select :value="tab" aria-label="Section" @change="setTab(($event.target as HTMLSelectElement).value)">
            <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.label }}</option>
          </select>
        </label>
      </div>

      <div v-if="tab === 'equipe'" class="table-scroll">
        <table>
          <thead><tr><th scope="col">Collaborateur</th><th scope="col">Poste</th><th scope="col">Matricule</th><th scope="col">Dossier</th></tr></thead>
          <tbody>
            <tr v-for="person in people" :key="person.id" :data-testid="`dos-fiche-${person.id}`">
              <td>{{ person.name }}</td><td>{{ person.poste }}</td><td>{{ person.matricule }}</td>
              <td><button class="button secondary small" type="button" @click="selected = person.id; setTab('dossier')">Ouvrir</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="tab === 'dossier'" :data-testid="`dos-onglet-dossier`">
        <label>Fiche<select v-model="selected"><option v-for="person in people" :key="person.id" :value="person.id">{{ person.name }}</option></select></label>
        <p><strong>{{ current.name }}</strong> · {{ current.poste }} · {{ current.matricule }}</p>
        <p>Ordre : {{ current.ordre || 'non inscrit' }} · visite {{ current.visite }} · {{ current.apte }}</p>
        <p>Dernière consultation enregistrée pour cette fiche.</p>
      </div>

      <div v-else-if="tab === 'ordre'">
        <button class="button primary" type="button" @click="form.ordre = current.ordre; form.echeance = ''; modal = true">Enregistrer une inscription</button>
        <div class="table-scroll">
          <table>
            <thead><tr><th scope="col">Collaborateur</th><th scope="col">Numéro</th><th scope="col">Échéance</th><th scope="col">Situation</th></tr></thead>
            <tbody>
              <tr v-for="person in people" :key="person.id" :data-testid="`dos-ordre-${person.id}`">
                <td>{{ person.name }}</td><td>{{ person.ordre || '—' }}</td><td>{{ person.echeance || '—' }}</td><td>{{ person.ordre ? (person.enRegle ? 'En règle' : 'À régulariser') : 'Non concerné' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="tab === 'postes'" class="table-scroll">
        <table>
          <thead><tr><th scope="col">Poste</th><th scope="col">Présence pharmaceutique</th><th scope="col">Inscription Ordre B</th></tr></thead>
          <tbody>
            <tr><td>Pharmacien titulaire</td><td>Oui</td><td>Requise</td></tr>
            <tr><td>Pharmacien adjoint</td><td>Oui</td><td>Requise</td></tr>
            <tr><td>Préparateur</td><td>Non</td><td>Non</td></tr>
            <tr><td>Caissier</td><td>Non</td><td>Non</td></tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="tab === 'organigramme'" data-testid="dos-organigramme">
        <p><strong>Titulaire</strong> — Amina Dossou</p>
        <p>Préparateur — Yves Koffi</p>
        <p>Caisse — Sena Agbodjan</p>
      </div>

      <div v-else-if="tab === 'formations'">
        <p>{{ formationsFaites }} formation réalisée sur {{ people.length }}.</p>
        <div class="table-scroll">
          <table>
            <thead><tr><th scope="col">Collaborateur</th><th scope="col">Plan</th></tr></thead>
            <tbody><tr v-for="person in people" :key="person.id"><td>{{ person.name }}</td><td>{{ person.formation }}</td></tr></tbody>
          </table>
        </div>
      </div>

      <div v-else-if="tab === 'entretiens'" class="table-scroll">
        <table>
          <thead><tr><th scope="col">Collaborateur</th><th scope="col">Dernier entretien</th></tr></thead>
          <tbody><tr v-for="person in people" :key="person.id"><td>{{ person.name }}</td><td>{{ person.entretien || 'Aucun sur l’exercice' }}</td></tr></tbody>
        </table>
      </div>

      <div v-else-if="tab === 'conges'">
        <p>Les demandes ouvertes se consultent aussi dans le pointage, section Absences.</p>
        <RouterLink class="button secondary" to="/dashboard/pointage?tab=absences">Ouvrir les absences</RouterLink>
      </div>

      <div v-else>
        <p>{{ aptes }} fiches aptes sur {{ people.length }}.</p>
        <div class="table-scroll">
          <table>
            <thead><tr><th scope="col">Collaborateur</th><th scope="col">Visite</th><th scope="col">Aptitude</th></tr></thead>
            <tbody><tr v-for="person in people" :key="person.id"><td>{{ person.name }}</td><td>{{ person.visite }}</td><td>{{ person.apte }}</td></tr></tbody>
          </table>
        </div>
      </div>
    </section>

    <AppModal v-model="modal" title="Inscription à l’Ordre">
      <form @submit.prevent="saveOrdre">
        <div class="form-body">
          <p>{{ current.name }}</p>
          <label>Numéro<input v-model="form.ordre" required maxlength="40" /></label>
          <label>Échéance<input v-model="form.echeance" type="date" required /></label>
        </div>
        <div class="modal-footer"><button class="button secondary" type="button" @click="modal = false">Annuler</button><button class="button primary" type="submit">Enregistrer</button></div>
      </form>
    </AppModal>
  </div>
</template>

<style scoped>
label { display: grid; gap: 6px; margin: 8px 0 14px; max-width: 420px; }
</style>
