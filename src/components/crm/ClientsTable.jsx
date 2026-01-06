import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, Phone, MapPin, Building2, Eye, Edit, Trash2, 
  MessageSquare, TrendingUp, Home, Clock, Euro, Bed, 
  Facebook, Globe, Users2, Megaphone, Tag, User,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from "lucide-react";
import DataTable from "../common/DataTable";
import { format } from "date-fns";
import { useAgentNames } from "@/components/common/useAgentNames";

const typeLabels = {
  client: "Cliente",
  partner: "Parceiro",
  investor: "Investidor",
  vendor: "Fornecedor",
  promoter: "Promotor",
  owner: "Proprietário",
  colega: "Colega",
  other: "Outro"
};

const typeColors = {
  client: "bg-blue-100 text-blue-800",
  partner: "bg-purple-100 text-purple-800",
  investor: "bg-green-100 text-green-800",
  vendor: "bg-orange-100 text-orange-800",
  promoter: "bg-indigo-100 text-indigo-800",
  owner: "bg-amber-100 text-amber-800",
  colega: "bg-cyan-100 text-cyan-800",
  other: "bg-slate-100 text-slate-800"
};

const statusColors = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-slate-100 text-slate-600",
  prospect: "bg-amber-100 text-amber-800"
};

const sourceIcons = {
  facebook_ads: Facebook,
  website: Globe,
  referral: Users2,
  networking: Megaphone,
  direct_contact: Tag,
  other: Tag
};

export default function ClientsTable({
  clients,
  communications = [],
  opportunities = [],
  onClientClick,
  onEdit,
  onDelete,
  onMatching,
  selectedContacts = [],
  onSelectionChange
}) {
  const { getAgentName } = useAgentNames();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Calculate paginated data
  const totalItems = clients.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedClients = useMemo(() => 
    clients.slice(startIndex, endIndex), 
    [clients, startIndex, endIndex]
  );
  
  // Reset to page 1 when clients change significantly
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const getClientCommunications = (clientId) => {
    return communications.filter(c => c.contact_id === clientId);
  };

  const getClientOpportunities = (client) => {
    const linkedIds = client.linked_opportunity_ids || [];
    return opportunities.filter(o => 
      o.profile_id === client.id || linkedIds.includes(o.id)
    );
  };

  const toggleSelectContact = (id) => {
    if (!onSelectionChange) return;
    const newSelection = selectedContacts.includes(id) 
      ? selectedContacts.filter(cid => cid !== id) 
      : [...selectedContacts, id];
    onSelectionChange(newSelection);
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    const currentPageIds = paginatedClients.map(c => c.id);
    const allCurrentPageSelected = currentPageIds.every(id => selectedSet.has(id));
    
    if (allCurrentPageSelected) {
      // Deselect all from current page
      onSelectionChange(selectedContacts.filter(id => !currentPageIds.includes(id)));
    } else {
      // Select all from current page
      const newSelection = [...selectedContacts];
      currentPageIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      onSelectionChange(newSelection);
    }
  };

  const selectedSet = useMemo(() => new Set(selectedContacts), [selectedContacts]);

  const columns = [
    ...(onSelectionChange ? [{
      key: "select",
      label: "",
      sortable: false,
      minWidth: "40px",
      alwaysVisible: true,
      headerRender: () => (
        <Checkbox
          checked={paginatedClients.length > 0 && paginatedClients.every(c => selectedSet.has(c.id))}
          onCheckedChange={toggleSelectAll}
        />
      ),
      render: (_, client) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedSet.has(client.id)}
            onCheckedChange={() => toggleSelectContact(client.id)}
          />
        </div>
      )
    }] : []),
    {
      key: "full_name",
      label: "Nome",
      minWidth: "80px",
      alwaysVisible: true,
      render: (val, client) => (
        <div>
          <div className="font-medium text-slate-900 text-xs">{val}</div>
          {client.company_name && (
            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-2.5 h-2.5" />
              {client.company_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: "contact_type",
      label: "Tipo",
      minWidth: "80px",
      render: (val) => (
        <Badge className={`${typeColors[val]} text-[10px] px-1.5 py-0`}>
          {typeLabels[val]}
        </Badge>
      )
    },
    {
      key: "status",
      label: "Estado",
      minWidth: "80px",
      render: (val) => (
        <Badge className={`${statusColors[val]} text-[10px] px-1.5 py-0`}>
          {val === 'active' ? 'Ativo' : val === 'inactive' ? 'Inativo' : 'Prospect'}
        </Badge>
      )
    },
    {
      key: "email",
      label: "Email",
      minWidth: "150px",
      render: (val) => val ? (
        <a href={`mailto:${val}`} className="text-blue-600 hover:underline flex items-center gap-1 text-xs" onClick={(e) => e.stopPropagation()}>
          <Mail className="w-3 h-3" />
          <span className="truncate max-w-[120px]">{val}</span>
        </a>
      ) : '-'
    },
    {
      key: "phone",
      label: "Telefone",
      minWidth: "110px",
      render: (val) => val ? (
        <a href={`tel:${val}`} className="text-blue-600 hover:underline flex items-center gap-1 text-xs" onClick={(e) => e.stopPropagation()}>
          <Phone className="w-3 h-3" />
          {val}
        </a>
      ) : '-'
    },
    {
      key: "city",
      label: "Cidade",
      minWidth: "100px",
      render: (val) => val ? (
        <span className="flex items-center gap-1 text-xs">
          <MapPin className="w-3 h-3 text-slate-400" />
          {val}
        </span>
      ) : '-'
    },
    {
      key: "source",
      label: "Origem",
      minWidth: "90px",
      render: (val) => {
        if (!val) return '-';
        const Icon = sourceIcons[val] || Tag;
        const labels = {
          facebook_ads: 'Facebook',
          website: 'Website',
          referral: 'Indicação',
          direct_contact: 'Direto',
          networking: 'Networking',
          other: 'Outro'
        };
        return (
          <span className="flex items-center gap-1 text-slate-600 text-xs">
            <Icon className="w-3 h-3" />
            {labels[val]}
          </span>
        );
      }
    },
    {
      key: "budget",
      label: "Orçamento",
      minWidth: "100px",
      sortValue: (row) => row.property_requirements?.budget_max || 0,
      render: (_, client) => {
        const req = client.property_requirements;
        if (!req?.budget_max) return '-';
        return (
          <span className="flex items-center gap-1 text-slate-700 text-xs">
            <Euro className="w-3 h-3" />
            {req.budget_min > 0 ? `${(req.budget_min/1000).toFixed(0)}k-` : ''}
            {(req.budget_max/1000).toFixed(0)}k
          </span>
        );
      }
    },
    {
      key: "bedrooms",
      label: "Quartos",
      minWidth: "60px",
      sortValue: (row) => row.property_requirements?.bedrooms_min || 0,
      render: (_, client) => {
        const req = client.property_requirements;
        if (!req?.bedrooms_min) return '-';
        return (
          <span className="flex items-center gap-1 text-slate-700 text-xs">
            <Bed className="w-3 h-3" />
            T{req.bedrooms_min}+
          </span>
        );
      }
    },
    {
      key: "communications_count",
      label: "Comun.",
      minWidth: "60px",
      sortValue: (row) => getClientCommunications(row.id).length,
      render: (_, client) => {
        const count = getClientCommunications(client.id).length;
        return (
          <span className="flex items-center gap-1 text-slate-600 text-xs">
            <MessageSquare className="w-3 h-3" />
            {count}
          </span>
        );
      }
    },
    {
      key: "opportunities_count",
      label: "Oport.",
      minWidth: "60px",
      sortValue: (row) => getClientOpportunities(row).length,
      render: (_, client) => {
        const count = getClientOpportunities(client).length;
        return (
          <span className={`flex items-center gap-1 text-xs ${count > 0 ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
            <TrendingUp className="w-3 h-3" />
            {count}
          </span>
        );
      }
    },
    {
      key: "last_contact_date",
      label: "Último Contacto",
      minWidth: "100px",
      sortValue: (row) => row.last_contact_date ? new Date(row.last_contact_date) : new Date(0),
      render: (val) => val ? (
        <span className="flex items-center gap-1 text-slate-600 text-xs">
          <Clock className="w-3 h-3" />
          {format(new Date(val), "dd/MM/yy")}
        </span>
      ) : '-'
    },
    {
      key: "tags",
      label: "Etiquetas",
      minWidth: "120px",
      render: (val) => {
        if (!val || val.length === 0) return '-';
        return (
          <div className="flex flex-wrap gap-0.5 max-w-[110px]">
            {val.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">
                <Tag className="w-2 h-2 mr-0.5" />
                {tag}
              </Badge>
            ))}
            {val.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                +{val.length - 2}
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      key: "assigned_agent",
      label: "Responsável",
      minWidth: "110px",
      render: (val) => val ? (
        <span className="flex items-center gap-1 text-slate-600 text-xs">
          <User className="w-3 h-3" />
          <span className="truncate max-w-[90px]">{getAgentName(val, true)}</span>
        </span>
      ) : '-'
    },
    {
      key: "created_date",
      label: "Criado",
      minWidth: "80px",
      sortValue: (row) => new Date(row.created_date),
      render: (val) => val ? <span className="text-xs">{format(new Date(val), "dd/MM/yy")}</span> : '-'
    },
    {
      key: "actions",
      label: "Ações",
      sortable: false,
      minWidth: "120px",
      alwaysVisible: true,
      render: (_, client) => (
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {client.contact_type === 'client' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-50"
              onClick={() => onMatching?.(client)}
              title="Matching"
            >
              <Home className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onClientClick?.(client)}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit?.(client)}>
            <Edit className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.(client.id, client.full_name, e);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )
    }
  ];

  const defaultVisibleColumns = [
    "full_name", "contact_type", "status", "email", "phone", 
    "city", "tags", "assigned_agent", "communications_count", "opportunities_count", "actions"
  ];

  return (
    <div className="space-y-4">
      {/* Pagination Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">
            A mostrar <strong>{startIndex + 1}</strong>-<strong>{endIndex}</strong> de <strong>{totalItems}</strong> contactos
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Por página:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="250">250</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 px-2">
              Página <strong>{currentPage}</strong> de <strong>{totalPages || 1}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <DataTable
        data={paginatedClients}
        columns={columns}
        defaultVisibleColumns={defaultVisibleColumns}
        defaultSortColumn="created_date"
        defaultSortDirection="desc"
        onRowClick={onClientClick}
        emptyMessage="Nenhum contacto encontrado"
      />

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          {/* Page Numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }
            
            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}