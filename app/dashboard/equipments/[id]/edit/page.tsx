'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trash2 } from 'lucide-react';

export default function EditEquipmentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    type: '',
    brand: '',
    model: '',
    serial_number: '',
    location: '',
    status: 'operational',
    last_maintenance_date: '',
  });

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);

      const { data: equipment, error: fetchError } = await supabase
        .from('equipments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !equipment) {
        setError('Equipo no encontrado');
      } else {
        setFormData({
          type: equipment.type,
          brand: equipment.brand,
          model: equipment.model,
          serial_number: equipment.serial_number,
          location: equipment.location,
          status: equipment.status,
          last_maintenance_date: equipment.last_maintenance_date || '',
        });
      }

      setChecking(false);
    }

    loadData();
  }, [id, router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('equipments')
        .update({
          ...formData,
          last_maintenance_date: formData.last_maintenance_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
      } else {
        router.push(`/dashboard/equipments/${id}`);
      }
    } catch (err) {
      setError('Error al actualizar el equipo');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este equipo? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const { error: deleteError } = await supabase
        .from('equipments')
        .delete()
        .eq('id', id);

      if (deleteError) {
        setError(deleteError.message);
        setDeleting(false);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Error al eliminar el equipo');
      setDeleting(false);
    }
  }

  if (checking || !isAdmin) {
    return <div className="text-slate-600">Cargando...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Editar Equipo</h1>
          <p className="text-slate-600">Actualiza la información del equipo</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Equipo</CardTitle>
          <CardDescription>Modifica los campos que necesites actualizar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Equipo *</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Marca *</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="serial">Número de Serie *</Label>
                <Input
                  id="serial"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="location">Ubicación / Lugar *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-slate-900"
                >
                  <option value="operational">Operativo</option>
                  <option value="in_maintenance">En Mantención</option>
                  <option value="out_of_service">Fuera de Servicio</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance">Última Mantención</Label>
                <Input
                  id="maintenance"
                  type="date"
                  value={formData.last_maintenance_date}
                  onChange={(e) => setFormData({ ...formData, last_maintenance_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
            </div>

            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Eliminando...' : 'Eliminar Equipo'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
