
import React, { useState, useRef, useCallback } from 'react';
import {
  QrCode,
  Download,
  Sparkles,
  Upload,
  Palette,
  ChevronDown,
  Loader2,
  Bell,
  Check,
  Image as ImageIcon,
  Link2,
  MessageSquareText,
  SquareIcon,
  CircleDot,
  X,
  AlertCircle,
  Zap,
  BarChart3,
  Layers,
  FileText,
  Printer,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

// ─── Constants ───────────────────────────────────────────────────────────────

const QR_PURPOSES = [
  'Website / Landing Page',
  'Store Location (Maps)',
  'Reviews',
  'Social Profile',
  'Payment Link',
  'Menu / Catalog',
  'Product Info',
  'Call / Contact',
];

const OPENROUTER_API_KEY = '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';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 21;
  const lum = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  const l1 = lum(rgb1.r, rgb1.g, rgb1.b);
  const l2 = lum(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Apply a vertical gradient to all non-white pixels on a canvas */
function applyGradientToQr(canvas: HTMLCanvasElement, color1: string, color2: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // Only colorize dark (non-white) pixels
      if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

/** Wraps text into lines that fit within maxWidth on a given canvas context */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ─── Copywriting type ────────────────────────────────────────────────────────

interface AiCopy {
  title: string;
  bullets: string[];
}

// ─── Design Block Renderer (Canvas) ─────────────────────────────────────────

async function renderDesignBlock(
  qrDataUrl: string,
  copy: AiCopy,
  brandColor: string,
  brandColor2: string | null,
  qrStyle: 'square' | 'rounded',
): Promise<HTMLCanvasElement> {
  const W = 1200;
  const PADDING = 80;
  const QR_SIZE = 600;
  const TEXT_AREA_WIDTH = W - PADDING * 2;
  const accentColor = brandColor;

  // Measure title lines
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = W;
  tempCanvas.height = 100;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.font = 'bold 38px Inter, system-ui, -apple-system, sans-serif';
  const titleLines = wrapText(tempCtx, copy.title, TEXT_AREA_WIDTH);
  const titleLineH = 52;
  const titleBlockH = titleLines.length * titleLineH;

  // Bullet lines
  tempCtx.font = '24px Inter, system-ui, -apple-system, sans-serif';
  const bulletWrapped: string[][] = copy.bullets.map(b => wrapText(tempCtx, b, TEXT_AREA_WIDTH - 40));
  const bulletLineH = 36;
  const bulletGap = 14;
  const bulletsBlockH = bulletWrapped.reduce((sum, bLines) => sum + bLines.length * bulletLineH + bulletGap, 0);

  const CTA_LABEL_HEIGHT = 30;
  const H = PADDING + CTA_LABEL_HEIGHT + 20 + titleBlockH + 40 + QR_SIZE + 40 + bulletsBlockH + 30 + PADDING;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Top accent bar (gradient if 2 colors)
  if (brandColor2) {
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, brandColor);
    grad.addColorStop(1, brandColor2);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = accentColor;
  }
  ctx.fillRect(0, 0, W, 8);

  let y = PADDING;

  // CTA Label
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 20px Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('✦ SCAN TO DISCOVER ✦', W / 2, y + 20);
  y += CTA_LABEL_HEIGHT + 20;

  // Title above QR
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 38px Inter, system-ui, -apple-system, sans-serif';
  ctx.letterSpacing = '0px';
  for (const line of titleLines) {
    ctx.fillText(line, W / 2, y + 38);
    y += titleLineH;
  }
  y += 40;

  // QR code
  const qrImg = new Image();
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });
  const qrX = (W - QR_SIZE) / 2;
  if (qrStyle === 'rounded') {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(qrX, y, QR_SIZE, QR_SIZE, 24);
    ctx.clip();
    ctx.drawImage(qrImg, qrX, y, QR_SIZE, QR_SIZE);
    ctx.restore();
  } else {
    ctx.drawImage(qrImg, qrX, y, QR_SIZE, QR_SIZE);
  }
  y += QR_SIZE + 40;

  // Bullet descriptions below QR
  ctx.font = '24px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#475569';
  for (const bLines of bulletWrapped) {
    for (let i = 0; i < bLines.length; i++) {
      const prefix = i === 0 ? '•  ' : '    ';
      ctx.fillText(prefix + bLines[i], W / 2, y + 24);
      y += bulletLineH;
    }
    y += bulletGap;
  }

  // Bottom scan instruction
  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Point your camera at the QR code above', W / 2, y);

  // Bottom accent bar
  if (brandColor2) {
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, brandColor);
    grad.addColorStop(1, brandColor2);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = accentColor;
  }
  ctx.fillRect(0, H - 8, W, 8);

  return canvas;
}

// ─── SVG Design Block ────────────────────────────────────────────────────────

function buildDesignBlockSvg(
  qrSvgString: string,
  copy: AiCopy,
  brandColor: string,
  brandColor2: string | null,
): string {
  const innerMatch = qrSvgString.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
  const innerQr = innerMatch ? innerMatch[1] : qrSvgString;
  const W = 1200;
  const QR_SIZE = 600;
  const PADDING = 80;
  const maxCharsPerLine = 40;

  // Title lines
  const titleLines = simpleWrap(copy.title, maxCharsPerLine);
  const titleLineH = 52;
  const titleBlockH = titleLines.length * titleLineH;

  // Bullet lines
  const bulletWrapped = copy.bullets.map(b => simpleWrap(b, maxCharsPerLine));
  const bulletLineH = 36;
  const bulletGap = 14;
  const bulletsBlockH = bulletWrapped.reduce((s, bl) => s + bl.length * bulletLineH + bulletGap, 0);

  const CTA_LABEL_HEIGHT = 30;
  const H = PADDING + CTA_LABEL_HEIGHT + 20 + titleBlockH + 40 + QR_SIZE + 40 + bulletsBlockH + 30 + PADDING;

  let y = PADDING;
  let textElements = '';

  // Gradient defs
  let barFill = brandColor;
  let defsBlock = '';
  if (brandColor2) {
    defsBlock = `<defs><linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="${brandColor}"/><stop offset="100%" stop-color="${brandColor2}"/></linearGradient></defs>`;
    barFill = 'url(#barGrad)';
  }

  textElements += `<text x="${W / 2}" y="${y + 20}" text-anchor="middle" fill="${brandColor}" font-family="Inter, system-ui, sans-serif" font-weight="bold" font-size="20" letter-spacing="3">✦ SCAN TO DISCOVER ✦</text>`;
  y += CTA_LABEL_HEIGHT + 20;

  for (const line of titleLines) {
    textElements += `<text x="${W / 2}" y="${y + 38}" text-anchor="middle" fill="#1a1a2e" font-family="Inter, system-ui, sans-serif" font-weight="bold" font-size="38">${escapeXml(line)}</text>`;
    y += titleLineH;
  }
  y += 40;

  const qrX = (W - QR_SIZE) / 2;
  const qrY = y;
  y += QR_SIZE + 40;

  for (const bLines of bulletWrapped) {
    for (let i = 0; i < bLines.length; i++) {
      const prefix = i === 0 ? '•  ' : '    ';
      textElements += `<text x="${W / 2}" y="${y + 24}" text-anchor="middle" fill="#475569" font-family="Inter, system-ui, sans-serif" font-size="24">${escapeXml(prefix + bLines[i])}</text>`;
      y += bulletLineH;
    }
    y += bulletGap;
  }

  textElements += `<text x="${W / 2}" y="${y}" text-anchor="middle" fill="#94a3b8" font-family="Inter, system-ui, sans-serif" font-size="16">Point your camera at the QR code above</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  ${defsBlock}
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect width="${W}" height="8" fill="${barFill}"/>
  <rect y="${H - 8}" width="${W}" height="8" fill="${barFill}"/>
  ${textElements}
  <g transform="translate(${qrX}, ${qrY})">
    <svg width="${QR_SIZE}" height="${QR_SIZE}" viewBox="0 0 1000 1000">
      ${innerQr}
    </svg>
  </g>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function simpleWrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (test.length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
};

// ─── Main Component ─────────────────────────────────────────────────────────

interface BusinessQrGeneratorProps {
  onNavigateHome: () => void;
}

const BusinessQrGenerator: React.FC<BusinessQrGeneratorProps> = ({ onNavigateHome }) => {
  // Form state
  const [purpose, setPurpose] = useState('');
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [brandColor, setBrandColor] = useState('#000000');
  const [colorInput, setColorInput] = useState('#000000');
  const [brandColor2, setBrandColor2] = useState('#4f46e5');
  const [color2Input, setColor2Input] = useState('#4f46e5');
  const [useGradient, setUseGradient] = useState(false);
  const [qrStyle, setQrStyle] = useState<'square' | 'rounded'>('square');
  const [aiInstruction, setAiInstruction] = useState('');
  const [isPurposeOpen, setIsPurposeOpen] = useState(false);

  // Output state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrSvgString, setQrSvgString] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiCopy, setAiCopy] = useState<AiCopy | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [designBlockUrl, setDesignBlockUrl] = useState<string | null>(null);

  // Waitlist state
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const designBlockRef = useRef<HTMLDivElement>(null);

  // ─── Logo Upload Handler ────────────────────────────────────────────────

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const removeLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ─── Color Handling ─────────────────────────────────────────────────────

  const handleColorInputChange = useCallback((val: string) => {
    setColorInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setBrandColor(val);
  }, []);

  const handleColorPickerChange = useCallback((val: string) => {
    setBrandColor(val);
    setColorInput(val);
  }, []);

  const handleColor2InputChange = useCallback((val: string) => {
    setColor2Input(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setBrandColor2(val);
  }, []);

  const handleColor2PickerChange = useCallback((val: string) => {
    setBrandColor2(val);
    setColor2Input(val);
  }, []);

  // ─── QR Generation ─────────────────────────────────────────────────────

  const generateQr = useCallback(async () => {
    // Validate URL
    if (!url.trim()) {
      setUrlError('Please enter a destination URL');
      return;
    }
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    if (!isValidUrl(finalUrl)) {
      setUrlError('Please enter a valid URL (e.g. https://example.com)');
      return;
    }
    setUrlError('');
    setIsGenerating(true);
    setQrDataUrl(null);
    setQrSvgString(null);
    setAiCopy(null);
    setDesignBlockUrl(null);

    const contrastRatio = getContrastRatio(brandColor, '#ffffff');
    const errorCorrectionLevel = logoFile ? 'H' : contrastRatio < 4.5 ? 'H' : 'M';

    try {
      // Generate SVG
      const svgStr = await QRCode.toString(finalUrl, {
        type: 'svg',
        color: { dark: brandColor, light: '#ffffff' },
        errorCorrectionLevel,
        margin: 2,
        width: 1000,
      });
      setQrSvgString(svgStr);

      // Generate PNG via canvas
      const qrCanvas = document.createElement('canvas');
      const size = 1000;
      qrCanvas.width = size;
      qrCanvas.height = size;

      await QRCode.toCanvas(qrCanvas, finalUrl, {
        color: { dark: brandColor, light: '#ffffff' },
        errorCorrectionLevel,
        margin: 2,
        width: size,
      });

      // Apply gradient if enabled
      if (useGradient) {
        applyGradientToQr(qrCanvas, brandColor, brandColor2);
      }

      // Overlay logo
      if (logoPreview) {
        const ctx = qrCanvas.getContext('2d');
        if (ctx) {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => {
              const logoSize = size * 0.2;
              const x = (size - logoSize) / 2;
              const y = (size - logoSize) / 2;
              const padding = 8;
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.roundRect(x - padding, y - padding, logoSize + padding * 2, logoSize + padding * 2, 12);
              ctx.fill();
              ctx.drawImage(logoImg, x, y, logoSize, logoSize);
              resolve();
            };
            logoImg.onerror = reject;
            logoImg.src = logoPreview;
          });
        }
      }

      const dataUrl = qrCanvas.toDataURL('image/png');
      setQrDataUrl(dataUrl);
      // Show QR immediately — AI loads async
      setIsGenerating(false);

      // Fire AI copywriting (non-blocking)
      fetchAiCopywriting(finalUrl, dataUrl, svgStr);
    } catch (err) {
      console.error('QR generation failed:', err);
      setUrlError('Failed to generate QR code. Please try again.');
      setIsGenerating(false);
    }
  }, [url, brandColor, brandColor2, useGradient, logoFile, logoPreview, qrStyle, purpose, aiInstruction]);

  // ─── AI Copywriting ─────────────────────────────────────────────────────

  const fetchAiCopywriting = async (finalUrl: string, qrPngDataUrl: string, svgStr: string) => {
    setIsAiLoading(true);

    const purposeContext = purpose || 'General business use';
    const userNote = aiInstruction ? `\nUser's specific instruction: "${aiInstruction}"` : '';

    const prompt = `You are an expert marketing copywriter. Create copy for a print material that has a QR code. The copy should PERSUADE customers to scan the QR.

Context:
- QR Purpose: ${purposeContext}
- Destination: ${finalUrl}${userNote}

Return ONLY valid JSON in this exact format (no markdown, no code fences):
{"title": "Short punchy headline (max 10 words)", "bullets": ["Benefit or action point 1", "Benefit or action point 2", "Benefit or action point 3"]}

Rules:
1. Title: Short, bold, action-oriented headline displayed ABOVE the QR code.
2. Bullets: 3 short benefit/action lines displayed BELOW the QR code (each under 12 words).
3. IMPORTANT: If the user provide specific instructions, phone numbers, or key phrases in the User's specific instruction, you MUST incorporate them directly into the title or bullets. Do NOT ignore user-provided details.
4. Speak directly to the END CUSTOMER who sees this in a physical location.
5. No quotes around the JSON values, no emojis, no hashtags.
6. Match tone to purpose (casual for restaurants, professional for business).

Example for instruction "Call 9958929886":
{"title": "Scan to Connect or Call Us Directly", "bullets": ["Get instant support at 9958929886", "Find our store location easily", "Browse our latest offerings online"]}`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const result = await response.json();
      let text = result?.choices?.[0]?.message?.content?.trim() || '';
      // Strip markdown code fences if present
      text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      let parsed: AiCopy;
      try {
        const obj = JSON.parse(text);
        parsed = {
          title: (obj.title || '').replace(/^["']+|["']+$/g, '').trim(),
          bullets: Array.isArray(obj.bullets) ? obj.bullets.map((b: string) => b.replace(/^["'•\-]+\s*/g, '').trim()).filter(Boolean).slice(0, 3) : [],
        };
        if (!parsed.title || parsed.bullets.length === 0) throw new Error('incomplete');
      } catch {
        parsed = getDefaultCopywriting();
      }
      setAiCopy(parsed);
      await renderFullDesignBlock(qrPngDataUrl, parsed, svgStr);
    } catch {
      const fallback = getDefaultCopywriting();
      setAiCopy(fallback);
      await renderFullDesignBlock(qrPngDataUrl, fallback, svgStr);
    } finally {
      setIsAiLoading(false);
    }
  };

  const getDefaultCopywriting = (): AiCopy => {
    switch (purpose) {
      case 'Website / Landing Page': return { title: 'Visit Our Website — Scan to Explore', bullets: ['Discover our latest products and services', 'Read customer stories and reviews', 'Get exclusive online-only offers'] };
      case 'Store Location (Maps)': return { title: 'Find Us Easily — Scan for Directions', bullets: ['Opens directly in Google Maps', 'Get turn-by-turn navigation', 'See our hours and parking info'] };
      case 'Reviews': return { title: 'Love Our Service? Share Your Feedback', bullets: ['Takes less than 30 seconds', 'Help others discover us', 'We read and value every review'] };
      case 'Social Profile': return { title: 'Follow Us — Scan to Connect', bullets: ['Stay updated with our latest news', 'Exclusive content for followers', 'Join our growing community'] };
      case 'Payment Link': return { title: 'Quick & Easy Payment — Scan to Pay', bullets: ['Secure and instant processing', 'Multiple payment methods supported', 'Get a digital receipt instantly'] };
      case 'Menu / Catalog': return { title: 'Browse Our Full Menu — Scan Here', bullets: ['See all items with photos and prices', 'Check daily specials and new arrivals', 'Dietary info and allergen details included'] };
      case 'Product Info': return { title: 'Learn More About This Product', bullets: ['Full specs and feature comparison', 'Watch demo videos', 'Check availability and pricing'] };
      case 'Call / Contact': return { title: 'Get in Touch — Scan to Call Us', bullets: ['Connect directly with our team', 'No typing needed, one-tap call', 'Available during business hours'] };
      default: return { title: 'Scan to Discover More', bullets: ['Quick and easy — just point your camera', 'No app download required', 'Works on any smartphone'] };
    }
  };

  // ─── Design Block Rendering ─────────────────────────────────────────────

  const renderFullDesignBlock = async (qrPngDataUrl: string, copy: AiCopy, _svgStr: string) => {
    try {
      const blockCanvas = await renderDesignBlock(qrPngDataUrl, copy, brandColor, useGradient ? brandColor2 : null, qrStyle);
      setDesignBlockUrl(blockCanvas.toDataURL('image/png'));
    } catch (err) {
      console.error('Design block render failed:', err);
    }
  };

  // ─── Download Handlers ──────────────────────────────────────────────────

  const downloadPng = useCallback(() => {
    if (!designBlockUrl) return;
    const a = document.createElement('a');
    a.href = designBlockUrl;
    a.download = 'qr-design-block.png';
    a.click();
  }, [designBlockUrl]);

  const downloadSvg = useCallback(() => {
    if (!qrSvgString || !aiCopy) return;
    const svgContent = buildDesignBlockSvg(qrSvgString, aiCopy, brandColor, useGradient ? brandColor2 : null);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr-design-block.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, [qrSvgString, aiCopy, brandColor, brandColor2, useGradient]);

  const downloadPdf = useCallback(async () => {
    if (!designBlockUrl) return;

    // Load the design block image
    const img = new Image();
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = designBlockUrl;
    });

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    // A4 dimensions in points (72 DPI): 595.28 x 841.89
    // We'll make a page that fits the design block centered on A4
    const pageW = 595.28;
    const pageH = 841.89;

    // Scale image to fit within page with margins
    const margin = 40;
    const availW = pageW - margin * 2;
    const availH = pageH - margin * 2;
    const scale = Math.min(availW / imgW, availH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const offsetX = (pageW - drawW) / 2;
    const offsetY = (pageH - drawH) / 2;

    // Build a minimal PDF with the image embedded
    const canvas = document.createElement('canvas');
    canvas.width = imgW;
    canvas.height = imgH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    // Get JPEG data for smaller PDF size
    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const jpegBase64 = jpegDataUrl.split(',')[1];
    const jpegBytes = atob(jpegBase64);
    const jpegLength = jpegBytes.length;

    // Build PDF structure
    const pdfParts: string[] = [];
    const offsets: number[] = [];
    let pos = 0;

    const addObj = (content: string) => {
      offsets.push(pos);
      pdfParts.push(content);
      pos += new Blob([content]).size;
    };

    // Header
    const header = '%PDF-1.4\n';
    pdfParts.push(header);
    pos += header.length;

    // Object 1: Catalog
    addObj(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
    // Object 2: Pages
    addObj(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
    // Object 3: Page
    addObj(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Img0 5 0 R >> >> >>\nendobj\n`);
    // Object 4: Content stream (draw image)
    const streamContent = `q\n${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${offsetX.toFixed(2)} ${(offsetY).toFixed(2)} cm\n/Img0 Do\nQ\n`;
    addObj(`4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`);

    // Object 5: Image XObject
    const imgObjHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegLength} >>\nstream\n`;
    offsets.push(pos);
    pdfParts.push(imgObjHeader);
    pos += new Blob([imgObjHeader]).size;

    // Add binary JPEG data
    const jpegArray = new Uint8Array(jpegLength);
    for (let i = 0; i < jpegLength; i++) {
      jpegArray[i] = jpegBytes.charCodeAt(i);
    }

    const imgObjFooter = `\nendstream\nendobj\n`;

    // XRef
    const xrefStart = pos + jpegLength + new Blob([imgObjFooter]).size;

    // Build final PDF as Blob
    const encoder = new TextEncoder();
    const headerBytes = encoder.encode(header);
    const objBytes = pdfParts.slice(1).map(p => encoder.encode(p));

    // Calculate actual offsets from binary sizes
    const actualOffsets: number[] = [];
    let binaryPos = headerBytes.length;
    for (let i = 0; i < objBytes.length; i++) {
      actualOffsets.push(binaryPos);
      binaryPos += objBytes[i].length;
      if (i === objBytes.length - 1) {
        // Last obj is image header, add JPEG + footer
        binaryPos += jpegArray.length;
        binaryPos += encoder.encode(imgObjFooter).length;
      }
    }

    const xrefPos = binaryPos;

    let xref = `xref\n0 6\n0000000000 65535 f \n`;
    for (const off of actualOffsets) {
      xref += `${off.toString().padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;

    const xrefBytes = encoder.encode(xref);
    const imgFooterBytes = encoder.encode(imgObjFooter);

    // Assemble
    const totalSize = headerBytes.length + objBytes.reduce((s, b) => s + b.length, 0) + jpegArray.length + imgFooterBytes.length + xrefBytes.length;
    const pdfBuffer = new Uint8Array(totalSize);
    let offset = 0;
    pdfBuffer.set(headerBytes, offset); offset += headerBytes.length;
    for (let i = 0; i < objBytes.length; i++) {
      pdfBuffer.set(objBytes[i], offset); offset += objBytes[i].length;
      if (i === objBytes.length - 1) {
        pdfBuffer.set(jpegArray, offset); offset += jpegArray.length;
        pdfBuffer.set(imgFooterBytes, offset); offset += imgFooterBytes.length;
      }
    }
    pdfBuffer.set(xrefBytes, offset);

    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = 'qr-design-block.pdf';
    a.click();
    URL.revokeObjectURL(dlUrl);
  }, [designBlockUrl]);

  // ─── Waitlist Handler ───────────────────────────────────────────────────

  const handleWaitlist = useCallback(() => {
    if (!waitlistEmail.trim()) return;
    setWaitlistSubmitted(true);
    setTimeout(() => setWaitlistSubmitted(false), 5000);
    setWaitlistEmail('');
  }, [waitlistEmail]);

  // ─── Render ─────────────────────────────────────────────────────────────

  const hasOutput = !!(qrDataUrl && (aiCopy || isAiLoading));

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Hero Section */}
      <motion.section variants={fadeInUp} className="text-center mb-16 pt-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm font-bold mb-8"
        >
          <Printer size={16} />
          Print-Ready QR + Copy Tool
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-5 leading-[1.1]">
          Create a Branded QR Code
          <br />
          <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
            for Your Business
          </span>
        </h1>
        <p className="text-base md:text-lg text-slate-500 font-medium max-w-2xl mx-auto">
          Free, fast, and print-ready — QR code + persuasive copywriting in one design block
        </p>
      </motion.section>

      {/* Generator Form + Output */}
      <motion.section variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20 lg:items-start">
        {/* Form Panel */}
        <div className="lg:col-span-7">
          <div className="glass p-8 md:p-10 rounded-[2.5rem] shadow-2xl space-y-7">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <QrCode size={20} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-black tracking-tight">QR Generator</h2>
            </div>

            {/* 1. QR Purpose */}
            <div className="relative">
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2.5 ml-1">
                QR Purpose <span className="text-slate-300 normal-case tracking-normal font-medium">(optional)</span>
              </label>
              <button
                onClick={() => setIsPurposeOpen(!isPurposeOpen)}
                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-black/5 border-2 border-slate-200 hover:border-emerald-400 transition-all text-left font-semibold"
              >
                <span className={purpose ? 'text-slate-900' : 'text-slate-400'}>
                  {purpose || 'Select a purpose...'}
                </span>
                <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isPurposeOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isPurposeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    className="absolute top-full left-0 mt-2 w-full glass rounded-2xl shadow-2xl overflow-hidden z-50 py-2 border border-black/10"
                  >
                    {QR_PURPOSES.map(p => (
                      <button
                        key={p}
                        onClick={() => { setPurpose(p); setIsPurposeOpen(false); }}
                        className={`w-full text-left px-6 py-3 hover:bg-emerald-500/10 transition-colors font-semibold ${purpose === p ? 'text-emerald-600 bg-emerald-500/5' : ''}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => { setPurpose(''); setIsPurposeOpen(false); }}
                      className="w-full text-left px-6 py-3 hover:bg-red-500/10 text-slate-400 font-semibold transition-colors"
                    >
                      Clear selection
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Destination URL */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2.5 ml-1">
                Destination URL <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Link2 size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
                  placeholder="https://your-website.com"
                  className={`w-full pl-12 pr-6 py-4 rounded-2xl bg-black/5 border-2 ${urlError ? 'border-red-400' : 'border-slate-200'} focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 transition-all text-lg font-semibold outline-none placeholder:text-slate-300`}
                />
              </div>
              {urlError && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-sm text-red-500 font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} /> {urlError}
                </motion.p>
              )}
            </div>

            {/* 3. Logo Upload */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2.5 ml-1">
                Brand Logo <span className="text-slate-300 normal-case tracking-normal font-medium">(optional, PNG/JPG)</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              {logoPreview ? (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/5 border-2 border-emerald-200">
                  <img src={logoPreview} alt="Logo preview" className="w-14 h-14 rounded-xl object-contain bg-white shadow-sm" />
                  <div className="flex-1">
                    <p className="font-bold text-sm">{logoFile?.name}</p>
                    <p className="text-xs text-slate-400">Will be centered inside QR code</p>
                  </div>
                  <button onClick={removeLogo} className="p-2 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all">
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="logo-upload"
                  className="flex items-center justify-center gap-3 px-6 py-8 rounded-2xl bg-black/5 border-2 border-dashed border-slate-200 hover:border-emerald-400 transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Upload size={22} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Click to upload your logo</p>
                    <p className="text-xs text-slate-400">PNG or JPG — auto-resized safely</p>
                  </div>
                </label>
              )}
            </div>

            {/* 4. Brand Colors */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2.5 ml-1">
                Brand Colors
              </label>
              {/* Color 1 */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => handleColorPickerChange(e.target.value)}
                    className="w-14 h-14 rounded-2xl cursor-pointer border-2 border-slate-200 hover:border-emerald-400 transition-all appearance-none bg-transparent qr-color-picker"
                  />
                </div>
                <div className="relative flex-1">
                  <Palette size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={colorInput}
                    onChange={(e) => handleColorInputChange(e.target.value)}
                    placeholder="#000000"
                    maxLength={7}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl bg-black/5 border-2 border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 transition-all font-mono font-bold text-lg outline-none"
                  />
                </div>
                <span className="text-xs font-bold text-slate-400 w-6">1</span>
              </div>
              {/* Gradient Toggle */}
              <button
                onClick={() => setUseGradient(!useGradient)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all mb-3 ${
                  useGradient
                    ? 'border-emerald-400 bg-emerald-500/5 text-emerald-600'
                    : 'border-slate-200 text-slate-400 hover:border-slate-300'
                }`}
              >
                {useGradient ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                Gradient QR
              </button>
              {/* Color 2 (shown when gradient enabled) */}
              <AnimatePresence>
                {useGradient && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="color"
                          value={brandColor2}
                          onChange={(e) => handleColor2PickerChange(e.target.value)}
                          className="w-14 h-14 rounded-2xl cursor-pointer border-2 border-slate-200 hover:border-emerald-400 transition-all appearance-none bg-transparent qr-color-picker"
                        />
                      </div>
                      <div className="relative flex-1">
                        <Palette size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                          type="text"
                          value={color2Input}
                          onChange={(e) => handleColor2InputChange(e.target.value)}
                          placeholder="#4f46e5"
                          maxLength={7}
                          className="w-full pl-11 pr-4 py-4 rounded-2xl bg-black/5 border-2 border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 transition-all font-mono font-bold text-lg outline-none"
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-400 w-6">2</span>
                    </div>
                    {/* Gradient preview bar */}
                    <div
                      className="mt-3 h-3 rounded-full"
                      style={{ background: `linear-gradient(to right, ${brandColor}, ${brandColor2})` }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {getContrastRatio(brandColor, '#ffffff') < 3 && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-sm text-amber-600 font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} /> Low contrast — QR may be hard to scan
                </motion.p>
              )}
            </div>

            {/* 5. QR Style */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2.5 ml-1">
                QR Style
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setQrStyle('square')}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl border-2 font-bold transition-all ${
                    qrStyle === 'square'
                      ? 'border-emerald-400 bg-emerald-500/5 text-emerald-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-500'
                  }`}
                >
                  <SquareIcon size={18} />
                  Square
                </button>
                <button
                  onClick={() => setQrStyle('rounded')}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl border-2 font-bold transition-all ${
                    qrStyle === 'rounded'
                      ? 'border-emerald-400 bg-emerald-500/5 text-emerald-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-500'
                  }`}
                >
                  <CircleDot size={18} />
                  Rounded
                </button>
              </div>
            </div>

            {/* 6. AI Instruction */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-slate-500 mb-2.5 ml-1">
                <span className="flex items-center gap-2">
                  <Sparkles size={14} className="text-emerald-500" />
                  Tell us how you'll use this QR
                  <span className="text-slate-300 normal-case tracking-normal font-medium">(optional)</span>
                </span>
              </label>
              <p className="text-sm font-medium text-slate-400 mb-2 ml-1">AI will generate a persuasive tagline to print alongside your QR code</p>
              <div className="relative">
                <MessageSquareText size={18} className="absolute left-5 top-4 text-slate-300" />
                <textarea
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder={'"For restaurant table stickers" or "For product packaging" or "Discount offer for walk-in customers"'}
                  rows={3}
                  maxLength={200}
                  className="w-full pl-12 pr-6 py-4 rounded-2xl bg-black/5 border-2 border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium outline-none resize-none placeholder:text-slate-300 text-base"
                />
                <span className="absolute bottom-3 right-4 text-xs text-slate-300 font-bold">{aiInstruction.length}/200</span>
              </div>
            </div>

            {/* Generate Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateQr}
              disabled={isGenerating}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed text-base group btn-glow"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Printer size={20} strokeWidth={2.5} />
                  Generate Print-Ready Design
                  <Sparkles size={16} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-5">
          <div className="glass p-8 md:p-10 rounded-[2.5rem] shadow-2xl sticky top-28 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
                <ImageIcon size={20} className="text-teal-500" />
              </div>
              <h2 className="text-xl font-black tracking-tight">Design Preview</h2>
            </div>

            {/* Design Block Preview */}
            <div ref={designBlockRef} className="bg-white rounded-3xl shadow-inner border-4 border-slate-50 overflow-hidden">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-4 text-slate-300 py-20 px-6"
                  >
                    <div className="qr-pulse">
                      <QrCode size={64} />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-widest">Generating QR...</span>
                  </motion.div>
                ) : designBlockUrl ? (
                  <motion.div
                    key="design-block"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.5, ease: 'backOut' }}
                  >
                    <img
                      src={designBlockUrl}
                      alt="QR Design Block — Print Ready"
                      className="w-full"
                    />
                  </motion.div>
                ) : qrDataUrl ? (
                  <motion.div
                    key="qr-with-ai-loading"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, ease: 'backOut' }}
                    className="p-6 relative"
                  >
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className={`w-full max-w-[260px] mx-auto ${qrStyle === 'rounded' ? 'rounded-2xl' : ''}`}
                    />
                    {isAiLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center justify-center gap-2 text-slate-400"
                      >
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">Writing copy with AI...</span>
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 text-slate-200 text-center py-16 px-6"
                  >
                    <div className="flex items-center gap-3">
                      <QrCode size={48} strokeWidth={1} />
                      <span className="text-2xl text-slate-200">+</span>
                      <MessageSquareText size={48} strokeWidth={1} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-widest text-slate-300">QR + Copywriting</p>
                      <p className="text-xs text-slate-300 mt-1">Your print-ready design block will appear here</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* AI Copywriting Display */}
            <AnimatePresence>
              {aiCopy && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">AI-Generated Copy</span>
                  </div>
                  <p className="text-sm text-slate-800 font-bold leading-relaxed mb-1.5">"{aiCopy.title}"</p>
                  <ul className="space-y-1">
                    {aiCopy.bullets.map((b, i) => (
                      <li key={i} className="text-xs text-slate-600 font-medium flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Download Buttons */}
            <AnimatePresence>
              {designBlockUrl && aiCopy && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="space-y-3"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">Download Design Block</p>
                  <div className="grid grid-cols-3 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={downloadPng}
                      className="py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs shadow-lg"
                    >
                      <Download size={14} />
                      PNG
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={downloadSvg}
                      className="py-3 border-2 border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-600 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs"
                    >
                      <Download size={14} />
                      SVG
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={downloadPdf}
                      className="py-3 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs shadow-lg shadow-red-500/20"
                    >
                      <FileText size={14} />
                      PDF
                    </motion.button>
                  </div>
                  <div className="flex items-center gap-2 justify-center pt-1">
                    <Printer size={12} className="text-slate-400" />
                    <span className="text-[10px] text-slate-400 font-medium">Print-ready for posters, banners, table tents & more</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* Waitlist CTA */}
      <motion.section
        variants={fadeInUp}
        className="glass p-10 md:p-14 rounded-[3rem] shadow-2xl mb-16 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 text-amber-600 text-sm font-bold mb-5">
              <Bell size={14} />
              Coming Soon
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-4">
              Unlock Smart QR Features
            </h2>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-center gap-3 font-semibold">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} className="text-emerald-500" />
                </div>
                Dynamic QR codes (edit link later)
              </li>
              <li className="flex items-center gap-3 font-semibold">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={16} className="text-blue-500" />
                </div>
                Scan analytics
              </li>
              <li className="flex items-center gap-3 font-semibold">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <Layers size={16} className="text-purple-500" />
                </div>
                Bulk QR generation
              </li>
            </ul>
          </div>
          <div className="flex flex-col items-start md:items-end gap-4">
            <div className="w-full md:max-w-sm flex gap-3">
              <input
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-5 py-4 rounded-2xl bg-black/5 border-2 border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/5 transition-all font-semibold outline-none"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleWaitlist}
                disabled={waitlistSubmitted}
                className={`px-6 py-4 rounded-2xl font-black text-white transition-all shadow-lg whitespace-nowrap ${
                  waitlistSubmitted
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/25'
                }`}
              >
                {waitlistSubmitted ? (
                  <span className="flex items-center gap-2"><Check size={18} /> Joined!</span>
                ) : (
                  'Join Waitlist'
                )}
              </motion.button>
            </div>
            <p className="text-xs text-slate-400 font-medium">No spam. We'll only notify you at launch.</p>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
};

export default BusinessQrGenerator;
