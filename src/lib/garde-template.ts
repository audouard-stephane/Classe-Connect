// Page de garde A4 — design sobre noir / gris / blanc
// Utilisé par toutes les routes d'impression QR.
// Un seul QR code par élève : sert uniquement à identifier l'élève.

export const GARDE_COLLEGE = "Collège Le Bastion";
export const GARDE_MATIERE = "TECHNOLOGIE";

// Conservé pour compat rétro : n'a plus d'effet.
export type QrVariant = 1 | 2 | 3;

export function gardeSchoolYear(): string {
  return "2016-2017";
}

const clean = (s: string) =>
  s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, "");

/**
 * Payload identifiant l'élève. Un seul QR par élève désormais ;
 * l'argument `variant` est accepté pour compat mais ignoré.
 */
export function gardeQrPayload(
  classe: string,
  nom: string,
  prenom: string,
  _variant?: QrVariant,
) {
  return `TECHNO_${clean(classe)}_${clean(nom)}_${clean(prenom)}`;
}

/** Retire un éventuel suffixe `_V1|_V2|_V3` (QR anciens). */
export function stripQrVariant(payload: string): string {
  return payload.trim().toUpperCase().replace(/_V[123]$/, "");
}

export interface GardeEleve {
  prenom: string;
  nom: string;
  classe: string;
  qrDataUrl: string;
}

const GEAR_SVG = `
<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
  <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94 0 .31.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58z"/>
</svg>`;

const SCHOOL_SVG = `
<svg viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
  <path d="M32 4 L32 12"/>
  <path d="M32 5 L40 8 L32 11 Z" fill="currentColor" stroke="none"/>
  <path d="M16 22 L32 14 L48 22"/>
  <rect x="18" y="22" width="28" height="22"/>
  <rect x="22" y="28" width="5" height="5"/>
  <rect x="29.5" y="28" width="5" height="5"/>
  <rect x="37" y="28" width="5" height="5"/>
  <rect x="29.5" y="36" width="5" height="8"/>
  <path d="M10 44 L54 44"/>
  <path d="M6 44 Q14 40 22 44"/>
  <path d="M42 44 Q50 40 58 44"/>
</svg>`;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Page individuelle avec un unique QR d'identification + champs. */
export function gardePageHTML(e: GardeEleve, annee: string): string {
  const classe = escapeHtml(e.classe);
  return `
  <section class="page">
    <div class="frame">
      <header class="head">
        <div class="rule"><span class="line"></span><span class="gear">${GEAR_SVG}</span><span class="line"></span></div>
        <h1 class="title">${GARDE_MATIERE}</h1>
        <div class="sep"><span class="line"></span><span class="dot"></span><span class="line"></span></div>
        <div class="annee">ANNÉE SCOLAIRE ${escapeHtml(annee)}</div>
      </header>

      <div class="qr-single">
        <div class="qr-box"><img src="${e.qrDataUrl}" alt="QR élève" /></div>
      </div>

      <div class="info">
        <div class="row"><span class="lbl">Prénom :</span><span class="val">${escapeHtml(e.prenom)}</span></div>
        <div class="row"><span class="lbl">Nom :</span><span class="val">${escapeHtml(e.nom)}</span></div>
        <div class="row"><span class="lbl">Classe :</span><span class="val">${classe}</span></div>
      </div>

      <footer class="foot">
        <div class="school">${SCHOOL_SVG}</div>
        <div class="college">COLLÈGE LE BASTION</div>
      </footer>
    </div>
  </section>`;
}

/** Feuille collective de classe : liste des élèves avec un QR chacun. */
export function gardeClassePageHTML(
  classe: string,
  eleves: { prenom: string; nom: string; qrDataUrl: string }[],
  annee: string,
): string {
  const rows = eleves
    .map(
      (e) => `
    <div class="student">
      <div class="qr-mini"><img src="${e.qrDataUrl}" alt="QR"/></div>
      <div class="s-name">${escapeHtml(e.prenom)} ${escapeHtml(e.nom.charAt(0).toUpperCase())}.</div>
    </div>`,
    )
    .join("");
  return `
  <section class="page">
    <div class="frame">
      <header class="head">
        <div class="rule"><span class="line"></span><span class="gear">${GEAR_SVG}</span><span class="line"></span></div>
        <h1 class="title small">${GARDE_MATIERE}</h1>
        <div class="sep"><span class="line"></span><span class="dot"></span><span class="line"></span></div>
        <div class="annee">FEUILLE DE CLASSE — ${escapeHtml(classe)} · ${escapeHtml(annee)}</div>
      </header>
      <div class="grid-list">${rows}</div>
      <footer class="foot small">
        <div class="college">COLLÈGE LE BASTION</div>
      </footer>
    </div>
  </section>`;
}

export function gardeDocumentHTML(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap">
<style>
  :root { --ink:#111; --muted:#5b6470; }
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:#fff; color: var(--ink);
    font-family: "Inter", -apple-system, system-ui, sans-serif; }
  .page { width:210mm; height:297mm; padding:12mm; page-break-after: always;
    display:flex; align-items:stretch; }
  .page:last-child { page-break-after: auto; }
  .frame { flex:1; border:0.4mm solid #d8dcd6; border-radius:4mm;
    padding:12mm 14mm; display:flex; flex-direction:column; background:#fff; }

  .head { text-align:center; color: var(--ink); }
  .rule { display:flex; align-items:center; justify-content:center; gap:6mm; }
  .rule .line { flex:0 0 26mm; height:0.25mm; background: #111; }
  .gear { width:11mm; height:11mm; color:#111; display:inline-flex; }
  .gear svg { width:100%; height:100%; }
  .title { font-weight:900; font-size:54pt; letter-spacing:1.5px; margin:3mm 0 4mm; line-height:1; color:#111; }
  .title.small { font-size:32pt; }
  .sep { display:flex; align-items:center; justify-content:center; gap:3mm; margin-bottom:4mm; }
  .sep .line { width:18mm; height:0.25mm; background:#111; }
  .sep .dot { width:1.4mm; height:1.4mm; background:#111; border-radius:50%; }
  .annee { font-size:11pt; letter-spacing:3px; color:#333; font-weight:600; }

  .qr-single { display:flex; justify-content:center; margin:14mm 0 10mm; }
  .qr-box { width:90mm; height:90mm; border:0.6mm solid #111; border-radius:4mm;
    padding:4mm; display:flex; align-items:center; justify-content:center; background:#fff; }
  .qr-box img { width:100%; height:100%; object-fit:contain; image-rendering: pixelated; }

  .info { margin:6mm 4mm 0; display:flex; flex-direction:column; gap:5mm; }
  .row { display:flex; align-items:baseline; gap:4mm; border-bottom:0.25mm solid #333; padding-bottom:2mm; }
  .lbl { font-weight:800; font-size:14pt; color:#111; min-width:28mm; }
  .val { font-size:16pt; font-weight:700; color:#111; }

  .foot { margin-top:auto; padding-top:8mm; text-align:center; color:#111; }
  .foot.small { padding-top:4mm; }
  .school { display:flex; justify-content:center; margin-bottom:2mm; }
  .school svg { width:20mm; height:15mm; color:#111; }
  .college { font-size:12pt; font-weight:700; letter-spacing:3px; color:#111; }

  /* Collective sheet grid */
  .grid-list { display:grid; grid-template-columns: 1fr 1fr; gap:3mm 6mm; margin-top:6mm; }
  .student { display:flex; align-items:center; gap:3mm; padding:2mm 3mm;
    border:0.25mm solid #ccc; border-radius:2mm; }
  .qr-mini { width:15mm; height:15mm; padding:0.5mm; border:0.25mm solid #111; }
  .qr-mini img { width:100%; height:100%; object-fit:contain; image-rendering:pixelated; }
  .s-name { flex:1; font-size:9pt; font-weight:700; }
</style></head><body>${body}</body></html>`;
}
