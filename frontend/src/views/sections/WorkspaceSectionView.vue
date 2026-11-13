<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import AppModal from '@/components/AppModal.vue'
import { notify } from '@/services/notify'

interface Part { id: string; label: string; columns?: string[]; notice?: string }
interface Seed { section: string; cells: string[] }
interface Workspace {
  title: string
  eyebrow: string
  intro: string
  sections: Part[]
  columns: string[]
  rows: Seed[]
}
interface Line { id: number; section: string; cells: string[] }
interface BalancePoint { label: string; entrees: number; sorties: number; solde: number }
interface Marker { x: number; yEntrees: number; ySorties: number; ySolde: number; label: string }
interface Tick { y: number; label: string }
interface BalancePlot {
  pathEntrees: string
  pathSorties: string
  pathSolde: string
  markers: Marker[]
  ticks: Tick[]
  points: BalancePoint[]
}
interface MonthCount { label: string; magistrale: number; officinale: number }
interface BarGeom {
  label: string
  magistrale: number
  officinale: number
  xMag: number
  xOff: number
  yMag: number
  yOff: number
  hMag: number
  hOff: number
  labelX: number
}
interface BarPlot { bars: BarGeom[]; width: number; height: number; baseline: number }
interface ControleStats {
  total: number
  conformes: number
  percent: number | null
  percentLabel: string
  meterWidth: number
  phrase: string
}

const CHART_W = 560
const CHART_H = 220
const PAD_L = 44
const PAD_R = 16
const PAD_T = 16
const PAD_B = 36
const INNER_W = CHART_W - PAD_L - PAD_R
const INNER_H = CHART_H - PAD_T - PAD_B
const BAR_H = 150
const BAR_W = 18
const BAR_GAP = 8
const GROUP_PITCH = 132
const BAR_PAD_L = 24
const BAR_PAD_T = 22
const BAR_PAD_B = 40

function columnsFor(spec: Workspace, section: string): string[] {
  const part = spec.sections.find(item => item.id === section)
  if (part?.columns && part.columns.length > 0) return part.columns
  return spec.columns
}

function columnIndex(columns: string[], names: string[]): number {
  const wanted = new Set(names.map(name => name.toLowerCase()))
  return columns.findIndex(column => wanted.has(column.toLowerCase()))
}

function parseAmount(raw: string): number | null {
  const match = raw.replace(/\s/g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
}

function formatQty(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

function xAt(index: number, count: number): number {
  if (count <= 1) return PAD_L + INNER_W / 2
  return PAD_L + (index / (count - 1)) * INNER_W
}

function yAt(value: number, min: number, max: number): number {
  const span = max - min || 1
  return PAD_T + (1 - (value - min) / span) * INNER_H
}

function linePath(values: number[], min: number, max: number): string {
  return values.map((value, index) => {
    const command = index === 0 ? 'M' : 'L'
    return `${command}${xAt(index, values.length).toFixed(1)} ${yAt(value, min, max).toFixed(1)}`
  }).join(' ')
}

function normalizeType(value: string): 'magistrale' | 'officinale' | null {
  const text = value.trim().toLowerCase()
  if (text.startsWith('magistrale')) return 'magistrale'
  if (text.startsWith('officinale')) return 'officinale'
  return null
}

function resultatConforme(value: string): boolean {
  const text = value.trim().toLowerCase()
  if (!text || text.includes('non conforme') || text.includes('non-conforme')) return false
  return text === 'conforme' || text.startsWith('conforme')
}

function controlePhrase(conformes: number, total: number): string {
  const left = conformes === 1 ? '1 contrôle conforme' : `${conformes} contrôles conformes`
  const right = total === 1 ? '1 contrôle enregistré' : `${total} contrôles enregistrés`
  return `${left} sur ${right}.`
}

function placeholderFor(column: string): string {
  const name = column.toLowerCase()
  if (name === 'type') return 'Magistrale ou officinale'
  if (name === 'mois') return 'Novembre 2026'
  if (name === 'résultat' || name === 'resultat') return 'Conforme ou non conforme'
  if (name === 'entrées' || name === 'sorties' || name === 'solde') return '0'
  return ''
}

function nextId(bucket: Line[]): number {
  return bucket.reduce((max, line) => Math.max(max, line.id), 0) + 1
}

const catalog: Record<string, Workspace> = {
  stupefiants: {
    title: 'Stupéfiants',
    eyebrow: 'STUPÉFIANTS',
    intro: 'Registre des mouvements, balances, ordonnancier, copies, inventaire, armoire, écarts, destructions et rapports.',
    sections: [
      { id: 'registre', label: 'Registre', notice: 'Conservation 10 ans', columns: ['Référence', 'Produit et lot', 'Opération', 'Quantité'] },
      { id: 'balance', label: 'Balance', columns: ['Période', 'Entrées', 'Sorties', 'Solde'] },
      { id: 'ordonnancier', label: 'Ordonnancier', columns: ['N° d’ordre', 'Date', 'Patient', 'Produit et quantité'] },
      { id: 'copies', label: 'Copies', notice: 'Conservation 3 ans', columns: ['Référence', 'Document', 'Période', 'Lieu de conservation'] },
      { id: 'inventaire', label: 'Inventaire', columns: ['Date', 'Produit et lot', 'Théorique', 'Physique'] },
      { id: 'armoire', label: 'Armoire', columns: ['Emplacement', 'Produit', 'Quantité', 'Dernier contrôle'] },
      { id: 'ecarts', label: 'Écarts', columns: ['Référence', 'Produit', 'Écart constaté', 'Décision'] },
      { id: 'destruction', label: 'Destruction', columns: ['Référence', 'Produit et lot', 'Quantité', 'Procès-verbal'] },
      { id: 'rapports', label: 'Rapports', columns: ['Référence', 'Période', 'Objet', 'Statut'] },
    ],
    columns: ['Référence', 'Détail', 'Opération', 'Quantité'],
    rows: [
      { section: 'registre', cells: ['REG-STU-2026-014', 'Morphine 10 mg/ml · lot MOR-4412', 'Entrée fournisseur, solde 48 ampoules', '20 ampoules'] },
      { section: 'registre', cells: ['REG-STU-2026-018', 'Morphine 10 mg/ml · lot MOR-4412', 'Sortie vers PAT-19, solde 46 ampoules', '2 ampoules'] },
      { section: 'balance', cells: ['03/11/2026', '20', '0', '48'] },
      { section: 'balance', cells: ['07/11/2026', '0', '2', '46'] },
      { section: 'balance', cells: ['10/11/2026', '10', '4', '52'] },
      { section: 'balance', cells: ['12/11/2026', '0', '6', '46'] },
      { section: 'ordonnancier', cells: ['ORD-STU-088', '09/11/2026', 'PAT-19', 'Codéine 25 mg · lot COD-2201 · 1 boîte'] },
      { section: 'copies', cells: ['COP-STU-2026-11', 'Copie du registre de novembre', '01/11/2026 – 12/11/2026', 'Classeur stupéfiants, officine'] },
      { section: 'inventaire', cells: ['12/11/2026', 'Morphine 10 mg/ml · lot MOR-4412', '46 ampoules', '46 ampoules'] },
      { section: 'armoire', cells: ['ARM-01', 'Morphine 10 mg/ml', '46 ampoules', '12/11/2026, fermeture vérifiée'] },
      { section: 'ecarts', cells: ['ECA-STU-2026-02', 'Morphine 10 mg/ml · lot MOR-4412', '1 ampoule manquante le 08/11/2026', 'Retrouver dans la délivrance PAT-19, registre aligné'] },
      { section: 'destruction', cells: ['DES-STU-2026-01', 'Morphine périmée · lot MOR-2208', '4 ampoules', 'PV du 28/10/2026, présence du pharmacien titulaire'] },
      { section: 'rapports', cells: ['RAP-STU-2026-10', 'Octobre 2026', 'Mouvements et inventaire', 'Transmis au titulaire'] },
    ],
  },
  preparations: {
    title: 'Préparations',
    eyebrow: 'PRÉPARATIONS',
    intro: 'Registre, formules, matières premières, contrôles, étiquettes et rapports des préparations magistrales et officinales.',
    sections: [
      { id: 'registre', label: 'Registre', columns: ['Référence', 'Préparation', 'Type', 'Mois', 'Statut'] },
      { id: 'formules', label: 'Formules', columns: ['Référence', 'Formule', 'Type', 'Statut'] },
      { id: 'matieres', label: 'Matières', columns: ['Référence', 'Matière', 'Lot', 'Quantité'] },
      { id: 'controles', label: 'Contrôles', columns: ['Référence', 'Préparation', 'Contrôle', 'Résultat'] },
      { id: 'etiquettes', label: 'Étiquettes', columns: ['Référence', 'Préparation', 'Mentions', 'Statut'] },
      { id: 'rapports', label: 'Rapports', columns: ['Référence', 'Période', 'Objet', 'Statut'] },
    ],
    columns: ['Référence', 'Préparation', 'Lot', 'Statut'],
    rows: [
      { section: 'registre', cells: ['PREP-2026-028', 'Solution buvable de codéine 1 mg/ml', 'Magistrale', 'Septembre 2026', 'Libérée'] },
      { section: 'registre', cells: ['PREP-2026-029', 'Gélules de mélatonine 1 mg', 'Magistrale', 'Septembre 2026', 'Libérée'] },
      { section: 'registre', cells: ['PREP-2026-031', 'Sirop expectorant sans sucre', 'Officinale', 'Septembre 2026', 'Libérée'] },
      { section: 'registre', cells: ['PREP-2026-044', 'Pommade à l’urée 10 %', 'Magistrale', 'Octobre 2026', 'Libérée'] },
      { section: 'registre', cells: ['PREP-2026-046', 'Solution antiseptique iodée', 'Officinale', 'Octobre 2026', 'Libérée'] },
      { section: 'registre', cells: ['PREP-2026-047', 'Sirop de codéine de l’officine', 'Officinale', 'Octobre 2026', 'Libérée'] },
      { section: 'registre', cells: ['PREP-2026-052', 'Gélules de mélatonine 2 mg', 'Magistrale', 'Novembre 2026', 'Libérée'] },
      { section: 'registre', cells: ['PREP-2026-055', 'Solution buvable de codéine 1 mg/ml', 'Magistrale', 'Novembre 2026', 'En cours'] },
      { section: 'registre', cells: ['PREP-2026-058', 'Crème hydratante de l’officine', 'Officinale', 'Novembre 2026', 'En cours'] },
      { section: 'formules', cells: ['FOR-PM-014', 'Solution buvable de codéine 1 mg/ml', 'Magistrale', 'Approuvée'] },
      { section: 'formules', cells: ['FOR-PO-006', 'Solution antiseptique iodée', 'Officinale', 'Approuvée'] },
      { section: 'matieres', cells: ['MAT-028-01', 'Codéine base', 'COD-771', '2 g'] },
      { section: 'matieres', cells: ['MAT-044-02', 'Urée', 'URE-330', '10 g'] },
      { section: 'controles', cells: ['CTL-2026-028', 'Solution buvable de codéine 1 mg/ml', 'Aspect et volume', 'Conforme'] },
      { section: 'controles', cells: ['CTL-2026-044', 'Pommade à l’urée 10 %', 'Homogénéité', 'Conforme'] },
      { section: 'controles', cells: ['CTL-2026-052', 'Gélules de mélatonine 2 mg', 'Masse moyenne', 'Non conforme'] },
      { section: 'etiquettes', cells: ['ETI-2026-028', 'Solution buvable de codéine 1 mg/ml', 'Nom, dosage, date limite, posologie', 'Apposée'] },
      { section: 'rapports', cells: ['RAP-PREP-2026-10', 'Octobre 2026', 'Préparations libérées et contrôles', 'Établi'] },
    ],
  },
  modeles: {
    title: 'Modèles de documents',
    eyebrow: 'DOCUMENTS',
    intro: 'Procédures, modes opératoires et enregistrements en vigueur dans l’officine.',
    sections: [
      { id: 'procedures', label: 'Procédures' },
      { id: 'modes', label: 'Modes opératoires' },
      { id: 'enregistrements', label: 'Enregistrements' },
    ],
    columns: ['Code', 'Intitulé', 'Version', 'Processus'],
    rows: [
      { section: 'procedures', cells: ['PR-REC-04', 'Réception et contrôle des livraisons', 'v3', 'Approvisionnement'] },
      { section: 'procedures', cells: ['PR-STU-02', 'Tenue du registre des stupéfiants', 'v2', 'Stupéfiants'] },
      { section: 'modes', cells: ['MO-CDF-01', 'Relevé des températures des enceintes', 'v4', 'Chaîne du froid'] },
      { section: 'enregistrements', cells: ['ENR-NET-12', 'Fiche de nettoyage du comptoir', 'v1', 'Locaux'] },
    ],
  },
  autoevaluation: {
    title: 'Auto-évaluation',
    eyebrow: 'QUALITÉ',
    intro: 'Chapitres examinés, écarts relevés et preuves conservées.',
    sections: [
      { id: 'chapitres', label: 'Chapitres' },
      { id: 'ecarts', label: 'Écarts' },
      { id: 'preuves', label: 'Preuves' },
    ],
    columns: ['Référence', 'Point examiné', 'Constat', 'Date'],
    rows: [
      { section: 'chapitres', cells: ['AE-CH-1.4', 'Locaux de stockage', 'Conforme sur l’échantillon du 4 novembre', '04/11/2026'] },
      { section: 'chapitres', cells: ['AE-CH-3.2', 'Dispensation au comptoir', 'Cinq délivrances revues, grille G-12', '07/11/2026'] },
      { section: 'ecarts', cells: ['AE-EC-019', 'Relevé du soir de l’enceinte positive', 'Signature absente le 2 novembre', '03/11/2026'] },
      { section: 'preuves', cells: ['AE-PV-007', 'Conservation des ordonnances', 'Classeur 2026, pièce PAT-19', '09/11/2026'] },
    ],
  },
  presence: {
    title: 'Pointage de présence',
    eyebrow: 'PERSONNEL',
    intro: 'Présences du jour, absences et habilitations du personnel.',
    sections: [
      { id: 'pointage', label: 'Pointage du jour' },
      { id: 'absences', label: 'Absences' },
      { id: 'habilitations', label: 'Habilitations' },
    ],
    columns: ['Référence', 'Fonction', 'Détail', 'Statut'],
    rows: [
      { section: 'pointage', cells: ['PT-2026-11-12-01', 'Pharmacien titulaire', 'Poste du matin, 08:00–13:00', 'Présent'] },
      { section: 'pointage', cells: ['PT-2026-11-12-02', 'Préparateur en pharmacie', 'Poste continu, 08:00–17:00', 'Présent'] },
      { section: 'absences', cells: ['ABS-2026-044', 'Aide officinale', 'Congé du 12 novembre', 'Justifiée'] },
      { section: 'habilitations', cells: ['HAB-STU-03', 'Préparateur en pharmacie', 'Délivrance des stupéfiants depuis le 01/06/2026', 'En cours de validité'] },
    ],
  },
  echeances: {
    title: 'Échéancier',
    eyebrow: 'ÉCHÉANCES',
    intro: 'Obligations de l’officine, classées selon leur avancement.',
    sections: [
      { id: 'avenir', label: 'À venir' },
      { id: 'retard', label: 'En retard' },
      { id: 'realisees', label: 'Réalisées' },
    ],
    columns: ['Référence', 'Obligation', 'Échéance', 'Responsable'],
    rows: [
      { section: 'avenir', cells: ['ECH-2026-118', 'Contrôle métrologique de la balance', '02/12/2026', 'Pharmacien titulaire'] },
      { section: 'avenir', cells: ['ECH-2026-121', 'Renouvellement de l’habilitation stupéfiants', '15/01/2027', 'Préparateur en pharmacie'] },
      { section: 'retard', cells: ['ECH-2026-090', 'Relevé annuel des déchets pharmaceutiques', '31/10/2026', 'Pharmacien titulaire'] },
      { section: 'realisees', cells: ['ECH-2026-077', 'Vérification de l’extincteur du comptoir', '18/09/2026', 'Prestataire de maintenance'] },
    ],
  },
  comptabilite: {
    title: 'Comptabilité',
    eyebrow: 'COMPTABILITÉ',
    intro: 'Journal, grand livre et balance, montants en francs CFA.',
    sections: [
      { id: 'journal', label: 'Journal' },
      { id: 'grandlivre', label: 'Grand livre' },
      { id: 'balance', label: 'Balance' },
    ],
    columns: ['Pièce', 'Compte', 'Libellé', 'Montant'],
    rows: [
      { section: 'journal', cells: ['JC-2026-1104', '6011', 'Achats de spécialités, lot AMO-118', '185 000 FCFA'] },
      { section: 'journal', cells: ['JC-2026-1108', '571', 'Encaissement du comptoir', '42 500 FCFA'] },
      { section: 'grandlivre', cells: ['GL-571-11', '571', 'Caisse, mouvements du 1er au 10 novembre', '620 000 FCFA'] },
      { section: 'balance', cells: ['BAL-11-2026', '411', 'Clients, solde débiteur au 10 novembre', '128 000 FCFA'] },
    ],
  },
  ohada: {
    title: 'OHADA',
    eyebrow: 'OHADA',
    intro: 'Plan de comptes, états de synthèse et rapprochements.',
    sections: [
      { id: 'plan', label: 'Plan de comptes' },
      { id: 'etats', label: 'États' },
      { id: 'rapprochements', label: 'Rapprochements' },
    ],
    columns: ['Compte', 'Intitulé', 'Pièce', 'Montant'],
    rows: [
      { section: 'plan', cells: ['6011', 'Achats de marchandises', 'Plan de comptes', 'Compte ouvert'] },
      { section: 'plan', cells: ['571', 'Caisse', 'Plan de comptes', 'Compte ouvert'] },
      { section: 'etats', cells: ['701', 'Ventes de marchandises, octobre 2026', 'ET-2026-10', '4 850 000 FCFA'] },
      { section: 'rapprochements', cells: ['571', 'Caisse rapprochée du journal au 10 novembre', 'RAP-CAI-11', '0 FCFA'] },
    ],
  },
  audit: {
    title: 'Journal d’audit',
    eyebrow: 'AUDIT',
    intro: 'Événements, exports et accès enregistrés pour l’officine.',
    sections: [
      { id: 'evenements', label: 'Événements' },
      { id: 'exports', label: 'Exports' },
      { id: 'acces', label: 'Accès' },
    ],
    columns: ['Référence', 'Événement', 'Acteur', 'Cible'],
    rows: [
      { section: 'evenements', cells: ['AUD-2026-441', 'Modification du prix de vente', 'Pharmacien titulaire', 'Amoxicilline 500 mg, lot AMO-118'] },
      { section: 'evenements', cells: ['AUD-2026-448', 'Délivrance enregistrée au comptoir', 'Préparateur en pharmacie', 'PAT-19, lot MOR-4412'] },
      { section: 'exports', cells: ['EXP-2026-019', 'Export du journal de caisse, 1er au 10 novembre', 'Pharmacien titulaire', 'Journal de caisse'] },
      { section: 'acces', cells: ['ACC-2026-077', 'Connexion au poste du comptoir', 'Préparateur en pharmacie', 'Poste CPT-02'] },
    ],
  },
}

const emptyBalance: BalancePlot = { pathEntrees: '', pathSorties: '', pathSolde: '', markers: [], ticks: [], points: [] }
const emptyBars: BarPlot = { bars: [], width: 320, height: 180, baseline: 0 }
const emptyControle: ControleStats = { total: 0, conformes: 0, percent: null, percentLabel: '', meterWidth: 0, phrase: '' }

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.path.split('/').filter(Boolean).at(-1) || '')
const workspace = computed(() => catalog[slug.value])
const sectionId = ref('')
const query = ref('')
const modal = ref(false)
const rectifOpen = ref(false)
const rectifError = ref('')
const memory = reactive<Record<string, Line[]>>({})
const draft = reactive({ section: '', cells: [] as string[] })
const rectif = reactive({ cells: [] as string[], motif: '' })

watch(slug, key => {
  const spec = catalog[key]
  if (!spec) return
  if (!memory[key]) memory[key] = spec.rows.map((row, index) => ({ id: index + 1, section: row.section, cells: [...row.cells] }))
  const asked = String(route.query.tab || '')
  sectionId.value = spec.sections.some(part => part.id === asked) ? asked : (spec.sections[0]?.id || '')
  query.value = ''
  modal.value = false
  rectifOpen.value = false
  rectifError.value = ''
}, { immediate: true })

watch(sectionId, id => {
  if (!id || route.query.tab === id) return
  router.replace({ query: { ...route.query, tab: id } })
})

watch(sectionId, () => { query.value = '' })

const currentPart = computed(() => workspace.value?.sections.find(part => part.id === sectionId.value))
const currentLabel = computed(() => currentPart.value?.label || '')
const currentNotice = computed(() => currentPart.value?.notice || '')
const activeColumns = computed(() => {
  const spec = workspace.value
  if (!spec) return []
  return columnsFor(spec, sectionId.value)
})
const draftColumns = computed(() => {
  const spec = workspace.value
  if (!spec) return []
  return columnsFor(spec, draft.section)
})
const rectifColumns = computed(() => columnsFor(catalog.stupefiants, 'registre'))
const filtered = computed(() => (memory[slug.value] || []).filter(line => line.section === sectionId.value))
const visible = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return filtered.value
  return filtered.value.filter(line => line.cells.some(cell => cell.toLowerCase().includes(needle)))
})
const headingIcon = computed(() => (slug.value === 'preparations' ? 'flask' : slug.value === 'stupefiants' ? 'box' : ''))
const showRectif = computed(() => slug.value === 'stupefiants' && sectionId.value === 'registre')
const onBalance = computed(() => slug.value === 'stupefiants' && sectionId.value === 'balance')
const onPrepRegistre = computed(() => slug.value === 'preparations' && sectionId.value === 'registre')
const onControles = computed(() => slug.value === 'preparations' && sectionId.value === 'controles')
const sectionTestId = computed(() => {
  if (slug.value === 'stupefiants' && sectionId.value === 'registre') return 'stup-registre'
  if (slug.value === 'stupefiants' && sectionId.value === 'balance') return 'stup-balance'
  if (slug.value === 'preparations' && sectionId.value === 'registre') return 'prep-registre'
  if (slug.value === 'preparations' && sectionId.value === 'controles') return 'prep-controle'
  return undefined
})

const balancePlot = computed((): BalancePlot => {
  if (slug.value !== 'stupefiants') return emptyBalance
  const columns = columnsFor(catalog.stupefiants, 'balance')
  const entreesIndex = columnIndex(columns, ['entrées', 'entrees'])
  const sortiesIndex = columnIndex(columns, ['sorties'])
  const soldeIndex = columnIndex(columns, ['solde'])
  const points: BalancePoint[] = []
  for (const line of (memory.stupefiants || []).filter(item => item.section === 'balance')) {
    const entrees = parseAmount(line.cells[entreesIndex] ?? '')
    const sorties = parseAmount(line.cells[sortiesIndex] ?? '')
    const solde = parseAmount(line.cells[soldeIndex] ?? '')
    if (entrees === null || sorties === null || solde === null) continue
    const label = (line.cells[0] ?? '').trim() || `Point ${points.length + 1}`
    points.push({ label, entrees, sorties, solde })
  }
  if (!points.length) return emptyBalance
  const values = points.flatMap(point => [point.entrees, point.sorties, point.solde])
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const mid = min + (max - min) / 2
  return {
    pathEntrees: linePath(points.map(point => point.entrees), min, max),
    pathSorties: linePath(points.map(point => point.sorties), min, max),
    pathSolde: linePath(points.map(point => point.solde), min, max),
    markers: points.map((point, index) => ({
      x: xAt(index, points.length),
      yEntrees: yAt(point.entrees, min, max),
      ySorties: yAt(point.sorties, min, max),
      ySolde: yAt(point.solde, min, max),
      label: point.label,
    })),
    ticks: [
      { y: yAt(max, min, max), label: formatQty(max) },
      { y: yAt(mid, min, max), label: formatQty(mid) },
      { y: yAt(min, min, max), label: formatQty(min) },
    ],
    points,
  }
})

const balanceAria = computed(() => {
  if (!balancePlot.value.points.length) return 'Aucun point à tracer pour cette balance'
  return balancePlot.value.points
    .map(point => `${point.label}, entrées ${formatQty(point.entrees)}, sorties ${formatQty(point.sorties)}, solde ${formatQty(point.solde)}`)
    .join('. ')
})

const prepMonths = computed((): MonthCount[] => {
  if (slug.value !== 'preparations') return []
  const columns = columnsFor(catalog.preparations, 'registre')
  const typeIndex = columnIndex(columns, ['type'])
  const monthIndex = columnIndex(columns, ['mois'])
  const rows: MonthCount[] = []
  for (const line of (memory.preparations || []).filter(item => item.section === 'registre')) {
    const label = (line.cells[monthIndex] ?? '').trim()
    const kind = normalizeType(line.cells[typeIndex] ?? '')
    if (!label || !kind) continue
    let row = rows.find(item => item.label === label)
    if (!row) {
      row = { label, magistrale: 0, officinale: 0 }
      rows.push(row)
    }
    row[kind] += 1
  }
  return rows
})

const prepPlot = computed((): BarPlot => {
  const months = prepMonths.value
  if (!months.length) return emptyBars
  const max = Math.max(...months.flatMap(month => [month.magistrale, month.officinale]), 1)
  const baseline = BAR_PAD_T + BAR_H
  const bars: BarGeom[] = months.map((month, index) => {
    const groupX = BAR_PAD_L + index * GROUP_PITCH
    const hMag = (month.magistrale / max) * BAR_H
    const hOff = (month.officinale / max) * BAR_H
    return {
      label: month.label,
      magistrale: month.magistrale,
      officinale: month.officinale,
      xMag: groupX,
      xOff: groupX + BAR_W + BAR_GAP,
      yMag: baseline - hMag,
      yOff: baseline - hOff,
      hMag,
      hOff,
      labelX: groupX + BAR_W + BAR_GAP / 2,
    }
  })
  return {
    bars,
    width: BAR_PAD_L + months.length * GROUP_PITCH + 12,
    height: baseline + BAR_PAD_B,
    baseline,
  }
})

const prepAria = computed(() => {
  if (!prepPlot.value.bars.length) return 'Aucune préparation à répartir par mois'
  return prepPlot.value.bars
    .map(bar => `${bar.label}, ${bar.magistrale} magistrale, ${bar.officinale} officinale`)
    .join('. ')
})

const controleStats = computed((): ControleStats => {
  if (slug.value !== 'preparations') return emptyControle
  const columns = columnsFor(catalog.preparations, 'controles')
  const resultIndex = columnIndex(columns, ['résultat', 'resultat'])
  const lines = (memory.preparations || []).filter(line => line.section === 'controles')
  if (!lines.length) return emptyControle
  const conformes = lines.filter(line => resultatConforme(line.cells[resultIndex] ?? '')).length
  const percent = Math.round((conformes / lines.length) * 1000) / 10
  return {
    total: lines.length,
    conformes,
    percent,
    percentLabel: `${formatQty(percent)} %`,
    meterWidth: Math.max(0, Math.min(100, percent)),
    phrase: controlePhrase(conformes, lines.length),
  }
})

function openAdd() {
  const spec = workspace.value
  if (!spec) return
  draft.section = sectionId.value
  draft.cells = columnsFor(spec, sectionId.value).map(() => '')
  rectifOpen.value = false
  modal.value = true
}

function onDraftSection() {
  const spec = workspace.value
  if (!spec) return
  draft.cells = columnsFor(spec, draft.section).map(() => '')
}

function save() {
  const key = slug.value
  const spec = workspace.value
  const bucket = memory[key]
  if (!bucket || !spec) return
  const columns = columnsFor(spec, draft.section)
  const cells = draft.cells.map(cell => cell.trim())
  if (!draft.section || cells.length !== columns.length || cells.some(cell => !cell)) {
    notify('error', 'Chaque champ est obligatoire. La ligne n’a pas été enregistrée.')
    return
  }
  bucket.push({ id: nextId(bucket), section: draft.section, cells })
  sectionId.value = draft.section
  query.value = ''
  modal.value = false
  notify('success', 'Ligne enregistrée.')
}

function openRectif() {
  if (slug.value !== 'stupefiants') return
  rectif.cells = rectifColumns.value.map(() => '')
  rectif.motif = ''
  rectifError.value = ''
  modal.value = false
  rectifOpen.value = true
}

function saveRectif() {
  const bucket = memory.stupefiants
  if (!bucket || slug.value !== 'stupefiants') return
  const columns = rectifColumns.value
  const cells = rectif.cells.map(cell => cell.trim())
  const motif = rectif.motif.trim()
  if (!motif || cells.length !== columns.length || cells.some(cell => !cell)) {
    rectifError.value = 'Le motif est obligatoire. L’écriture d’origine n’est pas modifiée.'
    notify('error', rectifError.value)
    return
  }
  const stored = [...cells]
  const opIndex = columnIndex(columns, ['opération', 'operation'])
  if (opIndex >= 0) stored[opIndex] = `${stored[opIndex]} — écriture rectificative : ${motif}`
  bucket.push({ id: nextId(bucket), section: 'registre', cells: stored })
  sectionId.value = 'registre'
  query.value = ''
  rectifError.value = ''
  rectifOpen.value = false
  notify('success', 'Écriture rectificative ajoutée. L’origine est inchangée.')
}
</script>

<template>
  <div v-if="workspace" class="page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">{{ workspace.eyebrow }}</p>
        <h1 class="title-line">
          <AppIcon v-if="headingIcon" :name="headingIcon" :size="28" />
          {{ workspace.title }}
        </h1>
        <p class="page-subtitle">{{ workspace.intro }}</p>
      </div>
      <div class="heading-actions">
        <button v-if="showRectif" class="button secondary" type="button" @click="openRectif">
          <AppIcon name="documents" :size="16" />
          Écriture rectificative
        </button>
        <button class="button primary" type="button" @click="openAdd">
          <AppIcon name="plus" :size="16" />
          Ajouter une ligne
        </button>
      </div>
    </div>
    <section class="panel" :data-testid="sectionTestId">
      <div class="panel-heading">
        <div>
          <h2>{{ currentLabel }}</h2>
        </div>
        <div class="panel-tools">
          <label class="section-filter">Filtrer
            <span class="filter-field">
              <AppIcon name="search" :size="16" />
              <input v-model="query" type="search" aria-label="Filtrer les lignes de la section" />
            </span>
          </label>
          <label class="section-filter">Section
            <select v-model="sectionId" aria-label="Section">
              <option v-for="part in workspace.sections" :key="part.id" :value="part.id">{{ part.label }}</option>
            </select>
          </label>
        </div>
      </div>
      <p v-if="currentNotice" class="retention">
        <AppIcon v-if="sectionId === 'copies'" name="documents" :size="16" />
        <AppIcon name="clock" :size="16" />
        <span>{{ currentNotice }}</span>
      </p>
      <p v-if="showRectif" class="retention-note">
        <AppIcon name="info" :size="16" />
        <span>Une écriture rectificative ajoute une ligne et laisse l’écriture d’origine inchangée.</span>
      </p>

      <figure v-if="onBalance" class="chart-card">
        <figcaption>
          <AppIcon name="calendar" :size="18" />
          Entrées, sorties et solde
        </figcaption>
        <template v-if="balancePlot.points.length">
          <svg class="chart-svg" :viewBox="`0 0 ${CHART_W} ${CHART_H}`" role="img" :aria-label="balanceAria" aria-describedby="balance-values">
            <title>Entrées, sorties et solde</title>
            <line v-for="(tick, index) in balancePlot.ticks" :key="`grid-${index}`" class="grid-line" :x1="PAD_L" :x2="CHART_W - PAD_R" :y1="tick.y" :y2="tick.y" />
            <text v-for="(tick, index) in balancePlot.ticks" :key="`tick-${index}`" class="axis-label" x="36" :y="tick.y" dominant-baseline="middle" text-anchor="end">{{ tick.label }}</text>
            <path class="line-in" :d="balancePlot.pathEntrees" />
            <path class="line-out" :d="balancePlot.pathSorties" />
            <path class="line-bal" :d="balancePlot.pathSolde" />
            <g v-for="(marker, index) in balancePlot.markers" :key="`marker-${index}`">
              <circle class="dot-in" :cx="marker.x" :cy="marker.yEntrees" r="3.5" />
              <circle class="dot-out" :cx="marker.x" :cy="marker.ySorties" r="3.5" />
              <circle class="dot-bal" :cx="marker.x" :cy="marker.ySolde" r="3.5" />
              <text class="axis-label" :x="marker.x" :y="CHART_H - 10" text-anchor="middle">{{ marker.label }}</text>
            </g>
          </svg>
          <ul class="legend">
            <li>Entrées : trait continu</li>
            <li>Sorties : trait tireté</li>
            <li>Solde : trait pointillé</li>
          </ul>
          <p id="balance-values" class="equivalent-title">Équivalent textuel</p>
          <ul class="text-equivalent">
            <li v-for="(point, index) in balancePlot.points" :key="`bal-${index}`">{{ point.label }} — entrées {{ formatQty(point.entrees) }}, sorties {{ formatQty(point.sorties) }}, solde {{ formatQty(point.solde) }}</li>
          </ul>
        </template>
        <p v-else class="empty-state">Aucun point à tracer pour cette balance.</p>
      </figure>

      <figure v-if="onPrepRegistre" class="chart-card">
        <figcaption>
          <AppIcon name="calendar" :size="18" />
          Préparations par mois
        </figcaption>
        <template v-if="prepPlot.bars.length">
          <svg class="chart-svg" :viewBox="`0 0 ${prepPlot.width} ${prepPlot.height}`" role="img" :aria-label="prepAria" aria-describedby="prep-month-values">
            <title>Préparations par mois</title>
            <line class="grid-line" x1="12" :x2="prepPlot.width - 8" :y1="prepPlot.baseline" :y2="prepPlot.baseline" />
            <g v-for="(bar, index) in prepPlot.bars" :key="`bar-${index}`">
              <rect class="bar-mag" :x="bar.xMag" :y="bar.yMag" :width="BAR_W" :height="bar.hMag" />
              <rect class="bar-off" :x="bar.xOff" :y="bar.yOff" :width="BAR_W" :height="bar.hOff" />
              <text class="axis-label" :x="bar.xMag + BAR_W / 2" :y="bar.yMag - 6" text-anchor="middle">{{ bar.magistrale }}</text>
              <text class="axis-label" :x="bar.xOff + BAR_W / 2" :y="bar.yOff - 6" text-anchor="middle">{{ bar.officinale }}</text>
              <text class="axis-label" :x="bar.labelX" :y="prepPlot.baseline + 22" text-anchor="middle">{{ bar.label }}</text>
            </g>
          </svg>
          <ul class="legend">
            <li>Magistrale : barre de gauche</li>
            <li>Officinale : barre de droite</li>
          </ul>
          <table id="prep-month-values" class="data equivalent">
            <caption>Équivalent textuel</caption>
            <thead>
              <tr>
                <th scope="col">Mois</th>
                <th scope="col">Magistrale</th>
                <th scope="col">Officinale</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(bar, index) in prepPlot.bars" :key="`month-${index}`">
                <td>{{ bar.label }}</td>
                <td>{{ bar.magistrale }}</td>
                <td>{{ bar.officinale }}</td>
              </tr>
            </tbody>
          </table>
        </template>
        <p v-else class="empty-state">Aucune préparation à répartir par mois.</p>
      </figure>

      <div v-if="onControles" class="gauge-card">
        <h3>
          <AppIcon name="check" :size="18" />
          Taux de conformité des contrôles
        </h3>
        <p v-if="controleStats.percent === null">Aucun contrôle enregistré</p>
        <template v-else>
          <svg class="meter" viewBox="0 0 100 10" role="img" :aria-label="`Taux de conformité ${controleStats.percentLabel}`">
            <title>Taux de conformité des contrôles</title>
            <rect class="meter-track" x="0" y="0" width="100" height="10" />
            <rect class="meter-fill" x="0" y="0" :width="controleStats.meterWidth" height="10" />
          </svg>
          <p class="gauge-value">{{ controleStats.percentLabel }}</p>
          <p>{{ controleStats.phrase }}</p>
        </template>
      </div>

      <p v-if="onBalance" class="retention-note">
        <AppIcon name="info" :size="16" />
        <span>La courbe reprend les entrées, les sorties et le solde des lignes de cette balance.</span>
      </p>
      <p v-if="!filtered.length" class="empty-state">Aucune ligne enregistrée pour « {{ currentLabel }} ». Ajoutez une ligne pour compléter cette section.</p>
      <p v-else-if="!visible.length" class="empty-state">Aucune ligne ne correspond à ce filtre.</p>
      <div v-else class="table-scroll">
        <table class="data">
          <thead>
            <tr>
              <th v-for="(column, index) in activeColumns" :key="`${column}-${index}`" scope="col">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in visible" :key="line.id">
              <td v-for="(cell, index) in line.cells" :key="index">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <AppModal v-model="modal" title="Ajouter une ligne" eyebrow="SAISIE">
      <form @submit.prevent="save">
        <div class="form-body">
          <label>Section
            <select v-model="draft.section" required @change="onDraftSection">
              <option v-for="part in workspace.sections" :key="part.id" :value="part.id">{{ part.label }}</option>
            </select>
          </label>
          <label v-for="(column, index) in draftColumns" :key="`${column}-${index}`">{{ column }}
            <input v-model="draft.cells[index]" required maxlength="180" :placeholder="placeholderFor(column)" />
          </label>
        </div>
        <div class="modal-footer">
          <button class="button secondary" type="button" @click="modal = false">Annuler</button>
          <button class="button primary" type="submit">Enregistrer la ligne</button>
        </div>
      </form>
    </AppModal>
    <AppModal v-model="rectifOpen" title="Écriture rectificative" eyebrow="REGISTRE">
      <form @submit.prevent="saveRectif">
        <div class="form-body">
          <p class="form-intro">Cette écriture s’ajoute au registre. L’écriture d’origine reste inchangée.</p>
          <label v-for="(column, index) in rectifColumns" :key="`rectif-${column}-${index}`">{{ column }}
            <input v-model="rectif.cells[index]" required maxlength="180" />
          </label>
          <label>Motif
            <textarea v-model="rectif.motif" required maxlength="400" rows="3" />
          </label>
          <p v-if="rectifError" class="form-error">{{ rectifError }}</p>
        </div>
        <div class="modal-footer">
          <button class="button secondary" type="button" @click="rectifOpen = false">Annuler</button>
          <button class="button primary" type="submit">Ajouter l’écriture</button>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<style scoped>
.title-line { display: flex; align-items: center; gap: 10px; }
.title-line svg { flex-shrink: 0; }
.heading-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
.heading-actions .button { display: inline-flex; align-items: center; gap: 8px; }
.panel-tools { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
.section-filter { display: grid; gap: 6px; min-width: 220px; font-size: 15px; font-weight: 600; white-space: normal; }
.section-filter select,
.form-body input,
.form-body select,
.form-body textarea { font-size: 15px; padding: 8px 10px; width: 100%; }
.form-body label { display: grid; gap: 6px; white-space: normal; font-size: 15px; }
.form-body textarea { min-height: 90px; resize: vertical; }
.form-intro,
.form-error { margin: 0; }
.filter-field { display: flex; align-items: center; gap: 6px; border: 1px solid #d5dee8; border-radius: 8px; padding: 0 8px; background: #fff; }
.filter-field input { border: 0; width: 100%; min-width: 0; padding: 8px 0; background: transparent; }
.retention,
.retention-note,
.chart-card figcaption,
.gauge-card h3 { display: flex; align-items: center; gap: 8px; }
.retention,
.retention-note { margin: 0 0 14px; }
.retention { font-weight: 700; }
.chart-card,
.gauge-card {
  margin: 0 0 16px;
  padding: 14px 16px;
  border: 1px solid #d5dee8;
  border-left-width: 1px;
  border-left-color: #d5dee8;
  border-radius: 12px;
  background: #fff;
}
.chart-card { margin-bottom: 16px; }
.chart-svg { width: 100%; height: auto; display: block; }
.legend { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 10px 0 0; padding: 0; list-style: none; }
.equivalent-title { font-weight: 700; margin: 12px 0 0; }
.text-equivalent { margin: 6px 0 0; padding-left: 18px; }
.text-equivalent li { margin: 4px 0; }
.equivalent { margin-top: 12px; }
.equivalent caption { caption-side: top; text-align: left; font-weight: 700; padding: 0 0 8px; }
.gauge-value { font-size: 28px; font-weight: 700; margin: 8px 0; }
.meter { width: min(100%, 420px); height: 16px; display: block; margin: 8px 0; }
.grid-line { stroke: #e3e9e4; stroke-width: 1; }
.axis-label { fill: #73847e; font-size: 12px; font-family: inherit; }
.line-in { fill: none; stroke: #146853; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.line-out { fill: none; stroke: #203c38; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 6 4; }
.line-bal { fill: none; stroke: #73847e; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 2 3; }
.dot-in { fill: #146853; }
.dot-out { fill: #203c38; }
.dot-bal { fill: #73847e; }
.bar-mag { fill: #146853; }
.bar-off { fill: #203c38; }
.meter-track { fill: #e3e9e4; }
.meter-fill { fill: #146853; }
.page > .panel { border-left-width: 1px; border-left-color: #d5dee8; }
table.data th,
table.data td { font-size: 15px !important; line-height: 1.45; }
</style>
