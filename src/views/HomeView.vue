<script setup lang="ts" name="HomeView">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
    <h1 class="text-2xl font-bold">{{ appStore.title }}</h1>
    <el-button type="primary">Element Plus 已接入</el-button>
  </div>
</template>
