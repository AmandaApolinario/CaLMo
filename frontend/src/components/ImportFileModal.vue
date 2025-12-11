<template>
    <div class="modal-overlay">
        <div class="modal-content dropzone" :class="{ dragging: isDragging }" @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false" @drop.prevent="onDrop">
            <h2>Import {{ props.importObjectName }}</h2>
            <label class="dropzone-label" :class="{ dragging: isDragging }" @click="openFileDialog">
                <input type="file" ref="fileInput" style="display: none" @change="onFileChange" />
                <div class="dropzone-message">
                    <i class="fas fa-upload" style="font-size:2rem; margin-bottom: 1rem;"></i>
                    <p>
                        Drop a file or <span class="dropzone-link">click to select</span>
                    </p>
                    <p>(Supported formats: {{ acceptedExtensions.join(', ') }})</p>
                </div>
            </label>
            <div v-if="uploadedFile" class="uploaded-files">
                <div class="file-previews">
                    <div class="file-preview" @click="removeFile(uploadedFile.name)" title="Clique para remover" style="cursor:pointer">
                        <img v-if="uploadedFile.name.endsWith('.json')" src="../assets/json.png" alt="JSON file"
                            class="file-icon" />
                        <div class="file-name">{{ uploadedFile.name }}</div>
                    </div>
                </div>
            </div>
            <div class="modal-action">
                <button type="button" class="btn-cancel" @click="$emit('close')" style="margin-top:2rem;">Close</button>
                <button type="button" class="btn-cancel btn-import" @click="onImport"
                    style="margin-top:2rem;">Import</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import JSONParserService from '@/services/jsonParser.service.js'

const props = defineProps({
    show: Boolean,
    importObjectName: {
        type: String,
        default: 'Files'
    },
    acceptedExtensions: {
        type: Array,
        default: () => ['.csv', '.json']
    },
    objectVariables: {},
    importFunction: {
        type: Function,
        default: null
    },
})

const emit = defineEmits(['close', 'files-selected'])

const isDragging = ref(false)
let uploadedFile = ref(null)
const fileInput = ref(null)

function openFileDialog() {
    fileInput.value && fileInput.value.click()
}

function isValidExtension(file) {
    return props.acceptedExtensions.some(ext => file.name.endsWith(ext))
}

function onDrop(e) {
    isDragging.value = false
    if (e.dataTransfer && e.dataTransfer.files.length) {
        const newFile = Array.from(e.dataTransfer.files).find(isValidExtension)
        if (newFile) {
            uploadedFile = newFile
        }
    }
}

function removeFile(name) {
    if (uploadedFile && uploadedFile.name === name) {
        uploadedFile = null
    }
}

function onFileChange(e) {
    if (e.target.files.length) {
        const newFile = Array.from(e.target.files).find(isValidExtension)
        if (newFile) {
            uploadedFile = newFile
        }
    }
}

async function onImport() {
    if (uploadedFile != null) {
        if (uploadedFile.name.endsWith('.csv')) {
            alert("CSV import is not yet supported. Please use JSON files.")
            return
        } else if (uploadedFile.name.endsWith('.json')) {
            const resultado = await JSONParserService.formatImportVariables(uploadedFile, props.objectVariables)
            if (props.importFunction) {
                await props.importFunction(resultado)
            }
            emit('close')
        }
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(30, 41, 59, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background: white;
    padding: 2rem 2.5rem;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
    min-width: 350px;
    max-width: 90vw;
    text-align: center;
}

.dropzone {
    min-height: 300px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border: 2px dashed #42b983;
    background: #f8fafc;
    transition: background 0.2s, border-color 0.2s;
    cursor: pointer;
}

.dropzone-label {
    width: 100%;
    height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.2s, border-color 0.2s;
}

.dropzone-label.dragging,
.dropzone.dragging {
    background: #e6fffa;
    border-color: #10b981;
}

.dropzone-message {
    color: #1a252f;
    text-align: center;
}

.dropzone-link {
    color: #42b983;
    text-decoration: underline;
    cursor: pointer;
}

.uploaded-files {
    margin-top: 1.5rem;
    width: 100%;
    text-align: left;
}

.uploaded-files ul {
    padding-left: 1.2rem;
}

.uploaded-files li {
    font-size: 1rem;
    color: #1a252f;
}

.btn-cancel {
    background-color: #e2e8f0;
    color: #1a252f;
    padding: 0.8rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.btn-cancel:hover {
    background-color: #cbd5e0;
}

.file-previews {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-top: 1rem;
    justify-content: center;
}

.file-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 90px;
    padding: 0.5rem;
}

.file-preview:hover {
    border: 2px solid #42b983;
    border-radius: 10px;
    background: #f0f6ff;
}

.file-icon {
    width: 32px;
    height: 32px;
    margin-bottom: 0.5rem;
}

.file-name {
    font-size: 1rem;
    color: #1a252f;
    text-align: center;
    word-break: break-all;
}

.modal-action {
    display: flex;
    justify-content: space-evenly;
    gap: 1rem;
}

.btn-import {
    background-color: #42b983;
}

.btn-import:hover {
    background-color: #369870;
}
</style>