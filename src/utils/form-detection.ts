import type { FormField, FormContext, DocumentUploadField } from '@/types';

export function detectForms(): FormContext[] {
  const forms = Array.from(document.querySelectorAll('form')) as HTMLFormElement[];
  
  return forms.map(formElement => ({
    url: window.location.href,
    title: document.title,
    fields: extractFormFields(formElement),
    formElement,
  }));
}

export function extractFormFields(formElement: HTMLFormElement): FormField[] {
  const fields: FormField[] = [];
  
  const inputs = formElement.querySelectorAll('input, textarea, select') as NodeListOf<any>;

  inputs.forEach(element => {
    // Skip hidden fields and submit buttons
    const isInput = typeof HTMLInputElement !== 'undefined' ? element instanceof (HTMLInputElement as any) : !!(element && element.nodeName && element.nodeName.toLowerCase() === 'input');
    if (isInput && (element.type === 'hidden' || element.type === 'submit')) {
      return;
    }

    const label = findLabel(element);
    fields.push({
      element,
      type: isInput ? element.type : element.tagName.toLowerCase(),
      name: element.name,
      id: element.id,
      label: label?.textContent?.trim(),
      placeholder: element.getAttribute('placeholder') || undefined,
      value: element.value,
    });
  });
  
  return fields;
}

export function findLabel(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): HTMLLabelElement | null {
  // Try to find associated label
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`) as HTMLLabelElement;
    if (label) return label;
  }
  
  // Check if element is wrapped in a label
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName === 'LABEL') {
      return parent as HTMLLabelElement;
    }
    parent = parent.parentElement;
  }
  
  return null;
}

export function detectDocumentUploadFields(): DocumentUploadField[] {
  const uploadInputs = Array.from(
    document.querySelectorAll('input[type="file"]')
  ) as HTMLInputElement[];
  
  return uploadInputs.map(element => ({
    element,
    accept: element.getAttribute('accept') || undefined,
    multiple: element.hasAttribute('multiple'),
    required: element.hasAttribute('required'),
  }));
}

export function isCommercialForm(context: FormContext): boolean {
  // Heuristic to detect commercial forms
  const commercialKeywords = [
    'email',
    'company',
    'invoice',
    'order',
    'purchase',
    'product',
    'customer',
    'business',
  ];
  
  const formText = context.fields
    .map(f => [f.name, f.label, f.placeholder].join(' ').toLowerCase())
    .join(' ');
  
  return commercialKeywords.some(keyword => formText.includes(keyword));
}
