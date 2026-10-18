<script>
  import { tick } from 'svelte'
  import { isAddress, ZeroAddress } from 'ethers'
  import { beneficiaries, deleteBeneficiary, saveBeneficiary } from '../../stores/beneficiaries.js'
  export let selectedAddress = ''
  export let recent = []
  export let contextKey = ''
  export let disabled = false
  export let onRepeat = () => {}
  let search = '', deleteId = '', error = ''
  let editing = null, editName = '', editAddress = '', editError = ''
  let editTrigger = null
  $: if (editing && (disabled || !contacts.some((item) => item.id === editing.id))) closeEdit()
  const hiddenKey = 'inkapay:frequents:hidden:v1'
  let hidden = readHidden()
  // Conserva los frecuentes del historial anterior, aunque no se guardaran como contactos.
  $: historical = recentRecipients(recent)
  $: contacts = [...$beneficiaries, ...historical.filter((item) => !$beneficiaries.some((saved) => saved.address.toLowerCase() === item.address.toLowerCase()) && hidden[`${contextKey}:${item.address.toLowerCase()}`] !== item.lastHash)]
  $: query = contacts.length > 5 ? search.trim().toLowerCase() : ''
  $: filtered = contacts.filter((item) => `${item.name} ${item.address}`.toLowerCase().includes(query))
  const initials = (name) => name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  function readHidden() {
    try {
      const value = JSON.parse(localStorage.getItem(hiddenKey) || '{}')
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
    } catch { return {} }
  }
  function recentRecipients(items) {
    const unique = new Map()
    for (const tx of [...items].filter((tx) => tx.status === 'Confirmada' && tx.to && tx.hash).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))) {
      const address = tx.to.toLowerCase()
      if (!unique.has(address)) unique.set(address, { id: `frequent:${address}`, name: tx.beneficiaryName || 'Familiar', address: tx.to, lastHash: tx.hash, fromHistory: true })
    }
    return [...unique.values()]
  }
  async function startEdit(item, trigger) {
    if (disabled) return
    editing = item; editName = item.name; editAddress = item.address; editError = ''; deleteId = ''; editTrigger = trigger
    await tick()
    document.getElementById('beneficiary-edit-name')?.focus()
  }
  function closeEdit() { editing = null; editError = ''; void tick().then(() => { if (editTrigger?.isConnected) editTrigger.focus() }) }
  function saveEdit(event) {
    event.preventDefault()
    if (disabled || !editing) return
    if (!editName.trim() || !isAddress(editAddress.trim()) || editAddress.trim() === ZeroAddress) { editError = 'Escribe un nombre y una dirección válida distinta de cero.'; return }
    try { saveBeneficiary({ id: editing.fromHistory ? '' : editing.id, name: editName, address: editAddress.trim() }); closeEdit() }
    catch { editError = 'No se pudo guardar el beneficiario en este navegador.' }
  }
  function remove(item) {
    if (disabled) return
    try {
      // Ocultar un frecuente nunca elimina sus remesas ni sus comprobantes.
      const latest = historical.find((tx) => tx.address.toLowerCase() === item.address.toLowerCase())
      const next = latest ? { ...hidden, [`${contextKey}:${item.address.toLowerCase()}`]: latest.lastHash } : hidden
      localStorage.setItem(hiddenKey, JSON.stringify(next))
      if (!item.fromHistory) deleteBeneficiary(item.id)
      hidden = next; deleteId = ''; error = ''
    }
    catch { error = 'No se pudo eliminar el beneficiario en este navegador.' }
  }
</script>

<section class="panel" aria-label="Beneficiarios frecuentes">
  <header><span class="eyebrow">Tu círculo cercano</span><h3>Beneficiarios frecuentes</h3></header>
  {#if contacts.length > 5}<label class="search"><span>Buscar beneficiario</span><input type="search" bind:value={search} placeholder="Nombre o dirección" /></label>{/if}
  <div class="list">
    {#each filtered as item (item.id)}
      <div class="row" class:selected={selectedAddress.toLowerCase() === item.address.toLowerCase()}>
        <div class="choose"><span class="avatar" aria-hidden="true">{initials(item.name)}</span><span class="info"><strong>{item.name}</strong><small title={item.address}>{item.address.slice(0, 6)}…{item.address.slice(-4)}</small></span></div>
        <div class="actions"><button type="button" onclick={() => onRepeat(item)} {disabled} aria-label={`Volver a elegir a ${item.name}`} title="Precargar nombre y dirección en el paso 1"><i class="ri-repeat-line" aria-hidden="true"></i><span>Volver a elegir</span></button><button type="button" onclick={(event) => startEdit(item, event.currentTarget)} {disabled} aria-label={`Editar a ${item.name}`} title="Editar"><i class="ri-edit-line" aria-hidden="true"></i></button><button type="button" onclick={() => deleteId = item.id} {disabled} aria-label={`Eliminar a ${item.name}`} title="Eliminar"><i class="ri-delete-bin-line" aria-hidden="true"></i></button></div>
        {#if editing?.id === item.id}
          <form class="editor" aria-label={`Editar beneficiario ${item.name}`} onsubmit={saveEdit}>
            <label for="beneficiary-edit-name">Nombre del beneficiario</label>
            <input id="beneficiary-edit-name" bind:value={editName} maxlength="50" required {disabled} />
            <label for="beneficiary-edit-address">Dirección del beneficiario</label>
            <input id="beneficiary-edit-address" bind:value={editAddress} spellcheck="false" required {disabled} />
            {#if editError}<p class="error" role="alert">{editError}</p>{/if}
            <div class="actions"><button type="submit" {disabled}>Guardar cambios</button><button type="button" onclick={closeEdit}>Cancelar</button></div>
          </form>
        {/if}
        {#if deleteId === item.id}<div class="confirmation" role="group" aria-label={`Confirmar eliminación de ${item.name}`}><p>¿Eliminar a {item.name} de tus beneficiarios?</p><div class="actions"><button type="button" onclick={() => remove(item)} {disabled}>Sí, eliminar</button><button type="button" onclick={() => deleteId = ''}>Cancelar</button></div></div>{/if}
      </div>
    {:else}<p class="empty">{contacts.length ? 'No hay beneficiarios que coincidan con tu búsqueda.' : 'Aún no tienes beneficiarios guardados'}</p>{/each}
  </div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</section>

<style>
  .panel{background:var(--surface-panel);border:1px solid var(--border-panel);border-radius:var(--radius-panel);box-shadow:var(--shadow-panel);padding:var(--space-5);width:100%;min-width:0;min-height:0;display:flex;flex-direction:column;gap:var(--space-4)}header{flex:none}.eyebrow{color:var(--accent-primary);text-transform:uppercase;letter-spacing:.1em;font-size:.65rem}h3{font:600 1.05rem var(--font-heading);letter-spacing:-.03em;margin:var(--space-2) 0 0}.list{display:grid;gap:var(--space-3);overflow-y:auto;min-height:0;padding:2px;scrollbar-gutter:stable}.row{border:1px solid var(--border-input);border-radius:var(--radius-control);background:var(--surface-input);min-width:0}.row:hover,.row.selected{border-color:color-mix(in srgb,var(--accent-primary) 50%,var(--border-input));background:color-mix(in srgb,var(--accent-primary) 4%,var(--surface-input))}button,input{font:inherit;color:var(--text-primary);background:var(--surface-input);border:1px solid var(--border-input);border-radius:var(--radius-control);cursor:pointer}button:hover:not(:disabled){border-color:var(--accent-primary);color:var(--accent-primary)}button:disabled{opacity:.5;cursor:not-allowed}button:focus-visible,input:focus-visible{outline:2px solid var(--accent-primary);outline-offset:-3px}.choose{display:flex;align-items:center;gap:var(--space-2);width:100%;text-align:left;padding:var(--space-3);border:0;background:transparent}.avatar{width:32px;height:32px;border-radius:var(--radius-control);display:grid;place-items:center;flex:none;background:var(--bg-card);color:var(--accent-secondary);font:600 .75rem var(--font-heading)}.info{display:flex;flex-direction:column;gap:var(--space-1);flex:1;min-width:0}.info strong{font-size:.8rem;overflow-wrap:anywhere}small{color:var(--text-secondary);font-size:.7rem}.actions{display:flex;justify-content:flex-end;gap:var(--space-1);padding:0 var(--space-2) var(--space-2);flex-wrap:wrap}.actions button{padding:6px;font-size:.68rem;border-color:transparent;background:transparent;display:flex;gap:4px;align-items:center}.actions button i{font-size:.85rem}.search{display:grid;gap:var(--space-2);font-size:.75rem;color:var(--text-secondary)}input{cursor:text;width:100%;min-width:0;padding:var(--space-3);font-size:.8rem}.confirmation{border-top:1px solid var(--border-card);padding-top:var(--space-2)}p{font-size:.75rem;line-height:1.6;color:var(--text-secondary);margin:0;padding:var(--space-2) var(--space-3)}.empty{border:1px dashed var(--border-input);border-radius:var(--radius-control);padding:var(--space-4)}.error{color:var(--text-error)}
  .editor{grid-column:1/-1;display:grid;gap:8px;padding:12px;border-top:1px solid var(--border-card)}.editor label{font-size:.75rem}.editor input{font-size:.8rem;padding:9px;cursor:text}.editor .actions{padding:4px 0 0}.editor p{padding:0}
  @media(min-width:1280px) and (max-width:1399px){.panel{padding:var(--space-4)}}
  @media(max-width:700px){.panel{padding:var(--space-4)}}
  @media(min-width:1001px){
    .panel{height:100%;padding:20px;gap:18px}.list{flex:1;align-content:start;gap:7px}.eyebrow{font-size:.58rem}h3{font-size:.9rem;margin-top:5px}.row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center}.choose{padding:9px 7px;gap:7px}.avatar{width:28px;height:28px;font-size:.65rem}.info strong{font-size:.73rem}.info small{font-size:.63rem}.row>.actions{padding:0 4px 0 0;gap:0;flex-wrap:nowrap}.row>.actions button{padding:5px}.row>.actions span{display:none}.confirmation{grid-column:1/-1}.search{font-size:.7rem;gap:6px}.search input{font-size:.73rem;padding:8px}.empty{font-size:.72rem;padding:12px}
  }
  @media(min-width:1001px) and (max-height:800px){.panel{padding:12px;gap:12px}.eyebrow{display:none}h3{margin:0}.choose{padding:7px 5px}.row>.actions button{padding:4px}}
</style>
