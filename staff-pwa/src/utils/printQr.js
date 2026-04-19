/**
 * Safe QR-print helper. Builds the print window's DOM programmatically instead
 * of interpolating strings into document.write — an attacker-controlled
 * product model/color used to be injected into HTML with zero escaping (C-6).
 *
 * `imageUrl` should be an object URL (blob: or data:image/*) that is already
 * sandboxed by CSP to image rendering.
 */
export function openPrintableQr({ imageUrl, title, lines }) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Pop-up blocked. Please allow pop-ups and try again.');
        return;
    }

    const doc = printWindow.document;
    doc.open();
    doc.write('<!doctype html><html><head></head><body></body></html>');
    doc.close();

    const titleEl = doc.createElement('title');
    titleEl.textContent = String(title ?? 'QR Code');
    doc.head.appendChild(titleEl);

    const styleEl = doc.createElement('style');
    styleEl.textContent = `
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            font-family: system-ui, -apple-system, sans-serif;
            color: #111;
        }
        img { width: 300px; height: 300px; }
        h2 { margin: 12px 0 4px; }
        p { margin: 2px 0; }
    `;
    doc.head.appendChild(styleEl);

    const img = doc.createElement('img');
    img.src = String(imageUrl || '');
    img.alt = 'QR code';
    img.onload = () => {
        try {
            printWindow.focus();
            printWindow.print();
        } catch {
            // Printing errors are non-fatal — the user can still trigger print manually.
        }
    };
    doc.body.appendChild(img);

    (lines || []).forEach((line) => {
        if (!line) return;
        const el = doc.createElement(line.heading ? 'h2' : 'p');
        if (line.label && line.value != null) {
            // Use textContent exclusively so any attacker-supplied characters
            // (<, >, &, quote) stay inert.
            el.textContent = `${line.label}: ${line.value}`;
        } else if (line.value != null) {
            el.textContent = String(line.value);
        }
        doc.body.appendChild(el);
    });
}
