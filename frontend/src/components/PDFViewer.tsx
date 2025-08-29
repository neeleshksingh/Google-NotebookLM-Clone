"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { debounce } from "lodash";
import { useToast } from "@/hooks/use-toast";

const Document = dynamic(() => import("react-pdf").then(m => m.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then(m => m.Page), { ssr: false });

interface PDFViewerProps {
  file: File | string;
  highlightPage?: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, highlightPage }) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.8);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);

  const toast = useToast();

  useEffect(() => {
    (async () => {
      const { pdfjs } = await import("react-pdf");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
    })();
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    toast.success("PDF loaded successfully", {
      description: `Document contains ${numPages} pages`,
    });
  }, [toast]);

  const onDocumentLoadError = useCallback((error: Error) => {
    setLoading(false);
    toast.error("Failed to load PDF", { description: error.message });
  }, [toast]);

  useEffect(() => {
    if (highlightPage && highlightPage > 0 && highlightPage <= numPages && highlightPage !== pageNumber) {
      setPageNumber(highlightPage);
    }
  }, [highlightPage, numPages, pageNumber]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      toast.error("PDF loading timeout", {
        description: "The PDF is taking too long to load. Please try again.",
      });
      setLoading(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [loading, toast]);

  const goToPreviousPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPageNumber((p) => Math.min(numPages, p + 1));

  const debouncedHandlePageInputChange = useMemo(() => debounce((page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    } else {
      toast.error("Invalid page", { description: `Enter between 1 and ${numPages}` });
    }
  }, 300), [numPages, toast]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (!isNaN(page)) debouncedHandlePageInputChange(page);
  };

  const zoomIn = () => setScale((s) => Math.min(3.0, s + 0.2));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.2));
  const rotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <Card className="h-full flex flex-col bg-gradient-surface shadow-medium">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPreviousPage} disabled={pageNumber <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <Input
              type="number"
              value={pageNumber}
              onChange={handlePageInputChange}
              min={1}
              max={numPages}
              className="w-16 text-center"
            />
            <span className="text-muted-foreground">of {numPages}</span>
          </div>

          <Button variant="outline" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom & Rotate */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3.0}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={rotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <div className="flex justify-center">
          {loading && (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
          )}

          {!loading && (
            <div className={`shadow-strong rounded-lg overflow-hidden ${highlightPage === pageNumber ? "ring-4 ring-citation ring-opacity-50" : ""}`}>
              <Document file={file} onLoadSuccess={onDocumentLoadSuccess} onLoadError={onDocumentLoadError} loading={null}>
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={<div className="flex items-center justify-center h-96 bg-card">Loading page...</div>}
                />
              </Document>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
