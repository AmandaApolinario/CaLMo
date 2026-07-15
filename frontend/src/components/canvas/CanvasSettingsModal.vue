<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content settings-modal" @click.stop>
      <div class="settings-header">
        <h3><i class="fas fa-cog"></i> Settings</h3>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </div>
      <div class="settings-body">
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Theme</span>
            <span class="setting-description">Switch between light and dark mode</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" :checked="currentTheme === 'light'" @change="$emit('toggle-theme')" />
            <span class="toggle-slider">
              <i class="fas fa-sun"></i>
              <i class="fas fa-moon"></i>
            </span>
          </label>
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
  currentTheme: {
    type: String,
    required: true,
  },
});

defineEmits(['close', 'toggle-theme']);
</script>