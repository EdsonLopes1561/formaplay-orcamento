import { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit, Trash2, Search, User, Users, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { Cliente } from '../types';
import { supabase } from '../supabase';

interface ClientesModalProps {
  onClose: () => void;
  onSelectCliente?: (cliente: Cliente) => void;
  isOpen?: boolean;
}

export function ClientesModal({ onClose, onSelectCliente, isOpen }: ClientesModalProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<Partial<Cliente>>({
    nome: '',
    razao_social: '',
    nome_fantasia: '',
    documento: '',
    inscricao_estadual: '',
    email: '',
    telefone: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
    contato_responsavel: '',
    tipo_cliente: '',
    observacoes: '',
  });

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [hasCepFailed, setHasCepFailed] = useState(false);

  const numeroInputRef = useRef<HTMLInputElement>(null);
  const enderecoInputRef = useRef<HTMLInputElement>(null);

  // Progressive validation logic
  const isNomeFilled = !!formData.nome?.trim();
  const isCepComplete = (formData.cep || '').replace(/\D/g, '').length === 8;
  const isEnderecoFilled = !!formData.endereco?.trim();
  const isNumeroFilled = !!formData.numero?.trim();
  const isBairroFilled = !!formData.bairro?.trim();
  const isCidadeFilled = !!formData.cidade?.trim();
  const isEstadoFilled = !!formData.estado?.trim();

  const isNonAddressEnabled = isNomeFilled;
  const isCepEnabled = isNomeFilled;

  // Address fields progressive unlocking:
  const isEnderecoEnabled = isNomeFilled && (!formData.cep || isCepComplete || isEnderecoFilled || hasCepFailed);
  const isNumeroEnabled = isNomeFilled && (isEnderecoFilled || isNumeroFilled);
  const isComplementoEnabled = isNomeFilled && (isEnderecoFilled || isNumeroFilled);
  const isBairroEnabled = isNomeFilled && (isNumeroFilled || isBairroFilled || isCepComplete || hasCepFailed);
  const isCidadeEnabled = isNomeFilled && (isBairroFilled || isCidadeFilled || isCepComplete || hasCepFailed);
  const isEstadoEnabled = isNomeFilled && (isCidadeFilled || isEstadoFilled || isCepComplete || hasCepFailed);

  // Form validation:
  const hasAddressOrCep = isEnderecoFilled || !!formData.cep?.trim();
  const isFormValid = isNomeFilled && (!hasAddressOrCep || isNumeroFilled);

  const fetchCep = async (cepStr: string, formattedCep: string) => {
    setIsSearchingCep(true);
    setHasCepFailed(false);
    try {
      const url = `https://viacep.com.br/ws/${cepStr}/json/`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.erro) {
        setCepError('CEP não encontrado. Preencha o endereço manualmente.');
        setHasCepFailed(true);
        setTimeout(() => {
          enderecoInputRef.current?.focus();
        }, 50);
      } else {
        setFormData((prev) => ({
          ...prev,
          cep: formattedCep,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
        setTimeout(() => {
          if (data.logradouro) {
            numeroInputRef.current?.focus();
          } else {
            enderecoInputRef.current?.focus();
          }
        }, 50);
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
      setCepError('Não foi possível consultar o CEP agora. Preencha o endereço manualmente.');
      setHasCepFailed(true);
      setTimeout(() => {
        enderecoInputRef.current?.focus();
      }, 50);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    
    let formattedCep = rawValue;
    if (rawValue.length > 5) {
      formattedCep = `${rawValue.slice(0, 5)}-${rawValue.slice(5, 8)}`;
    }
    
    setFormData((prev) => ({ ...prev, cep: formattedCep }));
    setCepError(null);
    if (rawValue.length < 8) {
      setHasCepFailed(false);
    }

    if (rawValue.length === 8) {
      fetchCep(rawValue, formattedCep);
    }
  };

  const loadClientes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Erro ao carregar clientes:', error);
        alert(`Erro ao carregar clientes: ${error.message}`);
        return;
      }
      setClientes(data ?? []);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      alert('Erro ao carregar clientes');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClientes();
  }, [isOpen]);

  const filteredClientes = clientes.filter(
    (c) =>
      (c.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.documento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.cidade || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.telefone || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.nome?.trim()) {
      alert('Nome do cliente é obrigatório');
      return;
    }
    const hasAddressOrCep = !!formData.endereco?.trim() || !!formData.cep?.trim();
    if (hasAddressOrCep && !formData.numero?.trim()) {
      alert('O campo Número é obrigatório quando há endereço preenchido ou CEP informado.');
      return;
    }

    setLoading(true);
    try {
      if (editingCliente?.id) {
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', editingCliente.id);
        if (error) {
          console.error('Erro ao atualizar cliente:', error);
          alert('Erro ao atualizar cliente: ' + error.message);
          setLoading(false);
          return;
        }
      } else {
        const { error, data } = await supabase.from('clientes').insert(formData).select();
        if (error) {
          console.error('Erro ao salvar cliente:', error);
          alert('Erro ao salvar cliente: ' + error.message);
          setLoading(false);
          return;
        }
      }
      await loadClientes();
      setShowForm(false);
      setEditingCliente(null);
      setFormData({
        nome: '',
        razao_social: '',
        nome_fantasia: '',
        documento: '',
        inscricao_estadual: '',
        email: '',
        telefone: '',
        cep: '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        complemento: '',
        contato_responsavel: '',
        tipo_cliente: '',
        observacoes: '',
      });
      setHasCepFailed(false);
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente');
    }
    setLoading(false);
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData(cliente);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja inativar este cliente?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          ativo: false,
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);
      if (error) {
        console.error('Erro ao inativar cliente:', error);
        alert('Erro ao inativar cliente: ' + error.message);
        setLoading(false);
        return;
      }
      await loadClientes();
    } catch (error) {
      console.error('Erro ao inativar cliente:', error);
      alert('Erro ao inativar cliente');
    }
    setLoading(false);
  };

  const handleSelect = (cliente: Cliente) => {
    if (onSelectCliente) {
      onSelectCliente(cliente);
      onClose();
    }
  };

  // Classes para inputs escuros
  const inputClassName = "w-full px-4 py-2.5 bg-blue-900/50 border border-blue-800 rounded-xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:outline-none transition-all placeholder-slate-600 disabled:opacity-40 disabled:bg-blue-950/40 disabled:cursor-not-allowed disabled:border-blue-900/50";
  const labelClassName = "block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 ml-1";

  if (showForm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-md animate-fade-in transition-opacity">
        <div className="bg-blue-950 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-blue-800/50 overflow-hidden text-slate-200">
          
          <div className="flex items-center justify-between p-6 border-b border-blue-900 bg-blue-950 shadow-sm relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-600 to-emerald-400 text-slate-950 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                {editingCliente ? <Edit size={24} strokeWidth={2.5} /> : <Plus size={24} strokeWidth={2.5} />}
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
            </div>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingCliente(null);
                setFormData({
                  nome: '', razao_social: '', nome_fantasia: '', documento: '', inscricao_estadual: '',
                  email: '', telefone: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '',
                  estado: '', complemento: '', contato_responsavel: '', tipo_cliente: '', observacoes: '',
                });
                setCepError(null);
                setHasCepFailed(false);
              }}
              className="p-2.5 rounded-xl bg-blue-900 hover:bg-slate-700 hover:text-white transition-all border border-blue-800 text-slate-400"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-blue-950/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className={labelClassName}>Nome *</label>
                <input
                  type="text"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={inputClassName}
                  placeholder="Nome completo ou breve do cliente"
                />
              </div>

              <div>
                <label className={labelClassName}>Razão Social</label>
                <input
                  type="text"
                  value={formData.razao_social || ''}
                  onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                  disabled={!isNonAddressEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Nome Fantasia</label>
                <input
                  type="text"
                  value={formData.nome_fantasia || ''}
                  onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                  disabled={!isNonAddressEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>CPF / CNPJ</label>
                <input
                  type="text"
                  value={formData.documento || ''}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  disabled={!isNonAddressEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Inscrição Estadual</label>
                <input
                  type="text"
                  value={formData.inscricao_estadual || ''}
                  onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                  disabled={!isNonAddressEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>E-mail</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isNonAddressEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Contato / Responsável</label>
                <input
                  type="text"
                  value={formData.contato_responsavel || ''}
                  onChange={(e) => setFormData({ ...formData, contato_responsavel: e.target.value })}
                  disabled={!isNonAddressEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  disabled={!isNonAddressEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Tipo de Cliente</label>
                <select
                  value={formData.tipo_cliente || ''}
                  onChange={(e) => setFormData({ ...formData, tipo_cliente: e.target.value })}
                  disabled={!isNonAddressEnabled}
                  className={`${inputClassName} cursor-pointer`}
                >
                  <option value="" className="bg-blue-900">Selecione...</option>
                  <option value="PF" className="bg-blue-900">Pessoa Física</option>
                  <option value="PJ" className="bg-blue-900">Pessoa Jurídica</option>
                </select>
              </div>

              <div className="md:col-span-2 mt-4">
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-4 border-b border-blue-900 pb-2">Endereço</h3>
              </div>

              <div>
                <label className={labelClassName}>CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cep || ''}
                    onChange={handleCepChange}
                    maxLength={9}
                    disabled={!isCepEnabled}
                    className={inputClassName}
                    placeholder="00000-000"
                  />
                  {isSearchingCep && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {cepError && <p className="text-xs text-rose-400 mt-1.5 font-bold ml-1">{cepError}</p>}
              </div>

              <div className="md:col-span-1">
                {/* Espaço vazio para alinhar o CEP */}
              </div>

              <div className="md:col-span-2">
                <label className={labelClassName}>Rua / Logradouro</label>
                <input
                  ref={enderecoInputRef}
                  type="text"
                  value={formData.endereco || ''}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  disabled={!isEnderecoEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Número</label>
                <input
                  ref={numeroInputRef}
                  type="text"
                  value={formData.numero || ''}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  disabled={!isNumeroEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Complemento</label>
                <input
                  type="text"
                  value={formData.complemento || ''}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  disabled={!isComplementoEnabled}
                  className={inputClassName}
                />
              </div>

              <div>
                <label className={labelClassName}>Bairro</label>
                <input
                  type="text"
                  value={formData.bairro || ''}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  disabled={!isBairroEnabled}
                  className={inputClassName}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className={labelClassName}>Cidade</label>
                  <input
                    type="text"
                    value={formData.cidade || ''}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    disabled={!isCidadeEnabled}
                    className={inputClassName}
                  />
                </div>
                <div className="col-span-1">
                  <label className={labelClassName}>UF</label>
                  <input
                    type="text"
                    value={formData.estado || ''}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    disabled={!isEstadoEnabled}
                    className={inputClassName}
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="md:col-span-2 mt-4">
                <label className={labelClassName}>Observações Internas</label>
                <textarea
                  value={formData.observacoes || ''}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  disabled={!isNonAddressEnabled}
                  rows={3}
                  className={`${inputClassName} resize-none`}
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-blue-900 bg-blue-950 flex justify-end gap-3 z-10">
             <button
               onClick={() => {
                 setShowForm(false);
                 setEditingCliente(null);
                 setFormData({
                   nome: '', razao_social: '', nome_fantasia: '', documento: '', inscricao_estadual: '',
                   email: '', telefone: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '',
                   estado: '', complemento: '', contato_responsavel: '', tipo_cliente: '', observacoes: '',
                 });
                 setCepError(null);
                 setHasCepFailed(false);
               }}
               className="px-6 py-2.5 bg-blue-900 text-slate-300 border border-blue-800 rounded-xl hover:bg-slate-800 hover:text-white transition-all font-bold text-sm shadow-sm active:scale-95"
             >
               Cancelar
             </button>
             <button
               onClick={handleSave}
               disabled={loading || !isFormValid}
               className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
             >
               {loading ? (
                 <>
                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                   Salvando...
                 </>
               ) : 'Salvar'}
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/80 backdrop-blur-md animate-fade-in transition-opacity">
      <div className="bg-blue-950 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-blue-800/50 overflow-hidden text-slate-200">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-blue-900 bg-blue-950 shadow-sm relative z-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-400 text-slate-950 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hidden sm:block">
              <Users size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Base de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">Clientes</span></h2>
              <p className="text-sm text-slate-400 font-medium mt-0.5">{clientes.length} cliente(s) cadastrado(s)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-blue-900 hover:bg-slate-700 hover:text-white transition-all border border-blue-800 text-slate-400 self-end sm:self-auto"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-5 border-b border-blue-900 bg-blue-950/80">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, documento, cidade ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-blue-900/50 border border-blue-800 rounded-xl text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 focus:outline-none transition-all placeholder-slate-500 shadow-inner"
              />
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Plus size={18} strokeWidth={2.5} />
              Novo Cliente
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6 bg-blue-950/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-900 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest text-sm">Carregando...</p>
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-20 text-slate-500 flex flex-col items-center bg-blue-900/20 rounded-3xl border border-dashed border-blue-800">
              <div className="p-4 bg-blue-900/50 rounded-full mb-4 border border-blue-800">
                <Users size={48} className="opacity-50 text-slate-400" />
              </div>
              <p className="text-xl font-black text-white">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1 font-medium">Cadastre um novo cliente para começar ou revise sua busca.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {filteredClientes.map((cliente) => (
                <div
                  key={cliente.id}
                  className="p-5 rounded-2xl bg-blue-900/40 border border-blue-800 shadow-lg hover:border-emerald-500/50 hover:bg-blue-900/60 hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center flex-shrink-0 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      {cliente.tipo_cliente === 'PJ' ? <Building2 size={22} strokeWidth={2.5} /> : <User size={22} strokeWidth={2.5} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-white text-lg truncate group-hover:text-emerald-400 transition-colors">{cliente.nome}</span>
                        {cliente.tipo_cliente && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                            {cliente.tipo_cliente}
                          </span>
                        )}
                      </div>
                      {cliente.documento && (
                        <p className="text-xs font-bold text-slate-400 truncate mb-2">{cliente.documento}</p>
                      )}
                      <div className="flex flex-col gap-1.5 mt-3 text-xs font-medium text-slate-500">
                        {cliente.telefone && (
                          <span className="flex items-center gap-2">
                            <Phone size={14} className="text-emerald-500/70" />
                            <span className="truncate">{cliente.telefone}</span>
                          </span>
                        )}
                        {cliente.email && (
                          <span className="flex items-center gap-2">
                            <Mail size={14} className="text-indigo-400/70" />
                            <span className="truncate">{cliente.email}</span>
                          </span>
                        )}
                        {cliente.cidade && cliente.estado && (
                          <span className="flex items-center gap-2">
                            <MapPin size={14} className="text-amber-500/70" />
                            <span className="truncate">{cliente.cidade} / {cliente.estado}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0 self-start sm:self-center">
                      {onSelectCliente && (
                        <button
                          onClick={() => handleSelect(cliente)}
                          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-all active:scale-95 shadow-[0_0_10px_rgba(37,99,235,0.3)] border border-blue-500/50"
                        >
                          Selecionar
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="p-2 bg-blue-900/80 text-amber-400 hover:text-amber-300 hover:bg-blue-800 rounded-xl transition-all active:scale-95 border border-blue-800"
                          title="Editar"
                        >
                          <Edit size={16} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => cliente.id && handleDelete(cliente.id)}
                          className="p-2 bg-blue-900/80 text-rose-500 hover:text-rose-400 hover:bg-blue-800 rounded-xl transition-all active:scale-95 border border-blue-800"
                          title="Excluir"
                        >
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-blue-900 bg-blue-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-blue-900 text-slate-300 border border-blue-800 rounded-xl hover:bg-slate-800 hover:text-white transition-all font-bold text-sm shadow-sm active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

