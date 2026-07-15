<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>Create New Variable</h3>
      <form @submit.prevent="$emit('submit')">
        <div class="form-group">
          <label>Name:</label>
          <input
            :value="name"
            @input="$emit('update:name', $event.target.value)"
            type="text"
            required
          />
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea
            :value="description"
            @input="$emit('update:description', $event.target.value)"
            rows="3"
          ></textarea>
        </div>
        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="btn-cancel">Cancel</button>
          <button type="submit" :disabled="creating" class="btn-create">
            {{ creating ? 'Creating...' : 'Create' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  creating: {
    type: Boolean,
    default: false,
  },
});

defineEmits([
  'update:name',
  'update:description',
  'close',
  'submit',
]);
</script>