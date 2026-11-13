<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { httpErrorMessage, readResponseJson, request, serviceUnavailable } from '@/services/quality'

type Integrity = 'verified' | 'mismatch' | 'missing' | 'unsafe'
type Source = {
  id: string; titre: string; rubrique: string; fichier: string | null; sha256: string;
  parties_count: number; images_count: number;
  integrity: { status: Integrity; actual_sha256: string | null }; approval_status: 'reference_only';
}
type Catalogue = {
  data: Source[];
  meta: { total: number; filtered: number; rubriques: { rubrique: string; count: number }[];
    integrity: Record<Integrity, number>; approval_status: 'reference_only' };
}
type Detail = Source & { parties: unknown[]; images: unknown[] }
type ImportResult = { created: boolean; data: { id: number | string; status: 'quarantine' | 'qualified' | 'approved' } }
const base = '/documents/library/reference-corpus'
const labels: Record<Integrity, string> = {
  verified: 'Empreinte vérifiée', mismatch: 'Source altérée', missing: 'Fichier manquant', unsafe: 'Chemin non sûr',
}
const search = ref(''), rubrique = ref(''), catalogue = ref<Catalogue | null>(null)
const loading = ref(true), error = ref('')
const modalOpen = ref(false), selected = ref<Source | null>(null), detail = ref<Detail | null>(null)
const detailLoading = ref(false), detailError = ref(''), downloadError = ref(''), downloading = ref(false)
const importConfirmed = ref(false), importing = ref(false), importError = ref('')
const importResult = ref<ImportResult | null>(null)
const gedStatusLabels = { quarantine: 'En quarantaine', qualified: 'Qualifiée', approved: 'Approuvée' }
let listVersion = 0, detailVersion = 0
const message = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback

async function load() {
  const version = ++listVersion
  loading.value = true
  error.value = ''
  try {
    const query = new URLSearchParams({ rubrique: rubrique.value, search: search.value.trim() })
    const result = await request<Catalogue>(`${base}?${query}`)
    if (!Array.isArray(result?.data) || !Array.isArray(result.meta?.rubriques)
      || !Number.isInteger(result.meta.total) || !Number.isInteger(result.meta.filtered)
      || !result.meta.integrity || result.meta.approval_status !== 'reference_only') {
      throw new Error('Réponse du catalogue invalide. Veuillez réessayer.')
    }
    if (version === listVersion) catalogue.value = result
  } catch (e) {
    if (version === listVersion) { catalogue.value = null; error.value = message(e, serviceUnavailable) }
  } finally { if (version === listVersion) loading.value = false }
}
async function loadDetail() {
  if (!selected.value) return
  const version = ++detailVersion
  detail.value = null
  detailError.value = ''
  detailLoading.value = true
  try {
    const result = await request<{ data: Detail }>(`${base}/${encodeURIComponent(selected.value.id)}`)
    if (!result?.data || !Array.isArray(result.data.parties)) throw new Error('Contenu de référence illisible.')
    if (version === detailVersion) detail.value = result.data
  } catch (e) {
    if (version === detailVersion) detailError.value = message(e, 'Consultation refusée.')
  } finally { if (version === detailVersion) detailLoading.value = false }
}
function openSource(source: Source) {
  if (importing.value) return
  selected.value = source
  downloadError.value = ''
  importConfirmed.value = false
  importError.value = ''
  importResult.value = null
  modalOpen.value = true
  void loadDetail()
}
async function importSource() {
  if (!detail.value || detail.value.integrity.status !== 'verified' || !importConfirmed.value
    || importing.value || importResult.value) return
  importing.value = true
  importError.value = ''
  try {
    const result = await request<ImportResult>(`${base}/${encodeURIComponent(detail.value.id)}/imports`, 'POST')
    if (typeof result?.created !== 'boolean' || !result.data || !['string', 'number'].includes(typeof result.data.id)
      || !['quarantine', 'qualified', 'approved'].includes(result.data.status)) {
      throw new Error('Réponse d’import illisible. Vérifiez la GED avant de réessayer.')
    }
    importResult.value = result
    importConfirmed.value = false
  } catch (e) { importError.value = message(e, 'Import dans la GED refusé.') }
  finally { importing.value = false }
}
// All nested source content remains escaped text, including paragraphs and table cells.
function sourceText(value: unknown): string {
  if (value == null) return ''
  if (typeof value !== 'object') return String(value)
  if (Array.isArray(value)) return value.map(sourceText).filter(Boolean).join('\n')
  return Object.entries(value).filter(([key]) => key !== 'type')
    .map(([key, content]) => ['texte', 'blocs', 'cellules', 'lignes'].includes(key)
      ? sourceText(content) : `${key} : ${sourceText(content)}`).join('\n')
}
function safeFilename(path: string | null) {
  const name = (path || '').split(/[\\/]/).pop()?.replace(/[\x00-\x1f\x7f<>:"|?*\u202a-\u202e\u2066-\u2069]/g, '_').replace(/^\.+/, '').slice(0, 180)
  return name?.trim() || 'source-reference'
}
async function download() {
  if (!selected.value || downloading.value) return
  const source = selected.value
  downloading.value = true
  downloadError.value = ''
  try {
    const token = sessionStorage.getItem('bestpharma.token')
    const tenant = sessionStorage.getItem('bestpharma.officine')
    let response: Response
    try {
      response = await fetch(`/api/v1${base}/${encodeURIComponent(source.id)}/file`, { headers: {
        Accept: 'application/octet-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenant ? { 'X-Officine-ID': tenant } : {}),
      } })
    } catch { throw new Error(serviceUnavailable) }
    if (!response.ok) throw new Error(httpErrorMessage(response, await readResponseJson(response), 'Téléchargement refusé.'))
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    try {
      link.href = url
      link.download = safeFilename(source.fichier)
      document.body.appendChild(link)
      link.click()
    } finally { link.remove(); URL.revokeObjectURL(url) }
  } catch (e) { downloadError.value = message(e, 'Téléchargement impossible.') }
  finally { downloading.value = false }
}
watch([search, rubrique], load, { immediate: true })
watch(modalOpen, open => { if (!open) { ++detailVersion; detail.value = null } })
onBeforeUnmount(() => { ++listVersion; ++detailVersion })
</script>

<template>
  <div class="page corpus-page" data-tour="mod-catalogue" data-testid="mod-catalogue">
    <header class="page-heading">
      <div>
        <p class="eyebrow">DOCUMENTS · CORPUS PRIVÉ</p>
        <h1>Corpus de référence</h1>
        <p class="page-subtitle">Consulter les sources, vérifier leur intégrité, préparer leur examen.</p>
      </div>
      <span class="reference-label">Sources de référence — non approuvées</span>
    </header>

    <section class="panel corpus-summary" aria-label="Intégrité du corpus" data-tour="mod-integrite" data-testid="mod-integrite" :aria-busy="loading">
      <div id="mod-catalogue-compteur" data-testid="mod-catalogue-compteur" class="corpus-count" aria-live="polite">
        <strong>{{ loading || !catalogue ? '—' : catalogue.meta.total }}</strong>
        <span>sources au catalogue</span>
        <small>{{ loading || !catalogue ? 'Comptage en attente du serveur' : `${catalogue.meta.rubriques.length} rubriques · données du serveur` }}</small>
      </div>
      <div class="integrity-summary">
        <h2>L’intégrité n’est pas une approbation</h2>
        <p>Une empreinte vérifiée confirme le fichier source, pas sa conformité ni son usage dans l’officine.</p>
        <dl v-if="catalogue && !loading && !error" class="integrity-counts">
          <div v-for="(label, status) in labels" :key="status" :class="`integrity-${status}`">
            <dt>{{ label }}</dt><dd>{{ catalogue.meta.integrity[status] }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <form class="panel corpus-filters" role="search" @submit.prevent="load">
      <label for="mod-recherche">Rechercher une source
        <input id="mod-recherche" v-model="search" data-testid="mod-recherche" type="search" placeholder="Titre ou rubrique…" />
      </label>
      <label for="mod-rubrique">Rubrique
        <select id="mod-rubrique" v-model="rubrique" data-testid="mod-rubrique">
          <option value="">Toutes les rubriques</option>
          <option v-for="item in catalogue?.meta.rubriques" :key="item.rubrique" :value="item.rubrique">{{ item.rubrique }} ({{ item.count }})</option>
        </select>
      </label>
      <button class="button secondary" type="submit" :disabled="loading">Actualiser</button>
    </form>

    <section aria-label="Sources de référence" :aria-busy="loading">
      <div v-if="error" id="mod-erreur" data-testid="mod-erreur" class="alert error" role="alert">
        <strong>Catalogue indisponible</strong><p>{{ error }}</p>
        <button class="button secondary" type="button" @click="load">Réessayer</button>
      </div>
      <p v-else-if="loading" class="panel corpus-state" role="status">Chargement du catalogue et vérification des sources…</p>
      <template v-else-if="catalogue">
        <p class="corpus-results" role="status">{{ catalogue.meta.filtered }} résultat(s) sur {{ catalogue.meta.total }} sources</p>
        <div v-if="!catalogue.data.length" class="panel corpus-state">
          <h2>{{ search || rubrique ? 'Aucune source ne correspond' : 'Aucune source disponible' }}</h2>
          <p>{{ search || rubrique ? 'Modifiez la recherche ou la rubrique pour élargir les résultats.' : 'Le serveur ne fournit actuellement aucune source de référence.' }}</p>
          <button v-if="search || rubrique" class="button secondary" type="button" @click="search = ''; rubrique = ''">Effacer les filtres</button>
        </div>
        <div class="corpus-sources">
          <article v-for="source in catalogue.data" :id="`mod-modele-${source.id}`" :key="source.id" :data-testid="`mod-modele-${source.id}`" class="panel corpus-source" data-tour="mod-source">
            <div class="source-copy">
              <p class="source-rubrique">{{ source.rubrique }}</p>
              <h2>{{ source.titre }}</h2>
              <p class="source-metadata">{{ source.parties_count }} partie(s) · {{ source.images_count }} image(s) · Référence non approuvée</p>
              <p class="source-hash"><span>SHA-256</span> <code>{{ source.sha256 }}</code></p>
            </div>
            <div class="source-actions">
              <span class="integrity-badge" :class="`integrity-${source.integrity.status}`">{{ labels[source.integrity.status] || 'État inconnu' }}</span>
              <button class="button secondary" type="button" :aria-label="`Consulter ${source.titre}`" @click="openSource(source)">Consulter la source</button>
            </div>
          </article>
        </div>
      </template>
    </section>

    <aside class="corpus-workflow">
      <h2>De la référence au document de l’officine</h2>
      <p>Import en quarantaine par la GED, puis qualification humaine et approbation distinctes. La consultation ou le téléchargement ne crée aucun document approuvé et n’adopte aucune source automatiquement.</p>
    </aside>

    <AppModal v-model="modalOpen" :title="selected?.titre || 'Source de référence'" :busy="importing" eyebrow="RÉFÉRENCE · NON APPROUVÉE" size="wide">
      <div id="mod-detail" data-testid="mod-detail" class="corpus-detail">
        <p v-if="detailLoading" role="status">Chargement du contenu protégé…</p>
        <div v-else-if="detailError" class="alert error" role="alert">
          <p>{{ detailError }}</p><button class="button secondary" type="button" @click="loadDetail">Réessayer la consultation</button>
        </div>
        <template v-else-if="detail">
          <p class="source-rubrique">{{ detail.rubrique }}</p>
          <p class="integrity-badge" :class="`integrity-${detail.integrity.status}`">{{ labels[detail.integrity.status] }}</p>
          <p class="source-hash">SHA-256 <code>{{ detail.sha256 }}</code></p>
          <section v-for="(partie, index) in detail.parties" :key="index" class="source-part">
            <h3>Partie {{ index + 1 }}</h3><p class="source-text">{{ sourceText(partie) }}</p>
          </section>
          <p v-if="!detail.parties.length">Aucun contenu textuel fourni pour cette source.</p>
          <p v-if="detail.images_count" class="muted-note">{{ detail.images_count }} image(s) dans le fichier source ; elles ne sont pas chargées dans cet aperçu textuel.</p>
          <p class="muted-note">Toute utilisation passe par un import GED en quarantaine et des décisions humaines distinctes.</p>
          <section v-if="detail.integrity.status === 'verified'" class="corpus-import" aria-labelledby="mod-import-titre" :aria-busy="importing">
            <h3 id="mod-import-titre">Importer dans ma GED</h3>
            <div v-if="importResult" data-testid="mod-import-resultat" role="status">
              <p><strong>{{ importResult.created ? 'Source importée dans votre GED.' : 'Cette source existe déjà dans votre GED.' }}</strong></p>
              <p>Source GED {{ importResult.data.id }} · État retourné par le serveur : <strong>{{ gedStatusLabels[importResult.data.status] }}</strong>.</p>
              <p v-if="importResult.data.status === 'quarantine'">La source reste en quarantaine. Une qualification humaine, puis une approbation distincte sont nécessaires.</p>
              <p v-else>L’état existant est conservé. Cet import n’effectue aucune nouvelle qualification ni approbation.</p>
              <a class="text-link" href="/documents">{{ importResult.data.status === 'quarantine' ? 'Ouvrir la GED pour qualifier la source' : 'Consulter la source existante dans la GED' }}</a>
            </div>
            <template v-else>
              <p>Une nouvelle source sera placée en quarantaine dans votre officine. Si elle existe déjà, son état sera conservé, sans retour en quarantaine ni nouvelle approbation.</p>
              <label class="corpus-import-confirm" for="mod-import-confirmation">
                <input id="mod-import-confirmation" v-model="importConfirmed" data-testid="mod-import-confirmation" type="checkbox" :disabled="importing">
                <span>Je confirme l’import de cette source dans la GED de mon officine. Cet import ne vaut pas approbation.</span>
              </label>
            </template>
            <p v-if="importError" class="alert error" data-testid="mod-import-erreur" role="alert">{{ importError }}</p>
          </section>
        </template>
        <p v-if="downloadError" class="alert error" role="alert">{{ downloadError }}</p>
      </div>
      <template #footer>
        <button class="button secondary" type="button" :disabled="importing" @click="modalOpen = false">Fermer</button>
        <button v-if="detail" class="button secondary" type="button" :disabled="downloading || importing || detail.integrity.status !== 'verified'" @click="download">{{ downloading ? 'Téléchargement…' : 'Télécharger pour examen' }}</button>
        <button v-if="detail?.integrity.status === 'verified' && !importResult" class="button primary" type="button" data-testid="mod-importer" :disabled="!importConfirmed || importing" @click="importSource">{{ importing ? 'Import en cours…' : 'Importer dans ma GED en quarantaine' }}</button>
      </template>
    </AppModal>
  </div>
</template>

<style scoped>
.corpus-page{color:var(--ink,#1e293b)}
.corpus-detail{padding:20px;min-width:0;overflow-wrap:anywhere}
.corpus-import{margin-top:24px;padding:18px;background:#f0f7ff;border:1px solid #bfdbfe;border-radius:7px;font-size:12px;line-height:1.8}.corpus-import h3{margin:0 0 10px;font-size:16px}.corpus-import-confirm{display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-weight:600}.corpus-import-confirm input{width:18px;height:18px;flex-shrink:0;margin-top:3px}.corpus-import .text-link{display:inline-block;margin-top:5px;font-weight:700}
.reference-label{display:inline-block;padding:9px 12px;border:1px solid #bfdbfe;background:#eff6ff;color:#1e40af;font-size:12px;font-weight:700;line-height:1.5}
.corpus-summary{display:grid;grid-template-columns:minmax(180px,1fr) 3fr;padding:0;overflow:hidden;margin-bottom:20px}
.corpus-count{padding:25px;background:#f0f7ff;border-right:1px solid var(--line,#e2e8f0);display:flex;flex-direction:column;gap:7px}
.corpus-count strong{font-family:var(--font-display);font-size:48px;line-height:1;color:#0065cf;letter-spacing:-2px}
.corpus-count span{font-weight:700;font-size:13px}.corpus-count small{color:#475569;font-size:11px;line-height:1.6}
.integrity-summary{padding:24px}.integrity-summary h2,.corpus-workflow h2{margin:0 0 8px;font-size:17px}
.integrity-summary p,.corpus-workflow p{font-size:12px;line-height:1.8;color:#475569;margin:0}
.integrity-counts{display:flex;flex-wrap:wrap;gap:10px 28px;margin:20px 0 0}.integrity-counts>div{display:flex;flex-direction:column-reverse;gap:5px}.integrity-counts dt{font-size:11px}.integrity-counts dd{font-family:var(--font-display);font-size:25px;font-weight:700;margin:0}
.corpus-filters{display:flex;gap:18px;align-items:flex-end;padding:18px 22px;margin-bottom:22px}.corpus-filters label{display:flex;flex-direction:column;gap:8px;min-width:0;font-size:12px;font-weight:700;flex:1}.corpus-filters label:first-child{flex:2}.corpus-filters input,.corpus-filters select{width:100%;min-height:40px;box-sizing:border-box}.corpus-filters button{min-height:40px}
.corpus-results{font-size:12px;color:#475569;margin:0 0 12px}.corpus-sources{display:flex;flex-direction:column;gap:12px}.corpus-source{display:flex;gap:24px;justify-content:space-between;padding:22px;margin:0}.source-copy{min-width:0}.source-rubrique{font-size:10px;letter-spacing:.7px;font-weight:700;color:#475569;margin:0 0 8px}.corpus-source h2{font-size:18px;line-height:1.4;margin:0 0 8px}.source-metadata{font-size:11px;color:#475569;margin:0 0 15px}.source-hash{font-size:10px;line-height:1.8;color:#475569;overflow-wrap:anywhere;margin:0}.source-hash span{font-weight:700;margin-right:8px}.source-hash code{font-size:11px}.source-actions{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:20px;flex-shrink:0}.integrity-badge{font-size:11px;font-weight:700;display:inline-block;padding:6px 9px;border:1px solid currentColor;border-radius:4px;width:fit-content}.integrity-verified{color:#166534}.integrity-mismatch,.integrity-unsafe{color:#9f1239}.integrity-missing{color:#92400e}.corpus-state{padding:30px}.corpus-state h2{font-size:18px}.corpus-state p{font-size:13px;line-height:1.7}.corpus-workflow{border-left:3px solid #007fff;padding:5px 0 5px 18px;margin-top:28px}.source-part{margin-top:24px;padding-top:16px;border-top:1px solid var(--line,#e2e8f0)}.source-part h3{font-size:15px}.source-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;line-height:1.9}.alert p{white-space:pre-wrap}.corpus-page :deep(button:focus-visible){outline:3px solid #7cc4ff;outline-offset:3px}
@media(max-width:1000px){.corpus-filters{display:grid;grid-template-columns:minmax(0,1fr) auto}.corpus-filters label:first-child{grid-column:1/-1}}
@media(max-width:700px){.corpus-page{padding:22px 16px}.corpus-detail{padding:16px}.corpus-summary{grid-template-columns:1fr}.corpus-count{border-right:0;border-bottom:1px solid var(--line,#e2e8f0);padding:20px}.corpus-count strong{font-size:40px}.integrity-summary{padding:20px}.corpus-filters{display:flex;flex-direction:column;align-items:stretch;padding:18px}.corpus-filters label,.corpus-filters label:first-child{flex:none}.corpus-source{flex-direction:column;gap:18px;padding:18px}.source-actions{flex-direction:row;align-items:center;flex-wrap:wrap;gap:12px}.source-actions button{margin-left:auto}.reference-label{margin-top:8px}.integrity-counts{gap:18px}}
</style>
