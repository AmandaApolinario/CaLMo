<template>
  <transition name="toast-fade">
    <div v-if="error" class="toast-error">
      <i class="fas fa-exclamation-circle"></i> {{ error }}
    </div>
  </transition>
</template>

<script setup>
defineProps({
  error: {
    type: String,
    default: null,
  },
});
</script>