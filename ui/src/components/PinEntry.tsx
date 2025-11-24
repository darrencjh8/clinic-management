import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PinEntryProps {
    mode: 'set' | 'enter';
    onSubmit: (pin: string) => void;
    error?: string | null;
}

export const PinEntry = ({ mode, onSubmit, error }: PinEntryProps) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState<'initial' | 'confirm'>('initial');
    const { t } = useTranslation();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('PinEntry: handleSubmit called', { mode, step, pinLength: pin.length, confirmPinLength: confirmPin.length });

        if (mode === 'set') {
            if (step === 'initial') {
                if (pin.length >= 6) {
                    console.log('PinEntry: Moving to confirm step');
                    setStep('confirm');
                } else {
                    console.warn('PinEntry: PIN too short');
                }
            } else {
                console.log('PinEntry: Checking match', { pin, confirmPin });
                if (pin === confirmPin) {
                    console.log('PinEntry: PINs match, calling onSubmit');
                    onSubmit(pin);
                } else {
                    console.warn('PinEntry: PINs do not match');
                    setConfirmPin('');
                    setStep('initial');
                    setPin('');
                    alert(t('pin.pinsDoNotMatch') || 'PINs do not match. Please try again.');
                }
            }
        } else {
            console.log('PinEntry: Calling onSubmit in enter mode');
            onSubmit(pin);
        }
    };

    return (
        <div className="w-full">
            <div className="w-16 h-16 bg-primary bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-dark mb-2 text-center">
                {mode === 'set' ? (step === 'initial' ? t('pin.setTitle') : t('pin.confirmTitle')) : t('pin.enterTitle')}
            </h2>
            <p className="text-gray-600 mb-8 text-center">
                {mode === 'set'
                    ? (step === 'initial' ? t('pin.setDescription') : t('pin.confirmDescription'))
                    : t('pin.enterDescription')}
            </p>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={step === 'confirm' ? confirmPin : pin}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\\D/g, '');
                        if (step === 'confirm') {
                            setConfirmPin(val);
                        } else {
                            setPin(val);
                        }
                    }}
                    placeholder={t('pin.placeholder')}
                    className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-secondary-light rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-colors bg-white text-secondary-dark font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-gray-400"
                    autoFocus
                />
                <button
                    type="submit"
                    disabled={mode === 'set' ? (step === 'initial' ? pin.length < 6 : confirmPin.length < 6) : pin.length < 6}
                    className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {mode === 'set' ? (step === 'initial' ? t('pin.next') : t('pin.savePin')) : t('pin.unlock')}
                </button>
            </form>
        </div>
    );
};
