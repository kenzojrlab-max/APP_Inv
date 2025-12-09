import React, { useState, useRef, useEffect } from 'react';
import { Asset, AppConfig } from '../types';
import { X, Send, Printer, Lightbulb, Minimize2, FileText, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

interface AiAssistantProps {
  assets: Asset[];
  config: AppConfig;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  isReport?: boolean;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ assets, config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', text: `Bonjour ! Je suis Panorama AI, l'intelligence artificielle de ${config.companyName}. Je suis là pour analyser votre inventaire. Que puis-je faire pour vous ?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [reportToPrint, setReportToPrint] = useState<string | null>(null);
   
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // @ts-ignore
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey.includes('PLACEHOLDER')) {
        throw new Error("Clé API introuvable.");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const dataContext = assets.map(a => 
        `- ${a.name} (${a.category}) [Etat: ${a.state}] à ${a.location}. Valeur: ${a.amount || 0} ${a.unit || ''}`
      ).join('\n');

      const prompt = `
        NOM DE L'ASSISTANT: Panorama AI
        CONTEXTE: Tu es une IA experte en audit pour l'entreprise ${config.companyName}.
        DONNÉES INVENTAIRE:
        ${dataContext}
        DEMANDE UTILISATEUR: "${userMsg.text}"
        CONSIGNES:
        - Tu t'appelles "Panorama AI".
        - Si on te demande un rapport : structure-le proprement (Markdown) avec des titres.
        - Sois professionnel, précis et synthétique.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiText = response.text();
      const isReport = aiText.length > 200 || aiText.includes('##');

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'ai', 
        text: aiText,
        isReport: isReport
      }]);

    } catch (error: any) {
      console.error("Erreur IA:", error);
      let errorMsg = "Une erreur est survenue.";
      if (error.message?.includes('429')) errorMsg = "Trop de demandes. Veuillez patienter une minute.";
      
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'ai', 
        text: `⚠️ ${errorMsg}` 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const triggerPrint = () => {
    setTimeout(() => {
        window.print();
    }, 200);
  };

  return (
    <>
      {/* BOUTON FLOTTANT */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-edc-blue to-blue-600 text-white p-3 md:p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center gap-2 animate-bounce-slow"
          title="Ouvrir Panorama AI"
        >
          <Lightbulb size={28} className="text-yellow-300 fill-yellow-300/20" strokeWidth={2} />
          <span className="font-bold hidden md:inline text-sm tracking-wide">Panorama AI</span>
        </button>
      )}

      {/* FENÊTRE DE CHAT */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 left-4 md:left-auto md:right-6 w-auto md:w-96 h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200">
          <div className="bg-edc-blue text-white p-4 rounded-t-2xl flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
                <div className="bg-white/10 p-1.5 rounded-full">
                  <Lightbulb size={18} className="text-yellow-300" />
                </div>
                <div>
                   <h3 className="font-bold text-sm">Panorama AI</h3>
                   <span className="text-[10px] text-blue-200 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> En ligne</span>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1.5 rounded transition-colors"><Minimize2 size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50" ref={scrollRef}>
             {messages.map(msg => (
               <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-edc-blue text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                   <div className="whitespace-pre-wrap">{msg.text}</div>
                   {msg.isReport && (
                     <button onClick={() => setReportToPrint(msg.text)} className="mt-3 w-full flex items-center justify-center gap-2 bg-edc-orange text-white py-2 rounded-lg hover:bg-orange-600 transition-colors text-xs font-bold shadow-sm">
                       <FileText size={14}/> Voir & Imprimer le Rapport
                     </button>
                   )}
                 </div>
               </div>
             ))}
             {isTyping && (
               <div className="flex justify-start">
                 <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex items-center gap-2">
                   <Loader2 size={16} className="animate-spin text-edc-blue"/>
                   <span className="text-xs text-gray-400 italic">Panorama réfléchit...</span>
                 </div>
               </div>
             )}
          </div>

          <div className="p-3 border-t bg-white rounded-b-2xl">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center bg-gray-100 p-1.5 rounded-full border focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez une question..."
                  className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-gray-700 placeholder-gray-400"
                />
                <button type="submit" disabled={!input.trim() || isTyping} className="bg-edc-blue text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-transform hover:scale-105">
                   <Send size={16} />
                </button>
            </form>
          </div>
        </div>
      )}

      {/* MODALE D'IMPRESSION */}
      {reportToPrint && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-0 md:p-4 print:p-0 print:bg-white print:static print:block">
          
          <div className="bg-white w-full md:max-w-4xl h-full md:h-[90vh] md:rounded-xl shadow-2xl flex flex-col relative overflow-hidden print:overflow-visible print:h-auto print:max-w-none print:shadow-none print:block">
            
            {/* Header (Caché à l'impression via no-print) */}
            <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl no-print">
               <h2 className="font-bold text-edc-blue flex items-center gap-2"><FileText size={20}/> Rapport Panorama AI</h2>
               <div className="flex gap-2">
                 <button onClick={triggerPrint} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex gap-2 font-medium text-sm shadow-sm"><Printer size={18}/> Imprimer</button>
                 <button onClick={() => setReportToPrint(null)} className="p-2 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"><X size={24}/></button>
               </div>
            </div>

            {/* ZONE IMPRIMABLE */}
            {/* J'ai retiré 'flex-1' pour l'impression car ça casse le flux sur plusieurs pages */}
            <div id="printable-area" className="flex-1 overflow-y-auto p-8 md:p-12 font-serif text-justify leading-relaxed bg-white relative print:overflow-visible print:h-auto print:block print:flex-none">
               
               <div className="flex justify-between items-center mb-8 border-b-2 border-edc-blue pb-4 print:flex">
                  <div className="flex items-center gap-4">
                    <img src={config.companyLogo} className="h-16 w-auto object-contain" alt="Logo" />
                    <div>
                        <h1 className="text-2xl font-bold text-edc-blue uppercase tracking-wider">{config.companyName}</h1>
                        <p className="text-sm text-gray-500 font-medium">Rapport Généré par Panorama AI</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>Date : {new Date().toLocaleDateString()}</p>
                    <p className="font-mono text-xs text-gray-400 mt-1">ID: {Date.now().toString().slice(-8)}</p>
                  </div>
               </div>
               
               <div className="prose max-w-none whitespace-pre-wrap text-gray-800 pb-16 print:text-black">
                  {reportToPrint}
               </div>

               {/* Pied de page imprimable */}
               <div className="print-footer hidden text-center text-[10px] text-gray-400 border-t pt-2 w-full mt-8">
                  <p>Document confidentiel - {config.companyName} - Généré le {new Date().toLocaleDateString()} par Panorama AI</p>
               </div>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS MAGIQUE POUR L'IMPRESSION */}
      <style>{`
        @media print {
          /* 1. Réinitialisation Globale */
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          /* 2. Tout cacher sauf le rapport */
          body * {
            visibility: hidden;
          }

          /* 3. Configuration de la zone d'impression */
          #printable-area, #printable-area * {
            visibility: visible;
            /* CRUCIAL : Force la couleur noire pour éviter le texte blanc sur blanc */
            color: black !important; 
            text-shadow: none !important;
          }

          /* 4. Positionnement Absolu pour 'sortir' le rapport du contexte React */
          #printable-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            margin: 0;
            padding: 20px !important;
            
            /* Désactive les barres de défilement pour laisser le papier gérer la hauteur */
            height: auto !important;
            min-height: 100% !important;
            overflow: visible !important;
            display: block !important; /* Casse le Flexbox */
            
            background: white !important;
            z-index: 99999;
          }

          /* 5. Pied de page */
          .print-footer {
            display: block !important;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: white;
            padding-bottom: 5px;
            color: gray !important; /* Le footer peut rester gris */
          }

          /* 6. Gestion des sauts de page */
          .prose, p, div {
            page-break-inside: auto;
          }
          h1, h2, h3, tr, img {
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default AiAssistant;