<template>
    <div v-if="props.show" :class="['notification', props.type]" role="status" aria-live="polite">
        <i :class="props.type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle'"></i>
        <div class="notification-text" v-html="props.text"></div>
    </div>
</template>

<script setup>
const props = defineProps({
    show: Boolean,
    type: {
        type: String,
        default: 'success' // 'success' or 'error'
    },
    text: {
        type: String,
        default: ''
    },
})

</script>

<style scoped>
.notification {
    position: fixed;
    right: 1.5rem;
    bottom: 1.5rem;
    min-width: 260px;
    max-width: 380px;
    padding: 0.9rem 1rem;
    border-radius: 10px;
    display: flex;
    gap: 0.75rem;
    align-items: center;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    z-index: 1200;
    color: #fff;
    font-weight: 600;
}

.notification i {
    font-size: 1.1rem;
}

.notification.success {
    background: linear-gradient(90deg, #2ecc71, #42b983);
}

.notification.error {
    background: linear-gradient(90deg, #e74c3c, #ff6b6b);
}

.notification-text {
    flex: 1;
    font-size: 0.95rem;
    text-align: left;
    color: #fff;
}
</style>
