import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { Eye } from 'lucide-react';

interface TimeLog {
  id: string;
  contractorUid: string;
  contractorName: string;
  contractorId: string;
  jobId: string;
  jobName: string;
  clockInTime: string;
  clockOutTime?: string;
  totalHours: number;
  workDate: string;
  weekEnding: string;
  hourlyRate: number;
  lineTotal: number;
  invoiced: boolean;
  perDiem?: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  contractorName: string;
  weekEnding: string;
  totalHours: number;
  totalAmount: number;
  invoiceDate: string;
  status: string;
}

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weekEnding, setWeekEnding] = useState('');

  useEffect(() => {
    const now = new Date();
    let weDate = new Date(now);
    const day = weDate.getDay();
    const diff = (day <= 5 ? 5 - day : 12 - day);
    weDate.setDate(weDate.getDate() + diff);
    setWeekEnding(format(weDate, 'yyyy-MM-dd'));
    
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'invoices'));
      const snapshot = await getDocs(q);
      setInvoices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice)));
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
    setLoading(false);
  };

  const previewInvoice = async (invoice: Invoice) => {
    try {
      // Fetch time logs for this invoice
      const logsQuery = query(
        collection(db, 'timeLogs'),
        where('invoiceNumber', '==', invoice.invoiceNumber)
      );
      const logsSnap = await getDocs(logsQuery);
      const contractorLogs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeLog));

      if (contractorLogs.length === 0) {
        alert("No time logs found for this invoice.");
        return;
      }

      const uid = contractorLogs[0].contractorUid;
      const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
      const userData = userSnap.empty ? null : userSnap.docs[0].data();
      
      const isSalaried = userData?.type === 'Salaried';
      const weeklySalary = userData?.weeklySalary || 0;

      // Calculate hours, overtime, and per diem
      let totalRegularHours = 0;
      let totalOvertimeHours = 0;
      let perDiemDays = 0;
      
      const jobBreakdown: Record<string, { hours: number, rate: number }> = {};

      contractorLogs.forEach(log => {
        const hours = log.totalHours || 0;
        const rate = log.hourlyRate || 0;
        const jobKey = `${log.jobId} ${log.jobName}`;
        
        if (!jobBreakdown[jobKey]) {
          jobBreakdown[jobKey] = { hours: 0, rate };
        }
        jobBreakdown[jobKey].hours += hours;
        
        if (log.perDiem) {
          perDiemDays += 1;
        }
      });

      const totalHours = contractorLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
      
      if (totalHours > 40) {
        totalRegularHours = 40;
        totalOvertimeHours = totalHours - 40;
      } else {
        totalRegularHours = totalHours;
      }

      const baseRate = contractorLogs[0]?.hourlyRate || 0;
      const otRate = baseRate * 1.5;
      const perDiemRate = 50.00;

      let totalAmount = 0;
      if (isSalaried) {
        totalAmount = weeklySalary + (perDiemDays * perDiemRate);
      } else {
        totalAmount = (totalRegularHours * baseRate) + (totalOvertimeHours * otRate) + (perDiemDays * perDiemRate);
      }

      // Create PDF
      const docPDF = new jsPDF();
      
      // Brand Colors
      const charcoal = '#222222';
      const concrete = '#A7AFB5';
      const green = '#10BE66';

      // Header
      docPDF.setTextColor(charcoal);
      docPDF.setFont("helvetica", "bold");
      docPDF.setFontSize(24);
      docPDF.text(invoice.contractorName, 14, 22);
      
      docPDF.setTextColor(concrete);
      docPDF.setFontSize(20);
      docPDF.text("INVOICE", 150, 22);
      
      // Sub-header (Job Code)
      docPDF.setTextColor(charcoal);
      docPDF.setFontSize(10);
      docPDF.text(`Base-5106`, 100, 35); // Defaulting to Base 1099 job code for now
      
      // Info Table
      autoTable(docPDF, {
        startY: 38,
        margin: { left: 100 },
        head: [['INVOICE #', 'DATE']],
        body: [[invoice.invoiceNumber, format(new Date(invoice.invoiceDate), 'M/d/yyyy')]],
        theme: 'plain',
        headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center', textColor: [34, 34, 34], fontStyle: 'bold' },
        styles: { cellPadding: 2, fontSize: 10 }
      });

      // Pay Period
      const weDate = new Date(invoice.weekEnding);
      const ppStart = new Date(weDate);
      ppStart.setDate(ppStart.getDate() - 6);
      docPDF.setFontSize(10);
      docPDF.text(`${format(ppStart, 'MM/dd/yy')}-${format(weDate, 'MM/dd/yyyy')}`, 100, 55);

      // Main Table
      const tableRows: any[] = [];
      
      if (isSalaried) {
        tableRows.push(["", "Weekly Salary", "1.00", weeklySalary.toFixed(2), weeklySalary.toFixed(2)]);
      } else {
        // Regular Hours per job
        let remainingReg = totalRegularHours;
        for (const [job, data] of Object.entries(jobBreakdown)) {
          if (remainingReg <= 0) break;
          const hoursToBill = Math.min(data.hours, remainingReg);
          tableRows.push([
            "", // Date column left blank as per example
            job,
            hoursToBill.toFixed(2),
            data.rate.toFixed(2),
            (hoursToBill * data.rate).toFixed(2)
          ]);
          remainingReg -= hoursToBill;
        }
        
        // Overtime Row
        if (totalOvertimeHours > 0) {
          tableRows.push([
            "",
            "Overtime (1.5x)",
            totalOvertimeHours.toFixed(2),
            otRate.toFixed(2),
            (totalOvertimeHours * otRate).toFixed(2)
          ]);
        }
      }

      // Empty rows for spacing
      for(let i=0; i<3; i++) tableRows.push(["", "", "", "", "-"]);

      // Per Diem Row
      if (perDiemDays > 0) {
        tableRows.push([
          "",
          "Per Diem",
          perDiemDays.toFixed(2),
          perDiemRate.toFixed(2),
          (perDiemDays * perDiemRate).toFixed(2)
        ]);
      } else {
        tableRows.push(["", "Per Diem", "", "", "-"]);
      }

      // More empty rows
      for(let i=0; i<3; i++) tableRows.push(["", "", "", "", "-"]);

      autoTable(docPDF, {
        startY: 60,
        head: [['Date', 'Job', 'QTY', 'UNIT PRICE', 'AMOUNT']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { textColor: [34, 34, 34] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 70 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        },
        styles: { fontSize: 10, cellPadding: 3, lineColor: [167, 175, 181], lineWidth: 0.1 }
      });

      const finalY = (docPDF as any).lastAutoTable.finalY || 60;
      
      // Footer
      docPDF.setTextColor(16, 190, 102); // Green
      docPDF.setFont("helvetica", "italic");
      docPDF.text("Thank you for your business!", 14, finalY + 8);
      
      // Total Box
      docPDF.setFillColor(167, 175, 181); // Concrete Gray
      docPDF.rect(100, finalY, 85, 10, 'F');
      docPDF.setTextColor(34, 34, 34);
      docPDF.setFont("helvetica", "bold");
      docPDF.text("TOTAL", 105, finalY + 7);
      docPDF.text(totalAmount.toFixed(2), 170, finalY + 7, { align: 'right' });

      const pdfUrl = docPDF.output('bloburl');
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error("Error previewing invoice:", error);
      alert("An error occurred while generating the preview.");
    }
  };

  const generateInvoices = async () => {
    setGenerating(true);
    try {
      // 1. Get all time logs for the selected week ending, then filter uninvoiced
      const logsQuery = query(
        collection(db, 'timeLogs'),
        where('weekEnding', '==', weekEnding)
      );
      const logsSnap = await getDocs(logsQuery);
      const logs = logsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as TimeLog))
        .filter(log => log.invoiced === false);

      if (logs.length === 0) {
        alert("No uninvoiced time logs found for this week ending.");
        setGenerating(false);
        return;
      }

      // Group by contractor
      const groupedLogs = logs.reduce((acc, log) => {
        if (!acc[log.contractorUid]) acc[log.contractorUid] = [];
        acc[log.contractorUid].push(log);
        return acc;
      }, {} as Record<string, TimeLog[]>);

      const qbData: any[] = [];

      // Generate invoice for each contractor
      for (const [uid, contractorLogs] of Object.entries(groupedLogs)) {
        const contractorName = contractorLogs[0].contractorName;
        const contractorId = contractorLogs[0].contractorId || 'SUB-000';
        
        // Fetch contractor details for prefix and type
        const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
        const userData = userSnap.empty ? null : userSnap.docs[0].data();
        
        // Calculate Invoice Number: First Initial + Last Initial - MMDDYY of payday
        const names = contractorName.split(' ');
        const firstInitial = names[0]?.[0] || '';
        const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
        
        // Payday is the Friday of the weekEnding (which is already a Friday)
        // Wait, "date (mmddyy) of the pay day (that friday). but the pay period is the week prior."
        // If weekEnding is Friday, payday is the NEXT Friday.
        const weDate = new Date(weekEnding);
        const payDate = new Date(weDate);
        payDate.setDate(payDate.getDate() + 7);
        const payDateStr = format(payDate, 'MMddyy');
        
        const invoiceNumber = `${firstInitial}${lastInitial}-${payDateStr}`;

        const isSalaried = userData?.type === 'Salaried';
        const weeklySalary = userData?.weeklySalary || 0;

        // Calculate hours, overtime, and per diem
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        let perDiemDays = 0;
        
        const jobBreakdown: Record<string, { hours: number, rate: number }> = {};

        contractorLogs.forEach(log => {
          const hours = log.totalHours || 0;
          const rate = log.hourlyRate || 0;
          const jobKey = `${log.jobId} ${log.jobName}`;
          
          if (!jobBreakdown[jobKey]) {
            jobBreakdown[jobKey] = { hours: 0, rate };
          }
          jobBreakdown[jobKey].hours += hours;
          
          if (log.perDiem) {
            perDiemDays += 1;
          }
        });

        const totalHours = contractorLogs.reduce((sum, log) => sum + (log.totalHours || 0), 0);
        
        if (totalHours > 40) {
          totalRegularHours = 40;
          totalOvertimeHours = totalHours - 40;
        } else {
          totalRegularHours = totalHours;
        }

        const baseRate = contractorLogs[0]?.hourlyRate || 0;
        const otRate = baseRate * 1.5;
        const perDiemRate = 50.00;

        let totalAmount = 0;
        if (isSalaried) {
          totalAmount = weeklySalary + (perDiemDays * perDiemRate);
        } else {
          totalAmount = (totalRegularHours * baseRate) + (totalOvertimeHours * otRate) + (perDiemDays * perDiemRate);
        }

        const invoiceDate = new Date().toISOString();
        const dueDate = payDate;

        // Create PDF
        const docPDF = new jsPDF();
        
        // Brand Colors
        const charcoal = '#222222';
        const concrete = '#A7AFB5';
        const green = '#10BE66';

        // Header
        docPDF.setTextColor(charcoal);
        docPDF.setFont("helvetica", "bold");
        docPDF.setFontSize(24);
        docPDF.text(contractorName, 14, 22);
        
        docPDF.setTextColor(concrete);
        docPDF.setFontSize(20);
        docPDF.text("INVOICE", 150, 22);
        
        // Sub-header (Job Code)
        docPDF.setTextColor(charcoal);
        docPDF.setFontSize(10);
        docPDF.text(`Base-5106`, 100, 35); // Defaulting to Base 1099 job code for now
        
        // Info Table
        autoTable(docPDF, {
          startY: 38,
          margin: { left: 100 },
          head: [['INVOICE #', 'DATE']],
          body: [[invoiceNumber, format(new Date(invoiceDate), 'M/d/yyyy')]],
          theme: 'plain',
          headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold', halign: 'center' },
          bodyStyles: { halign: 'center', textColor: [34, 34, 34], fontStyle: 'bold' },
          styles: { cellPadding: 2, fontSize: 10 }
        });

        // Pay Period
        const ppStart = new Date(weDate);
        ppStart.setDate(ppStart.getDate() - 6);
        docPDF.setFontSize(10);
        docPDF.text(`${format(ppStart, 'MM/dd/yy')}-${format(weDate, 'MM/dd/yyyy')}`, 100, 55);

        // Main Table
        const tableRows: any[] = [];
        
        if (isSalaried) {
          tableRows.push(["", "Weekly Salary", "1.00", weeklySalary.toFixed(2), weeklySalary.toFixed(2)]);
        } else {
          // Regular Hours per job
          let remainingReg = totalRegularHours;
          for (const [job, data] of Object.entries(jobBreakdown)) {
            if (remainingReg <= 0) break;
            const hoursToBill = Math.min(data.hours, remainingReg);
            tableRows.push([
              "", // Date column left blank as per example
              job,
              hoursToBill.toFixed(2),
              data.rate.toFixed(2),
              (hoursToBill * data.rate).toFixed(2)
            ]);
            remainingReg -= hoursToBill;
          }
          
          // Overtime Row
          if (totalOvertimeHours > 0) {
            tableRows.push([
              "",
              "Overtime (1.5x)",
              totalOvertimeHours.toFixed(2),
              otRate.toFixed(2),
              (totalOvertimeHours * otRate).toFixed(2)
            ]);
          }
        }

        // Empty rows for spacing
        for(let i=0; i<3; i++) tableRows.push(["", "", "", "", "-"]);

        // Per Diem Row
        if (perDiemDays > 0) {
          tableRows.push([
            "",
            "Per Diem",
            perDiemDays.toFixed(2),
            perDiemRate.toFixed(2),
            (perDiemDays * perDiemRate).toFixed(2)
          ]);
        } else {
          tableRows.push(["", "Per Diem", "", "", "-"]);
        }

        // More empty rows
        for(let i=0; i<3; i++) tableRows.push(["", "", "", "", "-"]);

        autoTable(docPDF, {
          startY: 60,
          head: [['Date', 'Job', 'QTY', 'UNIT PRICE', 'AMOUNT']],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [34, 34, 34], textColor: 255, fontStyle: 'bold' },
          bodyStyles: { textColor: [34, 34, 34] },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 70 },
            2: { cellWidth: 25, halign: 'center' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' }
          },
          styles: { fontSize: 10, cellPadding: 3, lineColor: [167, 175, 181], lineWidth: 0.1 }
        });

        const finalY = (docPDF as any).lastAutoTable.finalY || 60;
        
        // Footer
        docPDF.setTextColor(16, 190, 102); // Green
        docPDF.setFont("helvetica", "italic");
        docPDF.text("Thank you for your business!", 14, finalY + 8);
        
        // Total Box
        docPDF.setFillColor(167, 175, 181); // Concrete Gray
        docPDF.rect(100, finalY, 85, 10, 'F');
        docPDF.setTextColor(34, 34, 34);
        docPDF.setFont("helvetica", "bold");
        docPDF.text("TOTAL", 105, finalY + 7);
        docPDF.text(totalAmount.toFixed(2), 170, finalY + 7, { align: 'right' });

        docPDF.save(`${invoiceNumber}.pdf`);

        // Save Invoice to DB
        await addDoc(collection(db, 'invoices'), {
          invoiceNumber,
          contractorUid: uid,
          contractorName,
          contractorId,
          weekEnding,
          totalHours,
          totalAmount,
          invoiceDate,
          dueDate: dueDate.toISOString(),
          status: 'Generated'
        });

        // Update TimeLogs
        for (const log of contractorLogs) {
          await updateDoc(doc(db, 'timeLogs', log.id), {
            invoiced: true,
            invoiceNumber
          });
        }

        // Add to QB Data
        qbData.push({
          "Vendor Name": contractorName,
          "Bill Date": format(new Date(invoiceDate), 'MM/dd/yyyy'),
          "Due Date": format(dueDate, 'MM/dd/yyyy'),
          "Account": "Subcontractor Labor",
          "Description": `Week ending ${format(new Date(weekEnding), 'MM/dd/yyyy')}`,
          "Amount": totalAmount.toFixed(2),
          "Reference No": invoiceNumber
        });
      }

      // Generate CSV
      const csv = Papa.unparse(qbData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `QB_Import_${weekEnding}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      fetchInvoices();
      alert("Invoices and CSV generated successfully. PDFs and CSV have been downloaded.");
    } catch (error) {
      console.error("Error generating invoices:", error);
      alert("An error occurred while generating invoices.");
    }
    setGenerating(false);
  };

  if (loading) return <div className="p-8">Loading invoices...</div>;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#222222] uppercase tracking-wider">Invoices</h2>
        <div className="flex gap-4 items-center">
          <input 
            type="date" 
            value={weekEnding}
            onChange={(e) => setWeekEnding(e.target.value)}
            className="p-2 border border-gray-300 rounded outline-none"
          />
          <button 
            onClick={generateInvoices}
            disabled={generating}
            className="bg-[#10BE66] text-white px-4 py-2 rounded font-bold hover:bg-[#0e9f55] transition-colors disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Run Weekly Invoices'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-sm uppercase tracking-wider text-gray-600">
              <th className="p-4 font-semibold">Invoice #</th>
              <th className="p-4 font-semibold">Contractor</th>
              <th className="p-4 font-semibold">Week Ending</th>
              <th className="p-4 font-semibold">Hours</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map(invoice => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium text-[#222222]">{invoice.invoiceNumber}</td>
                <td className="p-4 text-gray-600">{invoice.contractorName}</td>
                <td className="p-4 text-gray-600">{format(new Date(invoice.weekEnding), 'MM/dd/yyyy')}</td>
                <td className="p-4 text-gray-600">{invoice.totalHours?.toFixed(2)}</td>
                <td className="p-4 font-medium text-[#222222]">${invoice.totalAmount?.toFixed(2)}</td>
                <td className="p-4">
                  <span className="px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-800">
                    {invoice.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => previewInvoice(invoice)}
                    className="p-2 text-gray-500 hover:text-[#10BE66] transition-colors rounded-full hover:bg-gray-100"
                    title="Preview PDF"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">No invoices generated yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
