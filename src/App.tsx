/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Truck, 
  Store as StoreIcon, 
  Plus, 
  Calendar, 
  Clock, 
  Navigation, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Search,
  Settings,
  LogOut,
  User,
  Filter,
  ArrowRight,
  Info,
  Package,
  Leaf,
  Users,
  Clipboard,
  Image as ImageIcon,
  Download,
  Trash2,
  GripVertical,
  History
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  getDocs,
  getDocFromServer,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

import { db, auth } from './firebase';

// --- Types ---

interface Store {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  region: string;
  contact?: string;
  type: 'Loja' | 'Filial';
}

interface Vehicle {
  id: string;
  plate: string;
  type: 'Caminhão' | 'Carreta';
  capacity: number;
  status: 'Disponível' | 'Em Rota' | 'Manutenção';
}

interface Driver {
  id: string;
  name: string;
  status: 'Ativo' | 'Inativo';
  lastRouteType?: 'Perto' | 'Longe';
  lastRouteDate?: string;
}

interface Route {
  id: string;
  date: string;
  time?: string;
  vehicleId: string;
  driverId: string;
  storeIds: string[];
  category: 'Seco' | 'FLV';
  loadNumber?: string;
  separation?: string;
  box?: string;
  weight?: number;
  boxes?: number;
  items?: number;
  pallets?: number;
  cross?: number;
  reverse?: number;
  flv?: number;
  eggs?: number;
  frozen?: number;
  beco?: number;
  totalKm: number;
  estimatedTime: number;
  status: 'Agendada' | 'Em Andamento' | 'Concluída';
  createdBy: string;
  routeType?: 'Perto' | 'Longe';
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

// --- Utils ---

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, user }: { activeTab: string, setActiveTab: (t: string) => void, user: FirebaseUser | null }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'routes-seco', icon: Package, label: 'Roteirizar Seco' },
    { id: 'routes-flv', icon: Leaf, label: 'Roteirizar FLV' },
    { id: 'routes', icon: MapIcon, label: 'Todas as Rotas' },
    { id: 'stores', icon: StoreIcon, label: 'Lojas' },
    { id: 'vehicles', icon: Truck, label: 'Frota' },
    { id: 'drivers', icon: Users, label: 'Motoristas' },
    { id: 'driver-history', icon: History, label: 'Histórico Motoristas' },
    { id: 'scale', icon: Clipboard, label: 'Escala Diária' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col border-r border-slate-800">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
          <Navigation className="text-orange-500" />
          RotaBrasília
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Logística Inteligente</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === item.id 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        {user ? (
          <div className="flex items-center gap-3 px-2 py-3">
            <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-slate-700" referrerPolicy="no-referrer" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate">{user.displayName}</p>
              <button 
                onClick={() => signOut(auth)}
                className="text-xs text-slate-400 hover:text-orange-400 flex items-center gap-1 mt-1"
              >
                <LogOut size={12} /> Sair
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2 rounded-lg text-sm font-medium"
          >
            <User size={16} /> Entrar com Google
          </button>
        )}
      </div>
    </div>
  );
};

const DriverHistory = ({ drivers, routes }: { drivers: Driver[], routes: Route[] }) => {
  const history = useMemo(() => {
    return drivers.map(driver => {
      const driverRoutes = routes.filter(r => r.driverId === driver.id);
      const secoKm = driverRoutes.filter(r => r.category === 'Seco').reduce((acc, r) => acc + (r.totalKm || 0), 0);
      const flvKm = driverRoutes.filter(r => r.category === 'FLV').reduce((acc, r) => acc + (r.totalKm || 0), 0);
      const lastRoute = driverRoutes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      return {
        ...driver,
        secoKm,
        flvKm,
        totalKm: secoKm + flvKm,
        routeCount: driverRoutes.length,
        lastRouteDate: lastRoute?.date
      };
    }).sort((a, b) => b.totalKm - a.totalKm);
  }, [drivers, routes]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Histórico de Motoristas</h3>
          <p className="text-slate-500 font-medium">Acumulado de quilometragem e performance</p>
        </div>
        <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
          <History size={24} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Motorista</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">Rotas</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">KM Seco</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">KM FLV</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Total Acumulado</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Última Rota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.map((driver) => (
              <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                      {driver.name.charAt(0)}
                    </div>
                    <span className="font-bold text-slate-900">{driver.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-center">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                    {driver.routeCount}
                  </span>
                </td>
                <td className="px-8 py-5 text-right font-medium text-slate-600">
                  {driver.secoKm.toFixed(1)} km
                </td>
                <td className="px-8 py-5 text-right font-medium text-slate-600">
                  {driver.flvKm.toFixed(1)} km
                </td>
                <td className="px-8 py-5 text-right font-black text-orange-600">
                  {driver.totalKm.toFixed(1)} km
                </td>
                <td className="px-8 py-5">
                  <span className="text-sm font-medium text-slate-500">
                    {driver.lastRouteDate ? format(new Date(driver.lastRouteDate), 'dd/MM/yyyy') : 'Nenhuma'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DailyScaleManager = ({ stores, vehicles, drivers, scales, onSaveScale }: { stores: Store[], vehicles: Vehicle[], drivers: Driver[], scales: any[], onSaveScale: (scale: any) => void }) => {
  const [category, setCategory] = useState<'Seco' | 'FLV'>('Seco');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inputText, setInputText] = useState('');
  const [scaleItems, setScaleItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scaleRef = React.useRef<HTMLDivElement>(null);

  const handleSave = () => {
    if (scaleItems.length === 0) return;
    onSaveScale({
      date,
      category,
      items: scaleItems
    });
  };

  const loadPastScale = (pastScale: any) => {
    setCategory(pastScale.category);
    setDate(pastScale.date);
    setScaleItems(pastScale.items);
    setShowHistory(false);
  };

  const processInput = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const prompt = `Analise estes dados de logística e transforme em uma lista de rotas JSON. 
      Dados: ${inputText}
      Regra de Negócio: Cargas que aparecem em verde ou são indicadas como compartilhadas devem ser agrupadas no mesmo objeto de rota se possível, ou marcadas para o mesmo caminhão.
      Retorne um ARRAY de objetos: [{ 
        loadNumber: string, 
        stores: string[], 
        pallets: number, 
        boxes: number, 
        weight: number, 
        items: number,
        box: string,
        cross: number,
        reverse: number,
        flv: number,
        eggs: number,
        frozen: number,
        beco: number,
        routeType: "Perto" | "Longe" 
      }]
      Tente identificar as lojas pelos nomes fornecidos. Se um valor for desconhecido ou "false", retorne null ou 0 conforme o tipo.`;
      
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: prompt, 
        config: { responseMimeType: "application/json" } 
      });
      
      const result = JSON.parse(response.text || '[]');
      setScaleItems(result.map((item: any) => ({
        loadNumber: item.loadNumber || '',
        stores: Array.isArray(item.stores) ? item.stores : [],
        pallets: Number(item.pallets) || 0,
        boxes: Number(item.boxes) || 0,
        weight: Number(item.weight) || 0,
        items: Number(item.items) || 0,
        box: item.box || '',
        cross: Number(item.cross) || 0,
        reverse: Number(item.reverse) || 0,
        flv: Number(item.flv) || 0,
        eggs: Number(item.eggs) || 0,
        frozen: Number(item.frozen) || 0,
        beco: Number(item.beco) || 0,
        routeType: item.routeType || 'Perto',
        id: Math.random().toString(36).substr(2, 9),
        driverId: '',
        vehicleId: ''
      })));
    } catch (error) {
      console.error(error);
      alert('Erro ao processar dados. Tente colar novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const res = (event.target?.result as string).split(',')[1];
          resolve(res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: "Extraia os dados desta escala de logística para JSON. Regra: Cargas em verde são compartilhadas (mesmo caminhão). ARRAY de objetos com loadNumber, stores, pallets, boxes, weight, items, box, cross, reverse, flv, eggs, frozen, beco." },
          { inlineData: { mimeType: file.type, data: base64 } }
        ],
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '[]');
      setScaleItems(result.map((item: any) => ({
        loadNumber: item.loadNumber || '',
        stores: Array.isArray(item.stores) ? item.stores : [],
        pallets: Number(item.pallets) || 0,
        boxes: Number(item.boxes) || 0,
        weight: Number(item.weight) || 0,
        items: Number(item.items) || 0,
        box: item.box || '',
        cross: Number(item.cross) || 0,
        reverse: Number(item.reverse) || 0,
        flv: Number(item.flv) || 0,
        eggs: Number(item.eggs) || 0,
        frozen: Number(item.frozen) || 0,
        beco: Number(item.beco) || 0,
        routeType: item.routeType || 'Perto',
        id: Math.random().toString(36).substr(2, 9),
        driverId: '',
        vehicleId: ''
      })));
    } catch (error) {
      console.error(error);
      alert('Erro ao processar imagem. Verifique se o arquivo é uma imagem válida.');
    } finally {
      setIsProcessing(false);
      // Reset input value to allow uploading the same file again
      e.target.value = '';
    }
  };

  const exportAsImage = async () => {
    if (scaleRef.current === null) return;
    try {
      const dataUrl = await toPng(scaleRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `escala-${category}-${date}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const addItem = () => {
    setScaleItems([...scaleItems, {
      id: Math.random().toString(36).substr(2, 9),
      loadNumber: '',
      stores: [],
      pallets: 0,
      boxes: 0,
      weight: 0,
      items: 0,
      box: '',
      cross: 0,
      reverse: 0,
      flv: 0,
      eggs: 0,
      frozen: 0,
      beco: 0,
      driverId: '',
      vehicleId: '',
      routeType: 'Perto'
    }]);
  };

  const removeItem = (id: string) => {
    setScaleItems(scaleItems.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setScaleItems(scaleItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Gerenciador de Escala Diária</h3>
            <p className="text-slate-500 font-medium">Importe dados e organize a distribuição do dia</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              <History size={18} />
              Histórico
            </button>
            <button 
              onClick={() => setCategory('Seco')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${category === 'Seco' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-100 text-slate-400'}`}
            >
              Seco
            </button>
            <button 
              onClick={() => setCategory('FLV')}
              className={`px-6 py-2 rounded-xl font-bold transition-all ${category === 'FLV' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-100 text-slate-400'}`}
            >
              FLV
            </button>
          </div>
        </div>

        {showHistory && (
          <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 animate-in slide-in-from-top duration-300">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Escalas Salvas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => (
                <button 
                  key={s.id}
                  onClick={() => loadPastScale(s)}
                  className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-orange-500 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${s.category === 'Seco' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {s.category}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{format(new Date(s.date), 'dd/MM/yyyy')}</span>
                  </div>
                  <p className="font-bold text-slate-900 group-hover:text-orange-500 transition-colors">{s.items.length} Cargas</p>
                </button>
              ))}
              {scales.length === 0 && <p className="text-sm text-slate-400 font-medium">Nenhuma escala salva ainda.</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Colar Dados da Planilha</label>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cole aqui as linhas da planilha..."
              className="w-full h-40 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 outline-none transition-all font-mono text-sm"
            />
            <div className="flex gap-4">
              <button 
                onClick={processInput}
                disabled={isProcessing}
                className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Clipboard size={20} />}
                Processar Texto
              </button>
              <label className={`flex-1 ${isProcessing ? 'bg-slate-200 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'} text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer`}>
                {isProcessing ? <div className="w-5 h-5 border-2 border-slate-400/20 border-t-slate-400 rounded-full animate-spin" /> : <ImageIcon size={20} />}
                Subir Imagem
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isProcessing} />
              </label>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-sm">
              <Info size={32} />
            </div>
            <h4 className="font-bold text-slate-900 mb-2">Dica de Importação</h4>
            <p className="text-sm text-slate-500 leading-relaxed">
              Você pode copiar várias linhas da sua planilha de roteirização e colar ao lado. 
              Nossa IA vai identificar automaticamente os números de carga, lojas e quantidades.
            </p>
          </div>
        </div>

        {scaleItems.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-black text-slate-900 tracking-tight">Itens da Escala</h4>
              <div className="flex gap-3">
                <button onClick={addItem} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all">
                  <Plus size={20} />
                </button>
                <button onClick={exportAsImage} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-500/20">
                  <Download size={18} />
                  Baixar Imagem
                </button>
                <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">
                  <CheckCircle2 size={18} />
                  Salvar Escala
                </button>
              </div>
            </div>

            <div ref={scaleRef} className="bg-white p-8 border border-slate-100 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                    <Navigation size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Escala de Distribuição - {category}</h2>
                    <p className="text-slate-500 font-bold">{format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Status</p>
                  <p className="text-lg font-black text-orange-500 uppercase">Em Montagem</p>
                </div>
              </div>

              <div className="space-y-4">
                {scaleItems.map((item, index) => (
                  <div key={item.id} className="group relative flex flex-col gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-200 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-xs font-black text-slate-400 border border-slate-100">
                          {index + 1}
                        </div>
                        <h5 className="font-bold text-slate-900">Carga {item.loadNumber || '---'}</h5>
                      </div>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      <div className="col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Carga</label>
                        <input 
                          type="text" 
                          value={item.loadNumber} 
                          onChange={(e) => updateItem(item.id, 'loadNumber', e.target.value)}
                          className="w-full bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-900 outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Lojas / Rota</label>
                        <input 
                          type="text" 
                          value={item.stores.join(', ')} 
                          onChange={(e) => updateItem(item.id, 'stores', e.target.value.split(',').map(s => s.trim()))}
                          className="w-full bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-900 outline-none focus:border-orange-500"
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Motorista</label>
                        <select 
                          value={item.driverId}
                          onChange={(e) => updateItem(item.id, 'driverId', e.target.value)}
                          className="w-full bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-900 outline-none focus:border-orange-500"
                        >
                          <option value="">Selecionar...</option>
                          {drivers.filter(d => d.status === 'Ativo').map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Veículo</label>
                        <select 
                          value={item.vehicleId}
                          onChange={(e) => updateItem(item.id, 'vehicleId', e.target.value)}
                          className="w-full bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-900 outline-none focus:border-orange-500"
                        >
                          <option value="">Selecionar...</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.plate} ({v.type})</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Box</label>
                        <input 
                          type="text" 
                          value={item.box} 
                          onChange={(e) => updateItem(item.id, 'box', e.target.value)}
                          className="w-full bg-white p-2 rounded-lg border border-slate-200 font-bold text-slate-900 outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Paletes</label>
                        <input type="number" value={item.pallets} onChange={(e) => updateItem(item.id, 'pallets', parseInt(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Caixas</label>
                        <input type="number" value={item.boxes} onChange={(e) => updateItem(item.id, 'boxes', parseInt(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Peso</label>
                        <input type="number" value={item.weight} onChange={(e) => updateItem(item.id, 'weight', parseFloat(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Itens</label>
                        <input type="number" value={item.items} onChange={(e) => updateItem(item.id, 'items', parseInt(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cross</label>
                        <input type="number" value={item.cross} onChange={(e) => updateItem(item.id, 'cross', parseInt(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Reversa</label>
                        <input type="number" value={item.reverse} onChange={(e) => updateItem(item.id, 'reverse', parseInt(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">FLV</label>
                        <input type="number" value={item.flv} onChange={(e) => updateItem(item.id, 'flv', parseInt(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Ovos</label>
                        <input type="number" value={item.eggs} onChange={(e) => updateItem(item.id, 'eggs', parseInt(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Cong.</label>
                        <input type="number" value={item.frozen} onChange={(e) => updateItem(item.id, 'frozen', parseInt(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Beco</label>
                        <input type="number" value={item.beco} onChange={(e) => updateItem(item.id, 'beco', parseInt(e.target.value) || 0)} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center">
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total de Cargas</p>
                    <p className="text-2xl font-black text-slate-900">{scaleItems.length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total de Paletes</p>
                    <p className="text-2xl font-black text-slate-900">{scaleItems.reduce((acc, item) => acc + (item.pallets || 0), 0)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Gerado via RotaBrasília AI</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = ({ stores, vehicles, routes }: { stores: Store[], vehicles: Vehicle[], routes: Route[] }) => {
  const stats = useMemo(() => {
    const totalKm = routes.reduce((acc, r) => acc + (r.totalKm || 0), 0);
    const completedRoutes = routes.filter(r => r.status === 'Concluída').length;
    const activeVehicles = vehicles.filter(v => v.status === 'Em Rota').length;
    const avgTime = routes.length > 0 
      ? routes.reduce((acc, r) => acc + (r.estimatedTime || 0), 0) / routes.length 
      : 0;

    return [
      { label: 'Distância Total', value: `${totalKm.toFixed(1)} km`, icon: Navigation, color: 'text-blue-500' },
      { label: 'Rotas Concluídas', value: completedRoutes, icon: CheckCircle2, color: 'text-green-500' },
      { label: 'Veículos em Rota', value: activeVehicles, icon: Truck, color: 'text-orange-500' },
      { label: 'Tempo Médio', value: `${Math.round(avgTime)} min`, icon: Clock, color: 'text-purple-500' },
    ];
  }, [routes, vehicles]);

  const chartData = useMemo(() => {
    // Simple mock data for distance over time
    return [
      { name: 'Seg', km: 120 },
      { name: 'Ter', km: 150 },
      { name: 'Qua', km: 180 },
      { name: 'Qui', km: 140 },
      { name: 'Sex', km: 210 },
      { name: 'Sáb', km: 90 },
      { name: 'Dom', km: 40 },
    ];
  }, []);

  const vehicleTypeData = useMemo(() => {
    const caminhao = vehicles.filter(v => v.type === 'Caminhão').length;
    const carreta = vehicles.filter(v => v.type === 'Carreta').length;
    return [
      { name: 'Caminhão', value: caminhao },
      { name: 'Carreta', value: carreta },
    ];
  }, [vehicles]);

  const COLORS = ['#f97316', '#3b82f6'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-slate-50 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Resumo</span>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</h3>
            <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Desempenho Semanal (KM)</h3>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs font-bold bg-slate-100 rounded-full text-slate-600">7 Dias</button>
              <button className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-slate-600">30 Dias</button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="km" 
                  stroke="#f97316" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-8">Distribuição de Frota</h3>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vehicleTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-slate-900">{vehicles.length}</span>
              <span className="text-xs text-slate-400 font-bold uppercase">Total</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            {vehicleTypeData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-sm font-medium text-slate-600">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const isLonge = (storeIds: string[], stores: Store[]) => {
  const selectedStores = storeIds.map(id => stores.find(s => s.id === id)).filter(Boolean);
  return selectedStores.some(s => 
    s?.name.toUpperCase().includes('GURUPI') || 
    s?.name.toUpperCase().includes('LEM') || 
    s?.name.toUpperCase().includes('RIO VERDE') || 
    s?.name.toUpperCase().includes('GOIÂNIA') || 
    s?.name.toUpperCase().includes('BALNEARIO') ||
    s?.name.toUpperCase().includes('RIO VERMELHO') ||
    s?.name.toUpperCase().includes('GOIANESIA') ||
    s?.name.toUpperCase().includes('CALDAS NOVAS') || 
    s?.name.toUpperCase().includes('APARECIDA-GO') || 
    (s?.region === 'Entorno GO' && !s?.name.toUpperCase().includes('LUZIANIA') && !s?.name.toUpperCase().includes('VALPARAISO'))
  );
};

const RoutePlannerSeco = ({ stores, vehicles, drivers, routes, onSave }: { stores: Store[], vehicles: Vehicle[], drivers: Driver[], routes: Route[], onSave: (r: Partial<Route>) => void }) => {
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loadNumber, setLoadNumber] = useState('');
  const [separation, setSeparation] = useState('NOITE');
  const [box, setBox] = useState('');
  const [weight, setWeight] = useState(0);
  const [boxes, setBoxes] = useState(0);
  const [items, setItems] = useState(0);
  const [pallets, setPallets] = useState(0);
  const [cross, setCross] = useState(0);
  const [reverse, setReverse] = useState(0);
  const [flv, setFlv] = useState(0);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState<{ km: number, time: number, order: string[] } | null>(null);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => d.status === 'Ativo').map(d => {
      const lastRoute = routes.filter(r => r.driverId === d.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const lastLongeRoute = routes.filter(r => r.driverId === d.id && r.routeType === 'Longe').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      let recommendation = '';
      let isRestricted = false;
      
      if (lastRoute) {
        if (lastRoute.routeType === 'Longe') recommendation = 'Próxima: Perto';
        else recommendation = 'Próxima: Longe';
      }

      if (lastLongeRoute) {
        const daysSinceLastLonge = Math.floor((new Date().getTime() - new Date(lastLongeRoute.date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastLonge < 3) isRestricted = true;
      }

      return { ...d, lastRoute, lastLongeRoute, recommendation, isRestricted };
    });
  }, [drivers, routes]);

  const optimizeRoute = async () => {
    if (selectedStores.length < 1) return;
    setOptimizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const storeDetails = selectedStores.map(id => stores.find(s => s.id === id)).filter(Boolean);
      const prompt = `Otimize a rota para SECO entre estas lojas: ${storeDetails.map(s => s?.name).join(', ')}. Retorne JSON: { km: number, time: number, order: [id1, id2, ...] }`;
      const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt, config: { responseMimeType: "application/json" } });
      const result = JSON.parse(response.text || '{}');
      setOptimizedResult({ km: result.km || 0, time: result.time || 0, order: result.order || selectedStores });
      setSelectedStores(result.order || selectedStores);
    } catch (error) {
      console.error(error);
      setOptimizedResult({ km: selectedStores.length * 15, time: selectedStores.length * 20, order: selectedStores });
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = () => {
    if (!vehicleId || !driverId || selectedStores.length === 0) return;
    const routeType = isLonge(selectedStores, stores) ? 'Longe' : 'Perto';
    onSave({
      date,
      vehicleId,
      driverId,
      storeIds: selectedStores,
      category: 'Seco',
      loadNumber,
      separation,
      box,
      weight,
      boxes,
      items,
      pallets,
      cross,
      reverse,
      flv,
      totalKm: optimizedResult?.km || 0,
      estimatedTime: optimizedResult?.time || 0,
      status: 'Agendada',
      routeType
    });
    // Reset
    setSelectedStores([]);
    setVehicleId('');
    setDriverId('');
    setOptimizedResult(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Roteirizar SECO</h3>
          <Package className="text-orange-500" size={24} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Separação</label>
            <select value={separation} onChange={e => setSeparation(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500">
              <option value="NOITE">NOITE</option>
              <option value="DIA">DIA</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carga</label>
            <input type="text" value={loadNumber} onChange={e => setLoadNumber(e.target.value)} placeholder="Nº Carga" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Box</label>
            <input type="text" value={box} onChange={e => setBox(e.target.value)} placeholder="Box" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Peso (kg)</label>
            <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Caixas</label>
            <input type="number" value={boxes} onChange={e => setBoxes(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Itens</label>
            <input type="number" value={items} onChange={e => setItems(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PLT</label>
            <input type="number" value={pallets} onChange={e => setPallets(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cross</label>
            <input type="number" value={cross} onChange={e => setCross(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rev.</label>
            <input type="number" value={reverse} onChange={e => setReverse(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">FLV</label>
            <input type="number" value={flv} onChange={e => setFlv(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Veículo</label>
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500">
            <option value="">Selecionar Veículo</option>
            {vehicles.filter(v => v.status === 'Disponível').map(v => <option key={v.id} value={v.id}>{v.plate} ({v.type})</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Motorista (Prioridade Escala)</label>
          <select value={driverId} onChange={e => setDriverId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500">
            <option value="">Selecionar Motorista</option>
            {filteredDrivers.map(d => (
              <option key={d.id} value={d.id} disabled={d.isRestricted && isLonge(selectedStores, stores)}>
                {d.name} {d.recommendation ? `(${d.recommendation})` : ''} {d.isRestricted ? '[Restrito Longe]' : ''}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Regra: Longe/Perto rotativo. Longe apenas a cada 3 dias.</p>
        </div>

        <button 
          onClick={handleSave}
          disabled={!vehicleId || !driverId || selectedStores.length === 0}
          className="w-full py-4 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
        >
          Salvar Roteirização Seco
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Selecionar Lojas</h3>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{selectedStores.length} selecionadas</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => setSelectedStores(prev => prev.includes(store.id) ? prev.filter(id => id !== store.id) : [...prev, store.id])}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedStores.includes(store.id) ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
            >
              <div className="text-left">
                <p className="font-bold text-slate-900">{store.name}</p>
                <p className="text-xs text-slate-500">{store.region}</p>
              </div>
              {selectedStores.includes(store.id) && <CheckCircle2 className="text-orange-500" size={18} />}
            </button>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100">
          <button onClick={optimizeRoute} disabled={optimizing || selectedStores.length < 1} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {optimizing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Navigation size={20} />}
            Calcular Rota Otimizada
          </button>
          {optimizedResult && (
            <div className="mt-4 p-4 bg-slate-50 rounded-2xl flex justify-around">
              <div className="text-center"><p className="text-xs font-bold text-slate-400 uppercase">Distância</p><p className="text-lg font-black text-slate-900">{optimizedResult.km.toFixed(1)} km</p></div>
              <div className="text-center"><p className="text-xs font-bold text-slate-400 uppercase">Tempo</p><p className="text-lg font-black text-slate-900">{Math.round(optimizedResult.time)} min</p></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RoutePlannerFLV = ({ stores, vehicles, drivers, routes, onSave }: { stores: Store[], vehicles: Vehicle[], drivers: Driver[], routes: Route[], onSave: (r: Partial<Route>) => void }) => {
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weight, setWeight] = useState(0);
  const [pallets, setPallets] = useState(0);
  const [eggs, setEggs] = useState(0);
  const [frozen, setFrozen] = useState(0);
  const [cross, setCross] = useState(0);
  const [beco, setBeco] = useState(0);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState<{ km: number, time: number, order: string[] } | null>(null);

  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => d.status === 'Ativo').map(d => {
      const lastRoute = routes.filter(r => r.driverId === d.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const lastLongeRoute = routes.filter(r => r.driverId === d.id && r.routeType === 'Longe').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      let recommendation = '';
      let isRestricted = false;
      
      if (lastRoute) {
        if (lastRoute.routeType === 'Longe') recommendation = 'Próxima: Perto';
        else recommendation = 'Próxima: Longe';
      }

      if (lastLongeRoute) {
        const daysSinceLastLonge = Math.floor((new Date().getTime() - new Date(lastLongeRoute.date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLastLonge < 3) isRestricted = true;
      }

      return { ...d, lastRoute, lastLongeRoute, recommendation, isRestricted };
    });
  }, [drivers, routes]);

  const optimizeRoute = async () => {
    if (selectedStores.length < 1) return;
    setOptimizing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const storeDetails = selectedStores.map(id => stores.find(s => s.id === id)).filter(Boolean);
      const prompt = `Otimize a rota para FLV entre estas lojas: ${storeDetails.map(s => s?.name).join(', ')}. Retorne JSON: { km: number, time: number, order: [id1, id2, ...] }`;
      const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt, config: { responseMimeType: "application/json" } });
      const result = JSON.parse(response.text || '{}');
      setOptimizedResult({ km: result.km || 0, time: result.time || 0, order: result.order || selectedStores });
      setSelectedStores(result.order || selectedStores);
    } catch (error) {
      console.error(error);
      setOptimizedResult({ km: selectedStores.length * 15, time: selectedStores.length * 20, order: selectedStores });
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = () => {
    if (!vehicleId || !driverId || selectedStores.length === 0) return;
    const routeType = isLonge(selectedStores, stores) ? 'Longe' : 'Perto';
    onSave({
      date,
      vehicleId,
      driverId,
      storeIds: selectedStores,
      category: 'FLV',
      weight,
      pallets,
      eggs,
      frozen,
      cross,
      beco,
      totalKm: optimizedResult?.km || 0,
      estimatedTime: optimizedResult?.time || 0,
      status: 'Agendada',
      routeType
    });
    // Reset
    setSelectedStores([]);
    setVehicleId('');
    setDriverId('');
    setOptimizedResult(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Roteirizar FLV</h3>
          <Leaf className="text-green-500" size={24} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Peso Geral (kg)</label>
            <input type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">PLT</label>
            <input type="number" value={pallets} onChange={e => setPallets(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ovos</label>
            <input type="number" value={eggs} onChange={e => setEggs(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cong.</label>
            <input type="number" value={frozen} onChange={e => setFrozen(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cross</label>
            <input type="number" value={cross} onChange={e => setCross(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Beco</label>
            <input type="number" value={beco} onChange={e => setBeco(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Veículo</label>
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500">
            <option value="">Selecionar Veículo</option>
            {vehicles.filter(v => v.status === 'Disponível').map(v => <option key={v.id} value={v.id}>{v.plate} ({v.type})</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Motorista (Prioridade Escala)</label>
          <select value={driverId} onChange={e => setDriverId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500">
            <option value="">Selecionar Motorista</option>
            {filteredDrivers.map(d => (
              <option key={d.id} value={d.id} disabled={d.isRestricted && isLonge(selectedStores, stores)}>
                {d.name} {d.recommendation ? `(${d.recommendation})` : ''} {d.isRestricted ? '[Restrito Longe]' : ''}
              </option>
            ))}
          </select>
        </div>

        <button 
          onClick={handleSave}
          disabled={!vehicleId || !driverId || selectedStores.length === 0}
          className="w-full py-4 bg-green-500 text-white font-bold rounded-2xl hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
        >
          Salvar Roteirização FLV
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Selecionar Lojas</h3>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{selectedStores.length} selecionadas</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => setSelectedStores(prev => prev.includes(store.id) ? prev.filter(id => id !== store.id) : [...prev, store.id])}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedStores.includes(store.id) ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
            >
              <div className="text-left">
                <p className="font-bold text-slate-900">{store.name}</p>
                <p className="text-xs text-slate-500">{store.region}</p>
              </div>
              {selectedStores.includes(store.id) && <CheckCircle2 className="text-orange-500" size={18} />}
            </button>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t border-slate-100">
          <button onClick={optimizeRoute} disabled={optimizing || selectedStores.length < 1} className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {optimizing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Navigation size={20} />}
            Calcular Rota Otimizada
          </button>
        </div>
      </div>
    </div>
  );
};

const RoutePlanner = ({ stores, vehicles, routes, onSave }: { stores: Store[], vehicles: Vehicle[], routes: Route[], onSave: (r: Partial<Route>) => void }) => {
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('08:00');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedResult, setOptimizedResult] = useState<{ km: number, time: number, order: string[] } | null>(null);

  const toggleStore = (id: string) => {
    setSelectedStores(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const optimizeRoute = async () => {
    if (selectedStores.length < 2) return;
    setOptimizing(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const storeDetails = selectedStores.map(id => stores.find(s => s.id === id)).filter(Boolean);
      
      // Find CD PÓLO JK if it's in the selection
      const cdStore = storeDetails.find(s => s?.name.includes('CD PÓLO JK'));
      
      const prompt = `Como um especialista em logística em Brasília, otimize a rota entre estas lojas:
      ${storeDetails.map(s => `- ${s?.name} (${s?.address})`).join('\n')}
      
      ${cdStore ? `IMPORTANTE: A rota DEVE começar pela filial "${cdStore.name}".` : ''}
      
      Retorne APENAS um JSON com este formato:
      {
        "km": número total estimado,
        "time": tempo total estimado em minutos,
        "order": ["id1", "id2", ...] (ordem otimizada dos IDs das lojas fornecidas)
      }
      
      Considere o trânsito típico de Brasília e as distâncias reais entre os bairros (Asa Sul, Norte, Taguatinga, etc).`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');
      setOptimizedResult({
        km: result.km || 0,
        time: result.time || 0,
        order: result.order || selectedStores
      });
      setSelectedStores(result.order || selectedStores);
    } catch (error) {
      console.error("Erro ao otimizar:", error);
      // Fallback simple simulation
      setOptimizedResult({
        km: selectedStores.length * 15,
        time: selectedStores.length * 25,
        order: selectedStores
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleSave = () => {
    if (!selectedVehicle || selectedStores.length === 0) return;
    onSave({
      date,
      time,
      vehicleId: selectedVehicle,
      storeIds: selectedStores,
      totalKm: optimizedResult?.km || 0,
      estimatedTime: optimizedResult?.time || 0,
      status: 'Agendada'
    });
    // Reset
    setSelectedStores([]);
    setSelectedVehicle('');
    setOptimizedResult(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Selecionar Lojas</h3>
          <div className="flex items-center gap-2">
            {selectedStores.length > 0 && (
              <button 
                onClick={() => { setSelectedStores([]); setOptimizedResult(null); }}
                className="text-[10px] font-bold uppercase text-red-500 hover:text-red-600 transition-colors"
              >
                Limpar
              </button>
            )}
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
              {selectedStores.length} selecionadas
            </span>
          </div>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar loja ou região..." 
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => toggleStore(store.id)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                selectedStores.includes(store.id)
                  ? 'bg-orange-50 border-orange-200'
                  : store.type === 'Filial' ? 'bg-blue-50/30 border-blue-100 hover:border-blue-200' : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{store.name}</p>
                  {store.type === 'Filial' && <span className="text-[8px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded uppercase">Filial</span>}
                </div>
                <p className="text-xs text-slate-500 truncate max-w-[200px]">{store.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                  {store.region}
                </span>
                {selectedStores.includes(store.id) && <CheckCircle2 className="text-orange-500" size={18} />}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-6">Configuração da Rota</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="date" 
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Horário</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="time" 
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-8">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Veículo Alocado</label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
              {vehicles.filter(v => v.status === 'Disponível').map(vehicle => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    selectedVehicle === vehicle.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Truck size={20} className={selectedVehicle === vehicle.id ? 'text-blue-500' : 'text-slate-400'} />
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{vehicle.plate}</p>
                      <p className="text-xs text-slate-500">{vehicle.type} • {vehicle.capacity}T</p>
                    </div>
                  </div>
                  {selectedVehicle === vehicle.id && <CheckCircle2 className="text-blue-500" size={18} />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={optimizeRoute}
            disabled={selectedStores.length < 2 || optimizing}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {optimizing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Otimizando Rota...
              </>
            ) : (
              <>
                <Navigation size={20} />
                Calcular Rota Otimizada
              </>
            )}
          </button>
        </div>

        {optimizedResult && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-500 text-white p-8 rounded-3xl shadow-xl shadow-orange-500/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold">Resultado da Otimização</h4>
              <Info size={20} className="opacity-60" />
            </div>
            
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-1">Distância Total</p>
                <p className="text-3xl font-bold">{optimizedResult.km.toFixed(1)} <span className="text-lg font-medium opacity-80">km</span></p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase opacity-60 mb-1">Tempo Estimado</p>
                <p className="text-3xl font-bold">{Math.round(optimizedResult.time)} <span className="text-lg font-medium opacity-80">min</span></p>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              <p className="text-xs font-bold uppercase opacity-60">Sequência de Entrega</p>
              <div className="flex flex-wrap gap-2">
                {optimizedResult.order.map((id, i) => (
                  <div key={id} className="flex items-center gap-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                      {stores.find(s => s.id === id)?.name}
                    </span>
                    {i < optimizedResult.order.length - 1 && <ArrowRight size={12} className="opacity-40" />}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-4 bg-white text-orange-600 rounded-2xl font-bold hover:bg-orange-50 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <CheckCircle2 size={20} />
              Confirmar e Agendar Rota
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const StoreManager = ({ stores, onAdd, onDelete, onDeleteAll }: { stores: Store[], onAdd: (s: Partial<Store>) => void, onDelete: (id: string) => void, onDeleteAll: () => void }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newStore, setNewStore] = useState({ name: '', address: '', region: '', lat: 0, lng: 0, type: 'Loja' as const });
  const [seeding, setSeeding] = useState(false);

  const regions = ['Asa Sul', 'Asa Norte', 'Taguatinga', 'Ceilândia', 'Águas Claras', 'Guará', 'Samambaia', 'Planaltina', 'Gama', 'Sobradinho', 'Entorno GO', 'Outros'];

  const handleAdd = () => {
    if (!newStore.name || !newStore.address) return;
    // Mock lat/lng for prototype
    onAdd({ ...newStore, lat: -15.7942, lng: -47.8822 });
    setNewStore({ name: '', address: '', region: '', lat: 0, lng: 0, type: 'Loja' });
    setShowAdd(false);
  };

  const seedStores = async () => {
    setSeeding(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const storeList = `
        01-DD CEI 070
        04-DD SOBRADINHO
        07-DD SIA
        08-DD TAGUATINGA
        12-DD GAMA
        13-DD LUZIANIA-GO
        15-DD BALNEARIO-GO
        16-DD SAD
        18-DD AGUAS LINDAS-GO
        19-DD CALDAS NOVAS-GO
        21-DD CEI SUL
        25-DD NOVO GAMA-GO
        26-DD CESAR LATTES-GO
        27-DD PLANALTINA-GO
        28-DD AGUAS CLARAS
        29-DD GUARA II
        30-DD LEM-BA
        32-DD CEI CENTRO
        33-DD PLANALTINA-DF
        34-DD SMB SUL
        37-DD VICENTE RUA 12
        38-DD VICENTE RUA 4
        39-DD GOIANESIA-GO
        40-DD GURUPI-TO
        42-DD LAGO SUL (JD BOTÂNICO)
        47-DD APARECIDA-GO
        50-DD MESTRE D'ARMAS
        52-DD RIACHO FUNDO I
        53-DD RIO VERDE-GO
        55-DD RECANTO DAS EMAS
        58-DD EPTG (V. PIRES)
        60-DD FURNAS (SMB)
        62-DD R VERMELHO (LUZIÂNIA-GO)
        63-DD FORMOSA-GO
        64-DD ITUMBIARA-GO
        65-DD CEI NORTE
        1017 - CD PÓLO JK
      `;

      const prompt = `Para cada uma destas lojas em Brasília e entorno, encontre o endereço exato e as coordenadas (latitude e longitude).
      
      REGRAS ESPECIAIS PARA ESTAS LOJAS (USE ESTES ENDEREÇOS):
      - 15-DD BALNEARIO-GO: Avenida Horácio Costa Silva SN - Quadra 03 Lote 81 A - Goiânia - GO CEP - 74593-681. (Atrás do Shopping Passeio das Águas).
      - 13-DD LUZIANIA-GO: Parque Estrela Dalva II - Quadra 146 - Lote 1A Luziânia - GO - CEP 72820-020. (Entrada Principal de Luziânia).
      - 62-DD R VERMELHO (LUZIÂNIA-GO): Esta é a "Luziânia 2", localizada em Luziânia-GO. Procure o endereço exato desta unidade específica.
      - 1017 - CD PÓLO JK: Este é o Centro de Distribuição principal, localizado no Polo JK, Santa Maria, DF.
      
      Lojas:
      ${storeList}
      
      Retorne APENAS um JSON que seja um array de objetos com este formato:
      [
        {
          "name": "Nome da Loja",
          "address": "Endereço Completo",
          "lat": número,
          "lng": número,
          "region": "Região Administrativa ou Cidade",
          "type": "Loja" ou "Filial" (Apenas 1017 é Filial)
        }
      ]
      
      Seja extremamente preciso com as coordenadas para o DF e entorno, especialmente para os endereços fornecidos acima.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '[]');
      for (const store of result) {
        onAdd(store);
      }
    } catch (error) {
      console.error("Erro ao popular lojas:", error);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Gerenciar Lojas</h2>
            <div className="flex gap-3">
              <button 
                onClick={onDeleteAll}
                className="text-slate-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-lg hover:bg-red-50 transition-all"
              >
                Limpar Tudo
              </button>
              <button 
                onClick={seedStores}
                disabled={seeding}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {seeding ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Navigation size={20} />}
                Importar Lojas Padrão
              </button>
              <button 
                onClick={() => setShowAdd(true)}
                className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
              >
                <Plus size={20} /> Adicionar Loja
              </button>
            </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stores.map(store => (
          <div key={store.id} className={`bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all group ${
            store.type === 'Filial' ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-100'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl transition-colors ${
                store.type === 'Filial' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover:text-orange-500'
              }`}>
                <StoreIcon size={24} />
              </div>
              <button 
                onClick={() => onDelete(store.id)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <AlertCircle size={20} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-lg font-bold text-slate-900">{store.name}</h4>
              {store.type === 'Filial' && <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase">Filial</span>}
            </div>
            <p className="text-sm text-slate-500 mb-4 line-clamp-2">{store.address}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                {store.region}
              </span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Nova Loja</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome da Loja</label>
                  <input 
                    type="text" 
                    value={newStore.name}
                    onChange={e => setNewStore({...newStore, name: e.target.value})}
                    placeholder="Ex: Supermercado Brasília Sul"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Loja', 'Filial'].map(type => (
                      <button
                        key={type}
                        onClick={() => setNewStore({...newStore, type: type as any})}
                        className={`py-3 rounded-xl text-sm font-bold transition-all ${
                          newStore.type === type ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Endereço</label>
                  <textarea 
                    value={newStore.address}
                    onChange={e => setNewStore({...newStore, address: e.target.value})}
                    placeholder="Endereço completo..."
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500 h-24 resize-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Região</label>
                  <select 
                    value={newStore.region}
                    onChange={e => setNewStore({...newStore, region: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Selecionar Região</option>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  Salvar Loja
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DriverManager = ({ drivers, onAdd, onDelete }: { drivers: Driver[], onAdd: (d: Partial<Driver>) => void, onDelete: (id: string) => void }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newDriver, setNewDriver] = useState({ name: '', status: 'Ativo' as const });

  const handleAdd = () => {
    if (!newDriver.name) return;
    onAdd(newDriver);
    setNewDriver({ name: '', status: 'Ativo' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Motoristas</h2>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-orange-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
        >
          <Plus size={20} /> Adicionar Motorista
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map(driver => (
          <div key={driver.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-orange-500 transition-colors">
                <User size={24} />
              </div>
              <button 
                onClick={() => onDelete(driver.id)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <AlertCircle size={20} />
              </button>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-1">{driver.name}</h4>
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                driver.status === 'Ativo' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
              }`}>
                {driver.status}
              </span>
              {driver.lastRouteType && (
                <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                  Última: {driver.lastRouteType}
                </span>
              )}
            </div>
            {driver.lastRouteDate && (
              <p className="text-xs text-slate-400 font-medium">
                Última rota em: {format(new Date(driver.lastRouteDate), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Novo Motorista</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newDriver.name}
                    onChange={e => setNewDriver({...newDriver, name: e.target.value})}
                    placeholder="Ex: João da Silva"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Ativo', 'Inativo'].map(status => (
                      <button
                        key={status}
                        onClick={() => setNewDriver({...newDriver, status: status as any})}
                        className={`py-3 rounded-xl text-sm font-bold transition-all ${
                          newDriver.status === status ? 'bg-orange-500 text-white' : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                >
                  Salvar Motorista
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const VehicleManager = ({ vehicles, onAdd, onDelete }: { vehicles: Vehicle[], onAdd: (v: Partial<Vehicle>) => void, onDelete: (id: string) => void }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ plate: '', type: 'Caminhão' as const, capacity: 5, status: 'Disponível' as const });

  const handleAdd = () => {
    if (!newVehicle.plate) return;
    onAdd(newVehicle);
    setNewVehicle({ plate: '', type: 'Caminhão', capacity: 5, status: 'Disponível' });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Frota</h2>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={20} /> Novo Veículo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map(vehicle => (
          <div key={vehicle.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl transition-colors ${
                vehicle.type === 'Carreta' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'
              }`}>
                <Truck size={24} />
              </div>
              <button 
                onClick={() => onDelete(vehicle.id)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <AlertCircle size={20} />
              </button>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-1">{vehicle.plate}</h4>
            <p className="text-sm text-slate-500 mb-4">{vehicle.type} • {vehicle.capacity} Toneladas</p>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                vehicle.status === 'Disponível' ? 'bg-green-100 text-green-600' :
                vehicle.status === 'Em Rota' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'
              }`}>
                {vehicle.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Novo Veículo</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Placa</label>
                  <input 
                    type="text" 
                    value={newVehicle.plate}
                    onChange={e => setNewVehicle({...newVehicle, plate: e.target.value.toUpperCase()})}
                    placeholder="ABC-1234"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Caminhão', 'Carreta'].map(type => (
                      <button
                        key={type}
                        onClick={() => setNewVehicle({...newVehicle, type: type as any})}
                        className={`py-3 rounded-xl text-sm font-bold transition-all ${
                          newVehicle.type === type ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-500'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Capacidade (Toneladas)</label>
                  <input 
                    type="number" 
                    value={newVehicle.capacity}
                    onChange={e => setNewVehicle({...newVehicle, capacity: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAdd}
                  className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                >
                  Salvar Veículo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="p-10 bg-red-50 border border-red-200 rounded-3xl m-10">
        <h2 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
          <AlertCircle /> Erro no Sistema
        </h2>
        <pre className="bg-white p-4 rounded-xl text-xs overflow-auto max-h-64 border border-red-100">
          {error?.message || 'Ocorreu um erro inesperado.'}
        </pre>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold"
        >
          Recarregar Aplicativo
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

const BrasíliaMap = ({ stores, activeRoute }: { stores: Store[], activeRoute?: Route }) => {
  // Stylized representation of Brasília (Plano Piloto + Satellites)
  return (
    <div className="relative w-full h-full bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
      <svg viewBox="0 0 400 400" className="w-full h-full opacity-20 absolute inset-0">
        {/* Simplified Plano Piloto Shape */}
        <path d="M200,100 L250,150 L200,300 L150,150 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
      </svg>
      
      <div className="absolute inset-0 p-4">
        {stores.map(store => (
          <motion.div
            key={store.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute w-3 h-3 rounded-full border-2 border-white shadow-sm transition-all ${
              store.type === 'Filial' ? 'bg-blue-600 scale-150 z-20' :
              activeRoute?.storeIds.includes(store.id) ? 'bg-orange-500 z-10 scale-125' : 'bg-slate-300'
            }`}
            style={{ 
              left: `${((store.lng + 48.5) * 800) % 100}%`, 
              top: `${((store.lat + 16.2) * 800) % 100}%` 
            }}
          >
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap">
              <span className={`text-[8px] font-bold px-1 rounded shadow-sm ${
                store.type === 'Filial' ? 'bg-blue-600 text-white' : 'bg-white/80 text-slate-600'
              }`}>
                {store.name}
              </span>
            </div>
          </motion.div>
        ))}
        
        {activeRoute && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Draw lines between stores in route order */}
            {activeRoute.storeIds.map((id, i) => {
              if (i === 0) return null;
              const s1 = stores.find(s => s.id === activeRoute.storeIds[i-1]);
              const s2 = stores.find(s => s.id === id);
              if (!s1 || !s2) return null;
              
              const x1 = `${((s1.lng + 48.5) * 800) % 100}%`;
              const y1 = `${((s1.lat + 16.2) * 800) % 100}%`;
              const x2 = `${((s2.lng + 48.5) * 800) % 100}%`;
              const y2 = `${((s2.lat + 16.2) * 800) % 100}%`;
              
              return (
                <motion.line
                  key={`${i}`}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#f97316"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                />
              );
            })}
          </svg>
        )}
      </div>
      
      <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Legenda</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
            <span className="text-[10px] font-medium text-slate-600">Filial / CD</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span className="text-[10px] font-medium text-slate-600">Na Rota</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
            <span className="text-[10px] font-medium text-slate-600">Outras Lojas</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RouteList = ({ routes, stores, vehicles, drivers, onUpdateStatus }: { routes: Route[], stores: Store[], vehicles: Vehicle[], drivers: Driver[], onUpdateStatus: (id: string, s: string) => void }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-4">Rotas Recentes</h3>
      <div className="space-y-3">
        {routes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(route => {
          const vehicle = vehicles.find(v => v.id === route.vehicleId);
          const driver = drivers.find(d => d.id === route.driverId);
          return (
            <div key={route.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-slate-200 transition-all">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  route.status === 'Concluída' ? 'bg-green-50 text-green-500' :
                  route.status === 'Em Andamento' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'
                }`}>
                  <Navigation size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{format(new Date(route.date), 'dd/MM/yyyy')}</p>
                    <span className="text-slate-300">•</span>
                    <p className="text-sm font-medium text-slate-500">{route.time}</p>
                    {route.category && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                        route.category === 'Seco' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {route.category}
                      </span>
                    )}
                    {route.routeType && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                        route.routeType === 'Longe' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {route.routeType}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    {vehicle?.plate} ({vehicle?.type}) • {driver?.name || 'Sem Motorista'} • {route.storeIds.length} lojas
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-slate-900">{route.totalKm.toFixed(1)} km</p>
                  <p className="text-xs text-slate-400 font-medium">{Math.round(route.estimatedTime)} min</p>
                </div>
                
                <select 
                  value={route.status}
                  onChange={(e) => onUpdateStatus(route.id, e.target.value)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border-none focus:ring-2 focus:ring-orange-500 ${
                    route.status === 'Concluída' ? 'bg-green-100 text-green-600' :
                    route.status === 'Em Andamento' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <option value="Agendada">Agendada</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Concluída">Concluída</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [scales, setScales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  const activeRoute = useMemo(() => routes.find(r => r.id === activeRouteId), [routes, activeRouteId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubStores = onSnapshot(collection(db, 'stores'), 
      (snap) => setStores(snap.docs.map(d => ({ id: d.id, ...d.data() } as Store))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'stores')
    );

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), 
      (snap) => setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'vehicles')
    );

    const unsubDrivers = onSnapshot(collection(db, 'drivers'), 
      (snap) => setDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Driver))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'drivers')
    );

    const unsubRoutes = onSnapshot(collection(db, 'routes'), 
      (snap) => setRoutes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Route))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'routes')
    );

    const unsubScales = onSnapshot(collection(db, 'scales'), 
      (snap) => setScales(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'scales')
    );

    return () => {
      unsubStores();
      unsubVehicles();
      unsubDrivers();
      unsubRoutes();
      unsubScales();
    };
  }, [user]);

  const handleAddDriver = async (data: Partial<Driver>) => {
    try {
      await addDoc(collection(db, 'drivers'), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'drivers');
    }
  };

  const handleDeleteDriver = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'drivers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'drivers');
    }
  };

  const handleAddStore = async (data: Partial<Store>) => {
    try {
      // Check if store with same name exists to avoid duplicates and allow updates
      const q = query(collection(db, 'stores'), where('name', '==', data.name));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const docRef = doc(db, 'stores', snap.docs[0].id);
        await updateDoc(docRef, data);
      } else {
        await addDoc(collection(db, 'stores'), data);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'stores');
    }
  };

  const handleDeleteStore = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'stores', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'stores');
    }
  };

  const handleDeleteAllStores = async () => {
    if (!confirm('Tem certeza que deseja excluir TODAS as lojas? Esta ação não pode ser desfeita.')) return;
    try {
      const snap = await getDocs(collection(db, 'stores'));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'stores', d.id));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'stores');
    }
  };

  const handleSaveVehicle = async (data: Partial<Vehicle>) => {
    try {
      await addDoc(collection(db, 'vehicles'), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'vehicles');
    }
  };

  const handleSaveScale = async (scale: any) => {
    try {
      await addDoc(collection(db, 'scales'), {
        ...scale,
        createdBy: user?.uid,
        createdAt: Timestamp.now()
      });
      
      // Also save individual routes if they have driver and vehicle
      const batch = writeBatch(db);
      for (const item of scale.items) {
        if (item.driverId && item.vehicleId) {
          const routeRef = doc(collection(db, 'routes'));
          batch.set(routeRef, {
            date: scale.date,
            category: scale.category,
            loadNumber: item.loadNumber,
            storeIds: item.stores, // This might need mapping to IDs if they are names
            driverId: item.driverId,
            vehicleId: item.vehicleId,
            pallets: item.pallets,
            boxes: item.boxes,
            weight: item.weight,
            items: item.items,
            box: item.box,
            cross: item.cross,
            reverse: item.reverse,
            flv: item.flv,
            eggs: item.eggs,
            frozen: item.frozen,
            beco: item.beco,
            routeType: item.routeType,
            status: 'Agendada',
            totalKm: 0, // Will be calculated or estimated
            estimatedTime: 0,
            createdBy: user?.uid,
            createdAt: Timestamp.now()
          });

          // Update vehicle status
          const vRef = doc(db, 'vehicles', item.vehicleId);
          batch.update(vRef, { status: 'Em Rota' });

          // Update driver info
          const dRef = doc(db, 'drivers', item.driverId);
          batch.update(dRef, { 
            lastRouteType: item.routeType,
            lastRouteDate: scale.date
          });
        }
      }
      await batch.commit();
      alert('Escala salva com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'scales');
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'vehicles', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'vehicles');
    }
  };

  const handleSaveRoute = async (data: Partial<Route>) => {
    try {
      await addDoc(collection(db, 'routes'), {
        ...data,
        createdBy: user?.uid,
        createdAt: Timestamp.now()
      });
      // Update vehicle status
      if (data.vehicleId) {
        const vRef = doc(db, 'vehicles', data.vehicleId);
        await updateDoc(vRef, { status: 'Em Rota' });
      }
      // Update driver status and last route info
      if (data.driverId) {
        const dRef = doc(db, 'drivers', data.driverId);
        await updateDoc(dRef, { 
          lastRouteType: data.routeType,
          lastRouteDate: data.date
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'routes');
    }
  };

  const handleUpdateRouteStatus = async (id: string, status: string) => {
    try {
      const rRef = doc(db, 'routes', id);
      await updateDoc(rRef, { status });
      
      // If completed, free the vehicle
      if (status === 'Concluída') {
        const route = routes.find(r => r.id === id);
        if (route?.vehicleId) {
          const vRef = doc(db, 'vehicles', route.vehicleId);
          await updateDoc(vRef, { status: 'Disponível' });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'routes');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando RotaBrasília...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[128px]" />
        </div>
        
        <div className="relative z-10 text-center max-w-md px-6">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-orange-500/40 rotate-12">
            <Navigation size={40} className="text-white -rotate-12" />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-4">RotaBrasília</h1>
          <p className="text-slate-400 mb-12 text-lg font-medium leading-relaxed">
            Otimização inteligente de rotas e logística para o Distrito Federal e entorno.
          </p>
          <button 
            onClick={() => signInWithPopup(auth, new GoogleAuthProvider())}
            className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-slate-100 transition-all shadow-xl flex items-center justify-center gap-3 group"
          >
            <User size={24} className="group-hover:scale-110 transition-transform" />
            Acessar Sistema
          </button>
          <p className="mt-8 text-xs text-slate-500 uppercase tracking-widest font-bold">Desenvolvido para Logística de Alta Performance</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
        
        <main className="flex-1 overflow-y-auto p-10">
          <header className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter capitalize">
                {activeTab === 'dashboard' ? 'Painel de Controle' : 
                 activeTab === 'routes' ? 'Planejamento de Rotas' : 
                 activeTab === 'stores' ? 'Catálogo de Lojas' : 'Gestão de Frota'}
              </h2>
              <p className="text-slate-500 font-medium">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <div className="flex gap-4">
              <button className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                <Filter size={20} />
              </button>
              <button className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                <Settings size={20} />
              </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <Dashboard key="dashboard" stores={stores} vehicles={vehicles} routes={routes} />
            )}
            {activeTab === 'scale' && (
              <DailyScaleManager 
                key="scale" 
                stores={stores} 
                vehicles={vehicles} 
                drivers={drivers} 
                scales={scales}
                onSaveScale={handleSaveScale} 
              />
            )}
            {activeTab === 'driver-history' && (
              <DriverHistory key="driver-history" drivers={drivers} routes={routes} />
            )}
            {activeTab === 'routes-seco' && (
              <div key="routes-seco" className="space-y-8 animate-in fade-in duration-500">
                <RoutePlannerSeco stores={stores} vehicles={vehicles} drivers={drivers} routes={routes} onSave={handleSaveRoute} />
              </div>
            )}
            {activeTab === 'routes-flv' && (
              <div key="routes-flv" className="space-y-8 animate-in fade-in duration-500">
                <RoutePlannerFLV stores={stores} vehicles={vehicles} drivers={drivers} routes={routes} onSave={handleSaveRoute} />
              </div>
            )}
            {activeTab === 'routes' && (
              <div key="routes" className="space-y-8 animate-in fade-in duration-500">
                <RoutePlanner stores={stores} vehicles={vehicles} routes={routes} onSave={handleSaveRoute} />
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <RouteList 
                      routes={routes} 
                      stores={stores} 
                      vehicles={vehicles} 
                      drivers={drivers}
                      onUpdateStatus={handleUpdateRouteStatus} 
                    />
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-[500px]">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-4">Mapa de Operações</h3>
                    <BrasíliaMap stores={stores} activeRoute={activeRoute} />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'stores' && (
              <StoreManager 
                key="stores" 
                stores={stores} 
                onAdd={handleAddStore} 
                onDelete={handleDeleteStore}
                onDeleteAll={handleDeleteAllStores}
              />
            )}
            {activeTab === 'vehicles' && (
              <VehicleManager key="vehicles" vehicles={vehicles} onAdd={handleSaveVehicle} onDelete={handleDeleteVehicle} />
            )}
            {activeTab === 'drivers' && (
              <DriverManager key="drivers" drivers={drivers} onAdd={handleAddDriver} onDelete={handleDeleteDriver} />
            )}
          </AnimatePresence>
        </main>
      </div>
    </ErrorBoundary>
  );
}
