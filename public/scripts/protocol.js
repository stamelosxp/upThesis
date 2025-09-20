function downloadPDF(button) {
    const scale = 2;
    button.style.display = 'none';

    html2canvas(content, {
        scale: scale,
        useCORS: true,
        backgroundColor: "#FFFFFF",
        logging: false
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new window.jspdf.jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            hotfixes: ["px_scaling"]
        });

        const pageWidth = 210;
        const pageHeight = 297;
        const imgWidth = pageWidth;
        const imgHeight = canvas.height * imgWidth / canvas.width;

        let renderHeight = imgHeight;
        let renderWidth = imgWidth;
        if (imgHeight > pageHeight) {
            renderHeight = pageHeight;
            renderWidth = canvas.width * renderHeight / canvas.height;
        }
        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight, undefined, 'FAST');
        pdf.save('praktiko.pdf');
        button.style.display = 'block';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const downloadButton = document.getElementById('save-button');
    if(downloadButton) {
        console.log('Download');
        downloadButton.addEventListener('click', () => downloadPDF(downloadButton));
    }
})