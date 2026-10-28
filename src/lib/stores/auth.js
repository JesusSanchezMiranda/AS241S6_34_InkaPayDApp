import { writable, get } from 'svelte/store'
import { chooseWalletAccount, getAuthorizedAccounts, getWalletSnapshot } from '../services/evmWallet.js'

export const AUTH_SESSION_KEY = 'inkapay.auth.session.v1'
// La sesión local caduca a las 24 horas; volver a elegir la cuenta renueva el acceso.
export const AUTH_SESSION_TTL_MS = 24 * 60 * 60 * 1000
const AUTH_SESSION_VERSION = 2

const anonymousState = () => ({
  status: 'anonymous',
  authenticated: false,
  address: '',
  chainId: null,
  networkName: '',
  issuedAt: 0,
  expiresAt: 0,
  error: ''
})

export const auth = writable(anonymousState())

const hasStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage)

function readStoredSession() {
  if (!hasStorage()) return null
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    clearStoredSession()
    return null
  }
}

function persistSession(session) {
  if (!hasStorage()) return
  try {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  } catch {
    // El navegador puede bloquear el almacenamiento; la sesión sigue activa en memoria.
  }
}

function clearStoredSession() {
  if (!hasStorage()) return
  try {
    window.localStorage.removeItem(AUTH_SESSION_KEY)
  } catch {
    // Sin acceso al almacenamiento no hay nada que limpiar.
  }
}

function isSessionValid(session) {
  return Boolean(
    session &&
    session.version === AUTH_SESSION_VERSION &&
    session.address &&
    Number(session.expiresAt) > Date.now()
  )
}

function sessionState(session) {
  return {
    status: 'authenticated',
    authenticated: true,
    address: session.address,
    chainId: session.chainId,
    networkName: session.networkName,
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
    error: ''
  }
}

export function describeAuthError(error) {
  const rawCode = error?.code
  const message = String(error?.message || '')
  if (Number(rawCode) === 4001 || rawCode === 'ACTION_REJECTED' || /reject|cancel|deneg|denied/i.test(message)) {
    return 'Cancelaste la solicitud en la wallet. No se inició sesión.'
  }
  if (/no se encontró una wallet/i.test(message)) {
    return 'No se encontró Pali Wallet ni una wallet EVM compatible. Instálala o actívala para continuar.'
  }
  if (/no devolvió ninguna cuenta/i.test(message)) {
    return 'La wallet no devolvió ninguna cuenta. Desbloquéala e inténtalo de nuevo.'
  }
  if (/no está autorizada|not authorized|unauthorized/i.test(message)) {
    return 'La cuenta elegida ya no está autorizada en la wallet. Vuelve a elegirla e inténtalo de nuevo.'
  }
  if (Number(rawCode) === 4100 || Number(rawCode) === 4900) {
    return 'La wallet no autorizó la cuenta elegida. Desbloquéala, vuelve a elegirla e inténtalo de nuevo.'
  }
  return message || 'No se pudo iniciar sesión con la wallet.'
}

/**
 * Inicia sesión con la cuenta elegida en el selector de la wallet.
 * 1. Abre el selector de Pali (o solicita permisos en wallets EIP-2255).
 * 2. Toma la cuenta activa que devuelve la wallet.
 * 3. Guarda una sesión local de 24 h, sin firmar mensajes ni enviar transacciones.
 * Si se pasa una dirección, se usa solo si sigue autorizada.
 * Devuelve el snapshot de la wallet para actualizar el store compartido.
 */
export async function signIn(preferredAddress) {
  const previous = get(auth)
  auth.set({ ...previous, status: 'authenticating', error: '' })

  try {
    const requested = String(preferredAddress || '').trim()
    let address = requested

    if (address) {
      const authorized = await getAuthorizedAccounts()
      const match = authorized.find((account) => account.toLowerCase() === address.toLowerCase())
      if (!match) {
        throw new Error('La cuenta elegida ya no está autorizada en la wallet. Vuelve a elegirla e inténtalo de nuevo.')
      }
      address = match
    } else {
      const result = await chooseWalletAccount()
      address = result.accounts[0] || ''
      if (!address) {
        throw new Error('La wallet no devolvió ninguna cuenta. Desbloquéala e inténtalo de nuevo.')
      }
    }

    const snapshot = await getWalletSnapshot(address)
    const issuedAt = Date.now()
    const session = {
      version: AUTH_SESSION_VERSION,
      address: snapshot.address,
      chainId: snapshot.chainId,
      networkName: snapshot.network?.name || `Red ${snapshot.chainId}`,
      issuedAt,
      expiresAt: issuedAt + AUTH_SESSION_TTL_MS
    }

    persistSession(session)
    auth.set(sessionState(session))
    return snapshot
  } catch (error) {
    auth.set({
      ...(previous.authenticated ? previous : anonymousState()),
      status: previous.authenticated ? 'authenticated' : 'anonymous',
      error: describeAuthError(error)
    })
    throw error
  }
}

/**
 * Restaura una sesión guardada sin abrir el diálogo de la wallet.
 * Solo se acepta si la cuenta de la sesión sigue entre las cuentas autorizadas.
 */
export async function restoreAuthSession() {
  const stored = readStoredSession()
  if (!stored) {
    auth.set(anonymousState())
    return null
  }

  auth.set({ ...anonymousState(), status: 'restoring' })

  if (!isSessionValid(stored)) {
    clearStoredSession()
    auth.set(anonymousState())
    return null
  }

  try {
    // La extensión puede inyectarse unos milisegundos después de montar la app.
    let authorized = await getAuthorizedAccounts()
    if (!authorized.length) {
      await new Promise((resolve) => setTimeout(resolve, 350))
      authorized = await getAuthorizedAccounts()
    }

    // Si el usuario empezó a iniciar sesión o cerró sesión mientras se restauraba,
    // esta restauración ya no debe pisar el estado más reciente.
    if (get(auth).status !== 'restoring') return null

    if (!authorized.length) {
      // La wallet está bloqueada o no está disponible: conserva la sesión para el próximo intento.
      if (get(auth).status === 'restoring') auth.set(anonymousState())
      return null
    }

    // La wallet puede tener varias cuentas autorizadas; basta con que la de la sesión siga entre ellas.
    if (!authorized.some((account) => account.toLowerCase() === stored.address.toLowerCase())) {
      if (get(auth).status !== 'restoring') return null
      clearStoredSession()
      auth.set(anonymousState())
      return null
    }

    const snapshot = await getWalletSnapshot(stored.address)
    if (get(auth).status !== 'restoring') return null

    const session = {
      ...stored,
      chainId: snapshot.chainId ?? stored.chainId,
      networkName: snapshot.network?.name || stored.networkName
    }

    persistSession(session)
    auth.set(sessionState(session))
    return snapshot
  } catch {
    // Un fallo de RPC no invalida la sesión; se reintentará en la próxima carga.
    if (get(auth).status === 'restoring') auth.set(anonymousState())
    return null
  }
}

export function signOut() {
  clearStoredSession()
  auth.set(anonymousState())
}
