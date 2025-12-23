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

  // --- LOGIQUE DE DÉPLACEMENT DU BOUTON (DRAG & DROP) ---
  const [btnStyle, setBtnStyle] = useState<React.CSSProperties>({});
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const btnStartPos = useRef({ top: 0, left: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Seulement clic gauche

    const btn = e.currentTarget as HTMLButtonElement;
    const rect = btn.getBoundingClientRect();
    
    isDraggingRef.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    btnStartPos.current = { top: rect.top, left: rect.left };

    const onMouseMove = (mv: MouseEvent) => {
        const dx = mv.clientX - dragStartPos.current.x;
        const dy = mv.clientY - dragStartPos.current.y;
        
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            isDraggingRef.current = true;
        }

        if (isDraggingRef.current) {
            setBtnStyle({
                position: 'fixed',
                top: `${btnStartPos.current.top + dy}px`,
                left: `${btnStartPos.current.left + dx}px`,
                bottom: 'auto',
                right: 'auto',
                transition: 'none',
                cursor: 'grabbing'
            });
        }
    };

    const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        setBtnStyle(prev => ({ ...prev, cursor: 'grab', transition: 'transform 0.2s' }));
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleBtnClick = (e: React.MouseEvent) => {
      if (isDraggingRef.current) {
          e.stopPropagation();
          return;
      }
      setIsOpen(true);
  };
  // --- FIN LOGIQUE DRAG ---

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

      // --- MODIFICATION MAJEURE ICI : CONTEXTE ENRICHI ---
      // On inclut l'année, la date, le code, le détenteur, etc.
      const dataContext = assets.map(a => 
        `- [${a.code}] ${a.name} (${a.category}) | Année: ${a.acquisitionYear} | Date Enreg: ${a.registrationDate} | Loc: ${a.location} (Porte: ${a.door || 'N/A'}) | Etat: ${a.state} | Détenteur: ${a.holder || 'Aucun'} (${a.holderPresence}) | Valeur: ${a.amount || 0} ${a.unit || ''}`
      ).join('\n');

      const prompt = `
        NOM DE L'ASSISTANT: Panorama AI
        CONTEXTE: Tu es une IA experte en audit et gestion de patrimoine pour l'entreprise ${config.companyName}.
        
        DONNÉES INVENTAIRE EXHAUSTIVES:
        ${dataContext}
        
        DEMANDE UTILISATEUR: "${userMsg.text}"
        
        CONSIGNES STRICTES:
        1. Analyse TOUTES les données fournies ci-dessus.
        2. Si l'utilisateur demande des acquisitions pour une année spécifique (ex: 2025), regarde le champ "Année" ou "Date Enreg".
        3. Si l'utilisateur demande un rapport, structure-le proprement en Markdown (Titres ##, Listes à puces, Tableaux si pertinent).
        4. Inclus des totaux et des sommaires (valeur totale, nombre d'articles) quand c'est pertinent.
        5. Sois professionnel, précis et synthétique.
        6. Si aucune donnée ne correspond, dis-le clairement.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiText = response.text();
      const isReport = aiText.length > 200 || aiText.includes('##') || aiText.includes('|');

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
          onMouseDown={handleMouseDown}
          onClick={handleBtnClick}
          style={btnStyle}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center p-2 cursor-grab hover:scale-125 transition-transform active:scale-95 group"
          title="Déplacer ou Ouvrir Panorama AI"
        >
          <Lightbulb 
            size={36} 
            className="text-edc-blue drop-shadow-xl filter transition-all duration-300 group-hover:drop-shadow-2xl" 
            strokeWidth={2.5}
            fill="currentColor"
            fillOpacity={0.1}
          />
        </button>
      )}

      {/* FENÊTRE DE CHAT */}
      {isOpen && (
        <div className="fixed bottom-6 right-4 left-4 md:left-auto md:right-6 w-auto md:w-96 h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 animate-fade-in-up">
          <div className="bg-edc-blue text-white p-4 rounded-t-2xl flex justify-between items-center shadow-md cursor-default">
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
            <div className="flex justify-between items-center p-4 border-b bg-gray-50 rounded-t-xl no-print">
               <h2 className="font-bold text-edc-blue flex items-center gap-2"><FileText size={20}/> Rapport Panorama AI</h2>
               <div className="flex gap-2">
                 <button onClick={triggerPrint} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex gap-2 font-medium text-sm shadow-sm"><Printer size={18}/> Imprimer</button>
                 <button onClick={() => setReportToPrint(null)} className="p-2 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700 transition-colors"><X size={24}/></button>
               </div>
            </div>
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
               {/* Utilisation de react-markdown si disponible ou affichage direct formaté */}
               <div className="prose max-w-none whitespace-pre-wrap text-gray-800 pb-16 print:text-black">
                  {reportToPrint}
               </div>
               <div className="print-footer hidden text-center text-[10px] text-gray-400 border-t pt-2 w-full mt-8">
                  <p>Document confidentiel - {config.companyName} - Généré le {new Date().toLocaleDateString()} par Panorama AI</p>
               </div>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @media print {
          html, body { height: auto !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: white !important; }
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; color: black !important; text-shadow: none !important; }
          #printable-area { position: absolute; top: 0; left: 0; width: 100%; margin: 0; padding: 20px !important; height: auto !important; min-height: 100% !important; overflow: visible !important; display: block !important; background: white !important; z-index: 99999; }
          .print-footer { display: block !important; position: fixed; bottom: 0; left: 0; width: 100%; background: white; padding-bottom: 5px; color: gray !important; }
          .prose, p, div { page-break-inside: auto; }
          h1, h2, h3, tr, img { page-break-after: avoid; page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default AiAssistant;