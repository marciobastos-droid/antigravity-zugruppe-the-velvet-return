import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Mail, Phone, MapPin, Building2, Eye, Edit, Trash2, 
  MessageSquare, TrendingUp, Home, Clock, Euro, Bed, 
  Facebook, Globe, Users2, Megaphone, Tag, User
} from "lucide-react";
import DataTable from "../common/DataTable";
import { format } from "date-fns";

const typeLabels = {
  client: "Cliente",
  partner: "Parceiro",
  investor: "Investidor",
  vendor: "Fornecedor",
  other: "Outro"
};

const typeColors = {
  client: "bg-blue-100 text-blue-800",
  partner: "bg-purple-100 text-purple-800",
  investor: "bg-green-100 text-green-800",
  vendor: "bg-orange-100 text-orange-800",
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
    const newSelection = selectedContacts.length === clients.length ? [] : clients.map(c => c.id);
    onSelectionChange(newSelection);
  };

  const columns = [
    ...(onSelectionChange ? [{
      key: "select",
      label: "",
      sortable: false,
      minWidth: "40px",
      alwaysVisible: true,
      headerRender: () => (
        <Checkbox
          checked={selectedContacts.length === clients.length && clients.length > 0}
          onCheckedChange={toggleSelectAll}
        />
      ),
      render: (_, client) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedContacts.includes(client.id)}
            onCheckedChange={() => toggleSelectContact(client.id)}
          />
        </div>
      )
    }] : []),
    {
      key: "full_name",
      label: "Nome",
      minWidth: "200px",
      alwaysVisible: true,
      render: (val, client) => (
        <div>
          <div className="font-medium text-slate-900">{val}</div>
          {client.company_name && (
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" />
              {client.company_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: "contact_type",
      label: "Tipo",
      minWidth: "100px",
      render: (val) => (
        <Badge className={typeColors[val]}>
          {typeLabels[val]}
        </Badge>
      )
    },
    {
      key: "status",
      label: "Estado",
      minWidth: "100px",
      render: (val) => (
        <Badge className={statusColors[val]}>
          {val === 'active' ? 'Ativo' : val === 'inactive' ? 'Inativo' : 'Prospect'}
        </Badge>
      )
    },
    {
      key: "email",
      label: "Email",
      minWidth: "180px",
      render: (val) => val ? (
        <a href={`mailto:${val}`} className="text-blue-600 hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Mail className="w-3.5 h-3.5" />
          <span className="truncate max-w-[150px]">{val}</span>
        </a>
      ) : '-'
    },
    {
      key: "phone",
      label: "Telefone",
      minWidth: "130px",
      render: (val) => val ? (
        <a href={`tel:${val}`} className="text-blue-600 hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Phone className="w-3.5 h-3.5" />
          {val}
        </a>
      ) : '-'
    },
    {
      key: "city",
      label: "Cidade",
      minWidth: "120px",
      render: (val) => val ? (
        <span className="flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-400" />
          {val}
        </span>
      ) : '-'
    },
    {
      key: "source",
      label: "Origem",
      minWidth: "100px",
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
          <span className="flex items-center gap-1 text-slate-600">
            <Icon className="w-3.5 h-3.5" />
            {labels[val]}
          </span>
        );
      }
    },
    {
      key: "budget",
      label: "Orçamento",
      minWidth: "120px",
      sortValue: (row) => row.property_requirements?.budget_max || 0,
      render: (_, client) => {
        const req = client.property_requirements;
        if (!req?.budget_max) return '-';
        return (
          <span className="flex items-center gap-1 text-slate-700">
            <Euro className="w-3.5 h-3.5" />
            {req.budget_min > 0 ? `${(req.budget_min/1000).toFixed(0)}k-` : ''}
            {(req.budget_max/1000).toFixed(0)}k
          </span>
        );
      }
    },
    {
      key: "bedrooms",
      label: "Quartos",
      minWidth: "80px",
      sortValue: (row) => row.property_requirements?.bedrooms_min || 0,
      render: (_, client) => {
        const req = client.property_requirements;
        if (!req?.bedrooms_min) return '-';
        return (
          <span className="flex items-center gap-1 text-slate-700">
            <Bed className="w-3.5 h-3.5" />
            T{req.bedrooms_min}+
          </span>
        );
      }
    },
    {
      key: "communications_count",
      label: "Comun.",
      minWidth: "80px",
      sortValue: (row) => getClientCommunications(row.id).length,
      render: (_, client) => {
        const count = getClientCommunications(client.id).length;
        return (
          <span className="flex items-center gap-1 text-slate-600">
            <MessageSquare className="w-3.5 h-3.5" />
            {count}
          </span>
        );
      }
    },
    {
      key: "opportunities_count",
      label: "Oport.",
      minWidth: "80px",
      sortValue: (row) => getClientOpportunities(row).length,
      render: (_, client) => {
        const count = getClientOpportunities(client).length;
        return (
          <span className={`flex items-center gap-1 ${count > 0 ? 'text-green-600 font-medium' : 'text-slate-500'}`}>
            <TrendingUp className="w-3.5 h-3.5" />
            {count}
          </span>
        );
      }
    },
    {
      key: "last_contact_date",
      label: "Último Contacto",
      minWidth: "120px",
      sortValue: (row) => row.last_contact_date ? new Date(row.last_contact_date) : new Date(0),
      render: (val) => val ? (
        <span className="flex items-center gap-1 text-slate-600">
          <Clock className="w-3.5 h-3.5" />
          {format(new Date(val), "dd/MM/yy")}
        </span>
      ) : '-'
    },
    {
      key: "assigned_agent",
      label: "Responsável",
      minWidth: "140px",
      render: (val) => val ? (
        <span className="flex items-center gap-1 text-slate-600">
          <User className="w-3.5 h-3.5" />
          <span className="truncate max-w-[120px]">{val.split('@')[0]}</span>
        </span>
      ) : '-'
    },
    {
      key: "created_date",
      label: "Criado",
      minWidth: "100px",
      sortValue: (row) => new Date(row.created_date),
      render: (val) => val ? format(new Date(val), "dd/MM/yy") : '-'
    },
    {
      key: "actions",
      label: "Ações",
      sortable: false,
      minWidth: "150px",
      alwaysVisible: true,
      render: (_, client) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {client.contact_type === 'client' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50"
              onClick={() => onMatching?.(client)}
              title="Matching"
            >
              <Home className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onClientClick?.(client)}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit?.(client)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete?.(client.id, client.full_name, e);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  const defaultVisibleColumns = [
    "full_name", "contact_type", "status", "email", "phone", 
    "city", "assigned_agent", "communications_count", "opportunities_count", "actions"
  ];

  return (
    <DataTable
      data={clients}
      columns={columns}
      defaultVisibleColumns={defaultVisibleColumns}
      defaultSortColumn="created_date"
      defaultSortDirection="desc"
      onRowClick={onClientClick}
      emptyMessage="Nenhum contacto encontrado"
    />
  );
}