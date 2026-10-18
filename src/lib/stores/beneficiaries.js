import { writable } from 'svelte/store'
import { isAddress } from 'ethers'

const KEY = 'inkapay:beneficiaries:v1'
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(saved) ? saved.filter((item) => item?.id && item.name && isAddress(item.address)) : []
  } catch { return [] }
}

export const beneficiaries = writable(load())
export function saveBeneficiary({ id, name, address }) {
  if (!isAddress(address) || !name.trim()) throw new Error('Escribe un alias y una dirección válida.')
  const item = { id: id || crypto.randomUUID(), name: name.trim(), address }
  beneficiaries.update((items) => {
    const next = [item, ...items.filter((entry) => entry.id !== id && entry.address.toLowerCase() !== address.toLowerCase())]
    // Se informa el fallo de almacenamiento antes de anunciar que se guardó.
    localStorage.setItem(KEY, JSON.stringify(next))
    return next
  })
  return item
}
export function deleteBeneficiary(id) {
  beneficiaries.update((items) => {
    const next = items.filter((entry) => entry.id !== id)
    localStorage.setItem(KEY, JSON.stringify(next))
    return next
  })
}
