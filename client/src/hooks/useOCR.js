import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const publicAsset = (path) => `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}/${path}`;

pdfjsLib.GlobalWorkerOptions.workerSrc = publicAsset('pdf.worker.min.mjs');

/**
 * On-device OCR with Tesseract.js (English + Hindi).
 * Offline use: place eng.traineddata.gz and hin.traineddata.gz in client/public/tessdata/ and the
 * app loads them locally. If they are missing it falls back to Tesseract's CDN (needs internet once).
 * Either way the original document is never uploaded.
 */
export function useOCR() {
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runOCR = useCallback(async (documentFile) => {
    setLoading(true); setError(null); setProgress(0);
    const isPdf = documentFile.type === 'application/pdf' || documentFile.name.toLowerCase().endsWith('.pdf');
    let pageCount = 1;
    let currentPage = 0;
    const hasLocalLanguageData = (await Promise.all(['eng', 'hin'].map(async (lang) => {
      try {
        const response = await fetch(publicAsset(`tessdata/${lang}.traineddata.gz`), { method: 'HEAD' });
        const contentType = response.headers.get('content-type') || '';
        const contentLength = response.headers.get('content-length');
        return response.ok
          && !contentType.includes('text/html')
          && (!contentLength || Number(contentLength) > 100000);
      } catch {
        return false;
      }
    }))).every(Boolean);
    const logger = (m) => {
      if (m.status === 'recognizing text') {
        setProgress(Math.round(((currentPage + m.progress) / pageCount) * 100));
      }
    };
    let worker;
    let pdf;
    try {
      let rejectInitialization;
      const initializationError = new Promise((resolve, reject) => {
        rejectInitialization = reject;
      });
      const workerPromise = createWorker('eng+hin', 1, {
        logger,
        errorHandler: (message) => rejectInitialization(new Error(String(message))),
        workerPath: publicAsset('tesseract/worker.min.js'),
        corePath: publicAsset('tesseract'),
        workerBlobURL: false,
        ...(hasLocalLanguageData && { langPath: publicAsset('tessdata') }),
      });
      worker = await Promise.race([workerPromise, initializationError]);

      if (!isPdf) {
        const { data } = await worker.recognize(documentFile);
        return data.text || '';
      }

      pdf = await pdfjsLib.getDocument({ data: await documentFile.arrayBuffer() }).promise;
      pageCount = pdf.numPages;
      const pageTexts = [];
      for (currentPage = 0; currentPage < pageCount; currentPage += 1) {
        const page = await pdf.getPage(currentPage + 1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(2, 2000 / baseViewport.width);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const { data } = await worker.recognize(canvas);
        pageTexts.push(data.text || '');
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
      setProgress(100);
      return pageTexts.join('\n');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err || '');
      setError(message === 'Failed to fetch' || message === 'initialization failed'
        ? 'Could not load OCR language data. Connect to the internet once or add eng.traineddata.gz and hin.traineddata.gz under public/tessdata.'
        : message || 'OCR failed. Try another file or enter the details manually.');
      return '';
    } finally {
      try { await worker?.terminate(); } catch { /* ignore */ }
      await pdf?.destroy();
      setLoading(false);
    }
  }, []);

  return { runOCR, progress, loading, error };
}
