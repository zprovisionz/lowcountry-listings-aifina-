import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';

interface CopyButtonProps {
  text: string;
  label?: string;
  onCopy?: () => void;
}

export default function CopyButton({ text, label = 'Copy', onCopy }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast('Copied to clipboard!', 'success');
      onCopy?.();
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast('Copy failed — please select and copy manually.', 'error');
    }
  };

  return (
    <button
      onClick={handle}
      className={copied ? 'success-pop' : ''}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px',
        background: copied ? 'rgba(0,255,150,0.1)' : 'rgba(0,255,255,0.07)',
        border: `1px solid ${copied ? 'rgba(0,255,150,0.4)' : 'rgba(0,255,255,0.25)'}`,
        borderRadius: 7,
        color: copied ? '#00ff96' : 'var(--cyan)',
        fontFamily: 'Space Mono, monospace',
        fontSize: 10, letterSpacing: '.1em',
        cursor: 'pointer',
        transition: 'all .25s ease',
      }}
      onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,255,0.12)'; }}
      onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,255,0.07)'; }}
    >
      <span style={{ fontSize: 12 }}>{copied ? '✓' : '⎘'}</span>
      {copied ? 'COPIED!' : label}
    </button>
  );
}
