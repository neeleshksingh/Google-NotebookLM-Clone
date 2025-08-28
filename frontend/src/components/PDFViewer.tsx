import { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { debounce } from 'lodash';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface PDFViewerProps {
  file: File | string;
  highlightPage?: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, highlightPage }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(0.8);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    toast({
      title: 'PDF loaded successfully',
      description: `Document contains ${numPages} pages`,
    });
  }, [toast]);

  const onDocumentLoadError = useCallback((error: Error) => {
    setLoading(false);
    toast({
      title: 'Failed to load PDF',
      description: `Error: ${error.message}`,
      variant: 'destructive',
    });
  }, [toast]);

  useEffect(() => {
    const timerId = 'pdf-load';
    if (highlightPage && highlightPage > 0 && highlightPage <= numPages && highlightPage !== pageNumber) {
      setPageNumber(highlightPage);
    }
    const timer = setTimeout(() => {
      if (loading) {
        toast({
          title: 'PDF loading timeout',
          description: 'The PDF is taking too long to load. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
      }
    }, 10000);
    return () => {
      clearTimeout(timer);
    };
  }, [highlightPage, pageNumber, numPages, loading, toast]);

  const goToPreviousPage = () => setPageNumber((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setPageNumber((prev) => Math.min(numPages, prev + 1));

  const debouncedHandlePageInputChange = debounce((page: number) => {
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  }, 300);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = parseInt(e.target.value);
    if (!isNaN(page)) {
      debouncedHandlePageInputChange(page);
    }
  };

  const zoomIn = () => setScale((prev) => Math.min(3.0, prev + 0.2));
  const zoomOut = () => setScale((prev) => Math.max(0.5, prev - 0.2));
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  return (
    <Card className="h-full flex flex-col bg-gradient-surface shadow-medium">
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
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
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <div className="flex justify-center">
          {loading && (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
          )}
          <div
            className={`shadow-strong rounded-lg overflow-hidden ${highlightPage === pageNumber ? 'ring-4 ring-citation ring-opacity-50' : ''
              }`}
          >
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                rotate={rotation}
                loading={<div className="flex items-center justify-center h-96 bg-card">Loading page...</div>}
              />
            </Document>
          </div>
        </div>
      </div>
    </Card>
  );
};