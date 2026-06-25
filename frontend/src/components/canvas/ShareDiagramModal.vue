<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3><i class="fas fa-share-alt"></i> Share Diagram</h3>

      <div v-if="isGeneratingLink" class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i> Processing...
      </div>

      <div v-else-if="currentShareToken" class="share-container">
        <p class="share-helper-text">
          Anyone with this link and an active account can access this diagram in real-time.
        </p>
        <div class="share-link-box">
          <i class="fas fa-link share-link-icon"></i>
          <input class="share-link-input" type="text" readonly :value="shareableUrl" />
          <button @click="$emit('copy')" class="btn-copy" title="Copy link">
            <i class="fas fa-copy"></i>
          </button>
        </div>

        <div class="form-actions share-actions">
          <button type="button" @click="$emit('revoke')" class="btn-cancel revoke-link-button">
            Revoke Link
          </button>
          <button type="button" @click="$emit('close')" class="btn-create">Done</button>
        </div>
      </div>

      <div v-else class="share-container">
        <p class="share-helper-text">
          The share link for this diagram has been revoked. Generate a new one to enable collaboration again.
        </p>
        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="btn-cancel">Close</button>
          <button type="button" @click="$emit('generate')" class="btn-create">Generate New Link</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  isGeneratingLink: {
    type: Boolean,
    default: false,
  },
  currentShareToken: {
    type: String,
    default: null,
  },
  shareableUrl: {
    type: String,
    default: '',
  },
});

defineEmits(['close', 'copy', 'revoke', 'generate']);
</script>
