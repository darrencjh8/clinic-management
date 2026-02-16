import '@/index.css';
import '@/i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';

export function mount(Component: React.ComponentType, props: any, slots: any) {
    const rootElement = document.getElementById('root');
    if (!rootElement) throw new Error('Root element not found');
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Component {...props} {...slots} />);
}
