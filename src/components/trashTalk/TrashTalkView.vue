<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBracketStore } from '@/stores/bracket'
import { useAuthStore } from '@/stores/auth'

const store = useBracketStore()
const auth = useAuthStore()

const nickname = ref(localStorage.getItem('trash-talk-nickname') || '')
const newMessage = ref('')
const submitting = ref(false)
const sortBy = ref<'newest' | 'top'>('newest')

onMounted(() => {
  if (!store.trashTalkLoaded) { store.loadTrashTalk() }
})

const voterId = computed(() => store.getVoterId())

const sortedMessages = computed(() => {
  const msgs = [...store.trashTalkMessages]
  if (sortBy.value === 'top') {
    return msgs.sort((a, b) =>
      (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length)
    )
  }
  return msgs
})

async function submitMessage(): Promise<void> {
  const author = nickname.value.trim()
  const message = newMessage.value.trim()
  if (!author || !message) return

  submitting.value = true
  localStorage.setItem('trash-talk-nickname', author)
  await store.submitTrashTalk(author, message)
  newMessage.value = ''
  submitting.value = false
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function userVote(msg: { upvotes: string[]; downvotes: string[] }): 'up' | 'down' | null {
  const vid = voterId.value
  if (msg.upvotes.includes(vid)) return 'up'
  if (msg.downvotes.includes(vid)) return 'down'
  return null
}
</script>

<template>
  <div class="tt">
    <div class="tt-form">
      <input
        v-model="nickname"
        class="tt-input"
        placeholder="Your nickname..."
        maxlength="30"
      />
      <textarea
        v-model="newMessage"
        class="tt-input tt-textarea"
        placeholder="Talk your trash..."
        rows="2"
        maxlength="500"
        @keydown.meta.enter="submitMessage"
        @keydown.ctrl.enter="submitMessage"
      ></textarea>
      <div class="tt-form-foot">
        <span class="tt-chars">{{ newMessage.length }}/500</span>
        <button
          class="tt-post-btn"
          :disabled="submitting || !nickname.trim() || !newMessage.trim()"
          @click="submitMessage"
        >{{ submitting ? 'Posting...' : 'Post' }}</button>
      </div>
    </div>

    <div class="tt-sort">
      <button
        class="tt-sort-btn"
        :class="{ active: sortBy === 'newest' }"
        @click="sortBy = 'newest'"
      >Newest</button>
      <button
        class="tt-sort-btn"
        :class="{ active: sortBy === 'top' }"
        @click="sortBy = 'top'"
      >Top</button>
    </div>

    <div v-if="sortedMessages.length === 0" class="tt-empty">
      No trash talk yet. Be the first!
    </div>

    <div v-for="msg in sortedMessages" :key="msg.id" class="tt-msg">
      <div class="tt-votes">
        <button
          class="tt-vote-btn tt-up"
          :class="{ voted: userVote(msg) === 'up' }"
          @click="store.voteOnTrashTalk(msg.id, 'up')"
        >&#9650;</button>
        <span class="tt-score" :class="{
          positive: msg.upvotes.length - msg.downvotes.length > 0,
          negative: msg.upvotes.length - msg.downvotes.length < 0,
        }">{{ msg.upvotes.length - msg.downvotes.length }}</span>
        <button
          class="tt-vote-btn tt-down"
          :class="{ voted: userVote(msg) === 'down' }"
          @click="store.voteOnTrashTalk(msg.id, 'down')"
        >&#9660;</button>
      </div>
      <div class="tt-body">
        <div class="tt-meta">
          <span class="tt-author">{{ msg.author }}</span>
          <span class="tt-time">{{ timeAgo(msg.date) }}</span>
          <button
            v-if="auth.isAdmin"
            class="tt-del"
            @click="store.removeTrashTalk(msg.id)"
          >Delete</button>
        </div>
        <div class="tt-text">{{ msg.message }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tt {
  max-width: 600px;
  margin: 0 auto;
}

.tt-form {
  background: #fff;
  border: 0.5px solid #ddd;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tt-input {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.tt-input:focus {
  border-color: #FA8D29;
}

.tt-textarea {
  resize: vertical;
  min-height: 48px;
}

.tt-form-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tt-chars {
  font-size: 11px;
  color: #999;
}

.tt-post-btn {
  background: #FA8D29;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 18px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}

.tt-post-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.tt-sort {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.tt-sort-btn {
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  color: #666;
  transition: all 0.15s;
}

.tt-sort-btn.active {
  background: #FA8D29;
  color: #fff;
  border-color: #FA8D29;
}

.tt-empty {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 32px 0;
}

.tt-msg {
  display: flex;
  gap: 10px;
  background: #fff;
  border: 0.5px solid #ddd;
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.tt-votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 32px;
}

.tt-vote-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: #ccc;
  padding: 2px;
  line-height: 1;
  transition: color 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.tt-up.voted { color: #007573; }
.tt-down.voted { color: #E25353; }
.tt-vote-btn:hover { color: #FA8D29; }

.tt-score {
  font-size: 13px;
  font-weight: 600;
  color: #666;
}

.tt-score.positive { color: #007573; }
.tt-score.negative { color: #E25353; }

.tt-body {
  flex: 1;
  min-width: 0;
}

.tt-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.tt-author {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a1a;
}

.tt-time {
  font-size: 11px;
  color: #999;
}

.tt-del {
  margin-left: auto;
  background: none;
  border: 1px solid #E25353;
  color: #E25353;
  border-radius: 4px;
  padding: 1px 8px;
  font-size: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.tt-del:hover {
  background: #E25353;
  color: #fff;
}

.tt-text {
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-line;
}

@media (max-width: 768px) {
  .tt-msg {
    padding: 10px;
    gap: 8px;
  }

  .tt-form {
    padding: 10px;
  }
}
</style>
