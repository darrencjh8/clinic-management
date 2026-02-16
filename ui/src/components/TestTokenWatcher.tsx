import { useStore } from '../store/useStore';

export const TestTokenWatcher = () => {
    const { accessToken } = useStore();
    return <div data-testid="token-value">{accessToken || 'null'}</div>;
    // return <div data-testid="token-value">DEBUG_TOKEN_SRC</div>;
};
