interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export default function LoadingSpinner({ size = 24, className = '' }: LoadingSpinnerProps) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `2px solid rgba(0,255,255,0.2)`,
        borderTopColor: 'var(--cyan)',
        borderRadius: '50%',
        animation: 'spinRing .8s linear infinite',
      }}
      aria-hidden
    />
  );
}
