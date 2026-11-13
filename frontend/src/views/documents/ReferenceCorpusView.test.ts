// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ReferenceCorpusView from './ReferenceCorpusView.vue'

// Deliberately synthetic test fixtures; no real corpus is bundled in the frontend.
const source = {
  id: 'a'.repeat(24), titre: 'Source synthétique de test', rubrique: 'Rubrique test',
  fichier: 'tests/source-test.docx', sha256: 'b'.repeat(64), parties_count: 1, images_count: 0,
  integrity: { status: 'verified', actual_sha256: 'b'.repeat(64) }, approval_status: 'reference_only',
}
const catalogue = () => ({ data: [source], meta: {
  total: 7, filtered: 1, rubriques: [{ rubrique: 'Rubrique test', count: 7 }],
  integrity: { verified: 4, mismatch: 1, missing: 1, unsafe: 1 }, approval_status: 'reference_only',
} })
const detail = () => ({ data: { ...source, parties: [{ origine: 'test', blocs: [
  { type: 'paragraphe', texte: '<img src=x onerror="alert(1)"> Texte synthétique' },
  { type: 'tableau', lignes: [{ cellules: ['Cellule de test', '<script>unsafe()</script>'] }] },
] }], images: [] } })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})
const fetchMock = vi.fn<typeof fetch>()
const wrappers: VueWrapper[] = []
function render() {
  const wrapper = mount(ReferenceCorpusView, { attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}
async function open(wrapper: VueWrapper) {
  await wrapper.get('[data-tour="mod-source"] button').trigger('click')
  await flushPromises()
  return document.getElementById('mod-detail')!
}
function modalButton(text: string) {
  const button = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(item => item.textContent?.includes(text))
  expect(button).toBeTruthy()
  return button!
}
async function confirmImport() {
  const checkbox = document.querySelector<HTMLInputElement>('[data-testid="mod-import-confirmation"]')!
  checkbox.checked = true
  checkbox.dispatchEvent(new Event('change', { bubbles: true }))
  await flushPromises()
}
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  sessionStorage.clear()
  sessionStorage.setItem('bestpharma.token', 'test-token')
  sessionStorage.setItem('bestpharma.officine', 'test-office')
})
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
  document.body.innerHTML = ''
})

describe('Catalogue privé de référence', () => {
  it('charge la vraie API authentifiée même en mode démo et affiche uniquement les compteurs serveur', async () => {
    fetchMock.mockResolvedValueOnce(json(catalogue()))
    const wrapper = render()
    expect(wrapper.get('[role="status"]').text()).toContain('Chargement')
    expect(wrapper.get('#mod-catalogue-compteur').text()).not.toContain('7 sources')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/documents/library/reference-corpus?rubrique=&search=', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'X-Officine-ID': 'test-office' }),
    }))
    expect(wrapper.get('#mod-catalogue-compteur strong').text()).toBe('7')
    expect(wrapper.get('[data-testid="mod-catalogue-compteur"]').attributes('id')).toBe('mod-catalogue-compteur')
    expect(wrapper.get(`[data-testid="mod-modele-${source.id}"]`).attributes('id')).toBe(`mod-modele-${source.id}`)
    expect(wrapper.get('[data-testid="mod-recherche"]').attributes('id')).toBe('mod-recherche')
    expect(wrapper.get('[data-testid="mod-rubrique"]').attributes('id')).toBe('mod-rubrique')
    expect(wrapper.get('#mod-catalogue-compteur').text()).toContain('1 rubriques')
    expect(wrapper.findAll('dd').map(item => item.text())).toEqual(['4', '1', '1', '1'])
    expect(wrapper.get('[data-tour="mod-source"] h2').text()).toBe(source.titre)
    expect(wrapper.text()).toContain('Sources de référence — non approuvées')
    expect(wrapper.text()).toContain('Import en quarantaine par la GED')
    expect(wrapper.findAll('button').some(button => /approuver|adopter/i.test(button.text()))).toBe(false)
  })

  it('transmet recherche et rubrique au serveur et distingue le vide filtré', async () => {
    fetchMock.mockResolvedValueOnce(json(catalogue()))
    const wrapper = render()
    await flushPromises()
    fetchMock.mockResolvedValueOnce(json({ ...catalogue(), data: [], meta: { ...catalogue().meta, filtered: 0 } }))
    await wrapper.get('#mod-recherche').setValue('aucun & test')
    await flushPromises()
    expect(String(fetchMock.mock.calls[1]![0])).toContain('search=aucun+%26+test')
    expect(wrapper.text()).toContain('Aucune source ne correspond')
    expect(wrapper.get('#mod-catalogue-compteur strong').text()).toBe('7')
    fetchMock.mockResolvedValueOnce(json(catalogue()))
    await wrapper.get('#mod-rubrique').setValue('Rubrique test')
    await flushPromises()
    const query = new URL(String(fetchMock.mock.calls[2]![0]), 'https://test.invalid').searchParams
    expect(query.get('rubrique')).toBe('Rubrique test')
    expect(query.get('search')).toBe('aucun & test')
  })

  it.each([
    [503, 'Service indisponible pour le test'], [403, 'Accès au corpus refusé pour le test'],
  ])('affiche une erreur HTTP %s sans faux catalogue vide et permet de réessayer', async (status, message) => {
    fetchMock.mockResolvedValueOnce(json({ message }, status))
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('#mod-erreur').text()).toContain(message)
    expect(wrapper.get('[data-testid="mod-erreur"]').attributes('id')).toBe('mod-erreur')
    expect(wrapper.text()).not.toContain('Aucune source disponible')
    expect(wrapper.get('#mod-catalogue-compteur strong').text()).toBe('—')
    fetchMock.mockResolvedValueOnce(json(catalogue()))
    await wrapper.get('#mod-erreur button').trigger('click')
    await flushPromises()
    expect(wrapper.find('#mod-erreur').exists()).toBe(false)
    expect(wrapper.get('#mod-catalogue-compteur strong').text()).toBe('7')
  })

  it('ne présente pas une réponse illisible comme un catalogue vide', async () => {
    fetchMock.mockResolvedValueOnce(new Response('not json'))
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('#mod-erreur').text()).toContain('Réponse du catalogue invalide')
    expect(wrapper.text()).not.toContain('Aucune source disponible')
  })

  it('affiche un catalogue réellement vide sans documents inventés', async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [], meta: { ...catalogue().meta, total: 0, filtered: 0, rubriques: [] } }))
    const wrapper = render()
    await flushPromises()
    expect(wrapper.get('#mod-catalogue-compteur strong').text()).toBe('0')
    expect(wrapper.text()).toContain('Aucune source disponible')
    expect(wrapper.find('[data-tour="mod-source"]').exists()).toBe(false)
  })

  it('conserve le refus 403 dans la modale et ne propose aucun téléchargement', async () => {
    fetchMock.mockResolvedValueOnce(json(catalogue())).mockResolvedValueOnce(json({ message: 'Consultation réservée aux gestionnaires.' }, 403))
    const wrapper = render()
    await flushPromises()
    const content = await open(wrapper)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(content.querySelector('[role="alert"]')?.textContent).toContain('Consultation réservée aux gestionnaires.')
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('Télécharger pour examen')
    fetchMock.mockResolvedValueOnce(json(detail()))
    modalButton('Réessayer la consultation').click()
    await flushPromises()
    expect(content.querySelector('[role="alert"]')).toBeNull()
    expect(content.textContent).toContain('Texte synthétique')
  })

  it('rend le contenu structuré en texte échappé, y compris les cellules', async () => {
    fetchMock.mockResolvedValueOnce(json(catalogue())).mockResolvedValueOnce(json(detail()))
    const wrapper = render()
    await flushPromises()
    const content = await open(wrapper)
    expect(fetchMock.mock.calls[1]![0]).toBe(`/api/v1/documents/library/reference-corpus/${source.id}`)
    expect(content.textContent).toContain('<img src=x onerror="alert(1)">')
    expect(content.textContent).toContain('<script>unsafe()</script>')
    expect(content.textContent).toContain('Cellule de test')
    expect(content.querySelector('img, script, table')).toBeNull()
    expect(content.querySelectorAll('.source-part')).toHaveLength(1)
    expect(content.dataset.testid).toBe('mod-detail')
    expect(content.classList.contains('corpus-detail')).toBe(true)
  })

  it('vérifie response.ok avant tout blob et affiche le refus de téléchargement', async () => {
    const denied = json({ message: 'Fichier refusé par le serveur.' }, 403)
    const blob = vi.spyOn(denied, 'blob')
    fetchMock.mockResolvedValueOnce(json(catalogue())).mockResolvedValueOnce(json(detail())).mockResolvedValueOnce(denied)
    const wrapper = render()
    await flushPromises()
    const content = await open(wrapper)
    modalButton('Télécharger pour examen').click()
    await flushPromises()
    expect(content.querySelector('[role="alert"]')?.textContent).toContain('Fichier refusé par le serveur.')
    expect(blob).not.toHaveBeenCalled()
    expect(fetchMock.mock.calls[2]).toEqual([`/api/v1/documents/library/reference-corpus/${source.id}/file`, {
      headers: { Accept: 'application/octet-stream', Authorization: 'Bearer test-token', 'X-Officine-ID': 'test-office' },
    }])
  })

  it('télécharge avec un nom sûr puis révoque son URL blob', async () => {
    const originalURL = URL
    const createObjectURL = vi.fn(() => 'blob:test-source')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', class extends originalURL { static createObjectURL = createObjectURL; static revokeObjectURL = revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('test_.docx')
      expect(this.href).toBe('blob:test-source')
    })
    fetchMock.mockResolvedValueOnce(json({ ...catalogue(), data: [{ ...source, fichier: '../../test?.docx' }] }))
      .mockResolvedValueOnce(json(detail())).mockResolvedValueOnce(new Response('synthetic test file'))
    const wrapper = render()
    await flushPromises()
    await open(wrapper)
    modalButton('Télécharger pour examen').click()
    await flushPromises()
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-source')
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('ignore les anciennes réponses après une nouvelle recherche', async () => {
    let resolveInitial!: (response: Response) => void
    fetchMock.mockReturnValueOnce(new Promise(resolve => { resolveInitial = resolve }))
      .mockResolvedValueOnce(json({ ...catalogue(), meta: { ...catalogue().meta, total: 9 } }))
    const wrapper = render()
    await wrapper.get('#mod-recherche').setValue('récent')
    await flushPromises()
    resolveInitial(json(catalogue()))
    await flushPromises()
    expect(wrapper.get('#mod-catalogue-compteur strong').text()).toBe('9')
  })

  it('exige une confirmation explicite puis affiche le succès 201 et le lien de qualification', async () => {
    fetchMock.mockResolvedValueOnce(json(catalogue())).mockResolvedValueOnce(json(detail()))
      .mockResolvedValueOnce(json({ created: true, data: { id: 42, status: 'quarantine' } }, 201))
    const wrapper = render()
    await flushPromises()
    const content = await open(wrapper)
    const button = modalButton('Importer dans ma GED en quarantaine')
    expect(button.disabled).toBe(true)
    button.click()
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(content.querySelector<HTMLInputElement>('#mod-import-confirmation')?.checked).toBe(false)
    await confirmImport()
    expect(button.disabled).toBe(false)
    button.click()
    await flushPromises()
    expect(fetchMock.mock.calls[2]).toEqual([`/api/v1/documents/library/reference-corpus/${source.id}/imports`, expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'X-Officine-ID': 'test-office' }),
    })])
    const result = content.querySelector('[data-testid="mod-import-resultat"]')!
    expect(result.textContent).toContain('Source importée dans votre GED.')
    expect(result.textContent).toContain('Source GED 42')
    expect(result.textContent).toContain('En quarantaine')
    expect(result.querySelector('a')?.getAttribute('href')).toBe('/documents')
    expect(result.querySelector('a')?.textContent).toContain('qualifier')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="mod-importer"]')).toBeNull()
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
  })

  it.each([['quarantine', 'En quarantaine'], ['qualified', 'Qualifiée'], ['approved', 'Approuvée']])(
    'affiche le véritable état %s renvoyé par un import idempotent 200 sans le rétrograder', async (status, label) => {
      fetchMock.mockResolvedValueOnce(json(catalogue())).mockResolvedValueOnce(json(detail()))
        .mockResolvedValueOnce(json({ created: false, data: { id: 84, status } }, 200))
      const wrapper = render()
      await flushPromises()
      const content = await open(wrapper)
      await confirmImport()
      modalButton('Importer dans ma GED en quarantaine').click()
      await flushPromises()
      const result = content.querySelector('[data-testid="mod-import-resultat"]')!
      expect(result.textContent).toContain('Cette source existe déjà dans votre GED.')
      expect(result.textContent).toContain(`État retourné par le serveur : ${label}`)
      expect(result.textContent).not.toContain('Source importée dans votre GED.')
      if (status !== 'quarantine') {
        expect(result.textContent).toContain('L’état existant est conservé')
        expect(result.textContent).not.toContain('La source reste en quarantaine')
      }
      expect(result.querySelector('a')?.getAttribute('href')).toBe('/documents')
      expect(fetchMock).toHaveBeenCalledTimes(3)
    },
  )

  it.each([403, 409, 500])('garde la modale ouverte sur erreur d’import %s et permet de réessayer', async status => {
    fetchMock.mockResolvedValueOnce(json(catalogue())).mockResolvedValueOnce(json(detail()))
      .mockResolvedValueOnce(json({ message: `Import refusé test ${status}` }, status))
    const wrapper = render()
    await flushPromises()
    const content = await open(wrapper)
    await confirmImport()
    modalButton('Importer dans ma GED en quarantaine').click()
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(content.querySelector('[data-testid="mod-import-erreur"]')?.textContent).toContain(`Import refusé test ${status}`)
    expect(content.querySelector('[data-testid="mod-import-resultat"]')).toBeNull()
    expect(modalButton('Importer dans ma GED en quarantaine').disabled).toBe(false)
    fetchMock.mockResolvedValueOnce(json({ created: true, data: { id: 42, status: 'quarantine' } }, 201))
    modalButton('Importer dans ma GED en quarantaine').click()
    await flushPromises()
    expect(content.querySelector('[data-testid="mod-import-erreur"]')).toBeNull()
    expect(content.querySelector('[data-testid="mod-import-resultat"]')?.textContent).toContain('En quarantaine')
  })

  it('verrouille la confirmation et la modale pendant l’import et ignore le double clic', async () => {
    let resolveImport!: (response: Response) => void
    fetchMock.mockResolvedValueOnce(json(catalogue())).mockResolvedValueOnce(json(detail()))
      .mockReturnValueOnce(new Promise(resolve => { resolveImport = resolve }))
    const wrapper = render()
    await flushPromises()
    const content = await open(wrapper)
    await confirmImport()
    const button = modalButton('Importer dans ma GED en quarantaine')
    button.click()
    button.click()
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(button.disabled).toBe(true)
    expect(content.querySelector<HTMLInputElement>('#mod-import-confirmation')?.disabled).toBe(true)
    expect(modalButton('Fermer').disabled).toBe(true)
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-busy')).toBe('true')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    resolveImport(json({ created: true, data: { id: 42, status: 'quarantine' } }, 201))
    await flushPromises()
    expect(modalButton('Fermer').disabled).toBe(false)
    expect(content.querySelector('[data-testid="mod-import-resultat"]')).not.toBeNull()
  })

  it('ne propose pas d’import pour une source dont l’empreinte est altérée', async () => {
    fetchMock.mockResolvedValueOnce(json(catalogue())).mockResolvedValueOnce(json({ data: {
      ...detail().data, integrity: { status: 'mismatch', actual_sha256: 'c'.repeat(64) },
    } }))
    const wrapper = render()
    await flushPromises()
    await open(wrapper)
    expect(document.querySelector('[data-testid="mod-importer"]')).toBeNull()
    expect(document.querySelector('[data-testid="mod-import-confirmation"]')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
