<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const pwInput = ref('')

watch(() => auth.showModal, (val) => {
  if (val) {
    pwInput.value = ''
  }
})

async function submit(): Promise<void> {
  await auth.submitPassword(pwInput.value)
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') { submit() }
  if (e.key === 'Escape') { auth.closeModal() }
}
</script>

<template>
  <div v-if="auth.showModal" class="modal-overlay" @keydown="onKeydown">
    <div class="modal-box">
      <h3 class="modal-title">Enter Admin Password</h3>
      <input
        ref="inputEl"
        v-model="pwInput"
        type="password"
        placeholder="Password"
        class="modal-input"
        autofocus
        @keydown="onKeydown"
      />
      <div v-if="auth.modalError" class="modal-error">Incorrect password</div>
      <div class="modal-actions">
        <button class="btn-cancel" @click="auth.closeModal()">Cancel</button>
        <button class="btn-submit" @click="submit">Submit</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-box {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  width: 300px;
  text-align: center;
}

.modal-title {
  font-size: 14px;
  margin-bottom: 10px;
}

.modal-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.modal-error {
  color: #E25353;
  font-size: 11px;
  margin-bottom: 8px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-cancel {
  padding: 6px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.btn-submit {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: #FA8D29;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}
</style>
