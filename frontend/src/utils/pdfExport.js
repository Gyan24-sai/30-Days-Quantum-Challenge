import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Export a prediction result as a research-paper-style PDF.
 * - Page 1: Snapshot of the full result view (image, prediction, probabilities, GradCAM, circuit, Bloch spheres, scene info)
 * - Page 2: Structured technical metadata table
 */
export const exportPredictionPDF = async (result, sectionElement) => {
  if (!result) throw new Error('No result to export');
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  
  // === Page 1: Visual snapshot ===
  if (sectionElement) {
    // Wait a tick for any pending animations to settle
    await new Promise(resolve => setTimeout(resolve, 150));
    
    const canvas = await html2canvas(sectionElement, {
      backgroundColor: '#050816',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowWidth: sectionElement.scrollWidth,
      windowHeight: sectionElement.scrollHeight,
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    
    // Header on page 1
    drawHeader(pdf, pageW, margin, result);
    
    let y = margin + 22;
    
    // If snapshot is taller than remaining page, split it
    let remainingH = imgH;
    let sourceY = 0;
    let pageHeightAvail = pageH - y - margin;
    
    while (remainingH > 0) {
      const sliceH = Math.min(remainingH, pageHeightAvail);
      const sliceRatio = sliceH / imgH;
      
      // Create a sub-canvas for this slice
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = canvas.height * sliceRatio;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.9);
      
      pdf.addImage(sliceData, 'JPEG', margin, y, imgW, sliceH);
      
      remainingH -= sliceH;
      sourceY += sliceCanvas.height;
      
      if (remainingH > 0) {
        pdf.addPage();
        drawHeader(pdf, pageW, margin, result, true);
        y = margin + 22;
        pageHeightAvail = pageH - y - margin;
      }
    }
  }
  
  // === Final page: Structured metadata ===
  pdf.addPage();
  drawHeader(pdf, pageW, margin, result, true);
  drawMetadataPage(pdf, pageW, pageH, margin, result);
  
  // Footer on all pages
  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    drawFooter(pdf, pageW, pageH, margin, i, pageCount);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `HQIC-${result.predicted_class}-${timestamp}.pdf`;
  pdf.save(filename);
  
  return filename;
};

const drawHeader = (pdf, pageW, margin, result, secondary = false) => {
  // Title
  pdf.setFontSize(secondary ? 12 : 16);
  pdf.setTextColor(0, 212, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Hybrid Quantum Image Classifier', margin, margin + 5);
  
  if (!secondary) {
    pdf.setFontSize(9);
    pdf.setTextColor(120, 120, 130);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Real-Time Environmental Scene Intelligence · Prediction Report', margin, margin + 10);
  }
  
  // Prediction badge (right side)
  const badgeText = `${result.predicted_class}  ·  ${(result.confidence * 100).toFixed(1)}%`;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const badgeW = pdf.getTextWidth(badgeText) + 8;
  pdf.setFillColor(0, 212, 255);
  pdf.roundedRect(pageW - margin - badgeW, margin + 2, badgeW, 7, 2, 2, 'F');
  pdf.setTextColor(5, 8, 22);
  pdf.text(badgeText, pageW - margin - badgeW + 4, margin + 6.8);
  
  // Divider line
  pdf.setDrawColor(0, 212, 255);
  pdf.setLineWidth(0.3);
  pdf.line(margin, margin + 14, pageW - margin, margin + 14);
};

const drawFooter = (pdf, pageW, pageH, margin, pageNum, totalPages) => {
  pdf.setFontSize(8);
  pdf.setTextColor(140, 140, 150);
  pdf.setFont('helvetica', 'normal');
  const ts = new Date(result_timestamp() || Date.now()).toISOString().replace('T', ' ').slice(0, 19);
  pdf.text(`Generated ${ts} UTC`, margin, pageH - 5);
  pdf.text(`Page ${pageNum} / ${totalPages}`, pageW - margin - 20, pageH - 5);
};

const result_timestamp = () => Date.now();

const drawMetadataPage = (pdf, pageW, pageH, margin, result) => {
  let y = margin + 22;
  
  const section = (label) => {
    pdf.setFontSize(11);
    pdf.setTextColor(0, 212, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, margin, y);
    y += 5;
    pdf.setDrawColor(0, 212, 255, 0.4);
    pdf.setLineWidth(0.15);
    pdf.line(margin, y - 3, margin + 40, y - 3);
    y += 2;
  };
  
  const row = (key, val, valColor = null) => {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(140, 140, 150);
    pdf.text(key, margin + 2, y);
    pdf.setFont('helvetica', 'bold');
    if (valColor) pdf.setTextColor(...valColor);
    else pdf.setTextColor(230, 230, 240);
    pdf.text(String(val), margin + 60, y);
    y += 5;
  };
  
  // Prediction section
  section('Prediction');
  row('Predicted Class', result.predicted_class, [0, 212, 255]);
  row('Confidence', `${(result.confidence * 100).toFixed(3)}%`);
  row('Inference Time', `${result.inference_time_ms.toFixed(2)} ms`);
  row('Model Weights', result.weights_loaded ? 'Trained (loaded)' : 'Random (untrained)', 
      result.weights_loaded ? [0, 255, 200] : [255, 140, 66]);
  y += 3;
  
  // Probabilities
  section('Class Probabilities');
  Object.entries(result.probabilities || {}).forEach(([cls, prob]) => {
    row(cls, `${(prob * 100).toFixed(3)}%`);
  });
  y += 3;
  
  // Quantum state (PauliZ)
  if (result.quantum_state && result.quantum_state.length) {
    section('PauliZ Expectation Values');
    result.quantum_state.forEach((z, i) => {
      row(`|q${i}⟩ ⟨Z⟩`, z >= 0 ? `+${z.toFixed(6)}` : z.toFixed(6));
    });
    y += 3;
  }
  
  // Bloch vectors
  if (result.bloch_vectors && result.bloch_vectors.length) {
    section('Bloch Vectors (X, Y, Z, |r|)');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(140, 140, 150);
    pdf.text('Qubit', margin + 2, y);
    pdf.text('X', margin + 30, y);
    pdf.text('Y', margin + 60, y);
    pdf.text('Z', margin + 90, y);
    pdf.text('|r|', margin + 120, y);
    y += 4;
    pdf.setDrawColor(60, 60, 70);
    pdf.line(margin, y - 2, pageW - margin, y - 2);
    y += 2;
    
    result.bloch_vectors.forEach((bv, i) => {
      pdf.setTextColor(230, 230, 240);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`|q${i}⟩`, margin + 2, y);
      pdf.setFont('courier', 'normal');
      pdf.setTextColor(255, 100, 100);
      pdf.text(fmt(bv.x), margin + 30, y);
      pdf.setTextColor(100, 255, 150);
      pdf.text(fmt(bv.y), margin + 60, y);
      pdf.setTextColor(120, 180, 255);
      pdf.text(fmt(bv.z), margin + 90, y);
      pdf.setTextColor(0, 255, 200);
      pdf.text(bv.purity.toFixed(4), margin + 120, y);
      y += 5;
    });
    y += 3;
  }
  
  // Architecture
  section('Model Architecture');
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(200, 200, 210);
  pdf.setFontSize(9);
  const archText = [
    '1. Classical Backbone: ResNet50 (ImageNet pretrained, frozen)',
    '2. Reduction Head: 2048 -> 256 -> 64 -> 4 (residual blocks + Tanh)',
    '3. Attention Bridge: Multi-Head Self-Attention',
    '4. Quantum Layer: 4 qubits, 2 layers, StronglyEntangling ansatz, Angle encoding',
    '5. Classifier: Skip-concat (classical + quantum) -> 3 classes',
  ];
  archText.forEach((t) => {
    pdf.text(t, margin + 2, y);
    y += 5;
  });
};

const fmt = (v) => (v >= 0 ? `+${v.toFixed(4)}` : v.toFixed(4));
