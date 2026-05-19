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
export declare class CommercialFormAgent implements Agent {
    name: string;
    private commonPatterns;
    isApplicable(context: FormContext): boolean;
    analyze(context: FormContext): Promise<Record<string, string>>;
    private matchFieldPattern;
    private getSampleValue;
}
/**
 * Document upload form agent
 * Handles file upload detection and validation
 */
export declare class DocumentUploadAgent implements Agent {
    name: string;
    isApplicable(context: FormContext): boolean;
    analyze(context: FormContext): Promise<Record<string, string>>;
}
/**
 * Adaptive agent that chains multiple specialized agents
 */
export declare class AdaptiveFormAgent implements Agent {
    name: string;
    private agents;
    isApplicable(_context: FormContext): boolean;
    analyze(context: FormContext): Promise<Record<string, string>>;
}
//# sourceMappingURL=form-agents.d.ts.map