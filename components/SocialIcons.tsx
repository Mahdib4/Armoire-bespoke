export default function SocialIcons({
  facebook,
  instagram,
  className = "",
}: {
  facebook?: string;
  instagram?: string;
  className?: string;
}) {
  if (!facebook && !instagram) return null;
  return (
    <div className={`social ${className}`}>
      {facebook && (
        <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
          </svg>
        </a>
      )}
      {instagram && (
        <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="5" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </a>
      )}
    </div>
  );
}
