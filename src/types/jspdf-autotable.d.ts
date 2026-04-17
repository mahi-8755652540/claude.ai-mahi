declare module "jspdf-autotable" {
  import { jsPDF } from "jspdf";
  
  interface AutoTableOptions {
    startY?: number;
    margin?: { left?: number; right?: number; top?: number; bottom?: number };
    head?: any[][];
    body?: any[][];
    foot?: any[][];
    theme?: string;
    headStyles?: Record<string, any>;
    bodyStyles?: Record<string, any>;
    footStyles?: Record<string, any>;
    columnStyles?: Record<number, Record<string, any>>;
    alternateRowStyles?: Record<string, any>;
  }

  function autoTable(doc: jsPDF, options: AutoTableOptions): void;
  export default autoTable;
}
