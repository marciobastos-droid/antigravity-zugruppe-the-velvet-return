import React from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Users, X } from "lucide-react";
import { toast } from "sonner";

const fieldLabels = {
  full_name: "Nome Completo",
  email: "Email",
  phone: "Telefone",
  company: "Empresa",
  position: "Cargo",
  contact_type: "Tipo de Contacto",
  notes: "Notas",
  address: "Morada",
  city: "Cidade",
  country: "País",
  tags: "Etiquetas"
};

export default function ImportContactsDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [file, setFile] = React.useState(null);
  const [fileType, setFileType] = React.useState(null);
  const [importing, setImporting] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [results, setResults] = React.useState(null);
  
  // Preview state
  const [previewData, setPreviewData] = React.useState([]);
  const [columnMapping, setColumnMapping] = React.useState({});
  const [headers, setHeaders] = React.useState([]);
  const [selectedRows, setSelectedRows] = React.useState([]);
  const [showPreview, setShowPreview] = React.useState(false);

  const resetState = () => {
    setFile(null);
    setFileType(null);
    setPreviewData([]);
    setColumnMapping({});
    setHeaders([]);
    setSelectedRows([]);
    setShowPreview(false);
    setResults(null);
    setProgress("");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // Parse CSV
  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    let delimiter = ',';
    if (lines[0].includes(';')) delimiter = ';';
    else if (lines[0].includes('\t')) delimiter = '\t';

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      return row;
    });
    
    return { headers, rows };
  };

  // Parse VCF (vCard)
  const parseVCF = (text) => {
    const contacts = [];
    const vcards = text.split('END:VCARD').filter(v => v.includes('BEGIN:VCARD'));
    
    vcards.forEach(vcard => {
      const contact = {};
      const lines = vcard.split('\n').map(l => l.trim());
      
      lines.forEach(line => {
        if (line.startsWith('FN:') || line.startsWith('FN;')) {
          contact.full_name = line.split(':').slice(1).join(':').trim();
        } else if (line.startsWith('N:') || line.startsWith('N;')) {
          const nameParts = line.split(':').slice(1).join(':').split(';');
          if (!contact.full_name && nameParts.length >= 2) {
            contact.full_name = `${nameParts[1]} ${nameParts[0]}`.trim();
          }
        } else if (line.startsWith('EMAIL') || line.startsWith('EMAIL;')) {
          const email = line.split(':').slice(1).join(':').trim();
          if (email && !contact.email) contact.email = email;
        } else if (line.startsWith('TEL') || line.startsWith('TEL;')) {
          const phone = line.split(':').slice(1).join(':').trim();
          if (phone && !contact.phone) contact.phone = phone;
        } else if (line.startsWith('ORG') || line.startsWith('ORG;')) {
          contact.company = line.split(':').slice(1).join(':').replace(/;/g, ' ').trim();
        } else if (line.startsWith('TITLE') || line.startsWith('TITLE;')) {
          contact.position = line.split(':').slice(1).join(':').trim();
        } else if (line.startsWith('ADR') || line.startsWith('ADR;')) {
          const addrParts = line.split(':').slice(1).join(':').split(';');
          if (addrParts[2]) contact.address = addrParts[2].trim();
          if (addrParts[3]) contact.city = addrParts[3].trim();
          if (addrParts[6]) contact.country = addrParts[6].trim();
        } else if (line.startsWith('NOTE') || line.startsWith('NOTE;')) {
          contact.notes = line.split(':').slice(1).join(':').trim();
        }
      });
      
      if (contact.full_name || contact.email) {
        contacts.push(contact);
      }
    });
    
    return contacts;
  };

  // Parse XML
  const parseXML = (text) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const contacts = [];
    
    // Try different common XML structures
    const contactNodes = xmlDoc.querySelectorAll('contact, Contact, person, Person, entry, Entry, record, Record');
    
    if (contactNodes.length === 0) {
      // Try to find any elements with contact-like children
      const allElements = xmlDoc.querySelectorAll('*');
      allElements.forEach(el => {
        const hasName = el.querySelector('name, Name, full_name, fullName, FullName');
        const hasEmail = el.querySelector('email, Email, e-mail');
        if (hasName || hasEmail) {
          contactNodes.push ? null : contacts.push(extractContactFromXML(el));
        }
      });
    }
    
    contactNodes.forEach(node => {
      contacts.push(extractContactFromXML(node));
    });
    
    return contacts.filter(c => c.full_name || c.email);
  };

  const extractContactFromXML = (node) => {
    const getText = (selectors) => {
      for (const sel of selectors) {
        const el = node.querySelector(sel);
        if (el && el.textContent) return el.textContent.trim();
      }
      return '';
    };
    
    return {
      full_name: getText(['name', 'Name', 'full_name', 'fullName', 'FullName', 'nome', 'Nome']),
      email: getText(['email', 'Email', 'e-mail', 'E-mail', 'mail', 'Mail']),
      phone: getText(['phone', 'Phone', 'telephone', 'Telephone', 'tel', 'Tel', 'telefone', 'Telefone', 'mobile', 'Mobile']),
      company: getText(['company', 'Company', 'organization', 'Organization', 'org', 'Org', 'empresa', 'Empresa']),
      position: getText(['position', 'Position', 'title', 'Title', 'job', 'Job', 'cargo', 'Cargo']),
      address: getText(['address', 'Address', 'street', 'Street', 'morada', 'Morada']),
      city: getText(['city', 'City', 'cidade', 'Cidade']),
      country: getText(['country', 'Country', 'pais', 'Pais', 'país', 'País']),
      notes: getText(['notes', 'Notes', 'note', 'Note', 'notas', 'Notas', 'comment', 'Comment'])
    };
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResults(null);
    
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    setFileType(extension);

    try {
      const text = await selectedFile.text();
      
      if (extension === 'csv') {
        const { headers: csvHeaders, rows } = parseCSV(text);
        setHeaders(csvHeaders);
        setPreviewData(rows);
        
        // Auto-map columns
        const autoMapping = {};
        const commonMappings = {
          full_name: ['nome', 'name', 'full_name', 'fullname', 'nome completo'],
          email: ['email', 'e-mail', 'mail', 'correio'],
          phone: ['telefone', 'phone', 'tel', 'mobile', 'celular', 'telemóvel'],
          company: ['empresa', 'company', 'org', 'organization', 'organização'],
          position: ['cargo', 'position', 'title', 'função', 'job'],
          notes: ['notas', 'notes', 'observações', 'comments'],
          address: ['morada', 'address', 'endereço'],
          city: ['cidade', 'city'],
          country: ['país', 'country', 'pais'],
          tags: ['tags', 'etiquetas', 'labels', 'categorias', 'categoria']
        };
        
        csvHeaders.forEach(header => {
          const lowerHeader = header.toLowerCase();
          for (const [field, variants] of Object.entries(commonMappings)) {
            if (variants.some(v => lowerHeader.includes(v))) {
              autoMapping[header] = field;
              break;
            }
          }
        });
        
        setColumnMapping(autoMapping);
        setSelectedRows(rows.map((_, idx) => idx));
        setShowPreview(true);
        
      } else if (extension === 'vcf') {
        const contacts = parseVCF(text);
        setPreviewData(contacts);
        setSelectedRows(contacts.map((_, idx) => idx));
        setShowPreview(true);
        
      } else if (extension === 'xml') {
        const contacts = parseXML(text);
        setPreviewData(contacts);
        setSelectedRows(contacts.map((_, idx) => idx));
        setShowPreview(true);
        
      } else {
        toast.error("Formato não suportado. Use CSV, VCF ou XML.");
        return;
      }
      
      toast.success(`Ficheiro carregado: ${previewData.length || 'a processar'} contactos`);
      
    } catch (error) {
      console.error("Error parsing file:", error);
      toast.error("Erro ao ler ficheiro");
    }
  };

  const processCSVData = () => {
    const selectedData = previewData.filter((_, idx) => selectedRows.includes(idx));
    
    return selectedData.map(row => {
      const contact = {};
      Object.entries(columnMapping).forEach(([csvCol, contactField]) => {
        if (contactField && row[csvCol]) {
          contact[contactField] = row[csvCol];
        }
      });
      return contact;
    }).filter(c => c.full_name || c.email);
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress("A processar contactos...");

    try {
      let contactsToImport = [];
      
      if (fileType === 'csv') {
        contactsToImport = processCSVData();
      } else {
        contactsToImport = previewData.filter((_, idx) => selectedRows.includes(idx));
      }

      if (contactsToImport.length === 0) {
        throw new Error("Nenhum contacto válido para importar");
      }

      setProgress(`A verificar duplicados...`);

      // Check for duplicates
      const existingContacts = await base44.entities.ClientContact.list();
      const existingEmails = new Set(existingContacts.map(c => c.email?.toLowerCase()).filter(Boolean));
      
      const newContacts = contactsToImport.filter(c => {
        if (!c.email) return true; // Import contacts without email
        return !existingEmails.has(c.email.toLowerCase());
      });

      const duplicates = contactsToImport.length - newContacts.length;

      if (newContacts.length === 0) {
        setResults({
          success: false,
          message: `Todos os ${contactsToImport.length} contactos já existem na base de dados.`
        });
        setImporting(false);
        return;
      }

      setProgress(`A importar ${newContacts.length} contactos...`);

      // Add default values and process tags
      const contactsWithDefaults = newContacts.map(c => {
        let tags = [];
        if (c.tags) {
          // Parse tags - can be comma or semicolon separated
          tags = c.tags.split(/[,;]/).map(t => t.trim()).filter(Boolean);
        }
        return {
          ...c,
          tags,
          contact_type: c.contact_type || 'client',
          status: 'active'
        };
      });

      const created = await base44.entities.ClientContact.bulkCreate(contactsWithDefaults);

      setResults({
        success: true,
        count: created.length,
        duplicates,
        message: `✅ ${created.length} contactos importados!${duplicates > 0 ? `\n⚠️ ${duplicates} duplicados ignorados` : ''}`
      });

      queryClient.invalidateQueries({ queryKey: ['clientContacts'] });
      toast.success(`${created.length} contactos importados!`);

    } catch (error) {
      console.error("Import error:", error);
      setResults({ success: false, message: error.message || "Erro ao importar" });
      toast.error("Erro na importação");
    }

    setImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Importar Contactos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          {!showPreview ? (
            <>
              {/* File Upload */}
              <Card>
                <CardContent className="p-6">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
                    <input
                      type="file"
                      accept=".csv,.vcf,.xml"
                      onChange={handleFileChange}
                      className="hidden"
                      id="contact-file-upload"
                    />
                    <label htmlFor="contact-file-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-700 font-medium mb-1">
                        Clique para carregar ficheiro
                      </p>
                      <p className="text-sm text-slate-500">CSV, VCF (vCard) ou XML</p>
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="font-medium text-blue-900 text-sm">CSV</p>
                      <p className="text-xs text-blue-700">Excel, Google Sheets</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="font-medium text-green-900 text-sm">VCF</p>
                      <p className="text-xs text-green-700">iPhone, Android, Outlook</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="font-medium text-purple-900 text-sm">XML</p>
                      <p className="text-xs text-purple-700">CRMs, Sistemas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* CSV Column Mapping */}
              {fileType === 'csv' && headers.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium text-slate-900 mb-3">Mapeamento de Colunas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {headers.map((header) => (
                        <div key={header}>
                          <Label className="text-xs mb-1 block truncate" title={header}>{header}</Label>
                          <Select
                            value={columnMapping[header] || "_ignore"}
                            onValueChange={(value) => {
                              const newMapping = { ...columnMapping };
                              if (value === '_ignore') {
                                delete newMapping[header];
                              } else {
                                newMapping[header] = value;
                              }
                              setColumnMapping(newMapping);
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Ignorar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_ignore">Ignorar</SelectItem>
                              {Object.entries(fieldLabels).map(([field, label]) => (
                                <SelectItem key={field} value={field}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preview Table */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-slate-900">
                      Pré-visualização ({selectedRows.length} de {previewData.length} selecionados)
                    </h3>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedRows(previewData.map((_, i) => i))}
                      >
                        Selecionar Todos
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedRows([])}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedRows.length === previewData.length}
                              onCheckedChange={(checked) => {
                                setSelectedRows(checked ? previewData.map((_, i) => i) : []);
                              }}
                            />
                          </TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Empresa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 20).map((contact, idx) => {
                          // For CSV, we need to map the data
                          const mappedContact = fileType === 'csv' ? (() => {
                            const c = {};
                            Object.entries(columnMapping).forEach(([csvCol, field]) => {
                              if (field) c[field] = contact[csvCol];
                            });
                            return c;
                          })() : contact;

                          return (
                            <TableRow key={idx}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedRows.includes(idx)}
                                  onCheckedChange={(checked) => {
                                    setSelectedRows(checked
                                      ? [...selectedRows, idx]
                                      : selectedRows.filter(i => i !== idx)
                                    );
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {mappedContact.full_name || '-'}
                              </TableCell>
                              <TableCell>{mappedContact.email || '-'}</TableCell>
                              <TableCell>{mappedContact.phone || '-'}</TableCell>
                              <TableCell>{mappedContact.company || '-'}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {previewData.length > 20 && (
                      <p className="text-xs text-slate-500 mt-2 text-center">
                        A mostrar 20 de {previewData.length} contactos
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Results */}
          {results && (
            <Card className={results.success ? "border-green-500" : "border-red-500"}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {results.success ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <h3 className={`font-semibold ${results.success ? "text-green-900" : "text-red-900"}`}>
                      {results.success ? "Sucesso!" : "Erro"}
                    </h3>
                    <p className="text-slate-700 whitespace-pre-line">{results.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            {results?.success ? "Fechar" : "Cancelar"}
          </Button>
          {showPreview && !results?.success && (
            <Button
              onClick={handleImport}
              disabled={importing || selectedRows.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {progress}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Importar {selectedRows.length} Contactos
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}