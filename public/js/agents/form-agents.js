/**
 * Rule-based agent for filling commercial forms
 * Uses predefined patterns to identify and fill common fields
 */
export class CommercialFormAgent {
    constructor() {
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'Commercial Form Agent'
        });
        Object.defineProperty(this, "commonPatterns", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
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
            }
        });
    }
    isApplicable(context) {
        const fieldText = context.fields
            .map(f => [f.name, f.id, f.label, f.placeholder].join(' ').toLowerCase())
            .join(' ');
        const commercialKeywords = ['email', 'company', 'invoice', 'order', 'product'];
        return commercialKeywords.some(keyword => fieldText.includes(keyword));
    }
    async analyze(context) {
        const result = {};
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
    matchFieldPattern(name, label, placeholder) {
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
    getSampleValue(fieldKey) {
        const sampleData = {
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
export class DocumentUploadAgent {
    constructor() {
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'Document Upload Agent'
        });
    }
    isApplicable(context) {
        return context.fields.some(f => {
            const el = f.element;
            const isInput = typeof HTMLInputElement !== 'undefined' ? el instanceof HTMLInputElement : !!(el && el.nodeName && el.nodeName.toLowerCase() === 'input');
            return isInput && (el.type === 'file');
        });
    }
    async analyze(context) {
        const uploads = context.fields.filter(f => {
            const el = f.element;
            const isInput = typeof HTMLInputElement !== 'undefined' ? el instanceof HTMLInputElement : !!(el && el.nodeName && el.nodeName.toLowerCase() === 'input');
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
export class AdaptiveFormAgent {
    constructor() {
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'Adaptive Form Agent'
        });
        Object.defineProperty(this, "agents", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: [
                new CommercialFormAgent(),
                new DocumentUploadAgent(),
            ]
        });
    }
    isApplicable(_context) {
        return true; // Always applicable as fallback
    }
    async analyze(context) {
        for (const agent of this.agents) {
            if (agent.isApplicable(context)) {
                return agent.analyze(context);
            }
        }
        return {};
    }
}
//# sourceMappingURL=form-agents.js.map