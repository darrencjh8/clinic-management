import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Layout } from '../Layout';
import { StoreProvider } from '../../store/useStore';
import React from 'react';

// Mock child components to isolate Layout
vi.mock('../Sidebar', () => ({ Sidebar: () => <div data-testid="sidebar" /> }));
vi.mock('../BottomTabs', () => ({ BottomTabs: () => <div data-testid="bottom-tabs" /> }));
vi.mock('../SyncStatus', () => ({ SyncStatus: () => <div data-testid="sync-status" /> }));

describe('Layout Viewport Reset Logic', () => {
    let scrollToSpy: any;

    beforeEach(() => {
        vi.useFakeTimers();
        scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    const renderLayout = (children: React.ReactNode = null) => {
        return render(
            <StoreProvider>
                <Layout currentView="treatments" onNavigate={() => {}}>
                    {children}
                </Layout>
            </StoreProvider>
        );
    };

    it('should scroll to (0,0) after 100ms when an input loses focus', async () => {
        renderLayout(<input data-testid="test-input" />);
        const input = document.querySelector('input')!;

        // Simulate focusout
        fireEvent.focusOut(input);

        // Fast-forward 100ms
        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });

    it('should NOT scroll to (0,0) if another input gains focus within 100ms', async () => {
        renderLayout(
            <>
                <input data-testid="input-1" />
                <input data-testid="input-2" />
            </>
        );
        const input1 = document.querySelectorAll('input')[0];
        const input2 = document.querySelectorAll('input')[1];

        // Simulate transition: focusout input1, then immediately focus input2
        fireEvent.focusOut(input1);
        
        // Mock document.activeElement
        Object.defineProperty(document, 'activeElement', {
            value: input2,
            configurable: true
        });

        // Fast-forward 100ms
        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it('should scroll to (0,0) if a non-input element gains focus', async () => {
        renderLayout(
            <>
                <input data-testid="test-input" />
                <div data-testid="test-div" tabIndex={0} />
            </>
        );
        const input = document.querySelector('input')!;
        const div = document.querySelector('div[data-testid="test-div"]')!;

        fireEvent.focusOut(input);
        
        // Mock activeElement to be the div
        Object.defineProperty(document, 'activeElement', {
            value: div,
            configurable: true
        });

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    });
});
