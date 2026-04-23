<template>
  <div class="workspace-files">
    <div class="files-header">
      <h4>工作区文件</h4>
      <button class="refresh" @click="loadFiles">刷新</button>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
    <div v-else class="files-tree">
      <ul>
        <file-node
          v-for="node in tree"
          :key="node.path"
          :node="node"
          @open-file="openFile"
        />
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const tree = ref([])
const loading = ref(false)

async function loadFiles() {
  loading.value = true
  try {
    const res = await fetch('/api/files')
    const data = await res.json()
    tree.value = data.tree || []
  } catch (err) {
    console.error('loadFiles error', err)
    tree.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFiles()
})

function openFile(node) {
  // 目前仅在控制台展示，未来可扩展为在右侧面板打开文件内容
  console.log('Open file:', node.path)
}
</script>

<script>
export default {
  components: {
    FileNode: {
      props: ['node'],
      data() {
        return { open: false }
      },
      methods: {
        toggle() {
          if (this.node.type === 'dir') this.open = !this.open
        },
        openFile() {
          this.$emit('open-file', this.node)
        }
      },
      template: `
        <li class="file-node">
          <div class="node-row" @click="node.type === 'dir' ? toggle() : openFile()">
            <span v-if="node.type === 'dir'">📂</span>
            <span v-else>📄</span>
            <span class="node-name">{{ node.name }}</span>
            <span class="node-meta" v-if="node.type === 'file'">{{ node.size }} bytes</span>
            <span class="chev" v-if="node.type === 'dir'">{{ open ? '▾' : '▸' }}</span>
          </div>
          <ul v-show="open" v-if="node.children && node.children.length">
            <file-node v-for="c in node.children" :key="c.path" :node="c" @open-file="$emit('open-file', $event)" />
          </ul>
        </li>
      `
    }
  }
}
</script>

<style scoped>
.workspace-files { padding: 8px; }
.files-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.refresh { font-size:12px; padding:4px 8px }
.loading { color: #888 }
.files-tree { max-height: 320px; overflow:auto }
.file-node { list-style:none; margin:4px 0 }
.node-row { display:flex; gap:8px; align-items:center; cursor:pointer }
.node-name { flex:1 }
.node-meta { font-size:11px; color:#888 }
.chev { font-size:11px; color:#666 }
</style>
