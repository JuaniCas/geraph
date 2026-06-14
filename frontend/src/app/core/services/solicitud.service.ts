import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Solicitud {
  id: number;
  nombre_jugador: string;
  contacto: string;
  fotos_ids: string;
  total: number;
  estado: string;
  partido_id: number | null;
  partido_titulo: string | null;
  descarga_habilitada: boolean;
  creado_en: string;
}

export interface SolicitudCrear {
  nombre_jugador: string;
  contacto: string;
  fotos_ids: number[];
}

@Injectable({ providedIn: 'root' })
export class SolicitudService {

  constructor(private http: HttpClient) {}

  crearSolicitud(datos: SolicitudCrear): Observable<Solicitud> {
    return this.http.post<Solicitud>(`${environment.apiUrl}/solicitudes/`, datos);
  }

  listarSolicitudes(): Observable<Solicitud[]> {
    return this.http.get<Solicitud[]>(`${environment.apiUrl}/solicitudes/`);
  }

  actualizarEstado(id: number, estado: string): Observable<Solicitud> {
    return this.http.patch<Solicitud>(
      `${environment.apiUrl}/solicitudes/${id}/estado`,
      { estado }
    );
  }

  eliminarSolicitud(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/solicitudes/${id}`);
  }

  habilitarDescarga(id: number): Observable<Solicitud> {
    return this.http.patch<Solicitud>(
      `${environment.apiUrl}/solicitudes/${id}/habilitar-descarga`, {}
    );
  }

  deshabilitarDescarga(id: number): Observable<Solicitud> {
    return this.http.patch<Solicitud>(
      `${environment.apiUrl}/solicitudes/${id}/deshabilitar-descarga`, {}
    );
  }

  obtenerLinksDescarga(id: number): Observable<any> {
    return this.http.get(
      `${environment.apiUrl}/solicitudes/${id}/descargas`
    );
  }
}