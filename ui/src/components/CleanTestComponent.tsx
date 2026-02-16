import { useEffect } from 'react';

export const CleanTestComponent = () => {
    useEffect(() => console.log('CleanTestComponent mounted'), []);
    return <div data-testid="clean-value">CLEAN_COMPONENT</div>;
};
