import type { FormContext } from '../types/index';

export interface Agent {
  name: string;
  analyze(context: FormContext): Promise<Record<string, string>>;
  isApplicable(context: FormContext): boolean;
}

/**
 * Rule-based agent for filling commercial forms
 * Uses predefined patterns to identify and fill common fields
 */
export class CommercialFormAgent implements Agent {
  name = 'Commercial Form Agent';
  
  private commonPatterns: Record<string, string[]> = {
    email: ['email', 'mail', 'e-mail', 'contact_email'],
    firstname: ['first_name', 'firstname', 'first name', 'fname'],
    lastname: ['last_name', 'lastname', 'last name', 'lname'],
    company: ['company', 'organization', 'org', 'business'],
    phone: ['phone', 'telephone', 'mobile', 'contact_phone'],
    address: ['address', 'street', 'street_address'],
    city: ['city', 'town'],
    state: ['state', 'province', 'region'],
    zip: ['zip', 'zipcode', 'postal_code', 'postcode'],
    country: ['country', 'nation'],
  };
  
  isApplicable(context: FormContext): boolean {
    const fieldText = context.fields
      .map(f => [f.name, f.id, f.label, f.placeholder].join(' ').toLowerCase())
      .join(' ');
    
    const commercialKeywords = ['email', 'company', 'invoice', 'order', 'product'];
    return commercialKeywords.some(keyword => fieldText.includes(keyword));
  }
  
  async analyze(context: FormContext): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    
    // This is a placeholder - in production, this would:
    // 1. Extract field labels and names
    // 2. Match them to known patterns
    // 3. Use stored user data or AI to infer values
    
    for (const field of context.fields) {
      const fieldKey = this.matchFieldPattern(field.name, field.label, field.placeholder);
      if (fieldKey) {
        result[fieldKey] = this.getSampleValue(fieldKey);
      }
    }
    
    return result;
  }
  
  private matchFieldPattern(name?: string, label?: string, placeholder?: string): string | null {
    const text = [name, label, placeholder]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    for (const [pattern, keywords] of Object.entries(this.commonPatterns)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return pattern;
      }
    }
    
    return null;
  }
  
  private getSampleValue(fieldKey: string): string {
    const sampleData: Record<string, string> = {
      email: 'user@example.com',
      firstname: 'John',
      lastname: 'Doe',
      company: 'Example Corp',
      phone: '555-0123',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'United States',
    };
    
    return sampleData[fieldKey] || '';
  }
}

/**
 * Document upload form agent
 * Handles file upload detection and validation
 */
export class DocumentUploadAgent implements Agent {
  name = 'Document Upload Agent';
  
  isApplicable(context: FormContext): boolean {
    return context.fields.some(f => {
      const el = f.element as any;
      const isInput = typeof HTMLInputElement !== 'undefined' ? el instanceof (HTMLInputElement as any) : !!(el && el.nodeName && el.nodeName.toLowerCase() === 'input');
      return isInput && (el.type === 'file');
    });
  }

  async analyze(context: FormContext): Promise<Record<string, string>> {
    const uploads = context.fields.filter(f => {
      const el = f.element as any;
      const isInput = typeof HTMLInputElement !== 'undefined' ? el instanceof (HTMLInputElement as any) : !!(el && el.nodeName && el.nodeName.toLowerCase() === 'input');
      return isInput && el.type === 'file';
    });

    return {
      documentFields: uploads.map(u => u.name || u.id || 'unknown').join(','),
    };
  }
}

/**
 * Adaptive agent that chains multiple specialized agents
 */
export class AdaptiveFormAgent implements Agent {
  name = 'Adaptive Form Agent';
  
  private agents: Agent[] = [
    new CommercialFormAgent(),
    new DocumentUploadAgent(),
  ];
  
  isApplicable(_context: FormContext): boolean {
    return true; // Always applicable as fallback
  }
  
  async analyze(context: FormContext): Promise<Record<string, string>> {
    for (const agent of this.agents) {
      if (agent.isApplicable(context)) {
        return agent.analyze(context);
      }
    }
    
    return {};
  }
}
