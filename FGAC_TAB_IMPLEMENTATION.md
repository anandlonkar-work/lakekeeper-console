# FGAC Tab Implementation Guide

## Overview
This guide shows how to add a Fine-Grained Access Control (FGAC) tab to the table details page in the Lakekeeper Console.

## Repository Info
- **Repository**: https://github.com/lakekeeper/console
- **Current Version**: v0.10.1
- **Location**: `/Users/anand.lonkar/code/lakekeeper/lakekeeper-console`

## Files to Modify

### 1. Main Table Page
**File**: `src/pages/warehouse/[id].namespace.[nsid].table.[tid].vue`

This file contains the tab navigation and tab content for table details.

#### Current Tab Structure (lines 32-48):
```vue
<v-tabs v-model="tab">
  <v-tab value="overview" @click="loadTabData">overview</v-tab>
  <v-tab value="raw" @click="loadTabData">raw</v-tab>
  <v-tab value="branch" @click="loadTabData">branch</v-tab>
  <v-tab
    v-if="canReadPermissions && enabledAuthentication && enabledPermissions"
    value="permissions"
    @click="loadTabData">
    Permissions
  </v-tab>
  <v-tab
    v-if="canGetTasks || !enabledAuthentication || !enabledPermissions"
    value="tasks"
    @click="loadTabData">
    tasks
  </v-tab>
</v-tabs>
```

#### Add FGAC Tab After Tasks Tab:
```vue
<v-tab value="fgac" @click="loadTabData">
  FGAC
</v-tab>
```

#### Current Tab Windows (lines 49-145):
```vue
<v-tabs-window v-model="tab">
  <v-tabs-window-item value="overview">
    <!-- Overview content -->
  </v-tabs-window-item>
  
  <v-tabs-window-item value="raw">
    <!-- Raw JSON content -->
  </v-tabs-window-item>
  
  <v-tabs-window-item value="branch">
    <!-- Branch visualization -->
  </v-tabs-window-item>
  
  <v-tabs-window-item v-if="canReadPermissions" value="permissions">
    <!-- Permissions manager -->
  </v-tabs-window-item>
  
  <v-tabs-window-item value="tasks">
    <!-- Task manager -->
  </v-tabs-window-item>
</v-tabs-window>
```

#### Add FGAC Tab Window:
```vue
<v-tabs-window-item value="fgac">
  <FgacManager
    v-if="loaded && tableId"
    :warehouse-id="warehouseId"
    :table-id="tableId"
    :namespace-id="namespaceId"
    :table-name="tableName" />
  <div v-else class="text-center pa-8">
    <v-progress-circular color="info" indeterminate :size="48"></v-progress-circular>
    <div class="text-subtitle-1 mt-2">Loading FGAC configuration...</div>
  </div>
</v-tabs-window-item>
```

### 2. Create FGAC Manager Component
**File**: `src/components/FgacManager.vue` (NEW)

```vue
<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <!-- Header -->
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-shield-lock</v-icon>
            Fine-Grained Access Control
          </v-card-title>
          <v-card-subtitle>
            Manage column-level permissions and row-level policies for this table
          </v-card-subtitle>
        </v-card>

        <!-- Loading State -->
        <v-progress-linear v-if="loading" indeterminate color="info"></v-progress-linear>

        <!-- Error State -->
        <v-alert v-if="error" type="error" class="mb-4">
          {{ error }}
        </v-alert>

        <!-- Column Permissions Section -->
        <v-card variant="outlined" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-table-column</v-icon>
            Column Permissions
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="openAddColumnPermissionDialog">
              Add Permission
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-data-table
            :headers="columnPermissionHeaders"
            :items="fgacData?.column_permissions || []"
            :loading="loading"
            class="elevation-0">
            <template #item.actions="{ item }">
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="editColumnPermission(item)"></v-btn>
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="deleteColumnPermission(item)"></v-btn>
            </template>
          </v-data-table>
        </v-card>

        <!-- Row Policies Section -->
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-table-row</v-icon>
            Row-Level Policies
            <v-spacer></v-spacer>
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              @click="openAddRowPolicyDialog">
              Add Policy
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-data-table
            :headers="rowPolicyHeaders"
            :items="fgacData?.row_policies || []"
            :loading="loading"
            class="elevation-0">
            <template #item.is_active="{ item }">
              <v-chip :color="item.is_active ? 'success' : 'default'" size="small">
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </template>
            <template #item.actions="{ item }">
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click="editRowPolicy(item)"></v-btn>
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                @click="deleteRowPolicy(item)"></v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialogs for add/edit will go here -->
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';

// Props
interface Props {
  warehouseId: string;
  tableId: string;
  namespaceId: string;
  tableName: string;
}

const props = defineProps<Props>();

// State
const loading = ref(false);
const error = ref<string | null>(null);
const fgacData = ref<any>(null);

// Table headers
const columnPermissionHeaders = [
  { title: 'Column', key: 'column_name' },
  { title: 'Principal Type', key: 'principal_type' },
  { title: 'Principal', key: 'principal_id' },
  { title: 'Permission', key: 'permission_type' },
  { title: 'Masking', key: 'masking_method' },
  { title: 'Actions', key: 'actions', sortable: false },
];

const rowPolicyHeaders = [
  { title: 'Policy Name', key: 'policy_name' },
  { title: 'Principal Type', key: 'principal_type' },
  { title: 'Principal', key: 'principal_id' },
  { title: 'Expression', key: 'policy_expression' },
  { title: 'Status', key: 'is_active' },
  { title: 'Actions', key: 'actions', sortable: false },
];

// Methods
async function loadFgacData() {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await fetch(`/ui/api/fgac/${props.warehouseId}/${props.tableId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load FGAC data: ${response.statusText}`);
    }
    
    fgacData.value = await response.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error loading FGAC data';
    console.error('Error loading FGAC data:', e);
  } finally {
    loading.value = false;
  }
}

function openAddColumnPermissionDialog() {
  // TODO: Implement dialog
  console.log('Open add column permission dialog');
}

function editColumnPermission(item: any) {
  // TODO: Implement edit
  console.log('Edit column permission:', item);
}

function deleteColumnPermission(item: any) {
  // TODO: Implement delete
  console.log('Delete column permission:', item);
}

function openAddRowPolicyDialog() {
  // TODO: Implement dialog
  console.log('Open add row policy dialog');
}

function editRowPolicy(item: any) {
  // TODO: Implement edit
  console.log('Edit row policy:', item);
}

function deleteRowPolicy(item: any) {
  // TODO: Implement delete
  console.log('Delete row policy:', item);
}

// Lifecycle
onMounted(() => {
  loadFgacData();
});
</script>

<style scoped>
/* Add any custom styles here */
</style>
```

## Implementation Steps

1. **Create the FGAC Manager Component**
   ```bash
   cd /Users/anand.lonkar/code/lakekeeper/lakekeeper-console
   # Create the new component file
   touch src/components/FgacManager.vue
   # Add the content shown above
   ```

2. **Update the Table Page**
   - Open `src/pages/warehouse/[id].namespace.[nsid].table.[tid].vue`
   - Add import for FgacManager component (around line 156)
   - Add the FGAC tab to the v-tabs section
   - Add the FGAC tab window to v-tabs-window section

3. **Test Locally**
   ```bash
   # Install dependencies
   npm install
   
   # Run development server
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

5. **Create New Release**
   ```bash
   git checkout -b feature/add-fgac-tab
   git add .
   git commit -m "feat: add FGAC tab to table details page"
   git push origin feature/add-fgac-tab
   # Create PR and merge
   # Tag new version (e.g., v0.10.2)
   ```

6. **Update Lakekeeper to Use New UI**
   - In `lakekeeper-local/crates/lakekeeper-bin/Cargo.toml`:
   ```toml
   lakekeeper-console = { git = "https://github.com/lakekeeper/console", rev = "v0.10.2" }
   ```
   - Rebuild lakekeeper with new UI

## API Endpoint Being Called

The component calls: `/ui/api/fgac/${warehouseId}/${tableId}`

This endpoint is already implemented in `lakekeeper-local/crates/lakekeeper-bin/src/ui.rs` and returns mock data including:
- `table_info` - Table metadata
- `available_columns` - List of columns in the table
- `column_permissions` - Column-level access rules
- `row_policies` - Row-level filtering policies
- `available_principals` - Users/roles that can be assigned

## Notes

- The component follows the existing pattern used by TaskManager and PermissionManager
- Uses Vuetify components for consistent styling
- Includes loading and error states
- Currently reads from the mock API endpoint
- Edit/delete functionality needs to be implemented (currently just console logs)
- Dialogs for adding/editing permissions need to be created

## Next Steps After Basic Implementation

1. Add dialogs for creating/editing column permissions
2. Add dialogs for creating/editing row policies
3. Implement actual API calls for POST/PUT/DELETE operations
4. Add form validation
5. Add confirmation dialogs for deletions
6. Add success/error notifications
7. Connect to real backend APIs (not mock data)
