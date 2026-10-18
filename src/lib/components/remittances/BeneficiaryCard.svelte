<script>
  export let beneficiary
  export let selected = false
  export let onSelect = () => {}
  export let onEdit = () => {}
  export let onDelete = () => {}
  $: initials = beneficiary.name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
</script>

<div class="card" class:selected>
  <button class="select" type="button" onclick={onSelect} aria-pressed={selected}>
    <span class="avatar" aria-hidden="true">{initials}</span><span class="info"><strong>{beneficiary.name}</strong><small>{beneficiary.address.slice(0, 8)}…{beneficiary.address.slice(-6)}</small></span><span aria-hidden="true">{selected ? '✓' : '→'}</span>
  </button>
  <div class="actions"><button type="button" onclick={onEdit} aria-label={`Editar a ${beneficiary.name}`}>Editar</button><button type="button" onclick={onDelete} aria-label={`Eliminar a ${beneficiary.name}`}>Eliminar</button></div>
</div>

<style>
  .card{background:var(--surface-input);border:1px solid var(--border-input);border-radius:var(--radius-control);overflow:hidden}.card:hover,.selected{border-color:var(--accent-primary)}button{font:inherit;cursor:pointer;background:transparent;border:0;color:var(--text-primary)}button:focus-visible{outline:2px solid var(--accent-primary);outline-offset:-3px}.select{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-4);width:100%;text-align:left}.avatar{display:grid;place-items:center;flex:none;width:40px;height:40px;border-radius:var(--radius-control);background:var(--bg-card);color:var(--accent-secondary);font-family:var(--font-heading)}.info{display:flex;flex-direction:column;gap:var(--space-1);flex:1;min-width:0;overflow-wrap:anywhere}small{color:var(--text-secondary);font-size:.75rem}.actions{display:flex;justify-content:flex-end;gap:var(--space-3);border-top:1px solid var(--border-card);padding:var(--space-2) var(--space-3)}.actions button{font-size:.75rem;color:var(--text-secondary);padding:var(--space-1)}.actions button:hover{color:var(--accent-primary)}
</style>
