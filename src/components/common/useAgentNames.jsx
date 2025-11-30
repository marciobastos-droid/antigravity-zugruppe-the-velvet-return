import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook para obter nomes de agentes registados na app
 * Usa display_name se disponível, caso contrário full_name
 */
export function useAgentNames() {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  /**
   * Obtém o nome do agente pelo email
   * @param {string} email - Email do agente
   * @param {boolean} shortName - Se true, retorna apenas o primeiro nome
   * @returns {string} Nome do agente ou email formatado
   */
  const getAgentName = (email, shortName = false) => {
    if (!email) return '-';
    
    const user = users.find(u => u.email === email);
    if (!user) {
      // Retorna a parte antes do @ se não encontrar
      return email.split('@')[0];
    }
    
    const name = user.display_name || user.full_name;
    if (!name) return email.split('@')[0];
    
    if (shortName) {
      return name.split(' ')[0];
    }
    
    return name;
  };

  /**
   * Obtém lista de agentes para selects
   * @returns {Array} Lista de agentes com value (email) e label (nome)
   */
  const getAgentOptions = () => {
    return users.map(u => ({
      value: u.email,
      label: u.display_name || u.full_name || u.email,
      shortLabel: (u.display_name || u.full_name || u.email).split(' ')[0]
    }));
  };

  /**
   * Mapa de emails para nomes para uso rápido
   */
  const agentMap = users.reduce((acc, u) => {
    acc[u.email] = u.display_name || u.full_name || u.email.split('@')[0];
    return acc;
  }, {});

  return {
    users,
    getAgentName,
    getAgentOptions,
    agentMap
  };
}

export default useAgentNames;