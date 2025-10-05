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
          <v-card-subtitle v-if="fgacData">
            {{ fgacData.column_permissions?.length || 0 }} column permissions, 
            {{ fgacData.row_policies?.length || 0 }} row policies
            <span v-if="fgacData.table_info">
              · Table: {{ fgacData.table_info.namespace_name }}.{{ fgacData.table_info.table_name }}
            </span>
          </v-card-subtitle>
        </v-card>

        <!-- Loading State -->
        <v-progress-linear v-if="loading" indeterminate color="info"></v-progress-linear>

        <!-- Error State -->
        <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = null">
          {{ error }}
        </v-alert>

        <!-- Success Message -->
        <v-alert v-if="successMessage" type="success" class="mb-4" closable @click:close="successMessage = null">
          {{ successMessage }}
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
              @click="openAddColumnPermissionDialog"
              :disabled="loading">
              Add Permission
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-data-table
            :headers="columnPermissionHeaders"
            :items="fgacData?.column_permissions || []"
            :loading="loading"
            class="elevation-0"
            items-per-page="10">
            <template #item.granted_at="{ item }">
              {{ formatTimestamp(item.granted_at) }}
            </template>
            <template #item.expires_at="{ item }">
              {{ item.expires_at ? formatTimestamp(item.expires_at) : 'Never' }}
            </template>
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
                @click="confirmDeleteColumnPermission(item)"></v-btn>
            </template>
            <template #no-data>
              <div class="text-center pa-4">
                <v-icon size="48" color="grey">mdi-shield-off</v-icon>
                <div class="text-subtitle-1 mt-2">No column permissions configured</div>
                <div class="text-caption">Click "Add Permission" to create your first column permission</div>
              </div>
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
              @click="openAddRowPolicyDialog"
              :disabled="loading">
              Add Policy
            </v-btn>
          </v-card-title>
          <v-divider></v-divider>
          
          <v-data-table
            :headers="rowPolicyHeaders"
            :items="fgacData?.row_policies || []"
            :loading="loading"
            class="elevation-0"
            items-per-page="10">
            <template #item.is_active="{ item }">
              <v-chip :color="item.is_active ? 'success' : 'default'" size="small">
                {{ item.is_active ? 'Active' : 'Inactive' }}
              </v-chip>
            </template>
            <template #item.policy_type="{ item }">
              <v-chip 
                :color="getPolicyTypeColor(item.policy_type)" 
                size="small">
                {{ item.policy_type }}
              </v-chip>
            </template>
            <template #item.granted_at="{ item }">
              {{ formatTimestamp(item.granted_at) }}
            </template>
            <template #item.expires_at="{ item }">
              {{ item.expires_at ? formatTimestamp(item.expires_at) : 'Never' }}
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
                @click="confirmDeleteRowPolicy(item)"></v-btn>
            </template>
            <template #no-data>
              <div class="text-center pa-4">
                <v-icon size="48" color="grey">mdi-filter-off</v-icon>
                <div class="text-subtitle-1 mt-2">No row policies configured</div>
                <div class="text-caption">Click "Add Policy" to create your first row-level policy</div>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Column Permission Dialog -->
    <v-dialog v-model="columnPermissionDialog" max-width="600">
      <v-card>
        <v-card-title>
          {{ editingColumnPermission ? 'Edit' : 'Add' }} Column Permission
        </v-card-title>
        <v-card-text>
          <v-form ref="columnPermissionForm">
            <v-select
              v-model="columnPermissionForm.column_name"
              :items="availableColumns"
              label="Column"
              :rules="[v => !!v || 'Column is required']"
              :disabled="editingColumnPermission !== null"></v-select>
            
            <v-select
              v-model="columnPermissionForm.principal_type"
              :items="['user', 'role', 'group']"
              label="Principal Type"
              :rules="[v => !!v || 'Principal type is required']"></v-select>
            
            <v-text-field
              v-model="columnPermissionForm.principal_id"
              label="Principal ID"
              :rules="[v => !!v || 'Principal ID is required']"
              hint="e.g., alice@example.com or data_analyst"></v-text-field>
            
            <v-select
              v-model="columnPermissionForm.permission_type"
              :items="['read', 'write', 'owner']"
              label="Permission Type"
              :rules="[v => !!v || 'Permission type is required']"></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="columnPermissionDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="saveColumnPermission"
            :loading="saving">
            {{ editingColumnPermission ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Row Policy Dialog -->
    <v-dialog v-model="rowPolicyDialog" max-width="700">
      <v-card>
        <v-card-title>
          {{ editingRowPolicy ? 'Edit' : 'Add' }} Row Policy
        </v-card-title>
        <v-card-text>
          <v-form ref="rowPolicyForm">
            <v-text-field
              v-model="rowPolicyForm.policy_name"
              label="Policy Name"
              :rules="[v => !!v || 'Policy name is required']"
              :disabled="editingRowPolicy !== null"
              hint="Unique identifier for this policy"></v-text-field>
            
            <v-select
              v-model="rowPolicyForm.principal_type"
              :items="['user', 'role', 'group']"
              label="Principal Type"
              :rules="[v => !!v || 'Principal type is required']"></v-select>
            
            <v-text-field
              v-model="rowPolicyForm.principal_id"
              label="Principal ID"
              :rules="[v => !!v || 'Principal ID is required']"
              hint="e.g., alice@example.com or sales_team"></v-text-field>
            
            <v-textarea
              v-model="rowPolicyForm.policy_expression"
              label="Policy Expression"
              :rules="[v => !!v || 'Policy expression is required']"
              hint="SQL WHERE clause (e.g., region = 'WEST' AND department = 'SALES')"
              rows="3"></v-textarea>
            
            <v-select
              v-model="rowPolicyForm.policy_type"
              :items="['filter', 'deny', 'allow']"
              label="Policy Type"
              :rules="[v => !!v || 'Policy type is required']"></v-select>
            
            <v-text-field
              v-model.number="rowPolicyForm.priority"
              label="Priority"
              type="number"
              :rules="[v => v >= 0 || 'Priority must be positive']"
              hint="Higher priority = applied first"></v-text-field>
            
            <v-switch
              v-model="rowPolicyForm.is_active"
              label="Active"
              color="success"></v-switch>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="rowPolicyDialog = false">Cancel</v-btn>
          <v-btn 
            color="primary" 
            @click="saveRowPolicy"
            :loading="saving">
            {{ editingRowPolicy ? 'Update' : 'Create' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>Confirm Delete</v-card-title>
        <v-card-text>
          Are you sure you want to delete this {{ deleteType }}?
          <div class="mt-2 text-caption text-error">This action cannot be undone.</div>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="deleteDialog = false">Cancel</v-btn>
          <v-btn 
            color="error" 
            @click="confirmDelete"
            :loading="deleting">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/user';

// Props
interface Props {
  warehouseId: string;
  tableId: string;
  namespaceId: string;
  tableName: string;
}

const props = defineProps<Props>();

// Type definitions matching actual API response
interface TableFgacConfiguration {
  table_info: {
    warehouse_id: string;
    table_id: string;
    warehouse_name: string;
    namespace_name: string;
    table_name: string;
  };
  available_columns: string[];
  column_permissions: Array<{
    column_permission_id: string;
    column_name: string;
    principal_type: 'user' | 'role' | 'group';
    principal_id: string;
    permission_type: 'mask' | 'deny' | 'allow';
    masking_method: string | null;
    granted_by: string;
    granted_at: string;
    expires_at: string | null;
  }>;
  row_policies: Array<{
    row_policy_id: string;
    policy_name: string;
    principal_type: 'user' | 'role' | 'group';
    principal_id: string;
    policy_expression: string;
    policy_type: 'filter' | 'deny' | 'allow';
    is_active: boolean;
    priority: number;
    granted_by: string;
    granted_at: string;
    expires_at: string | null;
  }>;
  available_principals: string[];
}

// State
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const fgacData = ref<TableFgacConfiguration | null>(null);

// Dialog states
const columnPermissionDialog = ref(false);
const rowPolicyDialog = ref(false);
const deleteDialog = ref(false);
const deleteType = ref<'column permission' | 'row policy'>('column permission');
const itemToDelete = ref<any>(null);

// Editing states
const editingColumnPermission = ref<any>(null);
const editingRowPolicy = ref<any>(null);

// Form data
const columnPermissionForm = ref({
  column_name: '',
  principal_type: 'role' as 'user' | 'role' | 'group',
  principal_id: '',
  permission_type: 'read' as 'read' | 'write' | 'owner',
});

const rowPolicyForm = ref({
  policy_name: '',
  principal_type: 'role' as 'user' | 'role' | 'group',
  principal_id: '',
  policy_expression: '',
  policy_type: 'filter' as 'filter' | 'deny' | 'allow',
  is_active: true,
  priority: 100,
});

// Computed
const availableColumns = computed(() => {
  console.log('🔍 DEBUG - fgacData.value:', fgacData.value);
  console.log('🔍 DEBUG - available_columns raw:', fgacData.value?.available_columns);
  const rawColumns = fgacData.value?.available_columns;
  if (!rawColumns) {
    console.log('🔍 DEBUG - No columns data, returning empty array');
    return [];
  }
  if (!Array.isArray(rawColumns)) {
    console.error('🔍 DEBUG - available_columns is not an array:', typeof rawColumns, rawColumns);
    return [];
  }
  console.log('🔍 DEBUG - columns after processing:', rawColumns);
  return rawColumns;
});

// Table headers
const columnPermissionHeaders = [
  { title: 'Column', key: 'column_name', sortable: true },
  { title: 'Principal Type', key: 'principal_type', sortable: true },
  { title: 'Principal', key: 'principal_id', sortable: true },
  { title: 'Permission', key: 'permission_type', sortable: true },
  { title: 'Granted By', key: 'granted_by', sortable: true },
  { title: 'Granted At', key: 'granted_at', sortable: true },
  { title: 'Expires', key: 'expires_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
];

const rowPolicyHeaders = [
  { title: 'Policy Name', key: 'policy_name', sortable: true },
  { title: 'Principal Type', key: 'principal_type', sortable: true },
  { title: 'Principal', key: 'principal_id', sortable: true },
  { title: 'Expression', key: 'policy_expression', sortable: false },
  { title: 'Type', key: 'policy_type', sortable: true },
  { title: 'Priority', key: 'priority', sortable: true },
  { title: 'Status', key: 'is_active', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '100px' },
];

// Methods
async function loadFgacData() {
  console.log('🔧 loadFgacData called');
  loading.value = true;
  error.value = null;
  
  try {
    // Construct the path: namespace.table
    const tableIdentifier = `${props.namespaceId}.${props.tableName}`;
    console.log('🔧 tableIdentifier:', tableIdentifier);
    
    // Get authentication token with fallback
    let token = null;
    try {
      const userStore = useUserStore();
      console.log('🔧 userStore:', userStore);
      console.log('🔧 userStore.user:', userStore?.user);
      token = userStore?.user?.access_token;
      console.log('🔧 token from store:', !!token);
      
      // Fallback to localStorage if store fails
      if (!token) {
        console.log('🔧 Store token failed, trying localStorage...');
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        token = userData?.user?.access_token;
        console.log('🔧 token from localStorage:', !!token);
      }
    } catch (error) {
      console.error('🔧 Error accessing user store:', error);
      // Fallback to localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      token = userData?.user?.access_token;
      console.log('🔧 token from localStorage fallback:', !!token);
    }
    
    const url = `/ui/api/fgac/${props.warehouseId}/${encodeURIComponent(tableIdentifier)}`;
    console.log('🔧 Making API call to:', url);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('🔧 API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load FGAC data: ${response.statusText}. ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('🔧 Raw API response data:', responseData);
    fgacData.value = responseData;
    console.log('🔧 Set fgacData.value to:', fgacData.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error loading FGAC data';
    console.error('Error loading FGAC data:', e);
  } finally {
    loading.value = false;
  }
}

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}

function getPolicyTypeColor(type: string): string {
  switch (type) {
    case 'filter': return 'primary';
    case 'deny': return 'error';
    case 'allow': return 'success';
    default: return 'default';
  }
}

// Column Permission Methods
function openAddColumnPermissionDialog() {
  console.log('🔍 DEBUG - openAddColumnPermissionDialog called');
  console.log('🔍 DEBUG - fgacData.value at dialog open:', fgacData.value);
  console.log('🔍 DEBUG - availableColumns at dialog open:', availableColumns.value);
  
  editingColumnPermission.value = null;
  columnPermissionForm.value = {
    column_name: '',
    principal_type: 'role',
    principal_id: '',
    permission_type: 'read',
  };
  columnPermissionDialog.value = true;
}

function editColumnPermission(item: any) {
  editingColumnPermission.value = item;
  columnPermissionForm.value = {
    column_name: item.column_name,
    principal_type: item.principal_type,
    principal_id: item.principal_id,
    permission_type: item.permission_type,
  };
  columnPermissionDialog.value = true;
}

async function saveColumnPermission() {
  saving.value = true;
  error.value = null;
  
  try {
    const url = `/management/v1/warehouse/${props.warehouseId}/namespace/${props.namespaceId}/table/${props.tableName}/fgac/column-permission`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...columnPermissionForm.value,
        granted_by: 'current-user', // TODO: Get from auth context
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save column permission: ${errorText}`);
    }
    
    successMessage.value = `Column permission ${editingColumnPermission.value ? 'updated' : 'created'} successfully`;
    columnPermissionDialog.value = false;
    await loadFgacData();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error saving column permission';
  } finally {
    saving.value = false;
  }
}

function confirmDeleteColumnPermission(item: any) {
  itemToDelete.value = item;
  deleteType.value = 'column permission';
  deleteDialog.value = true;
}

// Row Policy Methods
function openAddRowPolicyDialog() {
  editingRowPolicy.value = null;
  rowPolicyForm.value = {
    policy_name: '',
    principal_type: 'role',
    principal_id: '',
    policy_expression: '',
    policy_type: 'filter',
    is_active: true,
    priority: 100,
  };
  rowPolicyDialog.value = true;
}

function editRowPolicy(item: any) {
  editingRowPolicy.value = item;
  rowPolicyForm.value = {
    policy_name: item.policy_name,
    principal_type: item.principal_type,
    principal_id: item.principal_id,
    policy_expression: item.policy_expression,
    policy_type: item.policy_type,
    is_active: item.is_active,
    priority: item.priority,
  };
  rowPolicyDialog.value = true;
}

async function saveRowPolicy() {
  saving.value = true;
  error.value = null;
  
  try {
    const url = `/management/v1/warehouse/${props.warehouseId}/namespace/${props.namespaceId}/table/${props.tableName}/fgac/row-policy`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...rowPolicyForm.value,
        granted_by: 'current-user', // TODO: Get from auth context
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save row policy: ${errorText}`);
    }
    
    successMessage.value = `Row policy ${editingRowPolicy.value ? 'updated' : 'created'} successfully`;
    rowPolicyDialog.value = false;
    await loadFgacData();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error saving row policy';
  } finally {
    saving.value = false;
  }
}

function confirmDeleteRowPolicy(item: any) {
  itemToDelete.value = item;
  deleteType.value = 'row policy';
  deleteDialog.value = true;
}

async function confirmDelete() {
  deleting.value = true;
  error.value = null;
  
  try {
    let url: string;
    
    if (deleteType.value === 'column permission') {
      url = `/management/v1/warehouse/${props.warehouseId}/namespace/${props.namespaceId}/table/${props.tableName}/fgac/column-permission/${itemToDelete.value.column_permission_id}`;
    } else {
      url = `/management/v1/warehouse/${props.warehouseId}/namespace/${props.namespaceId}/table/${props.tableName}/fgac/row-policy/${itemToDelete.value.row_policy_id}`;
    }
    
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete ${deleteType.value}: ${errorText}`);
    }
    
    successMessage.value = `${deleteType.value.charAt(0).toUpperCase() + deleteType.value.slice(1)} deleted successfully`;
    deleteDialog.value = false;
    await loadFgacData();
  } catch (e) {
    error.value = e instanceof Error ? e.message : `Unknown error deleting ${deleteType.value}`;
  } finally {
    deleting.value = false;
  }
}

// Lifecycle
onMounted(() => {
  console.log('🔧 FgacManager mounted with props:', {
    warehouseId: props.warehouseId,
    tableId: props.tableId,
    namespaceId: props.namespaceId,
    tableName: props.tableName
  });
  loadFgacData();
});
</script>

<style scoped>
.font-mono {
  font-family: monospace;
}
</style>
