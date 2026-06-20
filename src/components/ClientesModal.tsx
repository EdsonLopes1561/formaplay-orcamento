import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Search, User, Building2, Mail, Phone, MapPin } from 'lucide-react';
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
    tipo_cliente: '',
    observacoes: '',
  });

  const loadClientes = async () => {
    console.log('Buscando clientes no Supabase...');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (error) {
        console.error('Erro ao carregar clientes:', error);
        alert('Erro ao carregar clientes: ' + error.message);
      } else if (data) {
        console.log(`Clientes retornados: ${data.length}`);
        console.log('Nomes dos clientes:', data.map((c: any) => c.nome));
        setClientes(data as Cliente[]);
      } else {
        console.log('Nenhum cliente retornado do Supabase');
        setClientes([]);
      }
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
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.documento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telefone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async () => {
    if (!formData.nome?.trim()) {
      alert('Nome do cliente é obrigatório');
      return;
    }

    setLoading(true);
    try {
      if (editingCliente?.id) {
        console.log('Atualizando cliente:', editingCliente.id, formData);
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
        console.log('Cliente atualizado com sucesso');
      } else {
        console.log('Salvando novo cliente:', formData);
        const { error, data } = await supabase.from('clientes').insert(formData).select();
        if (error) {
          console.error('Erro ao salvar cliente:', error);
          alert('Erro ao salvar cliente: ' + error.message);
          setLoading(false);
          return;
        }
        console.log('Cliente salvo com sucesso:', data);
      }
      console.log('Recarregando lista de clientes...');
      await loadClientes();
      console.log('Lista de clientes recarregada');
      setShowForm(false);
      setEditingCliente(null);
      setFormData({
        nome: '',
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
        tipo_cliente: '',
        observacoes: '',
      });
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

    console.log('Inativando cliente:', id);
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
      console.log('Cliente inativado com sucesso');
      console.log('Recarregando lista de clientes...');
      await loadClientes();
      console.log('Lista de clientes recarregada');
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

  if (showForm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-t-4 border-green-500">
          <div className="flex items-center justify-between p-6 border-b-2 border-gray-100 bg-gradient-to-r from-blue-50 to-transparent">
            <h2 className="text-2xl font-black text-gray-900">
              {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingCliente(null);
                setFormData({
                  nome: '',
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
                  tipo_cliente: '',
                  observacoes: '',
                });
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome / Razão Social *</label>
                <input
                  type="text"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">CPF / CNPJ</label>
                <input
                  type="text"
                  value={formData.documento || ''}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Inscrição Estadual</label>
                <input
                  type="text"
                  value={formData.inscricao_estadual || ''}
                  onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={formData.telefone || ''}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">CEP</label>
                <input
                  type="text"
                  value={formData.cep || ''}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de Cliente</label>
                <select
                  value={formData.tipo_cliente || ''}
                  onChange={(e) => setFormData({ ...formData, tipo_cliente: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  <option value="PF">Pessoa Física</option>
                  <option value="PJ">Pessoa Jurídica</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Endereço</label>
                <input
                  type="text"
                  value={formData.endereco || ''}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Número</label>
                <input
                  type="text"
                  value={formData.numero || ''}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Bairro</label>
                <input
                  type="text"
                  value={formData.bairro || ''}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={formData.cidade || ''}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Estado</label>
                <input
                  type="text"
                  value={formData.estado || ''}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Complemento</label>
                <input
                  type="text"
                  value={formData.complemento || ''}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Observações Internas</label>
                <textarea
                  value={formData.observacoes || ''}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t-2 border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                setEditingCliente(null);
                setFormData({
                  nome: '',
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
                  tipo_cliente: '',
                  observacoes: '',
                });
              }}
              className="px-6 py-2.5 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition-all font-bold text-sm shadow-md active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold text-sm shadow-md active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border-t-4 border-green-500">
        <div className="flex items-center justify-between p-6 border-b-2 border-gray-100 bg-gradient-to-r from-blue-50 to-transparent">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Cadastro de Clientes</h2>
            <p className="text-sm text-gray-500 mt-0.5">{clientes.length} cliente(s) cadastrado(s)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 border-b-2 border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, documento, cidade ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold text-sm shadow-md active:scale-95 flex items-center gap-2"
            >
              <Plus size={18} />
              Novo Cliente
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <User size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-bold">Nenhum cliente encontrado</p>
              <p className="text-sm">Cadastre um novo cliente para começar</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredClientes.map((cliente) => (
                <div
                  key={cliente.id}
                  className="p-4 rounded-lg bg-white border-l-4 border-green-500 shadow-sm hover:shadow-md hover:border-blue-600 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 text-white">
                      {cliente.tipo_cliente === 'PJ' ? <Building2 size={20} /> : <User size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-green-700 text-base truncate">{cliente.nome}</span>
                        {cliente.tipo_cliente && (
                          <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            {cliente.tipo_cliente}
                          </span>
                        )}
                      </div>
                      {cliente.documento && (
                        <p className="text-sm text-gray-600 truncate">{cliente.documento}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        {cliente.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {cliente.telefone}
                          </span>
                        )}
                        {cliente.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {cliente.email}
                          </span>
                        )}
                        {cliente.cidade && cliente.estado && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {cliente.cidade}/{cliente.estado}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {onSelectCliente && (
                        <button
                          onClick={() => handleSelect(cliente)}
                          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-sm"
                        >
                          Selecionar
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(cliente)}
                        className="px-3 py-1.5 bg-yellow-600 text-white text-xs font-bold rounded-lg hover:bg-yellow-700 transition-all active:scale-95 shadow-sm"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => cliente.id && handleDelete(cliente.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all active:scale-95 shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t-2 border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition-all font-bold text-sm shadow-md active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
