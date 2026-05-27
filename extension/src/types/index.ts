export interface FormField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  type: string;
  name?: string;
  id?: string;
  label?: string;
  placeholder?: string;
  value?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  [key: string]: string | undefined;
}

export interface FormContext {
  url: string;
  title: string;
  fields: FormField[];
  formElement?: HTMLFormElement;
}

export interface AgentConfig {
  provider: 'custom' | 'openai' | 'anthropic';
  apiKey?: string;
  model?: string;
  enabled: boolean;
}

export interface DocumentUploadField {
  element: HTMLInputElement;
  accept?: string;
  multiple: boolean;
  required: boolean;
}

export interface FillingResult {
  success: boolean;
  fieldsModified: number;
  message: string;
  timestamp: number;
}

export interface ExtensionMessage {
  type: 'FILL_FORM' | 'DETECT_FORM' | 'SAVE_SETTINGS' | 'GET_SETTINGS' | 'ANALYZE_FORM' | 'FORMS_DETECTED';
  data?: unknown;
}
