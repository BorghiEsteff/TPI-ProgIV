import { forwardRef } from 'react';

export const ClapperboardIcon = ({ animated = true, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.05"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`ct-clapper-svg ${animated ? 'ct-clapper-svg--animated' : ''} ${className}`.trim()}
  >
    {/* Base de claqueta basada en Gentleface Animated Clapperboard (MIT) */}
    <path d="M1.5 6.5L14.5 6.5L14.5 12C14.5 12.828 13.828 13.5 13 13.5L3 13.5C2.172 13.5 1.5 12.828 1.5 12L1.5 6.5Z" />
    {/* Detalle sutil de ojos para personalidad del asistente */}
    <circle cx="6" cy="10" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="10" cy="10" r="0.6" fill="currentColor" stroke="none" />
    {/* Tapa superior articulada */}
    <g className="ct-clapper-top">
      <path d="M1.5 6.5L1.5 4C1.5 3.172 2.172 2.5 3 2.5L13 2.5C13.828 2.5 14.5 3.172 14.5 4L14.5 6.5L1.5 6.5Z" />
      <path d="M1.5 4.5L3.5 2.5" />
      <path d="M3.5 6.5L7.5 2.5" />
      <path d="M7.5 6.5L11.5 2.5" />
      <path d="M11.5 6.5L14.5 3.5" />
    </g>
  </svg>
);

const ClapperboardLauncher = forwardRef(({ isOpen, onClick }, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      className="ct-clapper-launcher"
      onClick={onClick}
      aria-label={
        isOpen
          ? 'Cerrar asistente de recomendaciones'
          : 'Abrir asistente de recomendaciones'
      }
      aria-expanded={isOpen}
      aria-controls="cinetrack-ai-panel"
      title="¿Qué veo hoy?"
      data-testid="clapperboard-launcher"
    >
      <ClapperboardIcon animated={!isOpen} />
    </button>
  );
});

ClapperboardLauncher.displayName = 'ClapperboardLauncher';

export default ClapperboardLauncher;
