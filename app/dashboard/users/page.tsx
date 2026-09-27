'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { Edit, Eye, EyeOff, KeyRound, Phone, Plus, RotateCcw, Trash } from 'lucide-react';

type UserRole = 'admin' | 'technician';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

interface FormState {
  id: string;
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone: string;
}

const EMPTY_FORM: FormState = {
  id: '',
  email: '',
  password: '',
  full_name: '',
  role: 'technician',
  phone: '',
};

const roleLabel = (role: UserRole) => (role === 'admin' ? 'Administrador' : 'Técnico');

export default function UsersPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingDeactivate, setPendingDeactivate] = useState<UserRow | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/users');

        if (res.status === 401) {
          router.push('/login');
          return;
        }

        if (res.status === 403) {
          router.push('/dashboard');
          return;
        }

        if (res.ok) {
          const payload = (await res.json()) as { users?: UserRow[] };
          setIsAdmin(true);
          setUsers(payload.users ?? []);
        }
      } catch {
        setError('Error de conexión al cargar los usuarios');
      } finally {
        setAuthChecked(true);
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  function openCreateForm() {
    setFormData(EMPTY_FORM);
    setError('');
    setShowForm(true);
  }

  function openEditForm(user: UserRow, focusPassword = false) {
    setFormData({
      id: user.id,
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
      phone: user.phone ?? '',
    });
    setError('');
    setShowPassword(false);
    setShowForm(true);

    if (focusPassword) {
      requestAnimationFrame(() => {
        document.getElementById('password')?.focus();
      });
    }
  }

  async function reload() {
    const res = await fetch('/api/users');
    if (!res.ok) return;
    const payload = (await res.json()) as { users?: UserRow[] };
    setUsers(payload.users ?? []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const isEdit = Boolean(formData.id);
    const changesPassword = isEdit && formData.password.length > 0;

    try {
      const response = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Error al guardar el usuario');
        return;
      }

      setShowForm(false);
      setFormData(EMPTY_FORM);
      setShowPassword(false);
      await reload();

      toast({
        title: changesPassword
          ? 'Contraseña actualizada'
          : isEdit
            ? 'Usuario actualizado'
            : 'Usuario creado',
        description: changesPassword
          ? `La contraseña de ${formData.full_name} fue cambiada`
          : isEdit
            ? 'Los datos del usuario fueron actualizados'
            : 'El usuario fue agregado exitosamente',
        variant: 'success',
      });
    } catch {
      setError('Error de conexión al guardar el usuario');
    } finally {
      setSubmitting(false);
    }
  }

  async function setUserActive(user: UserRow, isActive: boolean) {
    setSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, is_active: isActive }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast({
          title: 'Error',
          description: data.error ?? 'No se pudo actualizar el estado',
          variant: 'destructive',
        });
        return;
      }

      setPendingDeactivate(null);
      await reload();
      toast({
        title: isActive ? 'Usuario reactivado' : 'Usuario desactivado',
        description: isActive
          ? `${user.full_name} vuelve a tener acceso`
          : `${user.full_name} ya no puede iniciar sesión`,
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del usuario',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) return <div>Cargando...</div>;
  if (!isAdmin) return <div>Acceso denegado</div>;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
            <p className="text-slate-600 mt-1">Total: {users.length} usuarios</p>
          </div>
          <Button onClick={showForm ? () => setShowForm(false) : openCreateForm} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">{error}</div>
        )}

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {formData.id ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={Boolean(formData.id)}
                      required
                    />
                    {formData.id && (
                      <p className="text-xs text-slate-500">
                        El email no se puede modificar.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nombre Completo *</Label>
                    <Input
                      id="full_name"
                      placeholder="Nombre del usuario"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+56 9 1234 5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol *</Label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as UserRole })
                      }
                      className="w-full px-3 py-2 rounded-md border border-slate-200"
                    >
                      <option value="technician">Técnico</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="password">
                      {formData.id ? 'Nueva Contraseña' : 'Contraseña *'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={
                          formData.id
                            ? 'Dejar vacío para no cambiarla'
                            : 'Mínimo 8 caracteres'
                        }
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        minLength={8}
                        required={!formData.id}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 cursor-pointer"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {formData.id && (
                      <p className="text-xs text-slate-500">
                        Mínimo 8 caracteres. Déjala vacía para conservar la contraseña actual.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting
                      ? 'Guardando...'
                      : formData.id
                        ? 'Actualizar Usuario'
                        : 'Crear Usuario'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setError('');
                      setFormData(EMPTY_FORM);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div>Cargando...</div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              {users.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No hay usuarios registrados</p>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg truncate">{user.full_name}</p>
                          {!user.is_active && (
                            <Badge variant="secondary" className="bg-slate-200 text-slate-600">
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{roleLabel(user.role)}</p>
                        {user.phone && (
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="cursor-pointer"
                              aria-label="Ver detalle"
                            >
                              <Eye className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium mb-1">Información del usuario</p>
                            <p>Email: {user.email}</p>
                            <p>Rol: {roleLabel(user.role)}</p>
                            <p>Teléfono: {user.phone || 'No registrado'}</p>
                            <p>Alta: {new Date(user.created_at).toLocaleDateString('es-CL')}</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => openEditForm(user)}
                              className="cursor-pointer"
                              aria-label="Editar usuario"
                            >
                              <Edit className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Editar usuario</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => openEditForm(user, true)}
                              className="cursor-pointer"
                              aria-label="Cambiar contraseña"
                            >
                              <KeyRound className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Cambiar contraseña</TooltipContent>
                        </Tooltip>

                        {user.is_active ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setPendingDeactivate(user)}
                                className="cursor-pointer"
                                aria-label="Desactivar usuario"
                              >
                                <Trash className="w-5 h-5 text-slate-400 hover:text-red-600 transition-colors" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Desactivar usuario — no podrá iniciar sesión, sus datos se conservan
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setUserActive(user, true)}
                                className="cursor-pointer"
                                aria-label="Reactivar usuario"
                              >
                                <RotateCcw className="w-5 h-5 text-slate-400 hover:text-emerald-600 transition-colors" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Reactivar usuario</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {pendingDeactivate && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
            <div className="bg-white rounded-lg p-8 max-w-sm w-full border border-slate-200">
              <h3 className="font-bold text-lg mb-4">Desactivar usuario</h3>
              <p className="text-slate-600 mb-6">
                ¿Estás seguro que quieres desactivar a{' '}
                <strong>{pendingDeactivate.full_name}</strong>? No podrá iniciar sesión, pero sus
                datos se conservan.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setPendingDeactivate(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setUserActive(pendingDeactivate, false)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Desactivar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
