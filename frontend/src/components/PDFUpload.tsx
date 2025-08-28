import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface PDFUploadProps {
  onFileSelect: (file: File, sessionId: string) => void;
  selectedFile?: File | null;
  onClearFile?: () => void;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({
  onFileSelect,
  selectedFile,
  onClearFile
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadToAPI = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('https://google-notebooklm-clone-a4ex.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return data.session_id;
    } catch (error) {
      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      setIsUploading(true);
      try {
        const sessionId = await uploadToAPI(file);
        onFileSelect(file, sessionId);
        toast({
          title: "PDF uploaded successfully",
          description: `${file.name} is ready for analysis`,
        });
      } catch (error) {
        toast({
          title: "Upload failed",
          description: "There was an error uploading your PDF. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
    }
    setIsDragActive(false);
  }, [onFileSelect, toast]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  if (selectedFile) {
    return (
      <Card className="p-6 bg-gradient-surface border shadow-soft">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {onClearFile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFile}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card
      {...getRootProps()}
      className={`
        upload-area p-8 cursor-pointer transition-all duration-300 hover:shadow-medium
        ${isDragActive ? 'drag-active border-primary shadow-primary' : 'border-dashed border-2'}
        ${isUploading ? 'pointer-events-none opacity-50' : ''}
      `}
    >
      <input {...getInputProps()} />
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
          <Upload className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            {isUploading ? "Uploading..." : isDragActive ? "Drop your PDF here" : "Upload PDF Document"}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {isUploading ? "Processing your PDF document..." : "Drag and drop your PDF file here, or click to browse. Maximum file size: 50MB"}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={isUploading}
          className="bg-background/50 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Uploading..." : "Choose File"}
        </Button>
      </div>
    </Card>
  );
};