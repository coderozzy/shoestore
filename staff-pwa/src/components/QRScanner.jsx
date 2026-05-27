import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import './QRScanner.css';

export default function QRScanner({ onScan, onError }) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState(null);
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    const startScanner = async () => {
        try {
            setError(null);
            isProcessingRef.current = false;

            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode('qr-reader');
            }

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            await html5QrCodeRef.current.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    handleScanSuccess(decodedText);
                },
                (errorMessage) => {
                    // Ignore scan errors (no QR code in frame)
                }
            );

            setIsScanning(true);
        } catch (err) {
            console.error('Failed to start scanner:', err);
            setError(err.message || 'Failed to access camera');
            onError?.(err);
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
            } catch (err) {
                // Ignore stop errors
            }
        }
        setIsScanning(false);
    };

    const handleScanSuccess = async (decodedText) => {
        // Prevent multiple callbacks
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        await stopScanner();
        onScan?.(decodedText);
    };

    const handleRetry = () => {
        setError(null);
        startScanner();
    };

    return (
        <div className="qr-scanner-container">
            <div className="scanner-header">
                <h2>📷 Scan QR Code</h2>
                <p>Point your camera at the shoe's QR code</p>
            </div>

            <div className="scanner-viewport">
                <div id="qr-reader" ref={scannerRef}></div>

                {!isScanning && !error && (
                    <div className="scanner-overlay">
                        <button className="btn btn-primary btn-large" onClick={startScanner}>
                            <span>📷</span> Start Scanner
                        </button>
                    </div>
                )}

                {error && (
                    <div className="scanner-error">
                        <div className="error-icon">⚠️</div>
                        <p>{error}</p>
                        <button className="btn btn-secondary" onClick={handleRetry}>
                            Try Again
                        </button>
                        <p className="error-hint">
                            Make sure you've granted camera permissions
                        </p>
                    </div>
                )}
            </div>

            {isScanning && (
                <div className="scanner-controls">
                    <button className="btn btn-secondary" onClick={stopScanner}>
                        Stop Scanner
                    </button>
                </div>
            )}

            <div className="scanner-instructions">
                <div className="instruction">
                    <span className="instruction-icon">1️⃣</span>
                    <span>Allow camera access when prompted</span>
                </div>
                <div className="instruction">
                    <span className="instruction-icon">2️⃣</span>
                    <span>Point camera at the QR code on the shoe</span>
                </div>
                <div className="instruction">
                    <span className="instruction-icon">3️⃣</span>
                    <span>Product details will appear automatically</span>
                </div>
            </div>
        </div>
    );
}
