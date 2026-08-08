/**
 * TekboToast.jsx
 *
 * Single Responsibility: notificación flotante efímera.
 * Componente puramente presentacional; recibe el mensaje por props.
 */

export default function TekboToast({ message }) {
  if (!message) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-8 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-slate-800 px-5 py-3 text-sm font-bold text-white shadow-lg"
      style={{ animation: "tekbo-fade 2.5s ease forwards" }}
    >
      💾 {message}
      <style>{`
        @keyframes tekbo-fade {
          0%   { opacity: 0; transform: translate(-50%, 8px); }
          15%  { opacity: 1; transform: translate(-50%, 0); }
          85%  { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, -8px); }
        }
      `}</style>
    </div>
  );
}
