<template>
  <div v-if="visible" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h3>{{ title }}</h3>
      <form @submit.prevent="$emit('submit')">
        <div class="form-group">
          <label>Subsystem Name:</label>
          <input
            :value="name"
            @input="$emit('update:name', $event.target.value)"
            type="text"
            required
            placeholder="Ex: Marketing..."
          />
        </div>
        <div class="form-group">
          <label>Description:</label>
          <textarea
            :value="description"
            @input="$emit('update:description', $event.target.value)"
            rows="3"
            placeholder="Description"
          ></textarea>
        </div>
        <div class="form-actions">
          <button type="button" @click="$emit('close')" class="btn-cancel">Cancel</button>
          <button type="submit" class="btn-create">{{ submitLabel }}</button>
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
  title: {
    type: String,
    default: 'Create Subsystem',
  },
  submitLabel: {
    type: String,
    default: 'Create',
  },
});

defineEmits([
  'update:name',
  'update:description',
  'close',
  'submit',
]);
</script>