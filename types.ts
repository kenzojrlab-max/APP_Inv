
export type Role = 'ADMIN' | 'USER';

// --- Theme Types ---
export type Theme = 'enterprise' | 'dark' | 'material' | 'green' | 'modern';

export interface UserPreferences {
  theme: Theme;
}

export interface Permission {
  canViewDashboard: boolean;
  canReadList: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean; // Soft delete/Archive
  canExport: boolean;
  isAdmin: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string; // In real app, this would be hashed
  permissions: Permission;
  preferences?: UserPreferences; // Added preferences
}

export type AssetState = string; // Made dynamic
export type HolderPresence = string; // Made dynamic

// --- Dynamic Field Types ---
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[]; // For 'select' type, comma separated values
  isArchived: boolean; // Soft delete for schema
}

export interface CoreFieldConfig {
  key: string;
  label: string;
  type: string; // Added type for display
  isVisible: boolean;
}

export interface Asset {
  id: string;
  code: string; // AAAA-LOC-CAT-SEQ (Immutable)
  registrationDate: string; // ISO Date
  acquisitionYear: string;
  location: string;
  category: string;
  name: string;
  description: string;
  door: string;
  state: AssetState;
  holder: string;
  holderPresence: HolderPresence;
  observation: string;
  photoUrl?: string;
  isArchived: boolean;
  
  // Dynamic attributes storage
  customAttributes: Record<string, any>; 
}

export interface Log {
  id: string;
  timestamp: number;
  userId: string;
  userEmail: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'LOGIN' | 'CONFIG';
  description: string;
  targetCode?: string; // Asset Code
  changes?: Array<{ field: string; before: any; after: any }>;
}

export interface AppConfig {
  companyName: string;
  companyLogo: string; // Base64 or URL
  locations: string[];
  states: string[]; // Dynamic List for Asset State
  holderPresences: string[]; // Dynamic List for Holder Presence
  categories: Record<string, string[]>; // Map Category Code -> List of Item Names
  categoriesDescriptions: Record<string, string>; // Map Category Code -> Description
  customFields: CustomField[]; // Schema definition
  coreFields?: CoreFieldConfig[];
}
