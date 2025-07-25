"use client";
import { useEffect, useRef } from "react";

const BarcodeScanner = ({ onScan }) => {
  const buffer = useRef("");
  const timeout = useRef(null);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "Enter") {
        const scanned = buffer.current.trim();
        if (scanned) {
          onScan(scanned);
        }
        buffer.current = "";
        return;
      }

      // ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      buffer.current += e.key;

      // clear if no input within 500ms (simulate scanner burst)
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        buffer.current = "";
      }, 500);
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [onScan]);

  return null; // no UI
};

export default BarcodeScanner;
