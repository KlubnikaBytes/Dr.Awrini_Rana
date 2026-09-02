import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * @param {string|HTMLElement} input - The ID of the HTML element, the element itself, or raw HTML string.
 * @param {string} to - The recipient email address.
 * @param {string} subject - The email subject.
 * @param {string} htmlMessage - The HTML body of the email.
 * @param {string} filename - The name of the attached PDF file.
 */
export const sendDocumentAsEmail = async (input, to, subject, htmlMessage, filename = 'document.pdf') => {
  let element;
  let isTemp = false;

  if (typeof input === 'string' && input.trim().startsWith('<')) {
    // It's raw HTML!
    element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.top = '0px';
    element.style.width = '900px';
    element.style.background = 'white';
    element.innerHTML = input;
    document.body.appendChild(element);
    isTemp = true;
    
    // Give images a tiny bit of time to load
    await new Promise(r => setTimeout(r, 500));
  } else if (typeof input === 'string') {
    element = document.getElementById(input);
  } else {
    element = input;
  }

  if (!element) {
    throw new Error(`Element not found for PDF generation`);
  }

  // 1. Generate PDF using html2canvas and jspdf
  // Ensure the element is visible, temporarily overriding any display:none if needed
  const originalDisplay = element.style.display;
  if (!isTemp) element.style.display = 'block';

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
    });
    
    if (!isTemp) element.style.display = originalDisplay; // restore
    if (isTemp) document.body.removeChild(element);

    // Use JPEG with 0.8 quality to drastically reduce PDF file size and speed up generation
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Calculate PDF dimensions (A4 size)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // Use JPEG instead of PNG
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    const pdfBlob = pdf.output('blob');

    // 2. Prepare FormData to send to backend
    const formData = new FormData();
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', htmlMessage);
    formData.append('file', pdfBlob, filename);

    // 3. Send via API
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/email/send`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });

    return response.data;
  } catch (error) {
    element.style.display = originalDisplay; // restore in case of error
    console.error('Error generating or sending PDF email:', error);
    throw error;
  }
};
