import React, { useEffect, useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OrientationGuardProps {
    children: React.ReactNode;
}

export const OrientationGuard: React.FC<OrientationGuardProps> = ({ children }) => {
    const { t } = useTranslation();
    const [isCorrectOrientation, setIsCorrectOrientation] = useState(true);
    const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

    useEffect(() => {
        const checkOrientation = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const isMobile = width < 768;
            const isPortrait = height > width;

            setDeviceType(isMobile ? 'mobile' : 'desktop');

            if (isMobile) {
                // Mobile must be portrait
                setIsCorrectOrientation(isPortrait);
            } else {
                // Desktop/Tablet must be landscape
                setIsCorrectOrientation(!isPortrait);
            }
        };

        checkOrientation();
        window.addEventListener('resize', checkOrientation);
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    if (!isCorrectOrientation) {
        return (
            <div className="fixed inset-0 bg-secondary-dark text-white z-[100] flex flex-col items-center justify-center p-8 text-center">
                {deviceType === 'mobile' ? (
                    <>
                        <Smartphone className="w-16 h-16 mb-6 animate-pulse text-primary" />
                        <h2 className="text-2xl font-bold mb-4">{t('common.rotatePortrait')}</h2>
                        <p className="text-gray-300">{t('common.rotatePortraitDesc')}</p>
                    </>
                ) : (
                    <>
                        <Monitor className="w-16 h-16 mb-6 animate-pulse text-primary" />
                        <h2 className="text-2xl font-bold mb-4">{t('common.rotateLandscape')}</h2>
                        <p className="text-gray-300">{t('common.rotateLandscapeDesc')}</p>
                    </>
                )}
            </div>
        );
    }

    return <>{children}</>;
};
