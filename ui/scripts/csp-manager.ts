/**
 * CSP Configuration Manager
 * Handles environment-specific CSP configuration and build-time injection
 */

import fs from 'fs';
import path from 'path';

export interface CSPDirective {
    [key: string]: string[];
}

export interface CSPConfig {
    environment: string;
    description: string;
    directives: CSPDirective;
    domains?: {
        [key: string]: string | string[];
    };
    security_notes?: string[];
}

/**
 * Load CSP configuration for the specified environment
 */
export function loadCSPConfig(environment: string): CSPConfig {
    const configPath = path.join(__dirname, '..', 'csp-config', `csp-${environment}.json`);
    
    if (!fs.existsSync(configPath)) {
        throw new Error(`CSP configuration file not found for environment: ${environment}`);
    }
    
    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(configContent) as CSPConfig;
    } catch (error) {
        throw new Error(`Failed to load CSP configuration for ${environment}: ${(error as Error).message}`);
    }
}

/**
 * Convert CSP directives object to CSP header string format
 */
export function directivesToCSPString(directives: CSPDirective): string {
    return Object.entries(directives)
        .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
        .join('; ');
}

/**
 * Generate CSP meta tag content from configuration
 */
export function generateCSPTagContent(config: CSPConfig): string {
    return directivesToCSPString(config.directives);
}

/**
 * Validate CSP configuration against environment requirements
 */
export function validateCSPConfig(config: CSPConfig, environment: string): void {
    const errors: string[] = [];
    
    // Check environment matches
    if (config.environment !== environment) {
        errors.push(`Configuration environment mismatch: expected ${environment}, got ${config.environment}`);
    }
    
    // Production-specific validations
    if (environment === 'production') {
        const cspString = generateCSPTagContent(config);
        
        // Check for localhost in production
        if (cspString.includes('localhost')) {
            errors.push('Production CSP should not contain localhost URLs');
        }
        
        // Check for staging domains in production
        if (cspString.includes('staging')) {
            errors.push('Production CSP should not contain staging URLs');
        }
        
        // Check for fly.dev in production (staging indicator)
        if (cspString.includes('fly.dev')) {
            errors.push('Production CSP should not contain fly.dev URLs');
        }
    }
    
    if (errors.length > 0) {
        throw new Error(`CSP validation failed for ${environment}:\n${errors.join('\n')}`);
    }
}

/**
 * Get all available environments
 */
export function getAvailableEnvironments(): string[] {
    const configDir = path.join(__dirname, '..', 'csp-config');
    const files = fs.readdirSync(configDir);
    return files
        .filter(file => file.startsWith('csp-') && file.endsWith('.json'))
        .map(file => file.replace('csp-', '').replace('.json', ''));
}

/**
 * Inject CSP configuration into HTML template
 */
export function injectCSPIntoHTML(htmlContent: string, environment: string): string {
    const config = loadCSPConfig(environment);
    validateCSPConfig(config, environment);
    
    const cspContent = generateCSPTagContent(config);
    const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`;
    
    // Replace existing CSP meta tag or add new one
    const cspMetaRegex = /<meta[^>]*http-equiv="Content-Security-Policy"[^>]*>/gi;
    
    if (cspMetaRegex.test(htmlContent)) {
        // Replace existing CSP meta tag
        return htmlContent.replace(cspMetaRegex, cspMetaTag);
    } else {
        // Add new CSP meta tag in the head section
        const headCloseRegex = /<\/head>/i;
        if (headCloseRegex.test(htmlContent)) {
            return htmlContent.replace(headCloseRegex, `${cspMetaTag}\n</head>`);
        } else {
            throw new Error('Could not find </head> tag in HTML content');
        }
    }
}

/**
 * Generate CSP report for documentation
 */
export function generateCSPReport(environment: string): string {
    const config = loadCSPConfig(environment);
    const cspString = generateCSPTagContent(config);
    
    let report = `# CSP Configuration Report for ${environment.toUpperCase()}\n\n`;
    report += `**Environment:** ${config.environment}\n`;
    report += `**Description:** ${config.description}\n\n`;
    
    report += `## CSP Meta Tag\n\n`;
    report += `\`\`\`html\n`;
    report += `<meta http-equiv="Content-Security-Policy" content="${cspString}">\n`;
    report += `\`\`\`\n\n`;
    
    report += `## Directives Breakdown\n\n`;
    Object.entries(config.directives).forEach(([directive, sources]) => {
        report += `### ${directive}\n`;
        sources.forEach(source => {
            report += `- \`${source}\`\n`;
        });
        report += '\n';
    });
    
    if (config.domains) {
        report += `## Domain Categories\n\n`;
        Object.entries(config.domains).forEach(([category, domains]) => {
            report += `### ${category}\n`;
            const domainList = Array.isArray(domains) ? domains : [domains];
            domainList.forEach(domain => {
                report += `- \`${domain}\`\n`;
            });
            report += '\n';
        });
    }
    
    if (config.security_notes) {
        report += `## Security Notes\n\n`;
        config.security_notes.forEach(note => {
            report += `- ${note}\n`;
        });
        report += '\n';
    }
    
    return report;
}