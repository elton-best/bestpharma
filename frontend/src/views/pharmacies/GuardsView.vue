<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import { demoMode } from '@/services/quality'
import { currentOffice, supportState } from '@/services/supportDemo'
import {
  deleteGuard, downloadText, guardsCsv, guardsICal, inputToIso, isoToInput, loadGuards, officeDay,
  officeMonth, resetGuards, saveGuard, type Guard, type GuardDraft, type GuardPeriod,
} from '@/services/pharmacyGuards'

const route = useRoute(), router = useRouter()
const rows = ref<Guard[]>([])
const canWrite = ref(false)
const loading = ref(false)
const error = ref('')
const feedback = ref('')
const busy = ref(false)
const now = ref(Date.now())
const search = ref(String(route.query.q || ''))
const period = ref<GuardPeriod>(['all', 'current', 'upcoming', 'past'].includes(String(route.query.period)) ? String(route.query.period) as GuardPeriod : 'all')
const month = ref(/^\d{4}-\d{2}$/.test(String(route.query.month)) ? String(route.query.month) : officeMonth())
const selectedDay = ref('')
const modal = ref(false), deleteModal = ref(false), resetModal = ref(false), detail = ref<Guard | null>(null)
const editing = ref<number | undefined>()
const deleteTarget = ref<Guard | null>(null)
const modalError = ref(''), deleteError = ref(''), resetError = ref('')
const draft = reactive<GuardDraft>(blankDraft())

function pad(value: number) { return String(value).padStart(2, '0') }
function defaultInput(offset: number, hour: number) {
  const day = officeDay(new Date(Date.parse(`${officeDay(new Date())}T12:00:00Z`) + offset * 86400000))
  return `${day}T${pad(hour)}:00`
}
function blankDraft(): GuardDraft {
  const slot = freeDefaultSlot()
  return { pharmacy_name: currentOffice.value.name, phone: '', address: '', starts_at: slot.start, ends_at: slot.end, reason: '' }
}
/** Start on the first free day rather than on an example that would overlap immediately. */
function freeDefaultSlot() {
  for (let offset = 1; offset <= 14; offset++) {
    const start = defaultInput(offset, 8), end = defaultInput(offset, 20)
    const from = inputToIso(start), to = inputToIso(end)
    if (!from || !to) continue
    const overlaps = rows.value.some(row => Date.parse(row.starts_at) < Date.parse(to) && Date.parse(row.ends_at) > Date.parse(from))
    if (!overlaps) return { start, end }
  }
  return { start: defaultInput(1, 8), end: defaultInput(1, 20) }
}
function message(cause: unknown) { return cause instanceof Error ? cause.message : 'Opération impossible. Réessayez.' }
const dateTime = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Porto-Novo' }).format(new Date(value))
const monthLabel = computed(() => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month.value}-01T12:00:00Z`)))
const today = computed(() => officeDay(new Date(now.value)))
const detailOpen = computed({ get: () => !!detail.value, set: value => { if (!value) detail.value = null } })

function statusKey(row: Guard): 'current' | 'upcoming' | 'past' {
  const start = Date.parse(row.starts_at), end = Date.parse(row.ends_at)
  if (start <= now.value && end > now.value) return 'current'
  return start > now.value ? 'upcoming' : 'past'
}
const statusLabel = (row: Guard) => ({ current: 'En cours', upcoming: 'À venir', past: 'Passée' })[statusKey(row)]
function inPeriod(row: Guard, value: GuardPeriod) {
  if (value === 'all') return true
  const key = statusKey(row)
  return value === key
}
const searchMatched = computed(() => {
  const text = search.value.trim().toLowerCase()
  return rows.value.filter(row => !text || `${row.pharmacy_name} ${row.address || ''}`.toLowerCase().includes(text))
})
const filtered = computed(() => searchMatched.value.filter(row => inPeriod(row, period.value)))
const counts = computed(() => ({
  all: rows.value.length,
  current: rows.value.filter(row => statusKey(row) === 'current').length,
  upcoming: rows.value.filter(row => statusKey(row) === 'upcoming').length,
  past: rows.value.filter(row => statusKey(row) === 'past').length,
}))
const selectedDayRows = computed(() => selectedDay.value ? searchMatched.value.filter(row => officeDay(row.starts_at) <= selectedDay.value && officeDay(row.ends_at) >= selectedDay.value) : [])

const monthCells = computed(() => {
  const [year, monthNumber] = month.value.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1, 12))
  const offset = (first.getUTCDay() + 6) % 7
  const total = new Date(Date.UTC(year, monthNumber, 0, 12)).getUTCDate()
  const cells: Array<{ key: string; day: number | null; date: string | null; guards: Guard[] }> = []
  for (let index = 0; index < offset; index++) cells.push({ key: `blank-${index}`, day: null, date: null, guards: [] })
  for (let day = 1; day <= total; day++) {
    const date = `${year}-${pad(monthNumber)}-${pad(day)}`
    cells.push({ key: date, day, date, guards: searchMatched.value.filter(row => officeDay(row.starts_at) <= date && officeDay(row.ends_at) >= date) })
  }
  return cells
})

function syncUrl() {
  void router.replace({ query: { ...route.query, q: search.value.trim() || undefined, period: period.value === 'all' ? undefined : period.value, month: month.value } })
}
function shiftMonth(delta: number) {
  const [year, monthNumber] = month.value.split('-').map(Number)
  month.value = new Date(Date.UTC(year, monthNumber - 1 + delta, 1, 12)).toISOString().slice(0, 7)
  selectedDay.value = ''
  syncUrl()
}
function goToday() {
  month.value = officeMonth(new Date(now.value))
  selectedDay.value = today.value
  syncUrl()
}
function choosePeriod(value: GuardPeriod) { period.value = value; syncUrl() }
function chooseDay(date: string) { selectedDay.value = selectedDay.value === date ? '' : date }

async function load() {
  loading.value = true; error.value = ''
  try {
    const result = await loadGuards()
    rows.value = result.data
    canWrite.value = result.can_write
    now.value = Date.now()
  } catch (cause) {
    rows.value = []; canWrite.value = false
    error.value = message(cause)
  } finally { loading.value = false }
}
watch(() => supportState.selectedOffice, () => {
  modal.value = false; detail.value = null; deleteModal.value = false; resetModal.value = false
  feedback.value = ''; search.value = ''; period.value = 'all'; month.value = officeMonth(); selectedDay.value = ''
  void load()
}, { immediate: true })

function openCreate() {
  editing.value = undefined
  Object.assign(draft, blankDraft())
  modalError.value = ''; modal.value = true
}
function openEdit(row: Guard) {
  editing.value = row.id
  Object.assign(draft, {
    pharmacy_name: row.pharmacy_name, phone: row.phone || '', address: row.address || '',
    starts_at: isoToInput(row.starts_at), ends_at: isoToInput(row.ends_at), reason: row.reason || '',
  })
  modalError.value = ''; detail.value = null; modal.value = true
}
async function save() {
  if (busy.value) return
  busy.value = true; modalError.value = ''
  try {
    await saveGuard({ ...draft }, editing.value)
    const edited = editing.value !== undefined
    modal.value = false
    feedback.value = edited ? 'Garde modifiée et enregistrée.' : 'Garde déclarée et enregistrée.'
    await load()
  } catch (cause) { modalError.value = message(cause) }
  finally { busy.value = false }
}
function remove(row: Guard) {
  deleteTarget.value = row; deleteError.value = ''; deleteModal.value = true; detail.value = null
}
async function confirmRemove() {
  if (!deleteTarget.value || busy.value) return
  busy.value = true; deleteError.value = ''
  try {
    await deleteGuard(deleteTarget.value.id)
    deleteModal.value = false; deleteTarget.value = null
    feedback.value = 'Garde supprimée.'
    await load()
  } catch (cause) { deleteError.value = message(cause) }
  finally { busy.value = false }
}
async function resetExamples() {
  if (busy.value) return
  busy.value = true; resetError.value = ''
  try {
    resetGuards()
    resetModal.value = false
    feedback.value = 'Exemples de gardes restaurés pour cette officine.'
    await load()
  } catch (cause) { resetError.value = message(cause) }
  finally { busy.value = false }
}
function exportCsv() {
  try {
    downloadText(guardsCsv(filtered.value), `gardes-${currentOffice.value.code}-${today.value}.csv`, 'text/csv;charset=utf-8')
    feedback.value = `${filtered.value.length} garde(s) exportée(s) en CSV.`
  } catch { error.value = 'Le navigateur a refusé le téléchargement CSV. Réessayez.' }
}
function exportIcal() {
  try {
    downloadText(guardsICal(filtered.value, currentOffice.value.name), `gardes-${currentOffice.value.code}-${today.value}.ics`, 'text/calendar;charset=utf-8')
    feedback.value = `${filtered.value.length} garde(s) exportée(s) au format iCal.`
  } catch { error.value = 'Le navigateur a refusé le téléchargement iCal. Réessayez.' }
}
</script>

<template>
  <main class="page erp-page guards-page" data-testid="guards-page">
    <header class="page-heading compact" data-tour="guards-heading">
      <div>
        <p class="eyebrow">PILOTAGE · OFFICINE</p>
        <h1>Pharmacies de garde</h1>
        <p class="page-subtitle">{{ currentOffice.name }} · {{ currentOffice.city }} · planning manuel, non officiel.</p>
      </div>
      <div class="guards-heading-actions">
        <button v-if="demoMode" class="text-link" data-testid="guards-reset" @click="resetError = ''; resetModal = true">Réinitialiser les exemples</button>
        <button v-if="canWrite" class="button primary" data-testid="guards-create" @click="openCreate"><AppIcon name="plus" :size="16" />Déclarer une garde</button>
      </div>
    </header>

    <p class="guards-notice" data-testid="guards-notice"><AppIcon name="info" :size="17" /><span>Ce planning est saisi par l’officine. Il ne remplace pas le calendrier officiel de garde et n’est pas transmis à une autorité.</span></p>
    <p v-if="feedback" role="status" class="guards-feedback" data-testid="guards-feedback">{{ feedback }}</p>

    <form class="guards-filters officine-panel" data-tour="guards-filters" @submit.prevent="syncUrl">
      <label>Rechercher<input v-model="search" data-testid="guards-search" type="search" placeholder="Nom ou adresse de la pharmacie" @change="syncUrl" /></label>
      <label>Période<select v-model="period" data-testid="guards-period" @change="syncUrl"><option value="all">Toutes les périodes</option><option value="current">En cours</option><option value="upcoming">À venir</option><option value="past">Passées</option></select></label>
      <div class="guards-export">
        <button class="button secondary" type="button" data-testid="guards-export-csv" :disabled="!filtered.length" @click="exportCsv"><AppIcon name="documents" :size="15" />CSV de la vue</button>
        <button class="button secondary" type="button" data-testid="guards-export-ical" :disabled="!filtered.length" @click="exportIcal"><AppIcon name="calendar" :size="15" />Calendrier iCal</button>
      </div>
    </form>

    <p v-if="error" role="alert" class="guards-error" data-testid="guards-error">{{ error }} <button class="button secondary" data-testid="guards-retry" @click="load">Réessayer</button></p>
    <p v-else-if="loading" role="status" class="guards-loading" data-testid="guards-loading">Chargement des gardes de l’officine…</p>
    <template v-else>
      <p v-if="!canWrite" class="guards-readonly" data-testid="guards-readonly"><AppIcon name="info" :size="16" />Consultation seule : votre rôle ne permet pas de modifier les gardes. Un administrateur d’officine peut vous accorder le droit « gardes.write ».</p>

      <section class="guards-kpis" aria-label="Répartition des gardes">
        <button v-for="item in [{ key: 'all', label: 'Toutes', value: counts.all }, { key: 'current', label: 'En cours', value: counts.current }, { key: 'upcoming', label: 'À venir', value: counts.upcoming }, { key: 'past', label: 'Passées', value: counts.past }]" :key="item.key" :class="{ active: period === item.key }" @click="choosePeriod(item.key as GuardPeriod)"><strong>{{ item.value }}</strong><span>{{ item.label }}</span></button>
      </section>

      <section class="officine-panel guards-list" data-testid="guards-table" data-tour="guards-planning" aria-labelledby="guards-list-title">
        <header><div><p class="eyebrow">DÉCLARATIONS MANUELLES</p><h2 id="guards-list-title">{{ filtered.length }} garde(s) dans cette vue</h2></div><span class="guards-source">Heure de Porto-Novo</span></header>
        <div v-if="filtered.length" class="table-scroll">
          <table>
            <caption class="sr-only">Gardes déclarées par l’officine</caption>
            <thead><tr><th scope="col">Pharmacie</th><th scope="col">Début</th><th scope="col">Fin</th><th scope="col">État</th><th scope="col">Contact</th><th v-if="canWrite" scope="col">Actions</th></tr></thead>
            <tbody>
              <tr v-for="row in filtered" :key="row.id">
                <td data-label="Pharmacie"><button class="table-title" data-testid="guards-detail" @click="detail = row">{{ row.pharmacy_name }}</button><small>{{ row.address || 'Adresse non renseignée' }}</small></td>
                <td data-label="Début">{{ dateTime(row.starts_at) }}</td><td data-label="Fin">{{ dateTime(row.ends_at) }}</td>
                <td data-label="État"><span class="guard-status" :class="statusKey(row)">{{ statusLabel(row) }}</span></td>
                <td data-label="Contact"><a v-if="!demoMode && row.phone" :href="`tel:${row.phone}`">{{ row.phone }}</a><span v-else>{{ row.phone || 'Non communiqué' }}</span></td>
                <td v-if="canWrite" data-label="Actions"><div class="row-actions"><button class="button secondary" @click="openEdit(row)">Modifier</button><button class="button secondary" @click="remove(row)">Supprimer</button></div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="officine-empty">Aucune garde ne correspond à cette recherche ou à cette période.</p>
      </section>

      <section class="officine-panel guards-calendar" data-testid="guards-calendar" aria-labelledby="guards-calendar-title">
        <header>
          <div><p class="eyebrow">VUE MENSUELLE</p><h2 id="guards-calendar-title">{{ monthLabel }}</h2></div>
          <div class="calendar-nav"><button class="icon-button" aria-label="Mois précédent" @click="shiftMonth(-1)"><AppIcon name="chevron" :size="16" style="transform: rotate(180deg)" /></button><button class="button secondary" @click="goToday">Ce mois</button><button class="icon-button" aria-label="Mois suivant" @click="shiftMonth(1)"><AppIcon name="chevron" :size="16" /></button></div>
        </header>
        <div class="calendar-weekdays" aria-hidden="true"><span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span><span>Ven</span><span>Sam</span><span>Dim</span></div>
        <div class="calendar-grid" role="grid" :aria-label="`Calendrier des gardes — ${monthLabel}`">
          <div v-for="cell in monthCells" :key="cell.key" class="calendar-day" :class="{ empty: !cell.day, today: cell.date === today, selected: cell.date === selectedDay }" role="gridcell">
            <template v-if="cell.day && cell.date">
              <button class="calendar-number" :aria-label="`Voir les gardes du ${cell.date}`" @click="chooseDay(cell.date)">{{ cell.day }}</button>
              <button v-for="guard in cell.guards.slice(0, 2)" :key="guard.id" class="calendar-guard" :title="guard.pharmacy_name" :aria-label="guard.pharmacy_name" @click="detail = guard">{{ guard.pharmacy_name }}</button>
              <button v-if="cell.guards.length > 2" class="calendar-more" @click="chooseDay(cell.date)">+{{ cell.guards.length - 2 }}</button>
            </template>
          </div>
        </div>
        <div v-if="selectedDay" class="calendar-day-detail" data-testid="guards-day-detail"><h3>Gardes du {{ selectedDay }}</h3><ul><li v-for="row in selectedDayRows" :key="row.id"><button class="text-link" @click="detail = row">{{ row.pharmacy_name }}</button><span>{{ dateTime(row.starts_at) }} → {{ dateTime(row.ends_at) }}</span></li></ul><p v-if="!selectedDayRows.length">Aucune garde déclarée ce jour.</p></div>
      </section>
    </template>

    <AppModal :model-value="detailOpen" :title="detail?.pharmacy_name ?? 'Garde'" eyebrow="DÉCLARATION MANUELLE · NON OFFICIELLE" @update:model-value="value => { if (!value) detail = null }">
      <div v-if="detail" class="form-body guards-detail">
        <p><span class="guard-status" :class="statusKey(detail)">{{ statusLabel(detail) }}</span></p>
        <dl><div><dt>Début</dt><dd>{{ dateTime(detail.starts_at) }}</dd></div><div><dt>Fin</dt><dd>{{ dateTime(detail.ends_at) }}</dd></div><div><dt>Adresse</dt><dd>{{ detail.address || 'Non renseignée' }}</dd></div><div><dt>Téléphone</dt><dd>{{ detail.phone || 'Non communiqué' }}</dd></div><div><dt>Motif / source</dt><dd>{{ detail.reason || 'Non renseigné' }}</dd></div></dl>
        <p class="guards-detail-note">Source manuelle de l’officine. Aucune confirmation d’une autorité ni publication sur un calendrier officiel.</p>
      </div>
      <template #footer><button class="button secondary" @click="detail = null">Fermer</button><button v-if="canWrite && detail" class="button secondary" @click="openEdit(detail)">Modifier</button><button v-if="canWrite && detail" class="button secondary" @click="remove(detail)">Supprimer</button></template>
    </AppModal>

    <AppModal v-model="modal" :title="editing !== undefined ? 'Modifier une garde' : 'Déclarer une garde'" eyebrow="SOURCE MANUELLE · NON OFFICIELLE" :busy="busy">
      <form class="guards-form" data-testid="guards-form" @submit.prevent="save">
        <p v-if="modalError" role="alert" class="guards-form-error">{{ modalError }}</p>
        <div class="form-grid">
          <label>Nom de la pharmacie<input v-model.trim="draft.pharmacy_name" required maxlength="180" /></label>
          <label>Téléphone<input v-model.trim="draft.phone" type="tel" maxlength="40" placeholder="Facultatif" /></label>
          <label class="wide">Adresse<input v-model.trim="draft.address" maxlength="255" placeholder="Facultatif" /></label>
          <label>Début (Porto-Novo)<input v-model="draft.starts_at" type="datetime-local" required /></label>
          <label>Fin (Porto-Novo)<input v-model="draft.ends_at" type="datetime-local" required /></label>
          <label class="wide">Motif / source de la déclaration<textarea v-model.trim="draft.reason" maxlength="500" rows="2" placeholder="Facultatif" /></label>
        </div>
        <p class="guards-form-note">Une garde ne peut pas chevaucher une autre garde de cette officine. Le serveur vérifie à nouveau ces règles en mode API.</p>
        <footer class="guards-form-actions"><button class="button secondary" type="button" :disabled="busy" @click="modal = false">Annuler</button><button class="button primary" type="submit" data-testid="guards-submit" :disabled="busy">{{ busy ? 'Enregistrement…' : 'Enregistrer' }}</button></footer>
      </form>
    </AppModal>

    <AppModal v-model="deleteModal" title="Supprimer cette garde ?" size="small" :busy="busy">
      <p v-if="deleteError" role="alert" class="guards-form-error">{{ deleteError }}</p>
      <p>La déclaration de <strong>{{ deleteTarget?.pharmacy_name }}</strong> sera retirée du planning de {{ currentOffice.name }}.</p>
      <template #footer><button class="button secondary" :disabled="busy" @click="deleteModal = false">Annuler</button><button class="button primary" data-testid="guards-delete-confirm" :disabled="busy" @click="confirmRemove">{{ busy ? 'Suppression…' : 'Confirmer la suppression' }}</button></template>
    </AppModal>

    <AppModal v-model="resetModal" title="Restaurer les exemples de gardes ?" size="small" :busy="busy">
      <p v-if="resetError" role="alert" class="guards-form-error">{{ resetError }}</p>
      <p>Les gardes de démonstration de <strong>{{ currentOffice.name }}</strong> retrouveront leur planning d’origine. Vos modifications locales seront supprimées ; les autres officines et les données réelles ne sont pas concernées.</p>
      <template #footer><button class="button secondary" :disabled="busy" @click="resetModal = false">Annuler</button><button class="button primary" data-testid="guards-reset-confirm" :disabled="busy" @click="resetExamples">Restaurer</button></template>
    </AppModal>
  </main>
</template>

<style scoped>
.guards-page { max-width: 1600px; padding: 28px; color: #0f3b27; }
.guards-page .page-heading { align-items: center; gap: 20px; margin-bottom: 18px; }
.guards-page h1 { font-size: 32px; line-height: 1.2; margin: 5px 0 8px; }
.guards-heading-actions, .guards-export, .guards-filters, .guards-form-actions, .calendar-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.guards-notice { display: flex; align-items: flex-start; gap: 9px; padding: 13px 16px; margin: 0 0 18px; border: 1px solid #cff1d2; border-radius: 10px; background: #edf7ee; color: #475c50; font-size: 13px; line-height: 1.6; }
.guards-notice svg { flex-shrink: 0; margin-top: 2px; }
.guards-feedback { padding: 11px 15px; border-radius: 8px; background: #e3f4e6; color: #0f3b27; font-size: 13px; }
.guards-filters { align-items: end; padding: 16px; margin-bottom: 20px; }
.guards-filters label { display: grid; gap: 6px; min-width: 190px; font-size: 12px; font-weight: 700; }
.guards-filters input, .guards-filters select { min-height: 42px; max-width: 100%; padding: 8px 11px; border: 1px solid #bcd8c1; border-radius: 7px; background: #fff; color: #0f3b27; }
.guards-export { margin-left: auto; }
.guards-error { padding: 14px 16px; border: 1px solid #f2bda5; border-radius: 10px; background: #fff1e9; color: #792e10; line-height: 1.7; }
.guards-error .button { margin-left: 10px; }
.guards-loading { padding: 30px; text-align: center; color: #475c50; }
.guards-readonly { display: flex; gap: 8px; padding: 12px 15px; margin-bottom: 18px; border: 1px solid #cff1d2; border-radius: 9px; background: #f0f8f3; color: #475c50; font-size: 13px; }
.guards-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
.guards-kpis button { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 16px 18px; border: 1px solid #dbe9dd; border-radius: 14px; background: #fff; color: #0f3b27; text-align: left; }
.guards-kpis button:hover, .guards-kpis button.active { border-color: #73a781; background: #edf7ee; }
.guards-kpis strong { font-family: var(--font-display); font-size: 28px; line-height: 1.2; }
.guards-kpis span { color: #475c50; font-size: 12px; font-weight: 700; }
.guards-list, .guards-calendar { margin-bottom: 22px; }
.guards-list > header, .guards-calendar > header { margin-bottom: 14px; }
.guards-source { color: #475c50; font-size: 12px; }
.guards-list table { min-width: 860px; }
.guards-list td { font-size: 13px; }
.guards-list td small { display: block; margin-top: 4px; color: #475c50; font-size: 12px; }
.guards-list .table-title { padding: 0; border: 0; background: transparent; color: #0f3b27; font-size: 13px; font-weight: 700; text-align: left; }
.guards-list .table-title:hover { text-decoration: underline; }
.guard-status { display: inline-flex; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.guard-status.current { background: #e3f4e6; color: #0f3b27; }
.guard-status.upcoming { background: #edf3fa; color: #315b7a; }
.guard-status.past { background: #f0f1ee; color: #5b665e; }
.row-actions { display: flex; flex-wrap: nowrap; gap: 6px; }
.row-actions .button { min-height: 32px; padding: 6px 10px; font-size: 12px; white-space: nowrap; }
.calendar-nav { margin-left: auto; }
.calendar-nav .button { min-height: 36px; padding: 7px 10px; }
.calendar-weekdays, .calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.calendar-weekdays span { padding: 8px 4px; color: #475c50; font-size: 11px; font-weight: 700; text-align: center; }
.calendar-grid { border-top: 1px solid #dbe9dd; border-left: 1px solid #dbe9dd; border-radius: 0 0 8px 8px; overflow: hidden; }
.calendar-day { min-height: 92px; min-width: 0; padding: 5px; border-right: 1px solid #dbe9dd; border-bottom: 1px solid #dbe9dd; background: #fff; }
.calendar-day.empty { background: #f7f9f7; }
.calendar-day.today { background: #f0f8f3; }
.calendar-day.selected { box-shadow: inset 0 0 0 2px #367d50; }
.calendar-number { display: block; width: 24px; height: 24px; margin: 0 0 3px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: #0f3b27; font-size: 12px; font-weight: 700; }
.calendar-day.today .calendar-number { background: #0f3b27; color: #fff; }
.calendar-guard, .calendar-more { display: block; width: 100%; overflow: hidden; margin: 2px 0; padding: 3px 5px; border: 0; border-radius: 4px; background: #e3f4e6; color: #0f3b27; font-size: 10px; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.calendar-guard:hover, .calendar-more:hover { background: #cff1d2; }
.calendar-more { color: #475c50; }
.calendar-day-detail { margin-top: 14px; padding: 14px 16px; border: 1px solid #dbe9dd; border-radius: 9px; background: #f7f9f7; }
.calendar-day-detail h3 { margin: 0 0 8px; font-size: 15px; }
.calendar-day-detail ul { display: grid; gap: 7px; margin: 0; padding: 0; list-style: none; }
.calendar-day-detail li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 12px; }
.calendar-day-detail .text-link { padding: 0; border: 0; background: transparent; font-weight: 700; }
.guards-detail dl { display: grid; gap: 10px; margin: 0; }
.guards-detail dl > div { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 12px; padding-bottom: 8px; border-bottom: 1px solid #e3eee5; }
.guards-detail dt { color: #475c50; font-size: 12px; font-weight: 700; }
.guards-detail dd { margin: 0; font-size: 13px; overflow-wrap: anywhere; }
.guards-detail-note, .guards-form-note { color: #475c50; font-size: 12px; line-height: 1.7; }
.guards-form { display: grid; gap: 15px; padding: 22px 26px; }
.guards-form .form-grid { gap: 14px; }
.guards-form label { display: grid; gap: 6px; font-size: 12px; font-weight: 700; }
.guards-form input, .guards-form textarea { min-height: 42px; padding: 8px 11px; border: 1px solid #bcd8c1; border-radius: 7px; background: #fff; color: #0f3b27; }
.guards-form textarea { min-height: 62px; }
.guards-form .wide { grid-column: 1 / -1; }
.guards-form-actions { justify-content: flex-end; }
.guards-form-error { margin: 0; padding: 10px 12px; border: 1px solid #f2bda5; border-radius: 7px; background: #fff1e9; color: #792e10; font-size: 13px; line-height: 1.6; }
@media (max-width: 900px) {
  .guards-page { padding: 22px 16px; }
  .guards-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .guards-export { margin-left: 0; }
  .calendar-day { min-height: 78px; }
  .calendar-guard { font-size: 9px; }
}
@media (max-width: 600px) {
  .guards-page h1 { font-size: 28px; }
  .guards-heading-actions { width: 100%; justify-content: space-between; }
  .guards-filters label { flex: 1 1 100%; }
  .guards-export { width: 100%; }
  .guards-export .button { flex: 1 1 auto; }
  .guards-list .table-scroll { overflow: visible; }
  .guards-list table, .guards-list thead, .guards-list tbody, .guards-list tr, .guards-list td { display: block; width: 100%; min-width: 0; }
  .guards-list thead { display: none; }
  .guards-list tbody tr { padding: 12px 14px; border-bottom: 1px solid #e3eee5; }
  .guards-list tbody tr:last-child { border-bottom: 0; }
  .guards-list td { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 4px 0; border: 0; text-align: right; }
  .guards-list td::before { content: attr(data-label); flex-shrink: 0; color: #475c50; font-size: 11px; font-weight: 700; text-align: left; }
  .guards-list td:first-child { display: block; padding-bottom: 7px; text-align: left; }
  .guards-list td:first-child::before { display: none; }
  .guards-list td:last-child { padding-top: 8px; }
  .guards-list .row-actions { justify-content: flex-end; }
  .calendar-weekdays span { font-size: 9px; }
  .calendar-day { min-height: 62px; padding: 3px; }
  .calendar-guard { width: 7px; height: 7px; margin: 4px 0 0; padding: 0; border-radius: 50%; background: #367d50; font-size: 0; }
  .calendar-guard:hover { background: #0f3b27; }
  .calendar-more { padding: 2px 3px; font-size: 9px; }
  .calendar-day-detail li { display: grid; }
  .guards-detail dl > div { grid-template-columns: 1fr; gap: 3px; }
  .guards-form { padding: 18px; }
  .guards-form .form-grid { grid-template-columns: 1fr; }
  .guards-form .wide { grid-column: auto; }
  .guards-form-actions .button { flex: 1; }
}
</style>
