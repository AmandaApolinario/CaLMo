<template>
  <div v-if="visible" class="history-modal-overlay" @click.self="$emit('close')">
    <div class="history-modal-content">
      <div class="history-header">
        <h2>CLD History</h2>
        <button @click="$emit('close')" class="close-btn">✖</button>
      </div>

      <div v-if="loading" class="history-loading">
        Loading CLD History...
      </div>

      <div v-else-if="historyList.length === 0" class="history-empty">
        No changes saved yet.
      </div>

      <ul v-else class="history-list">
        <li v-for="item in historyList" :key="item.id" class="history-item">
          <div class="history-meta">
            <strong>{{ item.user_name }}</strong> saved on
            <span>{{ new Date(item.timestamp).toLocaleString() }}</span>
          </div>
          <div class="history-summary" v-html="formatHistoryText(item.action_summary)"></div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  historyList: {
    type: Array,
    default: () => [],
  },
  formatHistoryText: {
    type: Function,
    required: true,
  },
});

defineEmits(['close']);
</script>