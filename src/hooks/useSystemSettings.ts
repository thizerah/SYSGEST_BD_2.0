import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar todas as configurações
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) {
        throw error;
      }

      // Converter array em objeto para facilitar o acesso
      const settingsMap = data.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, string>);

      setSettings(settingsMap);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar configurações do sistema",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Atualizar uma configuração específica
  const updateSetting = useCallback(async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: value,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', key);

      if (error) {
        throw error;
      }

      // Atualizar estado local
      setSettings(prev => ({
        ...prev,
        [key]: value
      }));

      toast({
        title: "Sucesso",
        description: "Configuração atualizada com sucesso",
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar configuração",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  // Obter valor de uma configuração específica
  const getSetting = useCallback((key: string, defaultValue: string = '') => {
    return settings[key] || defaultValue;
  }, [settings]);

  // Carregar configurações na inicialização
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    getSetting,
    updateSetting,
    reloadSettings: loadSettings,
  };
} 