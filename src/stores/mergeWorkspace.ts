import { defineStore } from 'pinia'
import { ref } from 'vue'
import { prepareImportText } from '@/composables/prepareImportText'

export type MergeSide = 'left' | 'right'

export const useMergeWorkspace = defineStore('mergeWorkspace', () => {
  const leftDoc = ref('')
  const rightDoc = ref('')
  const leftFileName = ref('')
  const rightFileName = ref('')

  function importSide(side: MergeSide, raw: string, fileName?: string) {
    const { text } = prepareImportText(raw)
    const nextFileName = fileName ?? ''
    if (side === 'left') {
      leftDoc.value = text
      leftFileName.value = nextFileName
    } else {
      rightDoc.value = text
      rightFileName.value = nextFileName
    }
  }

  function setLeftDoc(text: string) {
    leftDoc.value = text
  }

  function setRightDoc(text: string) {
    rightDoc.value = text
  }

  function clearSide(side: MergeSide) {
    if (side === 'left') {
      leftDoc.value = ''
      leftFileName.value = ''
    } else {
      rightDoc.value = ''
      rightFileName.value = ''
    }
  }

  return {
    leftDoc,
    rightDoc,
    leftFileName,
    rightFileName,
    importSide,
    setLeftDoc,
    setRightDoc,
    clearSide,
  }
})
