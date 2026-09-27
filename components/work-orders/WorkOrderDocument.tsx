'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { OtDocument, OtField } from '@/lib/ot-document';
import { FileDown, FileText } from 'lucide-react';

const EMPTY_VALUE = '—';

interface WorkOrderDocumentProps {
  document: OtDocument;
  signatureUrl: string | null;
  onDownloadPdf: () => void;
  onDownloadAttachment: () => void;
  downloading: boolean;
}

function FieldList({ fields }: { fields: OtField[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map((field) => (
        <div
          key={field.label}
          className={field.fullWidth ? 'space-y-2 sm:col-span-2' : 'space-y-2'}
        >
          <Label className="text-slate-500">{field.label}</Label>
          <p className="text-sm text-slate-900 whitespace-pre-wrap break-words">
            {field.value || EMPTY_VALUE}
          </p>
        </div>
      ))}
    </div>
  );
}

export function WorkOrderDocument({
  document,
  signatureUrl,
  onDownloadPdf,
  onDownloadAttachment,
  downloading,
}: WorkOrderDocumentProps) {
  return (
    <div className="space-y-6">
      {document.sections.map((section) => {
        if (section.kind === 'fields') {
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldList fields={section.fields} />
              </CardContent>
            </Card>
          );
        }

        if (section.kind === 'checklist') {
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.subtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <Checkbox checked={item.checked} disabled />
                      <span className={`text-sm ${item.checked ? '' : 'text-slate-400'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        }

        if (section.kind === 'parts') {
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {section.parts.length === 0 ? (
                  <p className="text-sm text-slate-500">Sin repuestos registrados</p>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {section.parts.map((part) => (
                      <div key={part.id} className="p-3">
                        {part.code && (
                          <p className="text-xs text-slate-500">Código: {part.code}</p>
                        )}
                        <p className="font-medium text-sm">{part.description}</p>
                        <p className="text-xs text-slate-600">Cantidad: {part.quantity}</p>
                        {part.observations && (
                          <p className="text-xs text-slate-500">{part.observations}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        }

        if (section.kind === 'conformity') {
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldList fields={section.fields} />

                <div className="space-y-2">
                  <Label className="text-slate-500">Firma Digital del Cliente</Label>
                  {signatureUrl ? (
                    // La firma viene de una URL firmada de Supabase Storage con
                    // expiracion corta; next/image la cachearia en disco y el
                    // enlace dejaria de funcionar.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={signatureUrl}
                      alt="Firma del cliente"
                      className="h-24 w-auto border border-slate-200 rounded bg-white p-2"
                    />
                  ) : (
                    <p className="text-sm text-slate-500">Sin firma registrada</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Checkbox checked={section.checkbox.checked} disabled />
                  <span className="text-sm">{section.checkbox.label}</span>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              {section.fileName ? (
                <button
                  type="button"
                  onClick={onDownloadAttachment}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  {section.fileName}
                </button>
              ) : (
                <p className="text-sm text-slate-500">Sin adjunto</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 disabled:opacity-50 cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          {downloading ? 'Generando...' : 'Descargar PDF'}
        </button>
      </div>
    </div>
  );
}
