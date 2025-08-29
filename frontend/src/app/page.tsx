"use client";

import React from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { PDFUpload } from "@/components/PDFUpload";
import { PDFViewer } from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { useState } from "react";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [highlightPage, setHighlightPage] = useState<number | undefined>();

  const handleFileSelect = (file: File, sessionId: string) => {
    setSelectedFile(file);
    setSessionId(sessionId);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setSessionId(null);
    setHighlightPage(undefined);
  };

  const handleCitationClick = (page: number) => {
    setHighlightPage(page);
  };

  if (!selectedFile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <PDFUpload
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            onClearFile={handleClearFile}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm shadow-soft">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold gradient-text">PDF Chat Assistant</h1>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleClearFile}
              className="hover:bg-destructive hover:text-destructive-foreground"
            >
              New Document
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* PDF Viewer */}
        <div className="flex-1 p-4">
          <PDFViewer
            file={selectedFile}
            highlightPage={highlightPage}
          />
        </div>

        {/* Chat Interface */}
        <div className="w-96 p-4 border-l">
          <ChatInterface
            onCitationClick={handleCitationClick}
            pdfFile={selectedFile}
            sessionId={sessionId}
          />
        </div>
      </div>
    </div>
  );
};
