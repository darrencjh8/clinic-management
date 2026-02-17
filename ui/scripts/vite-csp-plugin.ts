import type { Plugin } from 'vite';
import { loadCSPConfig, validateCSPConfig, generateCSPReport, generateCSPTagContent } from './csp-manager';
import fs from 'fs';
import path from 'path';

interface CSPPluginOptions {
    environment?: string;
    generateReport?: boolean;
    reportPath?: string;
}

/**
 * Vite plugin for environment-specific CSP injection
 */
export function viteCSPPlugin(options: CSPPluginOptions = {}): Plugin {
    const environment = options.environment || process.env.NODE_ENV || 'development';
    const generateReport = options.generateReport ?? true;
    const reportPath = options.reportPath || 'csp-report.md';
    
    let config: any;
    
    return {
        name: 'vite-csp-plugin',
        configResolved(resolvedConfig) {
            config = resolvedConfig;
        },
        buildStart() {
            console.log(`[CSP Plugin] Loading CSP configuration for environment: ${environment}`);
            
            try {
                const cspConfig = loadCSPConfig(environment);
                validateCSPConfig(cspConfig, environment);
                
                if (generateReport) {
                    const report = generateCSPReport(environment);
                    fs.writeFileSync(path.join(config.root, reportPath), report);
                    console.log(`[CSP Plugin] CSP report generated: ${reportPath}`);
                }
            } catch (error) {
                console.error(`[CSP Plugin] CSP configuration error:`, (error as Error).message);
                throw error;
            }
        },
        transformIndexHtml: {
            order: 'post',
            handler(html) {
                try {
                    // Replace CSP placeholder with actual CSP meta tag
                    const config = loadCSPConfig(environment);
                    validateCSPConfig(config, environment);
                    const cspContent = generateCSPTagContent(config);
                    const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`;
                    
                    // Replace the placeholder comment
                    return html.replace('<!-- CSP_PLACEHOLDER -->', cspMetaTag);
                } catch (error) {
                    console.error(`[CSP Plugin] CSP injection error:`, (error as Error).message);
                    throw error;
                }
            }
        },
        buildEnd() {
            console.log(`[CSP Plugin] CSP injection completed for environment: ${environment}`);
        }
    };
}