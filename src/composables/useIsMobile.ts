import { ref } from 'vue'

const MOBILE_BREAKPOINT = 768
const mq = typeof window !== 'undefined'
  ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  : null

const isMobile = ref(mq?.matches ?? false)

if (mq) {
  mq.addEventListener('change', (e) => { isMobile.value = e.matches })
}

export function useIsMobile() {
  return isMobile
}
