import type { FormField, FormContext, DocumentUploadField } from '@/types';
export declare function detectForms(): FormContext[];
export declare function extractFormFields(formElement: HTMLFormElement): FormField[];
export declare function findLabel(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): HTMLLabelElement | null;
export declare function detectDocumentUploadFields(): DocumentUploadField[];
export declare function isCommercialForm(context: FormContext): boolean;
//# sourceMappingURL=form-detection.d.ts.map