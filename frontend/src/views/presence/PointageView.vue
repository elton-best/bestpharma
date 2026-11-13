<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppModal from '@/components/AppModal.vue'
import { notify } from '@/services/notify'

interface Person {
  id: string
  name: string
  matricule: string
  poste: string
  pharmacien: boolean
  actif: boolean
  ordre: string
  badge: 'actif' | 'revoque' | 'expire'
  badgeFin: string
}
interface Punch { id: string; employeId: string; type: 'arrivee' | 'depart'; at: string; source: string }
interface Correction { id: string; employeId: string; type: 'arrivee' | 'depart'; heure: string; motif: string; statut: 'en_attente' | 'validee' }
interface Absence { id: string; employeId: string; type: string; debut: string; fin: string; statut: 'demandee' | 'validee' }
interface Creneau { id: string; jour: string; debut: string; fin: string; type: string; employeId: string }

const route = useRoute()
const router = useRouter()
const sections = [
  { id: 'direct', label: 'Présence en direct' },
  { id: 'plannings', label: 'Plannings et gardes' },
  { id: 'absences', label: 'Absences et congés' },
  { id: 'corrections', label: 'Corrections d’oubli' },
  { id: 'badges', label: 'Badges' },
  { id: 'rapports', label: 'Rapports de présence' },
  { id: 'parametres', label: 'Paramètres art. 1.11' },
]
const tab = computed(() => sections.some(s => s.id === route.query.tab) ? String(route.query.tab) : 'direct')
const borne = computed(() => route.query.borne === '1')
function setTab(id: string) { router.replace({ path: '/dashboard/pointage', query: { ...route.query, tab: id } }) }

const people = reactive<Person[]>([
  { id: 'e1', name: 'Amina Dossou', matricule: 'EMP-2026-0001', poste: 'Pharmacien titulaire', pharmacien: true, actif: true, ordre: '31/12/2026', badge: 'actif', badgeFin: '12/11/2027' },
  { id: 'e2', name: 'Yves Koffi', matricule: 'EMP-2026-0002', poste: 'Préparateur', pharmacien: false, actif: true, ordre: '', badge: 'actif', badgeFin: '12/11/2027' },
  { id: 'e3', name: 'Sena Agbodjan', matricule: 'EMP-2026-0003', poste: 'Caissier', pharmacien: false, actif: true, ordre: '', badge: 'actif', badgeFin: '02/12/2026' },
  { id: 'e4', name: 'Inès Dossou', matricule: 'EMP-2026-0004', poste: 'Agent d’entretien', pharmacien: false, actif: false, ordre: '', badge: 'revoque', badgeFin: '01/06/2026' },
])
function ago(hours: number, minutes = 0) { return new Date(Date.now() - (hours * 60 + minutes) * 60000).toISOString() }
const punches = ref<Punch[]>([
  { id: 'p1', employeId: 'e1', type: 'arrivee', at: ago(5), source: 'borne' },
  { id: 'p2', employeId: 'e1', type: 'depart', at: ago(2, 30), source: 'borne' },
  { id: 'p3', employeId: 'e1', type: 'arrivee', at: ago(2), source: 'borne' },
  { id: 'p4', employeId: 'e2', type: 'arrivee', at: ago(4, 20), source: 'borne' },
  { id: 'p5', employeId: 'e3', type: 'arrivee', at: ago(26), source: 'borne' },
  { id: 'p6', employeId: 'e3', type: 'depart', at: ago(18), source: 'borne' },
])
const corrections = ref<Correction[]>([
  { id: 'c1', employeId: 'e2', type: 'arrivee', heure: '07:45', motif: 'Panne de la borne à l’ouverture', statut: 'validee' },
])
const absences = ref<Absence[]>([
  { id: 'a1', employeId: 'e3', type: 'Formation', debut: '18/11/2026', fin: '18/11/2026', statut: 'demandee' },
])
const creneaux = ref<Creneau[]>([
  { id: 'k1', jour: 'Lundi au vendredi', debut: '08:00', fin: '13:00', type: 'Ouverture', employeId: 'e1' },
  { id: 'k2', jour: 'Lundi au vendredi', debut: '13:00', fin: '20:00', type: 'Journée', employeId: 'e1' },
  { id: 'k3', jour: 'Samedi', debut: '08:00', fin: '13:00', type: 'Ouverture', employeId: 'e2' },
])
const params = reactive({ tolerance: 10, mode: 'alerte' as 'alerte' | 'blocage', pinMin: 4, validiteBadge: 12 })
const clock = ref('')
let timer = 0
function tick() { clock.value = new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
onMounted(() => { tick(); timer = window.setInterval(tick, 1000) })
onUnmounted(() => window.clearInterval(timer))

function lastPunch(id: string) {
  return punches.value.filter(p => p.employeId === id).sort((a, b) => a.at.localeCompare(b.at)).at(-1)
}
function present(person: Person) { return person.actif && lastPunch(person.id)?.type === 'arrivee' }
const actifs = computed(() => people.filter(p => p.actif))
const presents = computed(() => actifs.value.filter(present))
const pharmacienPresent = computed(() => presents.value.some(p => p.pharmacien))
const periode = computed(() => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Porto-Novo', month: 'long', year: 'numeric' }).format(new Date()))

function hoursOf(id: string) {
  const list = punches.value.filter(p => p.employeId === id).sort((a, b) => a.at.localeCompare(b.at))
  let total = 0
  let open: Date | null = null
  for (const punch of list) {
    const when = new Date(punch.at)
    if (punch.type === 'arrivee') open = when
    else if (open) { total += (when.getTime() - open.getTime()) / 3600000; open = null }
  }
  return Math.round(total * 10) / 10
}
const gapLabel = computed(() => {
  const ids = new Set(people.filter(p => p.pharmacien).map(p => p.id))
  const list = punches.value.filter(p => ids.has(p.employeId)).sort((a, b) => a.at.localeCompare(b.at))
  for (let i = 0; i < list.length - 1; i++) {
    if (list[i].type === 'depart' && list[i + 1].type === 'arrivee') return `${fmt(list[i].at)} → ${fmt(list[i + 1].at)}`
  }
  return ''
})
const lateArrivals = computed(() => punches.value.filter(p => p.type === 'arrivee' && new Date(p.at).getHours() * 60 + new Date(p.at).getMinutes() > 8 * 60 + params.tolerance))
const punctuality = computed(() => {
  const arrivals = punches.value.filter(p => p.type === 'arrivee')
  if (!arrivals.length) return null
  return Math.round((arrivals.length - lateArrivals.value.length) / arrivals.length * 100)
})

const modal = ref('')
const code = ref('')
const draft = reactive({ employeId: 'e1', type: 'arrivee' as 'arrivee' | 'depart', heure: '08:00', motif: '', debut: '', fin: '', absenceType: 'Congé payé', jour: 'Lundi', creneauDebut: '08:00', creneauFin: '13:00', creneauType: 'Ouverture', signature: '', paramMotif: '' })
const badgePerson = ref<Person | null>(null)

function personName(id: string) { return people.find(p => p.id === id)?.name || 'Collaborateur' }
function fmt(iso: string) { return new Date(iso).toLocaleTimeString('fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit' }) }
function mouvement(person: Person) {
  const last = lastPunch(person.id)
  if (!last) return '—'
  return `${last.type === 'arrivee' ? 'Arrivée' : 'Départ'} ${fmt(last.at)}`
}

function pointer(person: Person, type: 'arrivee' | 'depart', testId = '') {
  if (!person.actif || person.badge !== 'actif') { notify('error', 'Fiche inactive ou badge révoqué : le pointage est refusé.', testId); return }
  const last = lastPunch(person.id)
  if (last?.type === type) { notify('error', 'Mouvement identique au dernier : une correction motivée est nécessaire.', testId); return }
  if (type === 'depart' && last?.type !== 'arrivee') { notify('error', 'Aucun départ sans arrivée ouverte.', testId); return }
  punches.value.push({ id: `p${Date.now()}`, employeId: person.id, type, at: new Date().toISOString(), source: 'application' })
  notify('success', `${person.name} · ${type === 'arrivee' ? 'Arrivée' : 'Départ'} enregistré.`, testId)
}
function scan() {
  const person = people.find(p => p.matricule === code.value.trim() || p.id === code.value.trim())
  code.value = ''
  if (!person) { notify('error', 'Code non reconnu. Rapprochez-vous du pharmacien.', 'prs-borne-refus'); return }
  if (!person.actif || person.badge !== 'actif') { notify('error', 'Badge révoqué ou fiche inactive.', 'prs-borne-refus'); return }
  pointer(person, present(person) ? 'depart' : 'arrivee', 'prs-borne-resultat')
}
function saveCorrection() {
  if (draft.motif.trim().length < 10) { notify('error', 'Le motif doit compter au moins 10 caractères.'); return }
  if (draft.signature.trim().length < params.pinMin) { notify('error', 'Le code personnel est incomplet.'); return }
  corrections.value.unshift({ id: `c${Date.now()}`, employeId: draft.employeId, type: draft.type, heure: draft.heure, motif: draft.motif.trim(), statut: 'en_attente' })
  modal.value = ''
  notify('success', 'Correction enregistrée. Elle n’entre dans les heures qu’après validation.')
}
function validerCorrection(row: Correction) {
  row.statut = 'validee'
  notify('success', 'Correction validée.')
}
function saveAbsence() {
  if (!draft.debut || !draft.fin) { notify('error', 'Indiquez les dates.'); return }
  const person = people.find(p => p.id === draft.employeId)
  if (person?.pharmacien && !people.some(p => p.pharmacien && p.id !== person.id && p.actif)) {
    notify('error', 'Cette absence laisse une ouverture sans pharmacien. Désignez un remplaçant avant de valider.')
    return
  }
  absences.value.unshift({ id: `a${Date.now()}`, employeId: draft.employeId, type: draft.absenceType, debut: draft.debut, fin: draft.fin, statut: 'demandee' })
  modal.value = ''
  notify('success', 'Demande d’absence enregistrée.')
}
function saveCreneau() {
  const person = people.find(p => p.id === draft.employeId)
  if (!person?.pharmacien) { notify('error', 'Chaque tranche d’ouverture doit compter un pharmacien.'); return }
  creneaux.value.push({ id: `k${Date.now()}`, jour: draft.jour, debut: draft.creneauDebut, fin: draft.creneauFin, type: draft.creneauType, employeId: person.id })
  modal.value = ''
  notify('success', 'Créneau enregistré.')
}
function saveParam() {
  if (draft.paramMotif.trim().length < 10 || draft.signature.trim().length < params.pinMin) { notify('error', 'Motif et code personnel sont requis.'); return }
  modal.value = ''
  notify('success', 'Paramètre enregistré.')
}
function openBadge(person: Person) { badgePerson.value = person; modal.value = 'badge' }
function qrCells(seed: string) {
  let n = 0
  for (const ch of seed) n = (n * 33 + ch.charCodeAt(0)) % 997
  return Array.from({ length: 64 }, (_, i) => ((n >> (i % 9)) + i * 3) % 5 > 1)
}
const exportRows = computed(() => people.filter(p => p.actif).map(p => `${p.name};${p.matricule};${hoursOf(p.id)} h`))
function downloadCsv() {
  const blob = new Blob([['Collaborateur;Matricule;Heures', ...exportRows.value].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'releve-presence.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div v-if="borne" class="borne" data-testid="prs-borne-ecran">
    <header><strong>Borne de pointage</strong><span>{{ clock }} · Bénin</span></header>
    <section>
      <h1>Scannez votre badge ou saisissez votre matricule</h1>
      <input v-model="code" data-testid="prs-borne-pave" inputmode="text" autocomplete="off" placeholder="EMP-2026-0001" @keyup.enter="scan" />
      <div class="keys">
        <button v-for="key in ['1','2','3','4','5','6','7','8','9','0']" :key="key" type="button" @click="code += key">{{ key }}</button>
        <button type="button" @click="code = ''">C</button>
        <button type="button" @click="scan">OK</button>
      </div>
    </section>
    <footer>
      <span>{{ pharmacienPresent ? 'Pharmacien sur place' : 'Aucun pharmacien sur place' }} · {{ presents.length }} sur place</span>
      <RouterLink to="/dashboard/pointage">Quitter</RouterLink>
    </footer>
  </div>

  <div v-else class="page" data-testid="prs-section-direct">
    <div class="page-heading">
      <div>
        <p class="eyebrow">PRÉSENCE · ART. 1.11</p>
        <h1>Pointage et présence de l’équipe</h1>
        <p class="page-subtitle">Horodatage · Africa/Porto-Novo · {{ clock }}</p>
      </div>
      <div class="heading-actions">
        <span class="status-badge" :class="pharmacienPresent ? 'closed' : 'open'">{{ pharmacienPresent ? 'Pharmacien sur place' : 'Interruption' }}</span>
        <RouterLink class="button secondary" to="/dashboard/pointage?borne=1">Lancer la borne</RouterLink>
      </div>
    </div>
    <p v-if="!pharmacienPresent && params.mode === 'blocage'" class="alert error" data-testid="prs-parametre-effet">Aucun pharmacien sur place : la caisse et la dispensation sont bloquées.</p>
    <p v-else-if="!pharmacienPresent" class="alert" data-testid="prs-parametre-effet">Aucun pharmacien sur place : une alerte est affichée, la vente reste possible.</p>

    <section class="panel">
      <div class="panel-heading">
        <h2>{{ sections.find(s => s.id === tab)?.label }}</h2>
        <label class="section-filter">Section
          <select :value="tab" aria-label="Section" @change="setTab(($event.target as HTMLSelectElement).value)">
            <option v-for="section in sections" :key="section.id" :value="section.id">{{ section.label }}</option>
          </select>
        </label>
      </div>

      <template v-if="tab === 'direct'">
        <div class="continuity" data-tour="prs-continuite" aria-label="Continuité pharmaceutique">
          <span class="on" /><span class="off" /><span class="on" />
          <p v-if="gapLabel">Interruption enregistrée {{ gapLabel }}, puis retour du pharmacien titulaire.</p>
        </div>
        <div class="table-scroll" data-tour="prs-equipe">
          <table>
            <thead><tr><th scope="col">Collaborateur</th><th scope="col">Poste</th><th scope="col">Statut</th><th scope="col">Dernier mouvement</th><th scope="col">Actions</th></tr></thead>
            <tbody>
              <tr v-for="person in people" :key="person.id" :data-testid="`prs-ligne-${person.id}`">
                <td><strong>{{ person.name }}</strong><small class="table-subtitle">{{ person.matricule }}<template v-if="person.ordre"> · Ordre B {{ person.ordre }}</template></small></td>
                <td>{{ person.poste }}</td>
                <td :data-testid="`prs-statut-${person.id}`">{{ !person.actif ? 'Fiche inactive' : present(person) ? 'Sur place' : 'Absent' }}</td>
                <td>{{ mouvement(person) }}</td>
                <td class="heading-actions">
                  <button v-if="person.actif && person.badge === 'actif'" class="button secondary small" type="button" @click="pointer(person, present(person) ? 'depart' : 'arrivee')">{{ present(person) ? 'Départ' : 'Arrivée' }}</button>
                  <button class="button secondary small" type="button" @click="openBadge(person)">Badge</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>{{ presents.length }} présents · {{ actifs.length - presents.length }} absents · {{ people.length - actifs.length }} inactif · retards : {{ lateArrivals.length }}</p>
      </template>

      <template v-else-if="tab === 'plannings'">
        <button class="button primary" type="button" @click="modal = 'creneau'">Créer un créneau</button>
        <div class="table-scroll">
          <table>
            <thead><tr><th scope="col">Jour</th><th scope="col">Tranche</th><th scope="col">Type</th><th scope="col">Responsable</th></tr></thead>
            <tbody>
              <tr v-for="row in creneaux" :key="row.id" :data-testid="`prs-planning-creneau-${row.id}`"><td>{{ row.jour }}</td><td>{{ row.debut }}–{{ row.fin }}</td><td>{{ row.type }}</td><td>{{ personName(row.employeId) }}</td></tr>
            </tbody>
          </table>
        </div>
        <p v-if="creneaux.some(row => !people.find(p => p.id === row.employeId)?.pharmacien)" class="alert error" data-testid="prs-planning-alerte-pharmacien">Une tranche n’a pas de pharmacien.</p>
      </template>

      <template v-else-if="tab === 'absences'">
        <button class="button primary" type="button" @click="modal = 'absence'">Nouvelle demande</button>
        <p v-if="!absences.length" class="empty-state">Aucune absence ouverte.</p>
        <div v-else class="table-scroll">
          <table>
            <thead><tr><th scope="col">Collaborateur</th><th scope="col">Type</th><th scope="col">Dates</th><th scope="col">Statut</th></tr></thead>
            <tbody>
              <tr v-for="row in absences" :key="row.id" :data-testid="`prs-absence-ligne-${row.id}`"><td>{{ personName(row.employeId) }}</td><td>{{ row.type }}</td><td>{{ row.debut }} → {{ row.fin }}</td><td>{{ row.statut === 'validee' ? 'Validée' : 'Demandée' }}</td></tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="tab === 'corrections'">
        <button class="button primary" type="button" @click="modal = 'correction'">Déclarer un oubli</button>
        <p data-testid="prs-correction-compteur">{{ corrections.length }} correction(s), dont {{ corrections.filter(c => c.statut === 'en_attente').length }} en attente.</p>
        <div class="table-scroll">
          <table>
            <thead><tr><th scope="col">Collaborateur</th><th scope="col">Heure déclarée</th><th scope="col">Motif</th><th scope="col">Statut</th><th scope="col"></th></tr></thead>
            <tbody>
              <tr v-for="row in corrections" :key="row.id" :data-testid="`prs-correction-ligne-${row.id}`">
                <td>{{ personName(row.employeId) }}</td><td>{{ row.type }} {{ row.heure }}</td><td>{{ row.motif }}</td><td>{{ row.statut === 'validee' ? 'Validée' : 'En attente' }}</td>
                <td><button v-if="row.statut === 'en_attente'" class="button secondary small" type="button" @click="validerCorrection(row)">Valider</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="tab === 'badges'">
        <div class="badge-grid">
          <article v-for="person in people" :key="person.id" class="badge-card" :data-testid="`bdg-carte-${person.id}`">
            <strong>{{ person.name }}</strong>
            <p>{{ person.poste }} · {{ person.matricule }}</p>
            <p :data-testid="`bdg-etat-${person.badge}`">Badge {{ person.badge }} · échéance {{ person.badgeFin }}</p>
            <button class="button secondary small" type="button" @click="openBadge(person)">Aperçu</button>
          </article>
        </div>
      </template>

      <template v-else-if="tab === 'rapports'">
        <p data-testid="prs-rapport-periode">Période : {{ periode }}</p>
        <p data-testid="prs-rapport-synthese">Ponctualité : {{ punctuality === null ? 'aucune arrivée' : `${punctuality} % (${punches.filter(p => p.type === 'arrivee').length - lateArrivals.length} arrivées dans la tolérance de ${params.tolerance} min sur ${punches.filter(p => p.type === 'arrivee').length})` }}</p>
        <div class="bars" aria-label="Heures travaillées par collaborateur">
          <div v-for="person in actifs" :key="person.id"><span>{{ person.name }}</span><i :style="{ width: `${Math.min(100, hoursOf(person.id) * 8)}%` }" /><b>{{ hoursOf(person.id) }} h</b></div>
        </div>
        <button class="button secondary" type="button" data-testid="prs-rapport-export-csv" @click="downloadCsv">Exporter le relevé</button>
      </template>

      <template v-else>
        <label>Tolérance de retard (minutes)<input v-model.number="params.tolerance" :data-testid="'prs-parametre-tolerance'" type="number" min="0" max="60" /></label>
        <label>Présence du pharmacien
          <select v-model="params.mode" data-testid="prs-parametre-mode">
            <option value="alerte">Alerte : la vente reste possible</option>
            <option value="blocage">Blocage : la caisse refuse sans pharmacien</option>
          </select>
        </label>
        <label>Validité d’un badge (mois)<input v-model.number="params.validiteBadge" type="number" min="1" max="24" /></label>
        <button class="button primary" type="button" @click="modal = 'param'">Enregistrer avec motif</button>
        <p data-testid="prs-parametre-effet">Effet courant : {{ pharmacienPresent ? 'un pharmacien est sur place.' : params.mode === 'blocage' ? 'la caisse est bloquée.' : 'une alerte est affichée, la vente reste possible.' }}</p>
      </template>
    </section>

    <AppModal :model-value="modal === 'correction'" title="Déclarer un oubli" @update:model-value="modal = ''">
      <form @submit.prevent="saveCorrection">
        <div class="form-body">
          <label>Collaborateur<select v-model="draft.employeId"><option v-for="person in actifs" :key="person.id" :value="person.id">{{ person.name }}</option></select></label>
          <label>Mouvement<select v-model="draft.type"><option value="arrivee">Arrivée</option><option value="depart">Départ</option></select></label>
          <label>Heure déclarée<input v-model="draft.heure" type="time" required /></label>
          <label>Motif<textarea v-model="draft.motif" minlength="10" required rows="3" /></label>
          <label>Code personnel<input v-model="draft.signature" data-testid="sig-code-saisie" inputmode="numeric" autocomplete="off" required /></label>
        </div>
        <div class="modal-footer"><button class="button secondary" type="button" @click="modal = ''">Annuler</button><button class="button primary" type="submit">Enregistrer</button></div>
      </form>
    </AppModal>
    <AppModal :model-value="modal === 'absence'" title="Demande d’absence" @update:model-value="modal = ''">
      <form @submit.prevent="saveAbsence">
        <div class="form-body">
          <label>Collaborateur<select v-model="draft.employeId"><option v-for="person in actifs" :key="person.id" :value="person.id">{{ person.name }}</option></select></label>
          <label>Type<select v-model="draft.absenceType"><option>Congé payé</option><option>Maladie</option><option>Formation</option><option>Sans solde</option></select></label>
          <label>Début<input v-model="draft.debut" type="date" required /></label>
          <label>Fin<input v-model="draft.fin" type="date" required /></label>
        </div>
        <div class="modal-footer"><button class="button secondary" type="button" @click="modal = ''">Annuler</button><button class="button primary" type="submit">Enregistrer</button></div>
      </form>
    </AppModal>
    <AppModal :model-value="modal === 'creneau'" title="Créer un créneau" @update:model-value="modal = ''">
      <form @submit.prevent="saveCreneau">
        <div class="form-body">
          <label>Jour<input v-model="draft.jour" required /></label>
          <label>Début<input v-model="draft.creneauDebut" type="time" required /></label>
          <label>Fin<input v-model="draft.creneauFin" type="time" required /></label>
          <label>Responsable<select v-model="draft.employeId"><option v-for="person in actifs" :key="person.id" :value="person.id">{{ person.name }}</option></select></label>
        </div>
        <div class="modal-footer"><button class="button secondary" type="button" @click="modal = ''">Annuler</button><button class="button primary" type="submit">Enregistrer</button></div>
      </form>
    </AppModal>
    <AppModal :model-value="modal === 'param'" title="Modifier un paramètre" @update:model-value="modal = ''">
      <form @submit.prevent="saveParam">
        <div class="form-body">
          <label>Motif<textarea v-model="draft.paramMotif" minlength="10" required rows="3" /></label>
          <label>Code personnel<input v-model="draft.signature" inputmode="numeric" autocomplete="off" required /></label>
        </div>
        <div class="modal-footer"><button class="button secondary" type="button" @click="modal = ''">Annuler</button><button class="button primary" type="submit">Enregistrer</button></div>
      </form>
    </AppModal>
    <AppModal :model-value="modal === 'badge'" title="Badge professionnel" @update:model-value="modal = ''">
      <div v-if="badgePerson" class="form-body" data-tour="bdg-apercu">
        <p><strong>{{ badgePerson.name }}</strong> · {{ badgePerson.poste }}</p>
        <p>{{ badgePerson.matricule }} · échéance {{ badgePerson.badgeFin }}</p>
        <svg viewBox="0 0 80 80" width="120" height="120" role="img" aria-label="Code du badge généré localement">
          <rect v-for="(on, index) in qrCells(badgePerson.matricule)" :key="index" :x="(index % 8) * 10" :y="Math.floor(index / 8) * 10" width="10" height="10" :fill="on ? '#0f3b27' : '#fff'" />
        </svg>
        <p>Pharmacie des Palmiers · format CR80 85,6 × 54 mm · planche A4 à l’impression de l’officine.</p>
      </div>
    </AppModal>
  </div>
</template>

<style scoped>
.continuity { display: grid; grid-template-columns: 1.4fr .35fr 1.4fr; gap: 4px; margin-bottom: 12px; }
.continuity span { display: block; height: 14px; border-radius: 7px; }
.continuity .on { background: #146853; }
.continuity .off { background: #ff7036; }
.continuity p { grid-column: 1 / -1; margin: 6px 0 0; }
.badge-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.badge-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
.bars { display: grid; gap: 8px; margin: 12px 0; }
.bars div { display: grid; grid-template-columns: 140px 1fr 48px; gap: 8px; align-items: center; }
.bars i { display: block; height: 10px; background: #146853; border-radius: 6px; }
.borne { min-height: 100vh; background: #0f3b27; color: #fff; display: grid; grid-template-rows: auto 1fr auto; padding: 24px; }
.borne header, .borne footer { display: flex; justify-content: space-between; align-items: center; }
.borne section { max-width: 420px; margin: auto; text-align: center; }
.borne input { width: 100%; min-height: 52px; font-size: 22px; text-align: center; border-radius: 10px; border: 0; }
.keys { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
.keys button { min-height: 52px; font-size: 20px; border-radius: 10px; border: 0; }
.borne a { color: #fff; }
label { display: grid; gap: 6px; margin: 10px 0; }
</style>
