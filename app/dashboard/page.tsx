'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Equipment } from '@/lib/types';
import { Plus, Search } from 'lucide-react';

export default function DashboardPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [filteredEquipments, setFilteredEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Check if admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        setIsAdmin(profile?.role === 'admin');

        // Load equipments
        const { data } = await supabase
          .from('equipments')
          .select('*')
          .order('created_at', { ascending: false });

        setEquipments(data || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  // Filter equipments
  useEffect(() => {
    let filtered = equipments;

    if (searchTerm) {
      filtered = filtered.filter(
        (eq) =>
          eq.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          eq.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
          eq.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          eq.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((eq) => eq.status === statusFilter);
    }

    setFilteredEquipments(filtered);
  }, [equipments, searchTerm, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'in_maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Operativo';
      case 'in_maintenance':
        return 'En Mantención';
      case 'out_of_service':
        return 'Fuera de Servicio';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Equipos</h1>
          <p className="text-slate-600 mt-1">Total: {filteredEquipments.length} equipos</p>
        </div>
        {isAdmin && (
          <Link href="/dashboard/equipments/new">
            <Button className="w-full sm:w-auto gap-2">
              <Plus className="w-4 h-4" />
              Nuevo Equipo
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Tipo, marca, serie, ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="operational">Operativo</option>
              <option value="in_maintenance">En Mantención</option>
              <option value="out_of_service">Fuera de Servicio</option>
            </select>
          </div>
        </div>
      </div>

      {/* Equipment cards */}
      {loading ? (
        <div className="flex justify-center py-12">Cargando...</div>
      ) : filteredEquipments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No se encontraron equipos
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEquipments.map((equipment) => (
            <Link key={equipment.id} href={`/dashboard/equipments/${equipment.id}`}>
              <Card className="cursor-pointer hover:shadow-lg transition">
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{equipment.type}</CardTitle>
                      <CardDescription>{equipment.brand} {equipment.model}</CardDescription>
                    </div>
                    <Badge variant="outline" className={getStatusColor(equipment.status)}>
                      {getStatusLabel(equipment.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <p className="text-slate-500">Serie</p>
                    <p className="font-mono text-slate-900">{equipment.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Ubicación</p>
                    <p className="text-slate-900">{equipment.location}</p>
                  </div>
                  {equipment.last_maintenance_date && (
                    <div>
                      <p className="text-slate-500">Última mantención</p>
                      <p className="text-slate-900">
                        {new Date(equipment.last_maintenance_date).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
