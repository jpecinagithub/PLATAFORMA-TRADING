import { useState, useEffect } from 'react';
import './InstallPrompt.css';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!prompt || dismissed) return null;

  const install = async () => {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setPrompt(null);
    else setDismissed(true);
  };

  return (
    <div className="install-banner">
      <span className="install-icon">📈</span>
      <span className="install-text">Instala TradingApp en tu dispositivo</span>
      <button className="btn btn-primary install-btn" onClick={install}>Instalar</button>
      <button className="install-close" onClick={() => setDismissed(true)}>✕</button>
    </div>
  );
}
