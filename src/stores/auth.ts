import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { verifyPassword } from '@/api/client'

export const useAuthStore = defineStore('auth', () => {
  const adminPassword = ref<string | null>(null)
  const showModal = ref(false)
  const modalError = ref(false)
  const pendingCallback = ref<(() => void) | null>(null)

  const isAdmin = computed(() => !!adminPassword.value)

  const LOCAL_DEV = typeof window !== 'undefined'
    && (location.protocol === 'file:'
      || location.hostname === 'localhost'
      || location.hostname === '127.0.0.1')

  function initLocalDev(): void {
    if (LOCAL_DEV) {
      adminPassword.value = 'local'
    }
  }

  function requireAdmin(callback: () => void): void {
    if (isAdmin.value) {
      callback()
      return
    }
    pendingCallback.value = callback
    modalError.value = false
    showModal.value = true
  }

  async function submitPassword(pw: string): Promise<boolean> {
    const ok = await verifyPassword(pw)
    if (!ok) {
      modalError.value = true
      return false
    }

    adminPassword.value = pw
    showModal.value = false
    modalError.value = false

    if (pendingCallback.value) {
      pendingCallback.value()
      pendingCallback.value = null
    }

    return true
  }

  function closeModal(): void {
    showModal.value = false
    pendingCallback.value = null
    modalError.value = false
  }

  function logout(): void {
    adminPassword.value = null
  }

  return {
    adminPassword,
    showModal,
    modalError,
    isAdmin,
    initLocalDev,
    requireAdmin,
    submitPassword,
    closeModal,
    logout,
  }
})
